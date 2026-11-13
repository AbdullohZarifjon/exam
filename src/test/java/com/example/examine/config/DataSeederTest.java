package com.example.examine.config;

import com.example.examine.constant.UserRoleType;
import com.example.examine.entity.StudentEntity;
import com.example.examine.entity.UserEntity;
import com.example.examine.repository.StudentRepository;
import com.example.examine.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DataSeederTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private DataSeeder dataSeeder;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(dataSeeder, "adminUsername", "admin");
        ReflectionTestUtils.setField(dataSeeder, "adminPassword", "admin123");
        ReflectionTestUtils.setField(dataSeeder, "adminFullName", "Administrator");
        ReflectionTestUtils.setField(dataSeeder, "teacherUsername", "teacher");
        ReflectionTestUtils.setField(dataSeeder, "teacherPassword", "teacher123");
        ReflectionTestUtils.setField(dataSeeder, "teacherFullName", "Teacher");
        ReflectionTestUtils.setField(dataSeeder, "studentFullName", "Test Student");
        ReflectionTestUtils.setField(dataSeeder, "studentCode", "STU-2026-1");
    }

    @Test
    void run_whenDataMissing_createsAdminTeacherAndStudent() throws Exception {
        when(userRepository.findByUsername(anyString())).thenReturn(Optional.empty());
        when(studentRepository.findByStudentCode(anyString())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed");

        dataSeeder.run(null);

        ArgumentCaptor<UserEntity> userCaptor = ArgumentCaptor.forClass(UserEntity.class);
        verify(userRepository, times(2)).save(userCaptor.capture());

        List<UserEntity> users = userCaptor.getAllValues();
        assertThat(users).extracting(UserEntity::getUsername)
                .containsExactlyInAnyOrder("admin", "teacher");
        assertThat(users).extracting(UserEntity::getRole)
                .containsExactlyInAnyOrder(UserRoleType.ADMIN, UserRoleType.TEACHER);
        assertThat(users).allSatisfy(user -> {
            assertThat(user.getPasswordHash()).isEqualTo("hashed");
            assertThat(user.getIsActive()).isTrue();
            assertThat(user.getTokenVersion()).isZero();
        });

        ArgumentCaptor<StudentEntity> studentCaptor = ArgumentCaptor.forClass(StudentEntity.class);
        verify(studentRepository).save(studentCaptor.capture());
        StudentEntity student = studentCaptor.getValue();
        assertThat(student.getFullName()).isEqualTo("Test Student");
        assertThat(student.getStudentCode()).isEqualTo("STU-2026-1");
        assertThat(student.getIsActive()).isTrue();
        assertThat(student.getFace()).isNotNull();
    }

    @Test
    void run_whenDataAlreadyExists_doesNothing() throws Exception {
        when(userRepository.findByUsername(anyString()))
                .thenReturn(Optional.of(UserEntity.builder().username("existing").build()));
        when(studentRepository.findByStudentCode(anyString()))
                .thenReturn(Optional.of(StudentEntity.builder().studentCode("STU-2026-1").build()));

        dataSeeder.run(null);

        verify(userRepository, never()).save(any(UserEntity.class));
        verify(studentRepository, never()).save(any(StudentEntity.class));
    }
}
