import "@typespec/http";

import "./operations/get_me.tsp";
import "./operations/update_membership.tsp";

using TypeSpec.Http;

@route("/me")
@tag("Me")
namespace AlfaHackathonApi.Me;
