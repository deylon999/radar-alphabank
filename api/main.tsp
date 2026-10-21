import "@typespec/http";
import "@typespec/openapi";
import "@typespec/openapi3";

import "./common";
import "./auth";
import "./me";
import "./companies";
import "./join-requests";
import "./members";
import "./facts";

using TypeSpec.Http;
using TypeSpec.OpenAPI;
using AlfaHackathonApi.Security;

@service(#{ title: "Alfa Hackathon API" })
@info(#{ version: "0.1.0" })
@server("/api")
@useAuth(SessionAuth)
namespace AlfaHackathonApi;
