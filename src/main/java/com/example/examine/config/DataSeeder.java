package com.example.examine.config;

import com.example.examine.constant.FaceStatus;
import com.example.examine.constant.UserRoleType;
import com.example.examine.entity.StudentEntity;
import com.example.examine.entity.UserEntity;
import com.example.examine.repository.StudentRepository;
import com.example.examine.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * DataSeeder - Ilova ishga tushganda boshlang'ich (bootstrap) ma'lumotlarni
 * bazaga avtomatik qo'shuvchi klass.
 *
 * <p>Yaratiladigan ma'lumotlar:</p>
 * <ul>
 *     <li>1 ta ADMIN foydalanuvchi</li>
 *     <li>1 ta TEACHER foydalanuvchi</li>
 *     <li>1 ta test talabasi</li>
 * </ul>
 *
 * <p>Barcha amallar idempotent: agar yozuv allaqachon mavjud bo'lsa,
 * qayta yaratilmaydi. Shuning uchun ilovani bir necha marta ishga tushirish
 * xavfsiz.</p>
 *
 * <p>Migratsiyalardan keyin ishlashi uchun {@code @Order(2)} berilgan
 * (migratsiya runner'i {@code @Order(1)}).</p>
 */
@Component
@Order(2)
@RequiredArgsConstructor
public class DataSeeder implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final PasswordEncoder passwordEncoder;

    // ----- Admin -----
    @Value("${admin.username:admin}")
    private String adminUsername;

    @Value("${admin.password:admin123}")
    private String adminPassword;

    @Value("${admin.full-name:Administrator}")
    private String adminFullName;

    // ----- Teacher -----
    @Value("${seed.teacher.username:teacher}")
    private String teacherUsername;

    @Value("${seed.teacher.password:teacher123}")
    private String teacherPassword;

    @Value("${seed.teacher.full-name:Teacher}")
    private String teacherFullName;

    // ----- Student -----
    @Value("${seed.student.full-name:Test Student}")
    private String studentFullName;

    @Value("${seed.student.code:STU-2026-1}")
    private String studentCode;

    @Override
    public void run(ApplicationArguments args) {
        seedUser(adminUsername, adminPassword, adminFullName, UserRoleType.ADMIN);
        seedUser(teacherUsername, teacherPassword, teacherFullName, UserRoleType.TEACHER);
        seedStudent();
    }

    /**
     * Foydalanuvchini username bo'yicha tekshiradi va yo'q bo'lsa yaratadi.
     */
    private void seedUser(String username, String password, String fullName, UserRoleType role) {
        if (userRepository.findByUsername(username).isPresent()) {
            log.info("Seed skipped: {} user '{}' already exists", role, username);
            return;
        }

        userRepository.save(UserEntity.builder()
                .fullName(fullName)
                .username(username)
                .passwordHash(passwordEncoder.encode(password))
                .role(role)
                .isActive(true)
                .tokenVersion(0)
                .build());

        log.info("Seeded {} user '{}'", role, username);
    }

    /**
     * Test talabasini studentCode bo'yicha tekshiradi va yo'q bo'lsa yaratadi.
     */
    private void seedStudent() {
        if (studentRepository.findByStudentCode(studentCode).isPresent()) {
            log.info("Seed skipped: student '{}' already exists", studentCode);
            return;
        }

        studentRepository.save(StudentEntity.builder()
                .fullName(studentFullName)
                .studentCode(studentCode)
                .isActive(true)
                .tokenVersion(0)
                .face(StudentEntity.Face.builder()
                        .status(FaceStatus.NOT_ENROLLED)
                        .build())
                .build());

        log.info("Seeded student '{}' ({})", studentFullName, studentCode);
    }
}
