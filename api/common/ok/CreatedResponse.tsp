import "@typespec/http";

using TypeSpec.Http;

namespace AlfaHackathonApi.Ok;

@doc("Ресурс успешно создан.")
model CreatedResponse<TBody> {
    @statusCode
    statusCode: 201;

    @header("Content-Type")
    contentType: "application/json";

    @header("Cache-Control")
    cacheControl: "no-store";

    @body
    body: TBody;
}
