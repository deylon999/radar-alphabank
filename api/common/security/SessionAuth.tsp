import "@typespec/http";

using TypeSpec.Http;

namespace AlfaHackathonApi.Security;

@doc("Идентификатор действующей аутентифицированной сессии в cookie SESSION.")
model SessionAuth is ApiKeyAuth<ApiKeyLocation.cookie, "SESSION">;
