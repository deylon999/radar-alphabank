package io.github.radar.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Пароль не должен входить в список распространённых паролей из утечек.
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = CompromisedPasswordValidator.class)
public @interface NotCompromisedPassword {
    /**
     * Описание ошибки.
     *
     * @return описание
     */
    String message() default "Этот пароль встречается в утечках. Выберите другой.";

    /**
     * Группы проверки.
     *
     * @return группы
     */
    Class<?>[] groups() default {};

    /**
     * Машинный код ошибки, обычно {@link ValidationCode.CompromisedPassword}.
     *
     * @return код
     */
    Class<? extends Payload>[] payload() default {};
}
