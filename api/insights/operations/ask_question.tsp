import "@typespec/http";

import "../model/request/AskQuestionRequest.tsp";
import "../model/response/AskStream.tsp";
import "../model/error/InsightErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Insights.Errors;

namespace AlfaHackathonApi.Insights;

const askQuestionSuccessOperationExample = #{
    parameters: #{ insightId: "9b1f3c5e-7a2d-4e6f-8b0c-1d3e5f7a9b2c", accept: "text/event-stream", body: askQuestionRequestExample, csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 200,
        contentType: "text/event-stream",
        cacheControl: "no-store",
        body: askStreamExample
    }
};

const askQuestionStreamErrorOperationExample = #{
    parameters: #{ insightId: "9b1f3c5e-7a2d-4e6f-8b0c-1d3e5f7a9b2c", accept: "text/event-stream", body: askQuestionRequestExample, csrfToken: csrfTokenExample },
    returnType: #{
        statusCode: 200,
        contentType: "text/event-stream",
        cacheControl: "no-store",
        body: askStreamErrorExample
    }
};

@post
@route("/insights/{insightId}/ask")
@summary("Вопрос по выводу")
@doc("""
    Доступно любому участнику компании, к которой относится вывод. Ответ приходит потоком Server-Sent Events: сначала шаги агента по мере выполнения,
    затем ответ или ошибка. Шаги настоящие, без внутренних промптов; придумывать их нельзя.
    Каждый вопрос обрабатывается отдельно, без истории предыдущих вопросов. Ответ учитывает должность: role из запроса, а без него — должность из членства.
    Вопрос не по теме вывода — обычный ответ с объяснением, что сервис отвечает только о выводе.
    Права, тело и лимиты проверяются до начала потока, их ошибки приходят обычным Problem Details.
    После начала потока статус уже 200, и сбой приходит событием error.
    Подготовка ответа ограничена 60 секундами. Если клиент закрывает соединение, сервер прекращает подготовку ответа.
    Повторный вопрос готовится заново. Вопрос сохраняется для метрик качества. Число вопросов и расход модели ограничены: 429.
    """)
@returnsDoc("Поток шагов и ответа.")
@opExample(askQuestionSuccessOperationExample)
@opExample(askQuestionStreamErrorOperationExample)
@opExample(badRequestOperationExample)
@opExample(askValidationOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(invalidCsrfOperationExample)
@opExample(insightNotFoundOperationExample)
@opExample(tooManyRequestsOperationExample)
op askQuestion(
    @doc("ID вывода.")
    @path insightId: Uuid,

    @doc("Должен включать text/event-stream, например «text/event-stream, application/json»; иначе возвращается 406.")
    @header("Accept")
    accept: string,

    ...CsrfParameters,
    @body body: AskQuestionRequest
):
    AskStreamResponse
    | BadRequestError
    | ValidationError<AskValidationIssue>
    | UnauthorizedError
    | ForbiddenError<InvalidCsrfDetails>
    | NotFoundError<InsightNotFoundDetails>
    | ProblemResponse<406>
    | TooManyRequestsError;
