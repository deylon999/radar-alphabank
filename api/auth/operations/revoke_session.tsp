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
@summary("Завершить выбранную сессию.")
@doc("""
    Завершает сессию, принадлежащую текущему пользователю, по публичному ID.
    Чужая, отсутствующая или истёкшая сессия возвращает одинаковый 404.
    При завершении текущей сессии также удаляет её cookie.
    На другом устройстве cookie может остаться, но больше не подтверждает вход.
    Уже выполняющийся запрос на отзываемой сессии автоматически не прерывается.
    """)
@returnsDoc("Выбранная сессия завершена.")
@opExample(revokeOtherSessionOperationExample)
@opExample(revokeCurrentSessionOperationExample)
@opExample(badRequestOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(notFoundOperationExample)
op revokeSession(
    @doc("Публичный ID из GET /auth/sessions, а не значение cookie.")
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
