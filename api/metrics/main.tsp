import "@typespec/http";

import "./operations/get_quality_metrics.tsp";

using TypeSpec.Http;

@route("/metrics")
@tag("Metrics")
namespace AlfaHackathonApi.Metrics;
