import "@typespec/http";

import "./operations/csrf.tsp";
import "./operations/register.tsp";
import "./operations/login.tsp";
import "./operations/verify_login.tsp";
import "./operations/logout.tsp";
import "./operations/get_sessions.tsp";
import "./operations/revoke_session.tsp";
import "./operations/revoke_others.tsp";
import "./operations/reauthenticate.tsp";
import "./operations/change_password.tsp";
import "./operations/setup_totp.tsp";
import "./operations/enable_totp.tsp";
import "./operations/disable_totp.tsp";
import "./operations/regenerate_recovery_codes.tsp";

using TypeSpec.Http;

@route("/auth")
@tag("Auth")
namespace AlfaHackathonApi.Auth;
