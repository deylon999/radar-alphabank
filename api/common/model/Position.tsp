namespace AlfaHackathonApi.Domain;

@doc("""
    Должность пользователя в компании для персонализации аналитики. Права доступа не даёт.
    Значение owner означает собственника бизнеса и не связано с ролью владельца в «Радаре».
    """)
union Position {
    "owner",
    "ceo",
    "cfo",
    "accountant",
    "treasurer",
    "other",
}
