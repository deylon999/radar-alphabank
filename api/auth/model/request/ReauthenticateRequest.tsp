import "./SecondFactorVerification.tsp";

namespace AlfaHackathonApi.Auth;

const reauthenticateRequestExample: ReauthenticateRequest = #{
    password: "My company has useful news"
};

const reauthenticateWithTotpRequestExample: ReauthenticateRequest = #{
    ...reauthenticateRequestExample,
    second_factor: totpVerificationExample
};

@doc("Повторное подтверждение личности для текущей сессии.")
@example(reauthenticateRequestExample)
@example(reauthenticateWithTotpRequestExample)
model ReauthenticateRequest {
    @doc("Текущий пароль пользователя.")
    @secret
    @minLength(1)
    @maxLength(255)
    password: string;

    @doc("Обязателен при включённой 2FA. Отсутствие второго фактора не отключает проверку на сервере.")
    second_factor?: SecondFactorVerification;
}
