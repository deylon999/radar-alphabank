import "@typespec/http";

import "../model/response/TotpSetupResponse.tsp";
import "../model/error/AuthErrors.tsp";
import "../model/error/AuthValidationIssue.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Auth.Errors;

namespace AlfaHackathonApi.Auth;

const setupTotpSuccessOperationExample = #{
    parameters: #{ csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: totpSetupResponseExample
    }
};

@post
@route("/2fa/setup")
@summary("Начало настройки TOTP")
@doc("""
    Нужно подтверждение личности не старше 5 минут.
    Генерирует TOTP-секрет и URI для QR-кода. Секрет передаётся только в этом ответе по HTTPS.
    Настройка привязана к пользователю и сессии, действует 5 минут и сама 2FA не включает.
    Повторный запуск отменяет предыдущую неподтверждённую настройку этой сессии.
    Уже включённый фактор этим запросом не заменяется.
    Секрет хранится в защищённом виде. Подключение выполняется локально, без запросов к Google.
    """)
@returnsDoc("Секрет и URI для приложения-аутентификатора.")
@opExample(setupTotpSuccessOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(reauthenticationRequiredOperationExample)
@opExample(twoFactorAlreadyEnabledOperationExample)
@opExample(tooManyRequestsOperationExample)
op setupTotp(
    ...CsrfParameters
):
    AlfaHackathonApi.Ok.OkResponse<TotpSetupResponse>
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails | ReauthenticationRequiredDetails>
    | ConflictError<TwoFactorAlreadyEnabledDetails>
    | TooManyRequestsError;
