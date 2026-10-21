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
    parameters: #{ body: loginRequestExample, csrf_token: csrfTokenExample, session: sessionCookieValueExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cache_control: "no-store",
        set_cookie: sessionCookieExample,
        body: authenticatedLoginExample
    }
};

const loginMfaRequiredOperationExample = #{
    parameters: #{ body: loginRequestExample, csrf_token: csrfTokenExample, session: sessionCookieValueExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cache_control: "no-store",
        set_cookie: sessionCookieExample,
        body: mfaRequiredExample
    }
};

@post
@route("/login")
@useAuth(NoAuth)
@summary("Войти в систему.")
@doc("""
    Проверяет лимиты по предъявленному email и IP до ресурсоёмкой проверки пароля.
    Лимит применяется и к несуществующему email. Неверные email и пароль дают одинаковую ошибку.
    При выключенной 2FA завершает вход и меняет идентификатор сессии.
    При включённой 2FA сохраняет только ожидание второго фактора на 5 минут;
    пользователь ещё не считается вошедшим. Продолжение — POST /auth/login/2fa.
    Ожидающий этап привязан к cookie; user_id и company_id для продолжения не принимаются.
    Для уже вошедшего пользователя операция отклоняется с 409: сначала нужно завершить текущий вход.
    После смены cookie необходимо получить свежий CSRF-токен, в том числе перед вторым этапом.
    """)
@returnsDoc("Завершённый вход либо указание продолжить проверку второго фактора.")
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
        set_cookie: string;
    }
    | BadRequestError
    | ValidationError<AuthValidationIssue>
    | UnauthorizedError<InvalidCredentialsDetails>
    | ForbiddenError<InvalidCsrfDetails>
    | ConflictError
    | TooManyRequestsError;
