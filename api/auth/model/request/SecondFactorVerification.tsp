import "@typespec/openapi3";

using TypeSpec.OpenAPI;

namespace AlfaHackathonApi.Auth;

const totpVerificationExample = #{ method: "totp", code: "123456" };
const recoveryVerificationExample = #{
    method: "recovery_code",
    code: "7e719de3-09189305-52a5628d-8d872e45"
};

@doc("Подтверждение вторым фактором. Резервный код заменяет TOTP и погашается после успешной проверки.")
@oneOf
@example(totpVerificationExample)
@example(recoveryVerificationExample)
union SecondFactorVerification {
    totp: {
        @doc("Код из приложения-аутентификатора.")
        method: "totp";

        @doc("Шестизначный TOTP-код. Начальные нули сохраняются.")
        @secret
        @minLength(6)
        @maxLength(6)
        @pattern("^[0-9]{6}$")
        code: string;
    },

    recoveryCode: {
        @doc("Одноразовый резервный код.")
        method: "recovery_code";

        @doc("Резервный код из выданного пользователю набора.")
        @secret
        @minLength(35)
        @maxLength(35)
        @pattern("^[0-9a-f]{8}(-[0-9a-f]{8}){3}$")
        code: string;
    },
}
