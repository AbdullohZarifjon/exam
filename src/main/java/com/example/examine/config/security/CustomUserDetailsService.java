package com.example.examine.config.security;

import com.example.examine.entity.UserEntity;
import com.example.examine.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * CustomUserDetailsService - Spring Security avtorizatsiya mexanizmi uchun
 * ma'lumotlar omboridan foydalanuvchini username bo'yicha qidirib topib beruvchi ko'prik servis.
 */
@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        UserEntity userEntity = userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("Foydalanuvchi topilmadi: " + username));

        // Spring Security tushunadigan UserDetails obyektini yasab qaytiramiz
        return User.withUsername(userEntity.getUsername())
                .password(userEntity.getPasswordHash())
                .authorities(List.of())
                .build();
    }
}