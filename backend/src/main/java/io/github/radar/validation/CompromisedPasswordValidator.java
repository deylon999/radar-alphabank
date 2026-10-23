package io.github.radar.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Проверяет пароль по списку распространённых паролей из утечек без учёта регистра.
 *
 * <p>Список лежит в ресурсах приложения: проверка не зависит от сети и внешних сервисов.
 * В нём только пароли длиной от 15 символов, более короткие отклоняет проверка длины.
 */
public class CompromisedPasswordValidator
        implements ConstraintValidator<NotCompromisedPassword, String> {
    private static final String RESOURCE = "/security/compromised-passwords.txt";

    private final Set<String> compromisedPasswords = load();

    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        return password == null
                || !compromisedPasswords.contains(password.toLowerCase(Locale.ROOT));
    }

    private Set<String> load() {
        try (InputStream stream = getClass().getResourceAsStream(RESOURCE);
                BufferedReader reader = new BufferedReader(
                        new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            return reader.lines()
                    .map(line -> line.toLowerCase(Locale.ROOT))
                    .collect(Collectors.toUnmodifiableSet());
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }
}
