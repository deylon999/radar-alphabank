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

const logoutSuccessOperationExample = #{
    parameters: #{ csrf_token: csrfTokenExample },
    returnType: #{
        statusCode: 204,
        cache_control: "no-store",
        set_cookie: clearedSessionCookieExample
    }
};

@post
@route("/logout")
@summary("Выйти из системы.")
@doc("""
    Аннулирует текущую серверную сессию, очищает аутентификацию и удаляет session cookie.
    Остальные сессии пользователя сохраняются. Скопированная cookie завершённой сессии больше не подтверждает вход.
    Уже выполняющиеся запросы автоматически не прерываются.
    Для истёкшей сессии возможны 401 или 403 при более ранней CSRF-проверке.
    """)
@returnsDoc("Текущая сессия завершена, cookie удалена.")
@opExample(logoutSuccessOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
op logout(
    ...CsrfParameters
):
    {
        ...AlfaHackathonApi.Ok.NoContentResponse;

        @doc("Удаление session cookie с теми же Path и атрибутами.")
        @header("Set-Cookie")
        @example(clearedSessionCookieExample)
        set_cookie: string;
    }
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails>;
