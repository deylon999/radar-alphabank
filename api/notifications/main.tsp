import "@typespec/http";

import "./operations/get_notification_settings.tsp";
import "./operations/update_notification_settings.tsp";
import "./operations/create_telegram_link.tsp";

using TypeSpec.Http;

@route("/notifications")
@tag("Notifications")
namespace AlfaHackathonApi.Notifications;
