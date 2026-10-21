import "@typespec/http";

import "../model/request/VerifyTotpRequest.tsp";
import "../model/response/RecoveryCodesResponse.tsp";
import "../model/error/AuthErrors.tsp";
import "../model/error/AuthValidationIssue.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Auth.Errors;

namespace AlfaHackathonApi.Auth;

const enableTotpSuccessOperationExample = #{
    parameters: #{ body: verifyTotpRequestExample, csrf_token: csrfTokenExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cache_control: "no-store",
        set_cookie: sessionCookieExample,
        body: recoveryCodesResponseExample
    }
};

@post
@route("/2fa/enable")
@summary("Подтвердить и включить TOTP.")
@doc("""
    Проверяет первый код для действующей настройки из текущей сессии.
    Требует недавнего подтверждения личности; если оно истекло, его выполняют заново.
    Только после корректного кода включает 2FA и возвращает резервные коды.
    Принятый временной шаг отмечается использованным; секрет больше не возвращается.
    Остальные сессии отзываются, текущая cookie обновляется, подтверждение чувствительных действий сбрасывается.
    После успеха клиент получает новый CSRF-токен.
    При истёкшей настройке возвращает 409, при уже включённой 2FA — другой 409.
    """)
@returnsDoc("Однократно выдаваемый набор резервных кодов.")
@opExample(enableTotpSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(secondFactorValidationOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidSecondFactorOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(reauthenticationRequiredOperationExample)
@opExample(totpSetupExpiredOperationExample)
@opExample(twoFactorAlreadyEnabledOperationExample)
@opExample(tooManyRequestsOperationExample)
op enableTotp(
    ...CsrfParameters,
    @body body: VerifyTotpRequest
):
    {
        ...AlfaHackathonApi.Ok.OkResponse<RecoveryCodesResponse>;

        @doc("Cookie текущей сессии: Secure, HttpOnly, SameSite=Lax, Path=/, без Domain.")
        @header("Set-Cookie")
        @example(sessionCookieExample)
        set_cookie: string;
    }
    | BadRequestError
    | ValidationError<AuthValidationIssue>
    | UnauthorizedError<ProblemDetails<401> | InvalidSecondFactorDetails>
    | ForbiddenError<InvalidCsrfDetails | ReauthenticationRequiredDetails>
    | ConflictError<TotpSetupExpiredDetails | TwoFactorAlreadyEnabledDetails>
    | TooManyRequestsError;
