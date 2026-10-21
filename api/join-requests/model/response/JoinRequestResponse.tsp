import "../../../common/model/Uuid.tsp";
import "../../../common/model/Position.tsp";
import "../../../companies/model/response/CompanySummary.tsp";

using AlfaHackathonApi.Domain;
using AlfaHackathonApi.Companies;

namespace AlfaHackathonApi.JoinRequests;

const pendingJoinRequestExample: JoinRequestResponse = #{
    id: "6a1d4e2f-8b3c-4f5a-9d7e-0c2b1a3f4e5d",
    company: datasetCompanySummaryExample,
    applicant: #{ id: "c3e1f7a2-4b6d-4e8f-a0c9-5d2b7e1f3a64", email: "maria@example.com" },
    status: "pending",
    position: "cfo",
    message: "Финансовый директор, работаю в компании с 2024 года.",
    createdAt: utcDateTime.fromISO("2026-10-18T11:00:00Z")
};

const approvedJoinRequestExample: JoinRequestResponse = #{
    ...pendingJoinRequestExample,
    status: "approved",
    decidedAt: utcDateTime.fromISO("2026-10-18T12:15:00Z")
};

const rejectedJoinRequestExample: JoinRequestResponse = #{
    ...pendingJoinRequestExample,
    status: "rejected",
    decidedAt: utcDateTime.fromISO("2026-10-18T12:15:00Z")
};

const cancelledJoinRequestExample: JoinRequestResponse = #{
    ...pendingJoinRequestExample,
    status: "cancelled",
    decidedAt: utcDateTime.fromISO("2026-10-18T11:30:00Z")
};

@doc("""
    Состояние заявки. Меняется только операциями approve, reject и cancel.
    pending — ждёт решения владельца; approved — одобрена, заявитель стал участником;
    rejected — отклонена владельцем; cancelled — отменена заявителем. Решённую заявку изменить нельзя.
    """)
union JoinRequestStatus {
    "pending",
    "approved",
    "rejected",
    "cancelled",
}

@doc("Пользователь, подавший заявку. Подавая заявку, он показывает свой email владельцу компании.")
model JoinRequestApplicant {
    @doc("ID пользователя.")
    id: Uuid;

    @doc("Email пользователя.")
    @format("email")
    email: string;
}

@doc("Заявка пользователя на вступление в компанию.")
@example(pendingJoinRequestExample)
@example(approvedJoinRequestExample)
model JoinRequestResponse {
    @doc("ID заявки.")
    id: Uuid;

    @doc("Компания, в которую подана заявка.")
    company: CompanySummary;

    @doc("Заявитель.")
    applicant: JoinRequestApplicant;

    @doc("Состояние заявки.")
    status: JoinRequestStatus;

    @doc("Должность, указанная заявителем. Не передаётся, если не указана.")
    position?: Position;

    @doc("Сообщение заявителя владельцу. Не передаётся, если его нет.")
    message?: string;

    @doc("Время подачи.")
    createdAt: utcDateTime;

    @doc("Время одобрения, отклонения или отмены. Не передаётся, пока заявка ждёт решения.")
    decidedAt?: utcDateTime;
}
