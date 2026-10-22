import "@typespec/http";

import "../model/request/UnlinkChatRequest.tsp";
import "../model/error/BotErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Bots.Errors;

namespace AlfaHackathonApi.Bots;

const unlinkChatSuccessOperationExample = #{
    parameters: #{ body: unlinkChatRequestExample },
    returnType: #{
        statusCode: 204,
        cacheControl: "no-store"
    }
};

@post
@route("/unlink")
@summary("Отвязка чата")
@doc("""
    Бот вызывает, когда пользователь отправил /stop или заблокировал бота.
    Снимает привязку чата в мессенджере этого бота; остальные настройки пользователя сохраняются.
    Если чат не привязан, тоже возвращается 204.
    """)
@returnsDoc("Чат отвязан.")
@opExample(unlinkChatSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(botValidationOperationExample)
@opExample(invalidBotTokenOperationExample)
op unlinkChat(
    @body body: UnlinkChatRequest
):
    AlfaHackathonApi.Ok.NoContentResponse
    | BadRequestError
    | ValidationError<BotValidationIssue>
    | UnauthorizedError<InvalidBotTokenDetails>;
