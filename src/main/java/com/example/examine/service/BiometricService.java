package com.example.examine.service;

import com.example.examine.constant.FaceStatus;
import com.example.examine.constant.ResponseType;
import com.example.examine.entity.BiometricEventEntity;
import com.example.examine.entity.StudentEntity;
import com.example.examine.exception.CustomBadRequestException;
import com.example.examine.repository.BiometricEventRepository;
import com.example.examine.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

/**
 * BiometricService - Talabalarning yuz biometriyasini ro'yxatdan o'tkazish,
 * solishtirish va xavfsizlik voqealarini qayd etish xizmati.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class BiometricService {

    private final FaceService faceService;
    private final StudentRepository studentRepository;
    private final BiometricEventRepository biometricEventRepository;

    @Value("${face-service.match-threshold:0.60}")
    private double matchThreshold;

    @Value("${face-service.gap-threshold:0.08}")
    private double gapThreshold;

    public record EnrollResult(double quality, String model) {}

    /**
     * Talabaning yuz tasvirini olib, embedding (vektor) hosil qilish va bazaga saqlash.
     */
    public EnrollResult enrollStudent(String studentId, String imageBase64, String staffId) {
        StudentEntity student = studentRepository.findById(studentId)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.STUDENT_NOT_FOUND));

        Map<String, Object> embedResult = faceService.embed(imageBase64);

        double quality = embedResult.get("quality") instanceof Number num ? num.doubleValue() : 0.0;
        String model = String.valueOf(embedResult.getOrDefault("model", "buffalo_s"));
        int faceCount = embedResult.get("faceCount") instanceof Number num ? num.intValue() : 1;

        if (faceCount != 1) {
            throw new CustomBadRequestException(ResponseType.FACE_NO_FACE_DETECTED);
        }
        if (quality < 0.35) {
            throw new CustomBadRequestException(ResponseType.FACE_QUALITY_TOO_LOW);
        }

        @SuppressWarnings("unchecked")
        List<Double> embeddingList = (List<Double>) embedResult.get("embedding");
        if (embeddingList == null || embeddingList.size() != 512) {
            throw new CustomBadRequestException(ResponseType.FACE_NO_FACE_DETECTED);
        }

        // List<Double> ni primitiv double[] massiviga o'tkazamiz (Xotira optimizatsiyasi)
        double[] primitiveEmbedding = new double[embeddingList.size()];
        for (int i = 0; i < embeddingList.size(); i++) {
            primitiveEmbedding[i] = embeddingList.get(i);
        }

        faceService.enrollEmbedding(studentId, embeddingList);

        student.setFaceEmbedding(primitiveEmbedding);
        student.setFaceStatus(FaceStatus.ENROLLED);
        student.setFaceEnrolledAt(OffsetDateTime.from(Instant.now())); // OffsetDateTime o'rniga Instant.now()
        student.setFaceEnrolledBy(staffId);
        student.setFaceQualityScore(quality);
        student.setFaceModel(model);
        student.setFacePhotoKey("faces/" + studentId);
        student.setFaceConsentAt(Instant.now()); // OffsetDateTime o'rniga Instant.now()
        student.setFaceConsentVersion("v1-uz");

        studentRepository.save(student);

        logBiometricEvent(student, null, null, "enroll", null, null, model, "quality=" + quality);
        return new EnrollResult(quality, model);
    }

    /**
     * Talabaning biometrik ma'lumotlarini bekor qilish (Revoke).
     */
    public Map<String, Object> revokeStudent(String studentId, String ip) {
        StudentEntity student = studentRepository.findById(studentId)
                .orElseThrow(() -> new CustomBadRequestException(ResponseType.STUDENT_NOT_FOUND));

        student.setFaceStatus(FaceStatus.NOT_ENROLLED);
        student.setFaceEmbedding(null);
        studentRepository.save(student);

        faceService.deleteStudent(studentId);
        logBiometricEvent(student, null, null, "revoke", null, null, student.getFaceModel(), ip);

        return Map.of("ok", true);
    }

    /**
     * Tashqi yuz servisi ishlamay qolganda mahalliy kosinus o'xshashlikni hisoblash (Local Fallback Algoritmi).
     */
    @Transactional(readOnly = true)
    public Map<String, Object> localIdentify(List<Double> probeVector) {
        List<StudentEntity> enrolledStudents = studentRepository.findAll().stream()
                .filter(s -> s.getFaceEmbedding() != null)
                .toList();

        record ScoredCandidate(String studentId, double score) {}

        double probeNorm = calculateVectorNorm(probeVector);

        List<ScoredCandidate> scoredCandidates = enrolledStudents.stream().map(student -> {
            double[] studentEmbedding = student.getFaceEmbedding();
            double dotProduct = 0.0;
            double studentNormSquared = 0.0;

            int limit = Math.min(studentEmbedding.length, probeVector.size());
            for (int i = 0; i < limit; i++) {
                dotProduct += studentEmbedding[i] * probeVector.get(i);
                studentNormSquared += studentEmbedding[i] * studentEmbedding[i];
            }

            double similarityScore = dotProduct / (probeNorm * Math.sqrt(studentNormSquared) + 1e-9);
            return new ScoredCandidate(student.getId(), similarityScore);
        }).sorted((a, b) -> Double.compare(b.score, a.score)).toList();

        if (scoredCandidates.isEmpty()) {
            return Map.of("studentId", "", "score", 0.0, "gap", 0.0, "model", "local", "candidates", List.of());
        }

        double topScore = scoredCandidates.get(0).score();
        double secondScore = scoredCandidates.size() > 1 ? scoredCandidates.get(1).score() : -1.0;

        List<Map<String, Object>> topCandidates = scoredCandidates.stream()
                .limit(5)
                .map(sc -> Map.<String, Object>of("studentId", sc.studentId(), "score", sc.score()))
                .toList();

        return Map.of(
                "studentId", scoredCandidates.get(0).studentId(),
                "score", topScore,
                "gap", topScore - secondScore,
                "model", "local",
                "candidates", topCandidates
        );
    }

    /**
     * Biometrik hodisalarni audit log sifatida saqlash.
     */
    public void logBiometricEvent(StudentEntity student, String examId, String attemptId,
                                  String event, Double score, Double gap, String model, String detail) {
        BiometricEventEntity eventEntity = BiometricEventEntity.builder()
                .studentId(student != null ? student.getId() : null)
                .examId(examId)
                .attemptId(attemptId)
                .event(event)
                .score(score)
                .gap(gap)
                .model(model)
                .detail(detail)
                .build();

        biometricEventRepository.save(eventEntity);
    }

    /**
     * So'nggi biometrik audit hodisalari (admin ko'rishi uchun, hech qachon o'chirilmaydi).
     */
    @Transactional(readOnly = true)
    public List<BiometricEventEntity> recentEvents(int limit) {
        return biometricEventRepository
                .findAll(PageRequest.of(0, limit, Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent();
    }

    /**
     * Vektor uzunligini (norm) hisoblash uchun yordamchi matematik metod.
     */
    private double calculateVectorNorm(List<Double> vector) {
        double sumOfSquares = 0.0;
        for (Double val : vector) {
            sumOfSquares += val * val;
        }
        return Math.sqrt(sumOfSquares);
    }
}