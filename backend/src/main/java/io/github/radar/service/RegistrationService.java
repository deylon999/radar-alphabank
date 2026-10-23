package io.github.radar.service;

import io.github.radar.domain.Email;
import io.github.radar.domain.User;
import io.github.radar.dto.RegisterRequest;
import io.github.radar.dto.RegisterResponse;
import io.github.radar.exception.EmailAlreadyExistsException;
import io.github.radar.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

/**
 * Регистрация пользователя. Вход не выполняется, доступа к компании регистрация не даёт.
 */
@Service
@RequiredArgsConstructor
public class RegistrationService {
    private final UserRepository userRepository;

    private final PasswordEncoder passwordEncoder;

    private final AttemptLimitService attemptLimitService;

    /**
     * Создаёт пользователя с хешем пароля.
     *
     * <p>Уникальность email обеспечивает ограничение схемы, поэтому одновременные регистрации
     * с одним email не создают двух пользователей.
     *
     * @param request email и пароль
     * @param ip адрес клиента для ограничения числа регистраций
     * @return ID созданного пользователя
     * @throws EmailAlreadyExistsException если email уже зарегистрирован
     * @throws io.github.radar.exception.TooManyAttemptsException если исчерпан лимит
     */
    public RegisterResponse register(RegisterRequest request, String ip) {
        attemptLimitService.reserveRegistration(ip);
        String passwordHash = passwordEncoder.encode(request.getPassword());
        try {
            User user = userRepository.insert(new Email(request.getEmail()), passwordHash);
            return new RegisterResponse(user.getId());
        } catch (DuplicateKeyException exception) {
            throw new EmailAlreadyExistsException(exception);
        }
    }
}
