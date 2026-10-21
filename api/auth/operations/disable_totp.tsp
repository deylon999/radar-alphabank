import "@typespec/http";

import "../model/request/SensitiveActionRequest.tsp";
import "../model/error/AuthErrors.tsp";
import "../model/error/AuthValidationIssue.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Auth.Errors;

namespace AlfaHackathonApi.Auth;

const disableTotpSuccessOperationExample = #{
    parameters: #{ body: sensitiveActionRequestExample, csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 204,
        cacheControl: "no-store",
        setCookie: sessionCookieExample
    }
};

const disableTotpWithRecoveryOperationExample = #{
    parameters: #{ body: sensitiveActionWithRecoveryRequestExample, csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 204,
        cacheControl: "no-store",
        setCookie: sessionCookieExample
    }
};

@post
@route("/2fa/disable")
@summary("Отключение TOTP")
@doc("""
    Нужны текущий пароль и второй фактор прямо в запросе.
    Недавнее подтверждение через reauthenticate здесь не учитывается. Вместо TOTP можно передать резервный код.
    При успехе удаляет фактор, отменяет оставшиеся резервные коды и незавершённую настройку,
    отзывает остальные сессии и сбрасывает разрешение на чувствительные действия.
    Текущий вход сохраняется, но id сессии меняется, поэтому CSRF-токен нужно получить заново.
    Чтобы сменить приложение-аутентификатор, 2FA сначала отключают, а затем настраивают заново.
    """)
@returnsDoc("2FA отключена, cookie текущей сессии обновлена.")
@opExample(disableTotpSuccessOperationExample)
@opExample(disableTotpWithRecoveryOperationExample)
@opExample(badRequestOperationExample)
@opExample(reauthenticationValidationOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidReauthenticationOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(twoFactorNotEnabledOperationExample)
@opExample(tooManyRequestsOperationExample)
op disableTotp(
    ...CsrfParameters,
    @body body: SensitiveActionRequest
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
    | UnauthorizedError<ProblemDetails<401> | InvalidReauthenticationDetails>
    | ForbiddenError<InvalidCsrfDetails>
    | ConflictError<TwoFactorNotEnabledDetails>
    | TooManyRequestsError;
