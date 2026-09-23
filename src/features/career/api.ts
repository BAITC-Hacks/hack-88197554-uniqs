import { getProfile } from "@/features/engine/profile";
import { AS_OF, getEvents, getRoleProfiles, getSkills } from "@/lib/store";
import { GRADES } from "@/lib/types";
import { projectRole, type CareerPreview } from "./domain";

/** Read-only simulation. Never writes career_goal or history. */
export function getCareerPreview(req: Request) {
  const employeeId = new URL(req.url).searchParams.get("employeeId") ?? "";
  const profile = getProfile(employeeId);
  if (!profile) return Response.json({ error: "Сотрудник не найден" }, { status: 404 });
  const events = getEvents();
  const skills = getSkills();
  const paths = getRoleProfiles()
    .filter(role => GRADES.indexOf(role.grade) >= GRADES.indexOf(profile.employee.grade) && !(role.role === profile.employee.role && role.grade === profile.employee.grade))
    .map(role => projectRole(profile, role, events, skills, AS_OF));
  const result: CareerPreview = { employeeId, asOf: AS_OF, paths };
  return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
}
