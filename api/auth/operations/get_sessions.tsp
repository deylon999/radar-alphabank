import "@typespec/http";

import "../model/response/SessionsResponse.tsp";
import "../model/error/AuthErrors.tsp";
import "../model/error/AuthValidationIssue.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Auth.Errors;

namespace AlfaHackathonApi.Auth;

const getSessionsSuccessOperationExample = #{
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cache_control: "no-store",
        body: sessionsResponseExample
    }
};

@get
@route("/sessions")
@summary("Получить свои сессии.")
@doc("""
    Возвращает только действующие аутентифицированные сессии текущего пользователя.
    Поиск выполняется по пользователю, а не по компании.
    Текущая сессия определяется по запросу. Браузер и ОС — приблизительные сведения из User-Agent.
    Возвращаемые ID предназначены только для управления и не являются значениями cookie.
    """)
@returnsDoc("Список действующих сессий пользователя.")
@opExample(getSessionsSuccessOperationExample)
@opExample(unauthorizedOperationExample)
op getSessions(

):
    AlfaHackathonApi.Ok.OkResponse<SessionsResponse>
    | UnauthorizedError;
