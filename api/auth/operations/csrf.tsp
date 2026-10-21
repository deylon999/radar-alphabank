import "@typespec/http";

import "../model/response/CsrfResponse.tsp";
import "../model/error/AuthErrors.tsp";
import "../model/error/AuthValidationIssue.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Auth.Errors;

namespace AlfaHackathonApi.Auth;

const getCsrfTokenSuccessOperationExample = #{
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cache_control: "no-store",
        set_cookie: sessionCookieExample,
        body: csrfResponseExample
    }
};

@get
@route("/csrf")
@useAuth(NoAuth)
@summary("Получить CSRF-токен.")
@doc("""
    Возвращает токен текущей сессии. Если сессии нет, создаёт анонимную и устанавливает cookie.
    Доступен до входа. Не выдаёт доступ к защищённым операциям.
    Вызывается при открытии приложения, после успешного входа и после выхода.
    Токен не имеет отдельного календарного TTL: связан с текущей сессией и может быть заменён сервером.
    """)
@returnsDoc("CSRF-токен и, при необходимости, session cookie.")
@opExample(getCsrfTokenSuccessOperationExample)
op getCsrfToken(
    @doc("Cookie текущей сессии, если есть.")
    @cookie("SESSION")
    @secret
    session?: string
):
    {
        ...AlfaHackathonApi.Ok.OkResponse<CsrfResponse>;

        @doc("Устанавливается, если для CSRF создана новая анонимная сессия.")
        @header("Set-Cookie")
        @example(sessionCookieExample)
        set_cookie?: string;
    };
