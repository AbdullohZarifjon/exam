package com.example.examine.service;

import com.example.examine.config.security.CookieService;
import com.example.examine.config.security.JwtService;
import com.example.examine.constant.ExamStatus;
import com.example.examine.constant.FaceStatus;
import com.example.examine.constant.ResponseType;
import com.example.examine.constant.VerificationStatus;
import com.example.examine.dto.AttemptDto;
import com.example.examine.dto.ExamDto;
import com.example.examine.dto.FaceAuthDto;
import com.example.examine.dto.StudentDto;
import com.example.examine.entity.AttemptEntity;
import com.example.examine.entity.ExamEntity;
import com.example.examine.entity.StudentEntity;
import com.example.examine.exception.CustomBadRequestException;
import com.example.examine.mapper.ExamMapper;
import com.example.examine.mapper.StudentMapper;
import com.example.examine.repository.AttemptRepository;
import com.example.examine.repository.ExamRepository;
import com.example.examine.repository.StudentRepository;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * FaceAuthService - Talabaning yuzini tanish, ishonchlilik foizlarini tekshirish,
 * JWT tokenlarni generatsiya qilish va imtihon sessiyasini xavfsiz boshlash xizmati.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class FaceAuthService {

    private final FaceService faceService;
    private final BiometricService biometricService;
    private final AttemptService attemptService;
    private final VerificationRequestService verificationRequestService;
    private final StudentRepository studentRepository;
    private final ExamRepository examRepository;
    private final AttemptRepository attemptRepository;

    private final JwtService jwtService;
    private final CookieService cookieService;
    private final StudentMapper studentMapper;
    private final ExamMapper examMapper;

    /** Access token amal qilish muddati (sekundda, default: 15 daqiqa). */
    @Value("${jwt.access-token-validity:900}")
    private long accessValidity;

    /** Refresh token amal qilish muddati (sekundda, default: 30 kun). */
    @Value("${jwt.refresh-token-validity:2592000}")
    private long refreshValidity;

    /** O'xshashlik uchun minimal eshik qiymati (Threshold). */
    @Value("${face-service.match-threshold:0.60}")
    private double matchThreshold;

    /** Top 1 va Top 2 nomzodlar orasidagi minimal farq (Gap threshold). */
    @Value("${face-service.gap-threshold:0.08}")
    private double gapThreshold;

    /**
     * Talabaning yuz rasmi orqali uni aniqlash, token berish va imtihonni boshlash.
     */
    @SuppressWarnings("unchecked")
    public FaceAuthDto.FaceIdentifyResponse identifyAndStartAttempt(
            String imageBase64,
            String examId,
            String ip,
            HttpServletResponse response) {

        // 1. Imtihon mavjudligi va PUBLISHED holatda ekanligini tekshiramiz
        ExamEntity examEntity = examRepository.findById(examId)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.EXAM_NOT_FOUND));

        if (examEntity.getStatus() != ExamStatus.PUBLISHED) {
            throw new CustomBadRequestException(ResponseType.EXAM_NOT_PUBLISHED);
        }

        // 2. Python servis yordamida rasmdan embedding olamiz
        Map<String, Object> embeddingResponse = faceService.embed(imageBase64);
        List<Double> embedding = (List<Double>) embeddingResponse.get("embedding");

        if (embedding == null) {
            throw new CustomBadRequestException(ResponseType.FACE_NO_FACE_DETECTED);
        }

        // 3. Vektor bo'yicha bazadan talabani qidiramiz
        Map<String, Object> identificationResult;
        try {
            identificationResult = faceService.identifyByEmbedding(embedding);
        } catch (CustomBadRequestException e) {
            identificationResult = biometricService.localIdentify(embedding);
        }

        List<Map<String, Object>> candidates = identificationResult.get("candidates") instanceof List<?> list
                ? (List<Map<String, Object>>) (List<?>) list
                : List.of();

        // Ball bo'yicha kamayish tartibida saralaymiz
        List<Map<String, Object>> sortedCandidates = candidates.stream()
                .filter(c -> c.get("studentId") != null)
                .sorted((a, b) -> Double.compare(extractNumber(b.get("score")), extractNumber(a.get("score"))))
                .toList();

        if (sortedCandidates.isEmpty()) {
            biometricService.logBiometricEvent(null, examId, null, "fail", 0.0, 0.0, extractString(identificationResult.get("model")), "no-candidate");
            throw new CustomBadRequestException(ResponseType.FACE_MATCH_FAILED);
        }

        String topStudentId = String.valueOf(sortedCandidates.get(0).get("studentId"));
        double topScore = extractNumber(sortedCandidates.get(0).get("score"));
        double scoreGap = sortedCandidates.size() > 1 ? topScore - extractNumber(sortedCandidates.get(1).get("score")) : topScore;

        StudentEntity studentEntity = studentRepository.findById(topStudentId)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.STUDENT_NOT_FOUND));

        if (!Boolean.TRUE.equals(studentEntity.getIsActive())) {
            throw new CustomBadRequestException(ResponseType.STUDENT_INACTIVE);
        }
        if (studentEntity.getFaceStatus() != FaceStatus.ENROLLED) {
            throw new CustomBadRequestException(ResponseType.FACE_NOT_ENROLLED);
        }

        // 4. Xavfsizlik: Ambiguous (bir xil o'xshash ikki talaba) tekshiruvi
        long aboveThresholdCount = sortedCandidates.stream()
                .filter(c -> extractNumber(c.get("score")) >= matchThreshold)
                .count();

        if (aboveThresholdCount >= 2) {
            biometricService.logBiometricEvent(studentEntity, examId, null, "fail", topScore, scoreGap, extractString(identificationResult.get("model")), "ambiguous");
            throw new CustomBadRequestException(ResponseType.FACE_AMBIGUOUS);
        }

        // 5. Threshold va Gap shartlarini tekshiramiz
        String method = "face";
        if (topScore < matchThreshold || scoreGap < gapThreshold) {
            biometricService.logBiometricEvent(studentEntity, examId, null, "fail", topScore, scoreGap, extractString(identificationResult.get("model")), "score/gap");
            throw new CustomBadRequestException(ResponseType.FACE_MATCH_FAILED);
        }

        // 6. JWT Tokenlarni generatsiya qilamiz va Cookie'ga yozamiz
        String accessToken = jwtService.generateAccess(studentEntity.getId(), null, null, "Student", examId, studentEntity.getTokenVersion());
        String refreshToken = jwtService.generateRefresh(studentEntity.getId(), null, null, "Student", examId, studentEntity.getTokenVersion());

        cookieService.setAccess(response, accessToken, accessValidity);
        cookieService.setRefresh(response, refreshToken, refreshValidity);

        // 7. Imtihon urinishini (Attempt) boshlaymiz
        AttemptDto.AttemptResponse attemptResponse = attemptService.startExam(examId, studentEntity.getId());

        // AttemptEntity ni topib biometrik ma'lumotlarni yozib qo'tamiz
        AttemptEntity attemptEntity = attemptRepository.findById(attemptResponse.id())
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.ATTEMPT_NOT_FOUND));

        attemptEntity.setIdentityMethod(method);
        attemptEntity.setIdentityVerifiedAt(Instant.now());
        attemptEntity.setIdentityScore(topScore);
        attemptEntity.setIdentityGap(scoreGap);
        attemptEntity.setIdentityModel(extractString(identificationResult.get("model")));
        attemptRepository.save(attemptEntity);

        // Audit log yozamiz
        biometricService.logBiometricEvent(studentEntity, examId, attemptEntity.getId(), "identify", topScore, scoreGap, extractString(identificationResult.get("model")), ip);

        // 8. Tayyor javob DTO'sini qaytaramiz
        StudentDto.PublicStudentResponse publicStudent = studentMapper.toPublicDto(studentEntity);
        ExamDto.ExamResponse examResponse = examMapper.toDto(examEntity);

        FaceAuthDto.AssuranceDto assurance = new FaceAuthDto.AssuranceDto(
                topScore,
                scoreGap,
                extractString(identificationResult.get("model"))
        );

        return new FaceAuthDto.FaceIdentifyResponse(
                "Student",
                publicStudent,
                examResponse,
                attemptResponse,
                assurance
        );
    }

    /**
     * Kiosk verify-request statusini so'raydi. So'rov APPROVED bo'lsa — bir marta
     * claim qilinadi: attempt ochiladi, JWT cookie'ga yoziladi va identity qaytariladi.
     */
    public ClaimResult claimApproved(String requestId, String claimToken, String ip, HttpServletResponse response) {
        var request = verificationRequestService.poll(requestId, claimToken);
        String status = request.getStatus() != null ? request.getStatus().name().toLowerCase() : "pending";

        if (request.getStatus() != VerificationStatus.APPROVED) {
            return new ClaimResult(status, null);
        }

        StudentEntity studentEntity = studentRepository.findById(request.getStudentId())
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.STUDENT_NOT_FOUND));

        if (!Boolean.TRUE.equals(studentEntity.getIsActive())) {
            throw new CustomBadRequestException(ResponseType.STUDENT_INACTIVE);
        }

        ExamEntity examEntity = examRepository.findById(request.getExamId())
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.EXAM_NOT_FOUND));

        if (examEntity.getStatus() != ExamStatus.PUBLISHED) {
            throw new CustomBadRequestException(ResponseType.EXAM_NOT_PUBLISHED);
        }

        // JWT tokenlar va cookie'lar (staff tasdig'i bilan kirish)
        String accessToken = jwtService.generateAccess(studentEntity.getId(), null, null, "Student", examEntity.getId(), studentEntity.getTokenVersion());
        String refreshToken = jwtService.generateRefresh(studentEntity.getId(), null, null, "Student", examEntity.getId(), studentEntity.getTokenVersion());

        cookieService.setAccess(response, accessToken, accessValidity);
        cookieService.setRefresh(response, refreshToken, refreshValidity);

        // Imtihon urinishini boshlaymiz (resume ham shu yerda sodir bo'ladi)
        AttemptDto.AttemptResponse attemptResponse = attemptService.startExam(examEntity.getId(), studentEntity.getId());

        AttemptEntity attemptEntity = attemptRepository.findById(attemptResponse.id())
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.ATTEMPT_NOT_FOUND));

        attemptEntity.setIdentityMethod("staff-verified");
        attemptEntity.setIdentityVerifiedAt(Instant.now());
        attemptRepository.save(attemptEntity);

        // Audit: staff override hodisasi
        biometricService.logBiometricEvent(studentEntity, examEntity.getId(), attemptEntity.getId(), "override", null, null, null, "staff-approved");

        // So'rov bir marta claim qilinadi
        verificationRequestService.markClaimed(request.getId());

        FaceAuthDto.FaceIdentifyResponse identity = new FaceAuthDto.FaceIdentifyResponse(
                "Student",
                studentMapper.toPublicDto(studentEntity),
                examMapper.toDto(examEntity),
                attemptResponse,
                new FaceAuthDto.AssuranceDto(0.0, 0.0, "staff-verified")
        );

        return new ClaimResult("approved", identity);
    }

    /** Kiosk poll natijasi: status + (approved bo'lsa) identity. */
    public record ClaimResult(String status, FaceAuthDto.FaceIdentifyResponse identity) {}

    private double extractNumber(Object obj) {
        return obj instanceof Number num ? num.doubleValue() : 0.0;
    }

    private String extractString(Object obj) {
        return obj == null ? null : String.valueOf(obj);
    }
}