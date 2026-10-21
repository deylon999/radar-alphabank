import "@typespec/http";

import "../model/error/AuthErrors.tsp";
import "../model/error/AuthValidationIssue.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Auth.Errors;

namespace AlfaHackathonApi.Auth;

const revokeOtherSessionsSuccessOperationExample = #{
    parameters: #{ csrf_token: csrfTokenExample },
    returnType: #{
        statusCode: 204,
        cache_control: "no-store"
    }
};

@post
@route("/sessions/revoke-others")
@summary("Завершить остальные сессии.")
@doc("""
    Находит сессии текущего пользователя, исключает текущую и аннулирует остальные.
    Не принимает user_id, company_id или признак текущей сессии от клиента.
    Текущая сессия и cookie сохраняются. Отсутствие других сессий также возвращает 204.
    Операция не запрещает последующие новые входы с правильными учётными данными.
    """)
@returnsDoc("Остальные сессии завершены, текущий вход сохранён.")
@opExample(revokeOtherSessionsSuccessOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
op revokeOtherSessions(
    ...CsrfParameters
):
    AlfaHackathonApi.Ok.NoContentResponse
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails>;
