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
@summary("Включение TOTP")
@doc("""
    Проверяет первый код для настройки, начатой в текущей сессии.
    Нужно недавнее подтверждение личности. Если оно истекло, его проходят заново.
    2FA включается и резервные коды выдаются только после правильного кода.
    Временной шаг принятого кода отмечается использованным, секрет больше не возвращается.
    Остальные сессии отзываются, cookie текущей обновляется, подтверждение чувствительных действий сбрасывается.
    После этого нужно получить новый CSRF-токен.
    Если настройка истекла, возвращается 409. Если 2FA уже включена, тоже 409, но с другим типом.
    """)
@returnsDoc("Резервные коды. Выдаются один раз.")
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
