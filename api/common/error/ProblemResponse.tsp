import "@typespec/http";
import "./ProblemDetails.tsp";

using TypeSpec.Http;

namespace AlfaHackathonApi.Errors;

@error
model ProblemResponse<Status extends int32, TBody = ProblemDetails<Status>> {
    @statusCode
    statusCode: Status;

    @header("Content-Type")
    contentType: "application/problem+json";

    @header("Cache-Control")
    cacheControl: "no-store";

    @body
    body: TBody;
}
