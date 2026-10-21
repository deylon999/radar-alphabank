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
    parameters: #{ body: reauthenticateRequestExample, csrf_token: csrfTokenExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cache_control: "no-store",
        body: reauthenticationResponseExample
    }
};

const reauthenticateWithTotpOperationExample = #{
    parameters: #{ body: reauthenticateWithTotpRequestExample, csrf_token: csrfTokenExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cache_control: "no-store",
        body: reauthenticationResponseExample
    }
};

@post
@route("/reauthenticate")
@summary("Повторно подтвердить личность.")
@doc("""
    Проверяет текущий пароль, а при включённой 2FA — также второй фактор.
    Успех разрешает обычные чувствительные действия на 5 минут только в текущей сессии.
    Отсутствующий обязательный второй фактор не позволяет пройти проверку.
    Обычные запросы не обновляют время подтверждения.
    Не изменяет время первоначального входа и не продлевает его восьмичасовой предел.
    Отключение 2FA и перевыпуск резервных кодов всё равно требуют отдельной проверки в самом запросе.
    """)
@returnsDoc("Время подтверждения и окончания разрешения.")
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
