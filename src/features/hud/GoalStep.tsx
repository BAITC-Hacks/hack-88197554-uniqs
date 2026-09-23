"use client";

// Шаг лобби «Кем хочу стать»: цель пишется в движок (POST /api/goal), дальше профиль,
// разрывы и рекомендации пересчитываются под неё.

import { useEffect, useState } from "react";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GRADE_CHARACTER } from "@/features/city/avatar";
import type { CharacterId } from "@/features/city/models";
import type { CareerGoal, GoalOptions } from "@/features/engine/goal";
import { actions, getState, useClientStore } from "@/lib/client-store";
import { GRADES, type Recommendation } from "@/lib/types";
import { skillName } from "./data";
import { CareerExplorer } from "@/features/career/CareerExplorer";

/** «вы станете Магом» */
const AS_HERO: Record<CharacterId, string> = {
  rogue: "Разведчиком",
  knight: "Рыцарем",
  mage: "Магом",
  barbarian: "Варваром",
};

async function fetchRecommendations(employeeId: string): Promise<Recommendation[]> {
  const res = await fetch(`/api/recommend/${encodeURIComponent(employeeId)}`);
  return res.ok ? ((await res.json()) as Recommendation[]) : [];
}

const same = (a: CareerGoal, b: CareerGoal) => !!a && !!b && a.target_role === b.target_role && a.target_grade === b.target_grade;

function Option({ active, disabled, title, hint, onClick, children }: {
  active: boolean;
  disabled?: boolean;
  title: string;
  hint: string;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  const Icon = active ? CheckCircle2 : Circle;
  return (
    <div className={`rounded-lg border transition-colors ${active ? "border-primary bg-primary/5" : "hover:bg-muted/60"} ${disabled ? "opacity-50" : ""}`}>
      <button type="button" disabled={disabled} aria-pressed={active} onClick={onClick} className="flex w-full items-start gap-3 p-3 text-left disabled:cursor-not-allowed">
        <Icon className={`mt-0.5 size-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
        <span><span className="block text-sm font-medium">{title}</span><span className="block text-xs text-muted-foreground">{hint}</span></span>
      </button>
      {children}
    </div>
  );
}

export function GoalStep() {
  const profile = useClientStore((s) => s.profile);
  const employeeId = useClientStore((s) => s.employeeId);
  const [options, setOptions] = useState<(GoalOptions & { employeeId: string }) | null>(null);
  const [recs, setRecs] = useState<{ profile: unknown; list: Recommendation[] } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;
    void fetch(`/api/goal?employeeId=${encodeURIComponent(employeeId)}`)
      .then((r) => (r.ok ? (r.json() as Promise<GoalOptions>) : null))
      .then((o) => { if (live && o) setOptions({ ...o, employeeId }); });
    return () => { live = false; };
  }, [employeeId]);

  // Шаги под текущую цель: профиль меняется после каждого POST /api/goal.
  useEffect(() => {
    if (!profile) return;
    let live = true;
    void fetchRecommendations(profile.employee.employee_id).then((list) => { if (live) setRecs({ profile, list }); });
    return () => { live = false; };
  }, [profile]);

  if (!profile || profile.employee.employee_id !== employeeId) return <p className="text-sm text-muted-foreground">Загружаем профиль…</p>;

  const employee = profile.employee;
  const current = employee.career_goal;
  const original = options?.employeeId === employeeId ? options.original : null;
  const nextGrade = GRADES[GRADES.indexOf(employee.grade) + 1];
  const growGoal: CareerGoal = nextGrade ? { target_role: employee.role, target_grade: nextGrade } : null;
  const showOriginal = !!original && !same(original, growGoal);
  const mode = !current || same(current, growGoal) ? "grow" : showOriginal && same(current, original) ? "goal" : "switch";

  const pairs = (options?.employeeId === employeeId ? options.roles : []).filter(
    (p) => GRADES.indexOf(p.grade) >= GRADES.indexOf(employee.grade) && !(p.role === employee.role && p.grade === employee.grade),
  );
  const roles = [...new Set(pairs.map((p) => p.role))];
  const switchRole = mode === "switch" && current ? current.target_role : "";
  const switchGrades = pairs.filter((p) => p.role === switchRole).map((p) => p.grade);

  function pairFor(role: string, preferred: string) {
    const grades = pairs.filter((p) => p.role === role).map((p) => p.grade);
    const grade = grades.find((g) => g === preferred) ?? grades[0];
    return grade ? { target_role: role, target_grade: grade } : null;
  }

  async function apply(goal: CareerGoal) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/goal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(goal ? { employeeId, ...goal } : { employeeId, goal: null }),
      });
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error ?? `Ошибка ${res.status}`);
      await actions.refreshProfile();
      // Город и наставник видят новую цель из store; старые шаги под прошлую цель заменяем.
      const list = await fetchRecommendations(employeeId);
      if (getState().employeeId === employeeId) actions.setRecommendations(list.slice(0, 3));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось сохранить цель");
    } finally {
      setPending(false);
    }
  }

  const target = profile.target;
  const gp = profile.gradeProgress;
  const gaps = [...profile.gaps].sort((a, b) => Number(b.critical) - Number(a.critical));
  const steps = recs?.profile === profile ? recs.list.slice(0, 3) : null;
  const heroNow = GRADE_CHARACTER[employee.grade];
  const heroThen = target ? GRADE_CHARACTER[target.grade] : null;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Кем хочу стать</h2>
        <p className="mt-1 text-sm text-muted-foreground">{employee.full_name} · {employee.role} · {employee.grade}</p>
        <div className="mt-3"><CareerExplorer /></div>
      </div>
      <div className="space-y-2">
        <Option active={mode === "grow"} disabled={pending || !growGoal} title="Расти в своей роли" hint={growGoal ? `${employee.role} · ${growGoal.target_grade}` : "Вы уже на старшем грейде роли"} onClick={() => mode !== "grow" && void apply(null)} />
        {showOriginal && original && <Option active={mode === "goal"} disabled={pending} title="Моя цель из профиля" hint={`${original.target_role} · ${original.target_grade}`} onClick={() => mode !== "goal" && void apply(original)} />}
        <Option active={mode === "switch"} disabled={pending || !roles.length} title="Сменить направление" hint="Другая роль, грейд не ниже текущего" onClick={() => {
          if (mode === "switch") return;
          const role = roles.find((r) => r !== employee.role) ?? roles[0];
          if (role) void apply(pairFor(role, employee.grade));
        }}>
          {mode === "switch" && <div className="grid grid-cols-[1fr_120px] gap-2 px-3 pb-3">
            <Select value={switchRole} onValueChange={(role) => { if (typeof role === "string" && role !== switchRole) void apply(pairFor(role, current?.target_grade ?? employee.grade)); }}>
              <SelectTrigger size="sm" className="w-full bg-background" aria-label="Роль" disabled={pending}><SelectValue placeholder="Роль" /></SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>{roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent>
            </Select>
            <Select value={current?.target_grade ?? ""} onValueChange={(grade) => { if (typeof grade === "string" && grade !== current?.target_grade) void apply(pairFor(switchRole, grade)); }}>
              <SelectTrigger size="sm" className="w-full bg-background" aria-label="Грейд" disabled={pending}><SelectValue placeholder="Грейд" /></SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>{switchGrades.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
            </Select>
          </div>}
        </Option>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <div className={`space-y-4 rounded-lg bg-muted/60 p-4 transition-opacity ${pending ? "opacity-60" : ""}`}>
        <p className="text-sm font-semibold">Что вас ждёт</p>
        {target ? <>
          <div>
            <p className="text-sm font-medium">Цель: {target.role} · {target.grade}</p>
            <Progress className="mt-2" value={gp.total ? (gp.met / gp.total) * 100 : 0} />
            <p className="mt-2 text-xs text-muted-foreground">Закрыто {gp.met} из {gp.total} требований · ключевые навыки: {gp.criticalMet} из {gp.criticalTotal}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Что подтянуть</p>
            {gaps.length ? <ul className="mt-2 space-y-1.5">
              {gaps.map((g) => <li key={g.skillId} className="flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-2">{skillName(g.skillId)}{g.critical && <Badge variant="secondary">ключевой</Badge>}</span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{g.current} → {g.required}</span>
              </li>)}
            </ul> : <p className="mt-2 text-sm">Все требования закрыты, можно обсуждать повышение.</p>}
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Первые шаги</p>
            {!steps ? <p className="mt-2 text-sm text-muted-foreground">Подбираем шаги…</p>
              : steps.length ? <ol className="mt-2 space-y-2">
                {steps.map((r, i) => <li key={r.eventId} className="text-sm">
                  <span className="font-medium">{i + 1}. {r.title}</span>
                  {r.factors[0] && <span className="block text-xs text-muted-foreground">{r.factors[0].text}</span>}
                </li>)}
              </ol> : <p className="mt-2 text-sm text-muted-foreground">Подходящих активностей сейчас нет, наставник подскажет другие варианты.</p>}
          </div>
          {heroThen && <p className="flex items-center gap-2 text-sm"><Sparkles className="size-4 text-amber-500" />На {target.grade} вы {heroThen === heroNow ? "остаётесь" : "станете"} {AS_HERO[heroThen]}</p>}
        </> : <p className="text-sm text-muted-foreground">Следующего грейда в роли нет. Выберите «Сменить направление» или обсудите путь с наставником.</p>}
      </div>
    </div>
  );
}
