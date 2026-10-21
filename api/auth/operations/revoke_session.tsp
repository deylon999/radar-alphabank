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

const revokeOtherSessionOperationExample = #{
    parameters: #{ id: "1bb885f8-4646-4332-a7f1-fc418d21cc8e", csrf_token: csrfTokenExample },
    returnType: #{
        statusCode: 204,
        cache_control: "no-store"
    }
};

const revokeCurrentSessionOperationExample = #{
    parameters: #{ id: "23d90edf-885d-4ea4-8878-15b5965f962d", csrf_token: csrfTokenExample },
    returnType: #{
        statusCode: 204,
        cache_control: "no-store",
        set_cookie: clearedSessionCookieExample
    }
};

@delete
@route("/sessions/{id}")
@summary("Завершение сессии")
@doc("""
    Завершает сессию текущего пользователя по её публичному id.
    Для чужой, отсутствующей или истёкшей сессии возвращается одинаковый 404.
    Если завершается текущая сессия, её cookie тоже удаляется.
    На другом устройстве cookie может остаться, но вход по ней больше не работает.
    Запрос, который уже выполняется в отзываемой сессии, не прерывается.
    """)
@returnsDoc("Сессия завершена.")
@opExample(revokeOtherSessionOperationExample)
@opExample(revokeCurrentSessionOperationExample)
@opExample(badRequestOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(notFoundOperationExample)
op revokeSession(
    @doc("Публичный id из GET /auth/sessions, а не значение cookie.")
    @path id: Uuid,
    ...CsrfParameters
):
    {
        ...AlfaHackathonApi.Ok.NoContentResponse;

        @doc("Удаление cookie, только если завершена текущая сессия.")
        @header("Set-Cookie")
        @example(clearedSessionCookieExample)
        set_cookie?: string;
    }
    | BadRequestError
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails>
    | NotFoundError;
