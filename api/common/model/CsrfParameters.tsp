import "@typespec/http";

using TypeSpec.Http;

namespace AlfaHackathonApi.Security;

const csrfTokenExample = "8cc5dfe6-47f8-48e8-a1a0-c4b8c6b279f1";

@doc("CSRF-токен для изменяющего запроса.")
model CsrfParameters {
    @doc("Токен, полученный через GET /auth/csrf для этой сессии.")
    @header("X-CSRF-TOKEN")
    @minLength(1)
    @example(csrfTokenExample)
    csrfToken: string;
}
