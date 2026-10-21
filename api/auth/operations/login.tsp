import "@typespec/http";

import "../model/request/LoginRequest.tsp";
import "../model/response/LoginResponse.tsp";
import "../model/error/AuthErrors.tsp";
import "../model/error/AuthValidationIssue.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Auth.Errors;

namespace AlfaHackathonApi.Auth;

const loginSuccessOperationExample = #{
    parameters: #{ body: loginRequestExample, csrfToken: csrfTokenExample, session: sessionCookieValueExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        setCookie: sessionCookieExample,
        body: authenticatedLoginExample
    }
};

const loginMfaRequiredOperationExample = #{
    parameters: #{ body: loginRequestExample, csrfToken: csrfTokenExample, session: sessionCookieValueExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        setCookie: sessionCookieExample,
        body: mfaRequiredExample
    }
};

@post
@route("/login")
@useAuth(NoAuth)
@summary("Вход")
@doc("""
    Сначала проверяются лимиты по email и IP, потом пароль: его проверка ресурсоёмкая.
    Лимит действует и для несуществующего email. Для неверного email и неверного пароля ошибка одинаковая.
    Без 2FA вход завершается сразу, id сессии меняется.
    С 2FA сохраняется только ожидание второго фактора на 5 минут,
    пользователь ещё не считается вошедшим. Следующий шаг — POST /auth/login/2fa.
    Ожидание привязано к cookie, userId и companyId для продолжения не принимаются.
    Если пользователь уже вошёл, возвращается 409: сначала нужно выйти.
    Cookie меняется, поэтому дальше нужен новый CSRF-токен, в том числе перед вторым шагом.
    """)
@returnsDoc("Завершённый вход или требование ввести второй фактор.")
@opExample(loginSuccessOperationExample)
@opExample(loginMfaRequiredOperationExample)
@opExample(badRequestOperationExample)
@opExample(credentialsValidationOperationExample)
@opExample(invalidCredentialsOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(conflictOperationExample)
@opExample(tooManyRequestsOperationExample)
op login(
    ...SessionCookieParameters,
    ...CsrfParameters,
    @body body: LoginRequest
):
    {
        ...AlfaHackathonApi.Ok.OkResponse<LoginResponse>;

        @doc("Cookie текущей сессии: Secure, HttpOnly, SameSite=Lax, Path=/, без Domain.")
        @header("Set-Cookie")
        @example(sessionCookieExample)
        setCookie: string;
    }
    | BadRequestError
    | ValidationError<AuthValidationIssue>
    | UnauthorizedError<InvalidCredentialsDetails>
    | ForbiddenError<InvalidCsrfDetails>
    | ConflictError
    | TooManyRequestsError;
