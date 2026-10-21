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
@summary("Получение CSRF-токена")
@doc("""
    Возвращает токен текущей сессии. Если сессии нет, создаёт анонимную и устанавливает cookie.
    Доступен без входа, но сам по себе доступа к защищённым операциям не даёт.
    Вызывается при открытии приложения, после входа и после выхода.
    Отдельного TTL у токена нет: он действует вместе с сессией и может быть заменён сервером.
    """)
@returnsDoc("CSRF-токен и session cookie, если сессия была создана.")
@opExample(getCsrfTokenSuccessOperationExample)
op getCsrfToken(
    @doc("Cookie текущей сессии, если она уже есть.")
    @cookie("SESSION")
    @secret
    session?: string
):
    {
        ...AlfaHackathonApi.Ok.OkResponse<CsrfResponse>;

        @doc("Устанавливается, если создана новая анонимная сессия.")
        @header("Set-Cookie")
        @example(sessionCookieExample)
        set_cookie?: string;
    };
