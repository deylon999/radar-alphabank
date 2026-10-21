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
    parameters: #{ body: changePasswordRequestExample, csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 204,
        cacheControl: "no-store",
        setCookie: sessionCookieExample
    }
};

@patch
@route("/password")
@summary("Смена пароля")
@doc("""
    Нужно подтверждение через POST /auth/reauthenticate не старше 5 минут.
    Если включена 2FA, подтверждение должно было включать второй фактор.
    Новый пароль проверяется по политике, в базе хранится только хеш Argon2id.
    Остальные сессии отзываются, у текущей меняется id, разрешение на чувствительные действия сбрасывается.
    Текущий вход сохраняется до исходного срока. После этого нужно получить новый CSRF-токен.
    """)
@returnsDoc("Пароль изменён, остальные сессии завершены.")
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
        setCookie: string;
    }
    | BadRequestError
    | ValidationError<AuthValidationIssue>
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails | ReauthenticationRequiredDetails>
    | TooManyRequestsError;
