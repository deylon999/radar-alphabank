package io.github.radar.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

/**
 * Проверяет контрольные цифры ИНН по алгоритму ФНС: одну у организации (10 цифр),
 * две у ИП и физического лица (12 цифр). Строки другого формата пропускает:
 * их отклоняет проверка шаблона.
 */
public class InnChecksumValidator implements ConstraintValidator<ValidInn, String> {
    private static final int ORGANIZATION_INN_LENGTH = 10;

    private static final int[] ORGANIZATION_WEIGHTS = {2, 4, 10, 3, 5, 9, 4, 6, 8};

    private static final int[] ELEVENTH_DIGIT_WEIGHTS = {7, 2, 4, 10, 3, 5, 9, 4, 6, 8};

    private static final int[] TWELFTH_DIGIT_WEIGHTS = {3, 7, 2, 4, 10, 3, 5, 9, 4, 6, 8};

    @Override
    public boolean isValid(String inn, ConstraintValidatorContext context) {
        if (inn == null || !inn.matches("[0-9]{10}|[0-9]{12}")) {
            return true;
        }
        if (inn.length() == ORGANIZATION_INN_LENGTH) {
            return checkDigit(inn, ORGANIZATION_WEIGHTS) == digit(inn, 9);
        }
        return checkDigit(inn, ELEVENTH_DIGIT_WEIGHTS) == digit(inn, 10)
                && checkDigit(inn, TWELFTH_DIGIT_WEIGHTS) == digit(inn, 11);
    }

    private int checkDigit(String inn, int... weights) {
        int sum = 0;
        for (int index = 0; index < weights.length; index++) {
            sum += weights[index] * digit(inn, index);
        }
        return sum % 11 % 10;
    }

    private int digit(String inn, int index) {
        return inn.charAt(index) - '0';
    }
}
