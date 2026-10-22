import "@typespec/http";

import "../model/request/FeedbackRequest.tsp";
import "../model/error/InsightErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Insights.Errors;

namespace AlfaHackathonApi.Insights;

const saveFeedbackSuccessOperationExample = #{
    parameters: #{ insightId: "9b1f3c5e-7a2d-4e6f-8b0c-1d3e5f7a9b2c", body: commentedFeedbackRequestExample, csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 204,
        cacheControl: "no-store"
    }
};

@post
@route("/insights/{insightId}/feedback")
@summary("Оценка вывода")
@doc("""
    Доступно любому участнику компании, к которой относится вывод. У каждого пользователя одна оценка вывода, и каждый запрос заменяет её целиком:
    «Полезно», а затем комментарий — это одна оценка, а не две. Если comment не передан, прежний комментарий удаляется.
    Повтор того же запроса ничего не меняет. Оценка и комментарий учитываются в метриках качества.
    """)
@returnsDoc("Оценка сохранена.")
@opExample(saveFeedbackSuccessOperationExample)
@opExample(badRequestOperationExample)
@opExample(feedbackValidationOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(insightNotFoundOperationExample)
op saveFeedback(
    @doc("ID вывода.")
    @path insightId: Uuid,

    ...CsrfParameters,
    @body body: FeedbackRequest
):
    AlfaHackathonApi.Ok.NoContentResponse
    | BadRequestError
    | ValidationError<FeedbackValidationIssue>
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails>
    | NotFoundError<InsightNotFoundDetails>;
