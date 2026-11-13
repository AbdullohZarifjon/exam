package com.example.examine.mapper;

import com.example.examine.constant.UserRoleType;
import com.example.examine.dto.AuthDto;
import com.example.examine.entity.UserEntity;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class UserMapperTest {

    private final UserMapper mapper = Mappers.getMapper(UserMapper.class);

    private UserEntity sampleEntity() {
        return UserEntity.builder()
                .id("user-1")
                .fullName("Admin")
                .username("admin")
                .role(UserRoleType.ADMIN)
                .isActive(true)
                .createdAt(Instant.parse("2026-01-01T10:00:00Z"))
                .build();
    }

    @Test
    void toDto_mapsRoleAndDate() {
        AuthDto.PublicUserResponse dto = mapper.toDto(sampleEntity());

        assertThat(dto.id()).isEqualTo("user-1");
        assertThat(dto.fullName()).isEqualTo("Admin");
        assertThat(dto.username()).isEqualTo("admin");
        assertThat(dto.role()).isEqualTo("ADMIN");
        assertThat(dto.isActive()).isTrue();
        assertThat(dto.createdAt()).isEqualTo("2026-01-01T10:00Z");
    }

    @Test
    void toDto_handlesNullRoleAndDate() {
        AuthDto.PublicUserResponse dto = mapper.toDto(UserEntity.builder().id("u").build());

        assertThat(dto.role()).isNull();
        assertThat(dto.createdAt()).isNull();
    }

    @Test
    void toDtoList_mapsEveryElement() {
        List<AuthDto.PublicUserResponse> result = mapper.toDtoList(List.of(sampleEntity(), sampleEntity()));

        assertThat(result).hasSize(2);
        assertThat(result).allMatch(dto -> dto.username().equals("admin"));
    }
}
