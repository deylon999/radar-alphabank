namespace AlfaHackathonApi.Domain;

@doc("Техническая роль доступа в компании. Владелец ровно один, он управляет участниками и заявками. Участник пользуется аналитикой.")
union MembershipRole {
    "owner",
    "member",
}
