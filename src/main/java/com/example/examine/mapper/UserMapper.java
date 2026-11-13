package com.example.examine.mapper;

import com.example.examine.dto.AuthDto;
import com.example.examine.entity.UserEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * UserMapper - UserEntity va AuthDto lar orasidagi obyekt almashinuvini bajaruvchi mapper.
 */
@Mapper(componentModel = "spring")
public interface UserMapper {

    @Mapping(target = "role", expression = "java(entity.getRole() != null ? entity.getRole().name() : null)")
    @Mapping(target = "createdAt", expression = "java(mapDate(entity.getCreatedAt()))")
    AuthDto.PublicUserResponse toDto(UserEntity entity);

    List<AuthDto.PublicUserResponse> toDtoList(List<UserEntity> entities);

    default String mapDate(Instant date) {
        return date != null ? date.toString() : null;
    }
}