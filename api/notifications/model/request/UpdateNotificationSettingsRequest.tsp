import "../../../insights/model/response/InsightEnums.tsp";
import "../response/NotificationSettingsResponse.tsp";

using AlfaHackathonApi.Insights;

namespace AlfaHackathonApi.Notifications;

const updateNotificationSettingsRequestExample: UpdateNotificationSettingsRequest = #{
    urgentKinds: #["risk", "opportunity"],
    digest: "weekly",
    digestTime: "08:30",
    timeZone: "Asia/Irkutsk"
};

@doc("""
    Настройки уведомлений. Клиент может прислать объект настроек целиком, как получил его из GET.
    Подключить мессенджер этим запросом нельзя, только отключить.
    """)
@example(updateNotificationSettingsRequestExample)
model UpdateNotificationSettingsRequest {
    @doc("Только для отключения Telegram: connected = false снимает привязку. connected = true и username игнорируются.")
    telegram?: MessengerConnection;

    @doc("Только для отключения MAX, по тем же правилам, что telegram.")
    max?: MessengerConnection;

    @doc("Виды срочных выводов для уведомлений, без повторов. Пустой массив отключает срочные уведомления.")
    @maxItems(2)
    urgentKinds: InsightKind[];

    @doc("Частота сводки.")
    digest: DigestFrequency;

    @doc("Время отправки сводки, ЧЧ:ММ.")
    @pattern("^([01][0-9]|2[0-3]):[0-5][0-9]$")
    digestTime: string;

    @doc("Часовой пояс IANA. Не передаётся — сохраняется прежний; у нового пользователя это Europe/Moscow.")
    @minLength(1)
    @maxLength(64)
    timeZone?: string;
}
