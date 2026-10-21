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
    parameters: #{ body: totpVerificationExample, csrfToken: csrfTokenExample, session: sessionCookieValueExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        setCookie: sessionCookieExample,
        body: #{ ...authenticatedLoginExample, user: #{ ...authenticatedUserExample, twoFactorEnabled: true } }
    }
};

const verifyLoginRecoveryOperationExample = #{
    parameters: #{ body: recoveryVerificationExample, csrfToken: csrfTokenExample, session: sessionCookieValueExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        setCookie: sessionCookieExample,
        body: #{ ...authenticatedLoginExample, user: #{ ...authenticatedUserExample, twoFactorEnabled: true } }
    }
};

@post
@route("/login/2fa")
@useAuth(NoAuth)
@summary("Второй шаг входа с 2FA")
@doc("""
    Проверяет TOTP или резервный код для незавершённого входа из cookie.
    Если код верный, он отмечается использованным, вход завершается, id сессии меняется.
    8 часов предельного срока считаются с этого момента, а не с проверки пароля.
    Истёкшее ожидание продлить нельзя, нужно заново ввести email и пароль.
    Новое ожидание не сбрасывает ограничения на перебор второго фактора.
    После успеха нужно получить новый CSRF-токен.
    """)
@returnsDoc("Вошедший пользователь и session cookie.")
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
        setCookie: string;
    }
    | BadRequestError
    | ValidationError<AuthValidationIssue>
    | UnauthorizedError<PendingLoginRequiredDetails | InvalidSecondFactorDetails>
    | ForbiddenError<InvalidCsrfDetails>
    | TooManyRequestsError;
