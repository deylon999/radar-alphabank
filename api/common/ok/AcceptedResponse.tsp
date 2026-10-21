import "@typespec/http";

using TypeSpec.Http;

namespace AlfaHackathonApi.Ok;

@doc("Запрос принят, обработка продолжается в фоне. Состояние доступно по адресу из Location.")
model AcceptedResponse<TBody> {
    @statusCode
    statusCode: 202;

    @header("Content-Type")
    contentType: "application/json";

    @header("Cache-Control")
    cacheControl: "no-store";

    @doc("Адрес, по которому клиент узнаёт состояние обработки.")
    @header("Location")
    location: string;

    @body
    body: TBody;
}
