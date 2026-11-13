package com.example.examine.dto.attempt;

import jakarta.validation.constraints.NotNull;

public record FinishRequestDto(@NotNull String attemptId) {
}
