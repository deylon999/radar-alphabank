namespace AlfaHackathonApi.Notifications;

const telegramLinkResponseExample: MessengerLinkResponse = #{
    url: "https://t.me/radar_demo_bot?start=Ab3xK9pQr2Zt",
    expiresAt: utcDateTime.fromISO("2026-10-22T10:15:00Z")
};

const maxLinkResponseExample: MessengerLinkResponse = #{
    url: "https://max.ru/radar_demo_bot?start=Kp7mZq2Lx9Rb",
    expiresAt: utcDateTime.fromISO("2026-10-22T10:15:00Z")
};

@doc("Ссылка на бота с одноразовым кодом привязки.")
@example(telegramLinkResponseExample)
@example(maxLinkResponseExample)
model MessengerLinkResponse {
    @doc("""
        Ссылка на бота: https://t.me/<бот>?start=<код> для Telegram, https://max.ru/<бот>?start=<код> для MAX.
        Содержит секретный код: не записывается в журналы и не передаётся третьим лицам.
        """)
    @secret
    url: url;

    @doc("Окончание действия кода: через 15 минут после выдачи.")
    expiresAt: utcDateTime;
}
