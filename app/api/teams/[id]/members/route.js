import { requireTeamMember, requireUser } from "@/lib/auth";
import { listTeamMembers } from "@/lib/team-queries";

export async function GET(request, { params }) {
  const { response, user } = await requireUser();
  if (response) return response;

  const { id } = await params;
  const forbidden = await requireTeamMember(id, user.id);
  if (forbidden) return forbidden;

  return Response.json({ members: await listTeamMembers(id) });
}
