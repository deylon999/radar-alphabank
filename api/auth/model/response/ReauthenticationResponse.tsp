namespace AlfaHackathonApi.Auth;

const reauthenticationResponseExample: ReauthenticationResponse = #{
    confirmedAt: utcDateTime.fromISO("2026-10-18T10:30:00Z"),
    validUntil: utcDateTime.fromISO("2026-10-18T10:35:00Z")
};

@doc("Временное подтверждение личности для чувствительных действий в текущей сессии.")
@example(reauthenticationResponseExample)
model ReauthenticationResponse {
    @doc("Время успешной проверки личности.")
    confirmedAt: utcDateTime;

    @doc("Окончание подтверждения: через 5 минут, но не позже окончания сессии. Обычные действия срок не продлевают.")
    validUntil: utcDateTime;
}
