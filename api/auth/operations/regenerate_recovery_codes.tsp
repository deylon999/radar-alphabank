import "@typespec/http";

import "../model/request/SensitiveActionRequest.tsp";
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

const regenerateRecoveryCodesSuccessOperationExample = #{
    parameters: #{ body: sensitiveActionRequestExample, csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: recoveryCodesResponseExample
    }
};

@post
@route("/2fa/recovery-codes")
@summary("Перевыпуск резервных кодов")
@doc("""
    Доступно только при включённой 2FA. В запросе нужны текущий пароль и второй фактор.
    Вместо TOTP можно передать любой ещё не использованный резервный код.
    Старый набор отменяется и создаётся новый в одной операции.
    Каждый код одноразовый, на сервере хранятся только хеши.
    Коды возвращаются только в этом ответе, повторно получить их нельзя.
    Разрешение на чувствительные действия сбрасывается.
    """)
@returnsDoc("Новый набор резервных кодов.")
@opExample(regenerateRecoveryCodesSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(reauthenticationValidationOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidReauthenticationOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(twoFactorNotEnabledOperationExample)
@opExample(tooManyRequestsOperationExample)
op regenerateRecoveryCodes(
    ...CsrfParameters,
    @body body: SensitiveActionRequest
):
    AlfaHackathonApi.Ok.OkResponse<RecoveryCodesResponse>
    | BadRequestError
    | ValidationError<AuthValidationIssue>
    | UnauthorizedError<ProblemDetails<401> | InvalidReauthenticationDetails>
    | ForbiddenError<InvalidCsrfDetails>
    | ConflictError<TwoFactorNotEnabledDetails>
    | TooManyRequestsError;
