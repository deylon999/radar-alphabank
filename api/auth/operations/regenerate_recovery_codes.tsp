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
    parameters: #{ body: sensitiveActionRequestExample, csrf_token: csrfTokenExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cache_control: "no-store",
        body: recoveryCodesResponseExample
    }
};

@post
@route("/2fa/recovery-codes")
@summary("Перевыпустить резервные коды.")
@doc("""
    Требует включённую 2FA, текущий пароль и существующий второй фактор непосредственно в запросе.
    Можно подтвердить операцию одним из ещё не использованных резервных кодов.
    В одной операции отменяет весь предыдущий набор и создаёт новый.
    Каждый код используется один раз. На сервере сохраняются только хеши.
    Значения выдаются только в этом ответе; повторное чтение набора не предусмотрено.
    Сбрасывает временное разрешение чувствительных действий.
    """)
@returnsDoc("Новый набор одноразовых резервных кодов.")
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
