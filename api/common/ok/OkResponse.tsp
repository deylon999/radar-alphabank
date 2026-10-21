import "@typespec/http";

using TypeSpec.Http;

namespace AlfaHackathonApi.Ok;

@doc("Запрос успешно выполнен.")
model OkResponse<TBody> {
    @statusCode
    statusCode: 200;

    @header("Content-Type")
    contentType: "application/json";

    @header("Cache-Control")
    cacheControl: "no-store";

    @body
    body: TBody;
}
