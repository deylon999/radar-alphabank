import "@typespec/http";

import "../model/response/MeResponse.tsp";

import "../../common";

using TypeSpec.Http;
using AlfaHackathonApi.Security;
using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Errors;

namespace AlfaHackathonApi.Me;

const getMeMemberOperationExample = #{
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: memberMeExample
    }
};

const getMePendingOperationExample = #{
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: pendingMeExample
    }
};

const getMeWithoutCompanyOperationExample = #{
    returnType: #{
        statusCode: 200,
        contentType: "application/json",
        cacheControl: "no-store",
        body: withoutCompanyMeExample
    }
};

@get
@summary("Текущий пользователь")
@doc("""
    Возвращает пользователя текущей сессии, его членство в компании и заявку, требующую внимания.
    Клиент вызывает его после входа и при открытии приложения, чтобы выбрать экран:
    аналитика компании, ожидание решения по заявке или выбор между созданием компании и подачей заявки.
    Членство читается при каждом запросе, поэтому одобрение, исключение и смена роли видны без повторного входа.
    """)
@returnsDoc("Пользователь, членство и заявка.")
@opExample(getMeMemberOperationExample)
@opExample(getMePendingOperationExample)
@opExample(getMeWithoutCompanyOperationExample)
@opExample(unauthorizedOperationExample)
op getMe(

):
    AlfaHackathonApi.Ok.OkResponse<MeResponse>
    | UnauthorizedError;
