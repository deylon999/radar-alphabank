namespace AlfaHackathonApi.Notifications;

const telegramLinkResponseExample: TelegramLinkResponse = #{
    url: "https://t.me/radar_demo_bot?start=Ab3xK9pQr2Zt",
    expiresAt: utcDateTime.fromISO("2026-10-22T10:15:00Z")
};

@doc("Ссылка на бота с одноразовым кодом привязки.")
@example(telegramLinkResponseExample)
model TelegramLinkResponse {
    @doc("Ссылка вида https://t.me/<бот>?start=<код>. Содержит секретный код: не записывается в журналы и не передаётся третьим лицам.")
    @secret
    url: url;

    @doc("Окончание действия кода: через 15 минут после выдачи.")
    expiresAt: utcDateTime;
}
