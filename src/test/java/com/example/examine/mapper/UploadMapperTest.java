package com.example.examine.mapper;

import com.example.examine.dto.UploadDto;
import com.example.examine.entity.UploadEntity;
import org.junit.jupiter.api.Test;
import org.mapstruct.factory.Mappers;

import static org.assertj.core.api.Assertions.assertThat;

class UploadMapperTest {

    private final UploadMapper mapper = Mappers.getMapper(UploadMapper.class);

    @Test
    void toConfirmResponse_mapsKeyAndUrl() {
        UploadEntity entity = UploadEntity.builder().id("u-1").key("uploads/key.png").build();

        UploadDto.UploadConfirmResponse response = mapper.toConfirmResponse(entity, "https://url");

        assertThat(response.key()).isEqualTo("uploads/key.png");
        assertThat(response.url()).isEqualTo("https://url");
    }

    @Test
    void toImageUrlResponse_mapsUrl() {
        UploadDto.ImageUrlResponse response = mapper.toImageUrlResponse("https://url");

        assertThat(response.url()).isEqualTo("https://url");
    }
}
