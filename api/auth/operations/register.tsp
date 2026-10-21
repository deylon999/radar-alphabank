import "@typespec/http";

import "../model/request/RegisterRequest.tsp";
import "../model/response/RegisterResponse.tsp";
import "../model/error/AuthErrors.tsp";
import "../model/error/AuthValidationIssue.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Auth.Errors;

namespace AlfaHackathonApi.Auth;

const registerSuccessOperationExample = #{
    parameters: #{ body: registerRequestExample, csrf_token: csrfTokenExample, session: sessionCookieValueExample },
    returnType: #{
        statusCode: 201,
        contentType: "application/json",
        cache_control: "no-store",
        body: registerResponseExample
    }
};

@post
@route("/register")
@useAuth(NoAuth)
@summary("Регистрация")
@doc("""
    Создаёт пользователя с уникальным email и его компанию в одной транзакции.
    id компании от клиента не принимается. Профиль компании здесь не заполняется.
    Пароль хранится как хеш Argon2id, ни пароль, ни хеш в ответ не попадают.
    Регистрация не выполняет вход. Число попыток ограничено.
    """)
@returnsDoc("id созданного пользователя и его компании.")
@opExample(registerSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(credentialsValidationOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(emailAlreadyExistsOperationExample)
@opExample(tooManyRequestsOperationExample)
op register(
    ...SessionCookieParameters,
    ...CsrfParameters,
    @body body: RegisterRequest
):
    AlfaHackathonApi.Ok.CreatedResponse<RegisterResponse>
    | BadRequestError
    | ValidationError<AuthValidationIssue>
    | ForbiddenError<InvalidCsrfDetails>
    | ConflictError<EmailAlreadyExistsDetails>
    | TooManyRequestsError;
