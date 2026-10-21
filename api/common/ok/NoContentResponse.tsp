import "@typespec/http";

using TypeSpec.Http;

namespace AlfaHackathonApi.Ok;

@doc("Запрос успешно выполнен, ответ без тела.")
model NoContentResponse {
    @statusCode
    statusCode: 204;

    @header("Cache-Control")
    cache_control: "no-store";
}
