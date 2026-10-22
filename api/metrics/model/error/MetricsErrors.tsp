import "../../../common/error/ForbiddenError.tsp";

using AlfaHackathonApi.Errors;

namespace AlfaHackathonApi.Metrics.Errors;

@doc("Метрики качества доступны только команде и экспертам.")
model QualityReviewerRequiredDetails {
    ...OmitProperties<ProblemDetails<403>, "type">;
    type: "/problems/quality-reviewer-required";
}

const qualityReviewerRequiredExample: ForbiddenError<QualityReviewerRequiredDetails> = #{
    statusCode: 403,
    contentType: "application/problem+json",
    cacheControl: "no-store",
    body: #{
        type: "/problems/quality-reviewer-required",
        title: "Нет доступа к метрикам",
        status: 403,
        detail: "Метрики качества доступны только команде и экспертам."
    }
};

const qualityReviewerRequiredOperationExample = #{ returnType: qualityReviewerRequiredExample };
