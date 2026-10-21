import "@typespec/http";

import "./operations/get_members.tsp";
import "./operations/transfer_ownership.tsp";
import "./operations/remove_member.tsp";

using TypeSpec.Http;

@route("/companies/{companyId}/members")
@tag("Members")
namespace AlfaHackathonApi.Members;
