namespace AlfaHackathonApi.Auth;

const verifyTotpRequestExample: VerifyTotpRequest = #{ code: "123456" };

@doc("Подтверждение настройки TOTP первым корректным кодом.")
@example(verifyTotpRequestExample)
model VerifyTotpRequest {
    @doc("Шестизначный код для секрета, полученного на этапе настройки.")
    @secret
    @minLength(6)
    @maxLength(6)
    @pattern("^[0-9]{6}$")
    code: string;
}
