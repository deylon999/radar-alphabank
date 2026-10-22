import "../../../insights/model/response/InsightEnums.tsp";

using AlfaHackathonApi.Insights;

namespace AlfaHackathonApi.Notifications;

const connectedTelegramExample: MessengerConnection = #{ connected: true, username: "demo_director" };

const notificationSettingsExample: NotificationSettingsResponse = #{
    telegram: connectedTelegramExample,
    max: #{ connected: false },
    urgentKinds: #["risk"],
    digest: "daily",
    digestTime: "09:00",
    timeZone: "Asia/Irkutsk"
};

const defaultNotificationSettingsExample: NotificationSettingsResponse = #{
    telegram: #{ connected: false },
    max: #{ connected: false },
    urgentKinds: #["risk"],
    digest: "daily",
    digestTime: "09:00",
    timeZone: "Europe/Moscow"
};

@doc("Частота сводки: daily — каждый день, weekly — по понедельникам, off — не присылать.")
union DigestFrequency {
    "daily",
    "weekly",
    "off",
}

@doc("Привязка мессенджера. Подключает её только подтверждение в боте; отключает бот или PUT с connected = false.")
model MessengerConnection {
    @doc("Привязан ли мессенджер.")
    connected: boolean;

    @doc("Имя пользователя в мессенджере без @. Не передаётся, если мессенджер не привязан или у пользователя нет имени.")
    username?: string;
}

@doc("""
    Личные настройки уведомлений текущего пользователя. Уведомления приходят во все привязанные мессенджеры
    и только о выводах компании, в которой пользователь состоит. У нового пользователя настройки по умолчанию:
    срочные риски, ежедневная сводка в 09:00 по Москве, мессенджеры не привязаны.
    """)
@example(notificationSettingsExample)
@example(defaultNotificationSettingsExample)
model NotificationSettingsResponse {
    @doc("Привязка Telegram.")
    telegram: MessengerConnection;

    @doc("Привязка MAX.")
    max: MessengerConnection;

    @doc("Виды срочных выводов, о которых сообщать сразу. Пустой массив — срочных уведомлений нет.")
    urgentKinds: InsightKind[];

    @doc("Частота сводки.")
    digest: DigestFrequency;

    @doc("Время отправки сводки, ЧЧ:ММ в 24-часовом формате, в часовом поясе timeZone. Хранится и при digest = off.")
    @pattern("^([01][0-9]|2[0-3]):[0-5][0-9]$")
    digestTime: string;

    @doc("Часовой пояс IANA, например Europe/Moscow.")
    @minLength(1)
    timeZone: string;
}
