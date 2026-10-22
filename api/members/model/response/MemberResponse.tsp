import "../../../common/model/Uuid.tsp";
import "../../../common/model/MembershipRole.tsp";
import "../../../common/model/Position.tsp";

using AlfaHackathonApi.Domain;

namespace AlfaHackathonApi.Members;

const ownerMemberExample: MemberResponse = #{
    userId: "b95b680c-67b7-4d2e-bbd3-3b63d4cc7d61",
    email: "ivan@example.com",
    role: "owner",
    position: "ceo",
    joinedAt: utcDateTime.fromISO("2026-10-01T09:00:00Z")
};

const memberExample: MemberResponse = #{
    userId: "c3e1f7a2-4b6d-4e8f-a0c9-5d2b7e1f3a64",
    email: "maria@example.com",
    role: "member",
    position: "cfo",
    joinedAt: utcDateTime.fromISO("2026-10-18T12:15:00Z")
};

@doc("Участник компании.")
@example(ownerMemberExample)
@example(memberExample)
model MemberResponse {
    @doc("ID пользователя.")
    userId: Uuid;

    @doc("Email пользователя.")
    @format("email")
    email: string;

    @doc("Роль доступа в компании.")
    role: MembershipRole;

    @doc("Должность для персонализации. Не передаётся, если не указана.")
    position?: Position;

    @doc("Время вступления: создания компании или одобрения заявки.")
    joinedAt: utcDateTime;
}
