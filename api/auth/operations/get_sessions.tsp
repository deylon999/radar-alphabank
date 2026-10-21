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
        cacheControl: "no-store",
        body: sessionsResponseExample
    }
};

@get
@route("/sessions")
@summary("Список своих сессий")
@doc("""
    Возвращает только действующие сессии текущего пользователя, в которых выполнен вход.
    Поиск идёт по пользователю, а не по компании.
    Текущая сессия определяется по запросу. Браузер и ОС берутся из User-Agent и могут быть неточными.
    ID в ответе нужны только для управления сессиями и не являются значениями cookie.
    """)
@returnsDoc("Действующие сессии пользователя.")
@opExample(getSessionsSuccessOperationExample)
@opExample(unauthorizedOperationExample)
op getSessions(

):
    AlfaHackathonApi.Ok.OkResponse<SessionsResponse>
    | UnauthorizedError;
