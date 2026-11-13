package com.example.examine.dto.upload;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record UploadRequestDto(@NotBlank String entityType, Long entityId, @NotBlank String fileName,
                               @NotBlank String contentType, @NotNull @Min(1) Long sizeBytes) {
}
