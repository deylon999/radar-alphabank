import "../../../insights/model/response/InsightEnums.tsp";
import "../../../notifications/model/response/NotificationSettingsResponse.tsp";

using AlfaHackathonApi.Insights;
using AlfaHackathonApi.Notifications;

namespace AlfaHackathonApi.Bots;

const chatStatusResponseExample: ChatStatusResponse = #{
    connected: true,
    companyName: "Клиент U_9250",
    urgentKinds: #["risk"],
    digest: "daily",
    digestTime: "09:00",
    timeZone: "Europe/Moscow"
};

@doc("Состояние привязанного чата для команды /status.")
@example(chatStatusResponseExample)
model ChatStatusResponse {
    @doc("Чат привязан. Для непривязанного чата возвращается 404.")
    connected: true;

    @doc("Название компании пользователя. Не передаётся, если пользователь не состоит в компании.")
    companyName?: string;

    @doc("Виды срочных выводов для уведомлений.")
    urgentKinds: InsightKind[];

    @doc("Частота сводки.")
    digest: DigestFrequency;

    @doc("Время сводки, ЧЧ:ММ.")
    digestTime: string;

    @doc("Часовой пояс IANA.")
    timeZone: string;
}
