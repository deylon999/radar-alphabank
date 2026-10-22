import "../../../common/model/Position.tsp";

using AlfaHackathonApi.Domain;

namespace AlfaHackathonApi.JoinRequests;

const submitJoinRequestExample: SubmitJoinRequest = #{
    position: "cfo",
    message: "Финансовый директор, работаю в компании с 2024 года."
};

@doc("Заявка на вступление. Заявителя и компанию определяет сервер по сессии и пути.")
@example(submitJoinRequestExample)
model SubmitJoinRequest {
    @doc("Должность заявителя. После одобрения становится должностью участника. Не передаётся, если не указана.")
    position?: Position;

    @doc("Сообщение владельцу, чтобы он узнал заявителя. Не передаётся, если его нет.")
    @minLength(1)
    @maxLength(500)
    message?: string;
}
