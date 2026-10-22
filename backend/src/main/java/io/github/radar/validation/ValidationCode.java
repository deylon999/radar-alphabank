package io.github.radar.validation;

import jakarta.validation.Payload;

/**
 * Машинные коды ошибок полей. Код ограничения задаётся в его payload,
 * например {@code @Size(min = 1, payload = ValidationCode.MustNotBeEmpty.class)},
 * и попадает в ответ в виде MUST_NOT_BE_EMPTY.
 */
public interface ValidationCode {
    /**
     * Поле не передано.
     */
    interface Required extends Payload {
    }

    /**
     * Передана пустая строка.
     */
    interface MustNotBeEmpty extends Payload {
    }

    /**
     * Значение вне допустимого диапазона или длины.
     */
    interface OutOfRange extends Payload {
    }

    /**
     * Значение не соответствует формату.
     */
    interface InvalidFormat extends Payload {
    }

    /**
     * Пароль распространённый или встречался в утечках.
     */
    interface CompromisedPassword extends Payload {
    }
}
