import "@typespec/http";

import "../model/response/ChatStatusResponse.tsp";
import "../model/error/BotErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Bots.Errors;

namespace AlfaHackathonApi.Bots;

const getChatStatusSuccessOperationExample = #{
    parameters: #{ chatId: 123456789 },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: chatStatusResponseExample
    }
};

@get
@route("/status")
@summary("Состояние чата")
@doc("""
    Бот вызывает для команды /status. Ищет привязку только в мессенджере этого бота.
    Если чат не привязан, возвращается 404.
    """)
@returnsDoc("Компания и настройки уведомлений пользователя.")
@opExample(getChatStatusSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(invalidBotTokenOperationExample)
@opExample(chatNotLinkedOperationExample)
op getChatStatus(
    @doc("ID чата в мессенджере.")
    @query chatId: int64
):
    AlfaHackathonApi.Ok.OkResponse<ChatStatusResponse>
    | BadRequestError
    | UnauthorizedError<InvalidBotTokenDetails>
    | NotFoundError<ChatNotLinkedDetails>;
