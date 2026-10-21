import "../../../common/model/Uuid.tsp";

using AlfaHackathonApi.Domain;

namespace AlfaHackathonApi.Auth;

const currentSessionExample: SessionResponse = #{
    id: "23d90edf-885d-4ea4-8878-15b5965f962d",
    browser: "Chrome",
    os: "Linux",
    authenticated_at: utcDateTime.fromISO("2026-10-18T10:00:00Z"),
    last_accessed_at: utcDateTime.fromISO("2026-10-18T10:30:00Z"),
    current: true
};

const otherSessionExample: SessionResponse = #{
    id: "1bb885f8-4646-4332-a7f1-fc418d21cc8e",
    browser: "Safari",
    os: "iOS",
    authenticated_at: utcDateTime.fromISO("2026-10-18T09:00:00Z"),
    last_accessed_at: utcDateTime.fromISO("2026-10-18T10:20:00Z"),
    current: false
};

@doc("Действующая сессия текущего пользователя.")
@example(currentSessionExample)
model SessionResponse {
    @doc("Публичный ID для управления сессией. Не совпадает с секретным значением session cookie.")
    id: Uuid;

    @doc("Предполагаемый браузер по User-Agent; null, если определить не удалось. Не доказательство устройства.")
    browser: string | null;

    @doc("Предполагаемая ОС по User-Agent; null, если определить не удалось.")
    os: string | null;

    @doc("Время завершения входа.")
    authenticated_at: utcDateTime;

    @doc("Последнее обращение, использующее сессию.")
    last_accessed_at: utcDateTime;

    @doc("Текущая ли это сессия. Определяется сервером по запросу.")
    current: boolean;
}
