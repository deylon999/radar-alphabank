import "@typespec/http";

import "./operations/get_me.tsp";

using TypeSpec.Http;

@route("/me")
@tag("Me")
namespace AlfaHackathonApi.Me;
