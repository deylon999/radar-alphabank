package io.github.radar.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Контрольные цифры ИНН совпадают. Формат проверяет отдельное ограничение,
 * наличие в реестре не проверяется.
 */
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = InnChecksumValidator.class)
public @interface ValidInn {
    /**
     * Описание ошибки.
     *
     * @return описание
     */
    String message() default "Проверьте ИНН: контрольная цифра не совпадает.";

    /**
     * Группы проверки.
     *
     * @return группы
     */
    Class<?>[] groups() default {};

    /**
     * Машинный код ошибки, обычно {@link ValidationCode.InvalidChecksum}.
     *
     * @return код
     */
    Class<? extends Payload>[] payload() default {};
}
