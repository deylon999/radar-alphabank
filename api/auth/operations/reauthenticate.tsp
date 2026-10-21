import "@typespec/http";

import "../model/request/ReauthenticateRequest.tsp";
import "../model/response/ReauthenticationResponse.tsp";
import "../model/error/AuthErrors.tsp";
import "../model/error/AuthValidationIssue.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Auth.Errors;

namespace AlfaHackathonApi.Auth;

const reauthenticateSuccessOperationExample = #{
    parameters: #{ body: reauthenticateRequestExample, csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: reauthenticationResponseExample
    }
};

const reauthenticateWithTotpOperationExample = #{
    parameters: #{ body: reauthenticateWithTotpRequestExample, csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: reauthenticationResponseExample
    }
};

@post
@route("/reauthenticate")
@summary("Повторное подтверждение личности")
@doc("""
    Проверяет текущий пароль, а при включённой 2FA ещё и второй фактор.
    После успеха чувствительные действия доступны 5 минут, только в текущей сессии.
    Если второй фактор обязателен, без него проверку не пройти.
    Обычные запросы время подтверждения не продлевают.
    Время входа не меняется, 8-часовой предел сессии не сдвигается.
    Отключение 2FA и перевыпуск резервных кодов всё равно требуют проверки прямо в запросе.
    """)
@returnsDoc("Время подтверждения и время, до которого оно действует.")
@opExample(reauthenticateSuccessOperationExample)
@opExample(reauthenticateWithTotpOperationExample)
@opExample(badRequestOperationExample)
@opExample(reauthenticationValidationOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidReauthenticationOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(tooManyRequestsOperationExample)
op reauthenticate(
    ...CsrfParameters,
    @body body: ReauthenticateRequest
):
    AlfaHackathonApi.Ok.OkResponse<ReauthenticationResponse>
    | BadRequestError
    | ValidationError<AuthValidationIssue>
    | UnauthorizedError<ProblemDetails<401> | InvalidReauthenticationDetails>
    | ForbiddenError<InvalidCsrfDetails>
    | TooManyRequestsError;
