package io.github.radar.dto;

/**
 * Результат проверки пароля: завершённый вход или ожидание второго фактора.
 * Вариант различается полем status.
 */
public sealed interface LoginResponse permits AuthenticatedLoginResponse, MfaRequiredResponse {
}
