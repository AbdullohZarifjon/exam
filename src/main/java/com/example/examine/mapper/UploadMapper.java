package com.example.examine.mapper;

import com.example.examine.dto.UploadDto;
import com.example.examine.entity.UploadEntity;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;

import java.time.Instant;
import java.time.OffsetDateTime;

/**
 * UploadMapper - UploadEntity va UploadDto'lar orasidagi obyekt almashinuvini bajaruvchi mapper.
 */
@Mapper(componentModel = "spring")
public interface UploadMapper {

    @Mapping(target = "key", source = "entity.key")
    @Mapping(target = "url", source = "url")
    UploadDto.UploadConfirmResponse toConfirmResponse(UploadEntity entity, String url);

    @Mapping(target = "url", source = "url")
    UploadDto.ImageUrlResponse toImageUrlResponse(String url);

    /** OffsetDateTime tipini String formatiga o'tkazish uchun yordamchi metod. */
    default String mapDate(Instant date) {
        return date != null ? date.toString() : null;
    }
}