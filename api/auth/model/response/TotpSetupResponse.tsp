namespace AlfaHackathonApi.Auth;

const totpSetupResponseExample: TotpSetupResponse = #{
    secret: "JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP",
    provisioningUri: "otpauth://totp/Alfa%20Hackathon:ivan%40example.com?secret=JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP&issuer=Alfa%20Hackathon&algorithm=SHA1&digits=6&period=30",
    expiresAt: utcDateTime.fromISO("2026-10-18T10:35:00Z")
};

@doc("Данные первоначальной настройки TOTP. Все значения в примере демонстрационные.")
@example(totpSetupResponseExample)
model TotpSetupResponse {
    @doc("Секрет в Base32 для ручного добавления. Не записывается в журналы и больше не выдаётся после включения.")
    @secret
    @minLength(1)
    secret: string;

    @doc("URI для QR-кода Google Authenticator или другого совместимого приложения. Содержит тот же секрет.")
    @secret
    @minLength(1)
    provisioningUri: string;

    @doc("Окончание пятиминутной настройки. До подтверждения первого кода 2FA выключена.")
    expiresAt: utcDateTime;
}
