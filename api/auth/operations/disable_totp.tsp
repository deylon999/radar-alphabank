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
    parameters: #{ body: sensitiveActionRequestExample, csrf_token: csrfTokenExample },
    returnType: #{
        statusCode: 204,
        cache_control: "no-store",
        set_cookie: sessionCookieExample
    }
};

const disableTotpWithRecoveryOperationExample = #{
    parameters: #{ body: sensitiveActionWithRecoveryRequestExample, csrf_token: csrfTokenExample },
    returnType: #{
        statusCode: 204,
        cache_control: "no-store",
        set_cookie: sessionCookieExample
    }
};

@post
@route("/2fa/disable")
@summary("Отключить TOTP.")
@doc("""
    Требует текущий пароль и существующий второй фактор непосредственно в запросе.
    Недавнее общее подтверждение не заменяет эту проверку. Можно использовать резервный код.
    При успехе удаляет фактор, отменяет оставшиеся резервные коды и ожидающую настройку,
    отзывает остальные сессии и сбрасывает разрешение чувствительных действий.
    Текущий вход сохраняется, идентификатор сессии меняется. CSRF-токен получают заново.
    Для замены приложения-аутентификатора после отключения запускают новую настройку.
    """)
@returnsDoc("Двухфакторная защита отключена, текущая cookie обновлена.")
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
        set_cookie: string;
    }
    | BadRequestError
    | ValidationError<AuthValidationIssue>
    | UnauthorizedError<ProblemDetails<401> | InvalidReauthenticationDetails>
    | ForbiddenError<InvalidCsrfDetails>
    | ConflictError<TwoFactorNotEnabledDetails>
    | TooManyRequestsError;
