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
@summary("Завершение остальных сессий")
@doc("""
    Завершает все сессии текущего пользователя, кроме текущей.
    user_id, company_id и признак текущей сессии от клиента не принимаются.
    Текущая сессия и cookie сохраняются. Если других сессий нет, тоже возвращается 204.
    Новые входы с правильными учётными данными после этого возможны.
    """)
@returnsDoc("Остальные сессии завершены, текущая сохранена.")
@opExample(revokeOtherSessionsSuccessOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
op revokeOtherSessions(
    ...CsrfParameters
):
    AlfaHackathonApi.Ok.NoContentResponse
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails>;
