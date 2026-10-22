import "@typespec/http";

import "../model/request/ConfirmLinkRequest.tsp";
import "../model/response/LinkResultResponse.tsp";
import "../model/error/BotErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Bots.Errors;

namespace AlfaHackathonApi.Bots;

const confirmLinkSuccessOperationExample = #{
    parameters: #{ body: confirmLinkRequestExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: linkResultResponseExample
    }
};

@post
@route("/link/confirm")
@summary("Подтверждение привязки чата")
@doc("""
    Бот вызывает после запуска по ссылке с кодом: /start <код> в Telegram, событие bot_started с payload в MAX.
    Код подходит только для мессенджера этого бота, иначе 404. Код одноразовый: после успеха он погашается.
    У пользователя одна привязка на мессенджер, у чата — один пользователь: прежние привязки
    этого пользователя и этого чата в этом мессенджере заменяются новой.
    После успеха привязка видна пользователю в GET /notifications/settings.
    """)
@returnsDoc("Пользователь, к которому привязан чат.")
@opExample(confirmLinkSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(botValidationOperationExample)
@opExample(invalidBotTokenOperationExample)
@opExample(linkCodeNotFoundOperationExample)
@opExample(linkCodeUsedOperationExample)
@opExample(linkCodeExpiredOperationExample)
op confirmLink(
    @body body: ConfirmLinkRequest
):
    AlfaHackathonApi.Ok.OkResponse<LinkResultResponse>
    | BadRequestError
    | ValidationError<BotValidationIssue>
    | UnauthorizedError<InvalidBotTokenDetails>
    | NotFoundError<LinkCodeNotFoundDetails>
    | ConflictError<LinkCodeUsedDetails>
    | ProblemResponse<410, LinkCodeExpiredDetails>;
