import "@typespec/http";

import "../model/response/QualityMetricsResponse.tsp";
import "../model/error/MetricsErrors.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;
using AlfaHackathonApi.Metrics.Errors;

namespace AlfaHackathonApi.Metrics;

const getQualityMetricsSuccessOperationExample = #{
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: qualityMetricsResponseExample
    }
};

@get
@route("/quality")
@summary("Метрики качества выводов")
@doc("""
    Доступно только пользователям с правом просмотра метрик: команде и экспертам. Право задаётся начальными данными,
    через API его не выдать; клиент узнаёт о нём из canViewQualityMetrics в GET /me. Остальные получают 403.
    Право не связано с членством в компании и не даёт доступа к выводам и профилям компаний.
    Считается по всем компаниям. Тексты вопросов и комментариев передаются без автора и компании.
    Личные статусы разных пользователей не суммируются: счётчики выводов считают выводы, а не пары «пользователь — вывод».
    """)
@returnsDoc("Метрики на момент запроса.")
@opExample(getQualityMetricsSuccessOperationExample)
@opExample(unauthorizedOperationExample)
@opExample(qualityReviewerRequiredOperationExample)
op getQualityMetrics(

):
    AlfaHackathonApi.Ok.OkResponse<QualityMetricsResponse>
    | UnauthorizedError
    | ForbiddenError<QualityReviewerRequiredDetails>;
