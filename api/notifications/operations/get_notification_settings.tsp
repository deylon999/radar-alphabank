import "@typespec/http";

import "../model/response/NotificationSettingsResponse.tsp";
import "../model/error/NotificationErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Notifications.Errors;

namespace AlfaHackathonApi.Notifications;

const getNotificationSettingsSuccessOperationExample = #{
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: notificationSettingsExample
    }
};

@get
@route("/settings")
@summary("Настройки уведомлений")
@doc("""
    Возвращает личные настройки текущего пользователя. Доступно и пользователю без компании:
    настройки сохраняются, но уведомления приходят только после вступления в компанию.
    Клиент перезапрашивает настройки, когда пользователь возвращается во вкладку, и так узнаёт о привязке в боте.
    """)
@returnsDoc("Настройки уведомлений.")
@opExample(getNotificationSettingsSuccessOperationExample)
@opExample(unauthorizedOperationExample)
op getNotificationSettings(

):
    AlfaHackathonApi.Ok.OkResponse<NotificationSettingsResponse>
    | UnauthorizedError;
