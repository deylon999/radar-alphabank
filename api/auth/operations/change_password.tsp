import "@typespec/http";

import "../model/request/ChangePasswordRequest.tsp";
import "../model/error/AuthErrors.tsp";
import "../model/error/AuthValidationIssue.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Auth.Errors;

namespace AlfaHackathonApi.Auth;

const changePasswordSuccessOperationExample = #{
    parameters: #{ body: changePasswordRequestExample, csrf_token: csrfTokenExample },
    returnType: #{
        statusCode: 204,
        cache_control: "no-store",
        set_cookie: sessionCookieExample
    }
};

@patch
@route("/password")
@summary("Изменить пароль.")
@doc("""
    Требует подтверждения через POST /auth/reauthenticate не более 5 минут назад.
    При включённой 2FA это подтверждение должно включать второй фактор.
    Проверяет политику нового пароля и сохраняет только его хеш Argon2id.
    Отзывает остальные сессии, меняет идентификатор текущей и сбрасывает разрешение чувствительных действий.
    Текущий вход сохраняется в пределах исходного срока. CSRF-токен нужно получить заново.
    """)
@returnsDoc("Пароль изменён, остальные входы завершены.")
@opExample(changePasswordSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(passwordValidationOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(reauthenticationRequiredOperationExample)
@opExample(tooManyRequestsOperationExample)
op changePassword(
    ...CsrfParameters,
    @body body: ChangePasswordRequest
):
    {
        ...AlfaHackathonApi.Ok.NoContentResponse;

        @doc("Обновлённая cookie текущей сессии.")
        @header("Set-Cookie")
        @example(sessionCookieExample)
        set_cookie: string;
    }
    | BadRequestError
    | ValidationError<AuthValidationIssue>
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails | ReauthenticationRequiredDetails>
    | TooManyRequestsError;
