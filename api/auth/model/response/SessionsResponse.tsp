import "./SessionResponse.tsp";

namespace AlfaHackathonApi.Auth;

const sessionsResponseExample: SessionsResponse = #{
    sessions: #[currentSessionExample, otherSessionExample]
};

@doc("Действующие входы пользователя. Чужие, анонимные и незавершённые входы не включаются.")
@example(sessionsResponseExample)
model SessionsResponse {
    @doc("Сессии, не истёкшие ни по бездействию, ни по предельному сроку.")
    sessions: SessionResponse[];
}
