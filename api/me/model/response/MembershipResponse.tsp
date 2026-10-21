import "../../../common/model/MembershipRole.tsp";
import "../../../common/model/Position.tsp";
import "../../../companies/model/response/CompanySummary.tsp";

using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Companies;

namespace AlfaHackathonApi.Me;

const ownerMembershipExample: MembershipResponse = #{
    company: datasetCompanySummaryExample,
    role: "owner",
    position: "ceo",
    joinedAt: utcDateTime.fromISO("2026-10-01T09:00:00Z")
};

@doc("Членство текущего пользователя в компании.")
@example(ownerMembershipExample)
model MembershipResponse {
    @doc("Компания пользователя.")
    company: CompanySummary;

    @doc("Роль доступа в компании.")
    role: MembershipRole;

    @doc("Должность для персонализации. Не передаётся, если не указана.")
    position?: Position;

    @doc("Время вступления: создания компании или одобрения заявки.")
    joinedAt: utcDateTime;
}
