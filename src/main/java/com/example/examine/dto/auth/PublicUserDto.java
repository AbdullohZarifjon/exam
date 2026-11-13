package com.example.examine.dto.auth;

public record PublicUserDto(String id, String fullName, String username, String role, Boolean isActive,
                            String createdAt, String updatedAt) {
}
