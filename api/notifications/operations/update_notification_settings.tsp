import "@typespec/http";

import "../model/request/UpdateNotificationSettingsRequest.tsp";
import "../model/response/NotificationSettingsResponse.tsp";
import "../model/error/NotificationErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Notifications.Errors;

namespace AlfaHackathonApi.Notifications;

const updateNotificationSettingsSuccessOperationExample = #{
    parameters: #{ body: updateNotificationSettingsRequestExample, csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: #{ ...notificationSettingsExample, ...updateNotificationSettingsRequestExample }
    }
};

@put
@route("/settings")
@summary("Сохранение настроек уведомлений")
@doc("""
    Заменяет настройки текущего пользователя; если timeZone не передан, пояс остаётся прежним.
    Привязка Telegram появляется только после подтверждения в боте. telegram.connected = false в запросе
    снимает привязку и отменяет неиспользованный код; connected = true игнорируется.
    Срочное уведомление отправляется, если вывод срочный, его вид есть в urgentKinds и пользователь его не скрыл.
    Сводка содержит то же, что GET /companies/{companyId}/digest, и отправляется в digestTime по поясу timeZone.
    Повтор того же запроса ничего не меняет.
    """)
@returnsDoc("Сохранённые настройки.")
@opExample(updateNotificationSettingsSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(notificationSettingsValidationOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
op updateNotificationSettings(
    ...CsrfParameters,
    @body body: UpdateNotificationSettingsRequest
):
    AlfaHackathonApi.Ok.OkResponse<NotificationSettingsResponse>
    | BadRequestError
    | ValidationError<NotificationSettingsValidationIssue>
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails>;
