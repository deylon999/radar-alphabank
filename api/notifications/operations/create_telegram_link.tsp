import "@typespec/http";

import "../model/response/TelegramLinkResponse.tsp";
import "../model/error/NotificationErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Notifications.Errors;

namespace AlfaHackathonApi.Notifications;

const createTelegramLinkSuccessOperationExample = #{
    parameters: #{ csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: telegramLinkResponseExample
    }
};

@post
@route("/telegram/link")
@summary("Ссылка для привязки Telegram")
@doc("""
    Выдаёт ссылку на бота с одноразовым кодом привязки. Код случайный, создаётся криптографическим генератором,
    привязан к текущему пользователю и действует 15 минут. Новая ссылка отменяет прежний неиспользованный код.
    Пользователь открывает ссылку и нажимает «Старт»; бот подтверждает код, и привязка видна в GET /notifications/settings.
    Если Telegram уже привязан, возвращается 409. Число запросов ограничено.
    """)
@returnsDoc("Ссылка и время окончания её действия.")
@opExample(createTelegramLinkSuccessOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(telegramAlreadyConnectedOperationExample)
@opExample(tooManyRequestsOperationExample)
op createTelegramLink(
    ...CsrfParameters
):
    AlfaHackathonApi.Ok.OkResponse<TelegramLinkResponse>
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails>
    | ConflictError<TelegramAlreadyConnectedDetails>
    | TooManyRequestsError;
