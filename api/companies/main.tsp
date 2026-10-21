import "@typespec/http";

import "./operations/search_companies.tsp";
import "./operations/create_company.tsp";
import "./operations/get_company.tsp";

using TypeSpec.Http;

@route("/companies")
@tag("Companies")
namespace AlfaHackathonApi.Companies;
