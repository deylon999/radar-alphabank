import "@typespec/http";

import "../model/request/SecondFactorVerification.tsp";
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

const verifyLoginTotpOperationExample = #{
    parameters: #{ body: totpVerificationExample, csrf_token: csrfTokenExample, session: sessionCookieValueExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cache_control: "no-store",
        set_cookie: sessionCookieExample,
        body: #{ ...authenticatedLoginExample, user: #{ ...authenticatedUserExample, two_factor_enabled: true } }
    }
};

const verifyLoginRecoveryOperationExample = #{
    parameters: #{ body: recoveryVerificationExample, csrf_token: csrfTokenExample, session: sessionCookieValueExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cache_control: "no-store",
        set_cookie: sessionCookieExample,
        body: #{ ...authenticatedLoginExample, user: #{ ...authenticatedUserExample, two_factor_enabled: true } }
    }
};

@post
@route("/login/2fa")
@useAuth(NoAuth)
@summary("Завершить вход со вторым фактором.")
@doc("""
    Проверяет TOTP или одноразовый резервный код для незавершённого входа из cookie.
    После успешной проверки погашает использованный код, завершает вход и меняет идентификатор сессии.
    Восемь часов предельного срока считаются от этого момента, а не от проверки пароля.
    Истёкший этап ожидания нельзя продлить запросами: нужно заново ввести email и пароль.
    Создание нового этапа ожидания не обнуляет ограничения перебора второго фактора.
    При успехе клиент заново получает CSRF-токен.
    """)
@returnsDoc("Аутентифицированный пользователь и session cookie.")
@opExample(verifyLoginTotpOperationExample)
@opExample(verifyLoginRecoveryOperationExample)
@opExample(badRequestOperationExample)
@opExample(secondFactorValidationOperationExample)
@opExample(pendingLoginRequiredOperationExample)
@opExample(invalidSecondFactorOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(tooManyRequestsOperationExample)
op verifyLoginSecondFactor(
    ...SessionCookieParameters,
    ...CsrfParameters,
    @body body: SecondFactorVerification
):
    {
        ...AlfaHackathonApi.Ok.OkResponse<AuthenticatedLoginResponse>;

        @doc("Cookie текущей сессии: Secure, HttpOnly, SameSite=Lax, Path=/, без Domain.")
        @header("Set-Cookie")
        @example(sessionCookieExample)
        set_cookie: string;
    }
    | BadRequestError
    | ValidationError<AuthValidationIssue>
    | UnauthorizedError<PendingLoginRequiredDetails | InvalidSecondFactorDetails>
    | ForbiddenError<InvalidCsrfDetails>
    | TooManyRequestsError;
