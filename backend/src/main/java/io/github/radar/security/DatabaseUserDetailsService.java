package io.github.radar.security;

import io.github.radar.domain.Email;
import io.github.radar.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Component;

/**
 * Загружает учётные данные пользователя по email для проверки пароля.
 *
 * <p>Имя пользователя в результате — его UUID: по нему вход связывается с пользователем.
 */
@Component
@RequiredArgsConstructor
public class DatabaseUserDetailsService implements UserDetailsService {
    private final UserRepository userRepository;

    @Override
    public UserDetails loadUserByUsername(String email) {
        return userRepository.findByEmail(new Email(email))
                .map(user -> User.withUsername(user.getId().toString())
                        .password(user.getPasswordHash())
                        .build())
                .orElseThrow(() -> new UsernameNotFoundException("Пользователь не найден"));
    }
}
