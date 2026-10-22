import "@typespec/http";

import "./operations/confirm_link.tsp";
import "./operations/unlink_chat.tsp";
import "./operations/get_chat_status.tsp";
import "./operations/get_deliveries.tsp";
import "./operations/ack_delivery.tsp";

using TypeSpec.Http;
using AlfaHackathonApi.Security;

@doc("""
    Внутренний API ботов Telegram и MAX. Доступ только по токену бота; сессия и CSRF здесь не используются.
    Пути /api/internal извне закрываются на уровне прокси. Мессенджер определяется по токену,
    поэтому бот видит только свои привязки и доставки. chatId — 64-битное целое ID чата в мессенджере.
    """)
@route("/internal/bot")
@tag("Bots (internal)")
@useAuth(BotAuth)
namespace AlfaHackathonApi.Bots;
