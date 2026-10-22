import "@typespec/http";

import "./operations/submit_join_request.tsp";
import "./operations/get_join_requests.tsp";
import "./operations/approve_join_request.tsp";
import "./operations/reject_join_request.tsp";
import "./operations/cancel_join_request.tsp";

using TypeSpec.Http;

@route("/companies/{companyId}/join-requests")
@tag("Join requests")
namespace AlfaHackathonApi.JoinRequests;
