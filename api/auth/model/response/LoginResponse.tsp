import "@typespec/openapi3";
import "./AuthenticatedUserResponse.tsp";

using TypeSpec.OpenAPI;

namespace AlfaHackathonApi.Auth;

const authenticatedLoginExample: AuthenticatedLoginResponse = #{
    status: "authenticated",
    user: authenticatedUserExample,
    authenticatedAt: utcDateTime.fromISO("2026-10-18T10:00:00Z"),
    idleTimeoutSeconds: 3600,
    absoluteExpiresAt: utcDateTime.fromISO("2026-10-18T18:00:00Z")
};

const mfaRequiredExample: MfaRequiredResponse = #{
    status: "mfa_required",
    expiresAt: utcDateTime.fromISO("2026-10-18T10:05:00Z")
};

@doc("Вход полностью завершён. Идентификатор сессии передаётся только через Set-Cookie.")
@example(authenticatedLoginExample)
model AuthenticatedLoginResponse {
    @doc("Состояние входа.")
    status: "authenticated";

    @doc("Аутентифицированный пользователь.")
    user: AuthenticatedUserResponse;

    @doc("Время завершения всех необходимых этапов входа.")
    authenticatedAt: utcDateTime;

    @doc("Таймаут бездействия в секундах. Активность может продлевать только этот срок.")
    idleTimeoutSeconds: 3600;

    @doc("Предельное время входа. Обычные запросы его не изменяют.")
    absoluteExpiresAt: utcDateTime;
}

@doc("Пароль проверен, но нужен второй фактор. Доступ к защищённым операциям ещё не предоставлен.")
@example(mfaRequiredExample)
model MfaRequiredResponse {
    @doc("Состояние входа.")
    status: "mfa_required";

    @doc("Окончание пятиминутного ожидания второго фактора. После него пароль вводится заново.")
    expiresAt: utcDateTime;
}

@doc("Результат проверки первого этапа входа.")
@oneOf
union LoginResponse {
    authenticated: AuthenticatedLoginResponse,
    mfaRequired: MfaRequiredResponse,
}
