import "@typespec/http";

import "./operations/get_insights.tsp";
import "./operations/get_digest.tsp";
import "./operations/get_overview.tsp";
import "./operations/get_insight.tsp";
import "./operations/update_insight_status.tsp";
import "./operations/save_feedback.tsp";
import "./operations/ask_question.tsp";

using TypeSpec.Http;

@route("/companies/{companyId}")
@tag("Insights")
namespace AlfaHackathonApi.Insights;
