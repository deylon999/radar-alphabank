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
    parameters: #{ csrf_token: csrfTokenExample },
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cache_control: "no-store",
        body: totpSetupResponseExample
    }
};

@post
@route("/2fa/setup")
@summary("Начать настройку TOTP.")
@doc("""
    Требует повторного подтверждения личности не более 5 минут назад.
    Генерирует секрет TOTP и URI для QR-кода. Секрет передаётся только в ответе настройки по HTTPS.
    Ожидающая настройка привязана к текущему пользователю и сессии, действует 5 минут и не включает 2FA.
    Повторный запуск отменяет предыдущую неподтверждённую настройку этой сессии.
    Уже включённый фактор не заменяется этим запросом.
    Секрет хранится защищённо; подключение выполняется локально, без запроса к Google.
    """)
@returnsDoc("Секрет и URI для добавления в приложение-аутентификатор.")
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
