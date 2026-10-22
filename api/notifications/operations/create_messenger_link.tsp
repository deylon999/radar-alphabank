import "@typespec/http";

import "../model/response/MessengerLinkResponse.tsp";
import "../model/error/NotificationErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Notifications.Errors;

namespace AlfaHackathonApi.Notifications;

const createTelegramLinkSuccessOperationExample = #{
    parameters: #{ channel: "telegram", csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: telegramLinkResponseExample
    }
};

const createMaxLinkSuccessOperationExample = #{
    parameters: #{ channel: "max", csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: maxLinkResponseExample
    }
};

@post
@route("/{channel}/link")
@summary("Ссылка для привязки мессенджера")
@doc("""
    Выдаёт ссылку на бота выбранного мессенджера с одноразовым кодом привязки.
    Код из 12 латинских букв и цифр создаётся криптографическим генератором, привязан к текущему пользователю
    и мессенджеру и действует 15 минут. Новая ссылка отменяет прежний неиспользованный код этого мессенджера.
    Пользователь открывает ссылку и запускает бота; бот подтверждает код, и привязка видна в GET /notifications/settings.
    Если мессенджер уже привязан, возвращается 409. Неизвестный мессенджер в пути — 400. Число запросов ограничено.
    """)
@returnsDoc("Ссылка и время окончания её действия.")
@opExample(createTelegramLinkSuccessOperationExample)
@opExample(createMaxLinkSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(channelAlreadyConnectedOperationExample)
@opExample(tooManyRequestsOperationExample)
op createMessengerLink(
    @doc("Мессенджер: telegram или max.")
    @path channel: MessengerChannel,

    ...CsrfParameters
):
    AlfaHackathonApi.Ok.OkResponse<MessengerLinkResponse>
    | BadRequestError
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails>
    | ConflictError<ChannelAlreadyConnectedDetails>
    | TooManyRequestsError;
