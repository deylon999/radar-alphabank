import "@typespec/http";

using TypeSpec.Http;

namespace AlfaHackathonApi.Security;

@doc("""
    Токен бота в заголовке Authorization: Bearer <токен>. У каждого бота свой токен из окружения,
    по нему сервер определяет мессенджер. Пользовательская сессия здесь не используется.
    """)
model BotAuth is BearerAuth;
