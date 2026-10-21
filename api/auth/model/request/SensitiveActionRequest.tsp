import "./SecondFactorVerification.tsp";

namespace AlfaHackathonApi.Auth;

const sensitiveActionRequestExample: SensitiveActionRequest = #{
    password: "My company has useful news",
    second_factor: totpVerificationExample
};

const sensitiveActionWithRecoveryRequestExample: SensitiveActionRequest = #{
    password: "My company has useful news",
    second_factor: recoveryVerificationExample
};

@doc("Пароль и существующий второй фактор непосредственно для чувствительного действия.")
@example(sensitiveActionRequestExample)
@example(sensitiveActionWithRecoveryRequestExample)
model SensitiveActionRequest {
    @doc("Текущий пароль пользователя.")
    @secret
    @minLength(1)
    @maxLength(255)
    password: string;

    @doc("Действующий TOTP-код или ещё не использованный резервный код.")
    second_factor: SecondFactorVerification;
}
