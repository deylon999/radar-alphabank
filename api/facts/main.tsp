import "@typespec/http";

import "./operations/describe_company.tsp";
import "./operations/upload_documents.tsp";
import "./operations/get_extraction.tsp";
import "./operations/update_fact.tsp";

using TypeSpec.Http;

@route("/companies/{companyId}")
@tag("Company profile")
namespace AlfaHackathonApi.Facts;
