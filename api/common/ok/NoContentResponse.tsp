import "@typespec/http";

using TypeSpec.Http;

namespace AlfaHackathonApi.Ok;

@doc("Запрос успешно выполнен, ответ без тела.")
model NoContentResponse {
    @statusCode
    statusCode: 204;

    @header("Cache-Control")
    cacheControl: "no-store";
}
