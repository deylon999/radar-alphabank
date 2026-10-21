import "@typespec/http";

using TypeSpec.Http;

namespace AlfaHackathonApi.Security;

const sessionCookieValueExample = "ZmFkMWY5YmUtZGY4ZS00NGFhLWI5NmEtZjA3MzQ5ZjU1YTdh";

const sessionCookieExample =
    "SESSION=ZmFkMWY5YmUtZGY4ZS00NGFhLWI5NmEtZjA3MzQ5ZjU1YTdh; Path=/; Secure; HttpOnly; SameSite=Lax";

const clearedSessionCookieExample =
    "SESSION=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax";

@doc("Cookie анонимной сессии или незавершённого входа. Она не даёт доступ к защищённым операциям.")
model SessionCookieParameters {
    @doc("Cookie, установленная при получении CSRF-токена или начале входа.")
    @cookie("SESSION")
    @secret
    @minLength(1)
    @example(sessionCookieValueExample)
    session: string;
}
