"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, BookOpen, ChartNoAxesCombined, Check, ChevronRight, Compass, GraduationCap, Layers3, LockKeyhole, LogOut, Plus, RefreshCw, Search, ShieldCheck, Target, UsersRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GRADES } from "@/lib/types";
import { AccessPanel } from "./AccessPanel";
import { ApiError, fieldClass, hrRequest } from "./client";
import { PlanEditor, PlansPanel } from "./PlansPanel";
import { ROLE_LABELS, type Account, type EmployeeView, type HrWorkspace, type PlanView } from "./types";

export default function HrPage() {
  const [account, setAccount] = useState<Account | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { void hrRequest<{ account: Account }>("/session").then((r) => setAccount(r.account)).catch((e: Error) => { if (!(e instanceof ApiError && e.status === 401)) setError(e.message); }).finally(() => setChecking(false)); }, []);
  if (checking) return <main className="grid min-h-screen place-items-center text-sm text-slate-500">Открываем HR-панель…</main>;
  return account ? <Workspace key={account.id} account={account} onLogout={() => setAccount(null)} /> : <Login onLogin={setAccount} initialError={error} />;
}

function Login({ onLogin, initialError }: { onLogin: (account: Account) => void; initialError: string }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(initialError);
  const [busy, setBusy] = useState(false);
  return <main className="grid min-h-screen grid-cols-2 bg-slate-50 text-slate-900">
    <section className="flex flex-col justify-between bg-emerald-950 p-16 text-white"><Link href="/" className="flex items-center gap-2 text-sm text-emerald-100"><ArrowLeft className="size-4" />Вернуться в город</Link><div><div className="mb-6 flex size-16 items-center justify-center rounded-2xl bg-emerald-800"><Layers3 className="size-8 text-emerald-200" /></div><p className="text-xs font-medium uppercase tracking-[.24em] text-emerald-300">Career Quest · Halyk</p><h1 className="mt-5 text-5xl font-semibold leading-tight">Развитие команды<br />начинается с понимания.</h1><p className="mt-6 max-w-lg text-lg leading-relaxed text-emerald-100/70">Компетенции, карьерные цели и обучение в одном рабочем пространстве.</p><div className="mt-10 flex gap-8 text-sm text-emerald-100"><span className="flex items-center gap-2"><ChartNoAxesCombined className="size-4" />Обзор навыков</span><span className="flex items-center gap-2"><BookOpen className="size-4" />Планы обучения</span></div></div><p className="text-sm text-emerald-100/50">Поддержка развития без публичного рейтинга сотрудников.</p></section>
    <section className="flex items-center justify-center p-16"><form className="w-full max-w-sm space-y-5" onSubmit={async (event) => { event.preventDefault(); setBusy(true); setError(""); try { const result = await hrRequest<{ account: Account }>("/session", { login, password }); onLogin(result.account); } catch (e) { setError(e instanceof Error ? e.message : "Ошибка входа"); } finally { setBusy(false); } }}>
      <div className="mb-7"><LockKeyhole className="mb-4 size-7 text-emerald-700" /><h2 className="text-2xl font-semibold">Войти в HR-панель</h2><p className="mt-2 text-sm leading-relaxed text-slate-500">Используйте аккаунт, который создал администратор. Доступные отделы и действия зависят от ваших прав.</p></div>
      <label className="block space-y-2 text-sm font-medium"><span>Логин</span><input autoFocus required autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} className={fieldClass} /></label>
      <label className="block space-y-2 text-sm font-medium"><span>Пароль</span><input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={fieldClass} /></label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <Button className="h-11 w-full bg-emerald-800 hover:bg-emerald-900" disabled={busy} type="submit">{busy ? "Входим…" : "Открыть рабочее пространство"}<ArrowUpRight /></Button>
      <p className="text-xs leading-relaxed text-slate-400">Первый административный аккаунт создаётся при запуске панели. Реквизиты доступны владельцу локального проекта.</p>
    </form></section>
  </main>;
}

function Workspace({ account, onLogout }: { account: Account; onLogout: () => void }) {
  const [data, setData] = useState<HrWorkspace | null>(null);
  const [tab, setTab] = useState("overview");
  const [department, setDepartment] = useState("");
  const [grade, setGrade] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState("");
  const [editor, setEditor] = useState<{ employee: EmployeeView; plan?: PlanView } | null>(null);
  const reload = useCallback(async () => {
    setRefreshing(true);
    try { const params = new URLSearchParams({ department, grade, q: query }); const result = await hrRequest<HrWorkspace>(`?${params}`); setData(result); setError(""); }
    catch (e) { if (e instanceof ApiError && e.status === 401) onLogout(); else { setData(null); setError(e instanceof Error ? e.message : "Не удалось загрузить данные"); } }
    finally { setRefreshing(false); }
  }, [department, grade, query, onLogout]);
  // A request belongs to one filter set; cleanup prevents older responses replacing newer data.
  useEffect(() => {
    let stale = false;
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ department, grade, q: query });
      void hrRequest<HrWorkspace>(`?${params}`).then((result) => { if (!stale) { setData(result); setError(""); } }).catch((e: Error) => { if (!stale) { if (e instanceof ApiError && e.status === 401) onLogout(); else { setData(null); setError(e.message); } } });
    }, 180);
    return () => { stale = true; clearTimeout(timer); };
  }, [department, grade, query, onLogout]);
  const viewer = data?.account ?? account;
  const focused = data?.employees.find((e) => e.id === selected) ?? data?.employees[0];
  const activeTab = tab === "access" && !viewer.permissions.access ? "overview" : tab;
  return <main className="min-h-screen bg-[#f4f6f5] text-slate-900">
    <aside className="fixed inset-y-0 left-0 flex w-60 flex-col border-r border-slate-200 bg-white px-5 py-7">
      <Link href="/" className="flex items-center gap-3 px-2"><span className="grid size-10 place-items-center rounded-xl bg-emerald-800 text-white"><Compass className="size-5" /></span><span className="font-semibold">Career Quest<span className="block text-[11px] font-normal uppercase tracking-widest text-slate-400">People & growth</span></span></Link>
      <p className="mb-3 mt-12 px-3 text-[10px] font-semibold uppercase tracking-[.2em] text-slate-400">Рабочее пространство</p>
      <nav aria-label="Разделы HR" className="space-y-2">{[{ id: "overview", name: "Обзор компетенций", icon: ChartNoAxesCombined }, { id: "plans", name: "Планы обучения", icon: GraduationCap }, ...(viewer.permissions.access ? [{ id: "access", name: "Доступ и роли", icon: ShieldCheck }] : [])].map(({ id, name, icon: Icon }) => <button key={id} type="button" onClick={() => setTab(id)} aria-current={activeTab === id ? "page" : undefined} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition-colors ${activeTab === id ? "bg-emerald-50 font-medium text-emerald-800" : "text-slate-500 hover:bg-slate-50"}`}><Icon className="size-4" />{name}</button>)}</nav>
      <div className="mt-auto space-y-5"><div className="rounded-xl bg-slate-50 p-4"><p className="text-sm font-medium">{viewer.name}</p><p className="mt-1 text-xs text-slate-500">{ROLE_LABELS[viewer.role]}</p><p className="mt-3 text-xs leading-relaxed text-slate-400">{viewer.role === "admin" ? "Доступ ко всем отделам" : viewer.role === "employee" ? "Только ваши данные" : `Доступно отделов: ${viewer.departments.length}`}</p></div><Link href="/" className="flex items-center gap-2 px-3 text-sm text-slate-500"><ArrowLeft className="size-4" />В город</Link><button type="button" onClick={async () => { await hrRequest("/session", {}, "DELETE"); onLogout(); }} className="flex items-center gap-2 px-3 text-sm text-slate-500"><LogOut className="size-4" />Выйти</button></div>
    </aside>
    <div className="ml-60 px-8 py-7">
      <header className="mb-7 flex items-center justify-between"><div><div className="flex items-center gap-2 text-xs text-slate-400">Halyk Bank<ChevronRight className="size-3" />Развитие команды</div><h1 className="mt-2 text-3xl font-semibold tracking-tight">{activeTab === "overview" ? "Обзор компетенций" : activeTab === "plans" ? "Планы обучения" : "Доступ и роли"}</h1><p className="mt-2 text-sm text-slate-500">{activeTab === "overview" ? "От текущих навыков — к понятному следующему шагу." : activeTab === "plans" ? "Обучение, связанное с целями сотрудников." : "Настройте, кто видит данные и управляет обучением."}</p></div><div className="flex items-center gap-3"><span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500">Срез · 01.10.2026</span><Button variant="outline" disabled={refreshing} onClick={() => void reload()}><RefreshCw className={refreshing ? "animate-spin" : ""} />Обновить</Button></div></header>
      {activeTab !== "access" && <div className="mb-6 flex items-center gap-3"><label className="relative flex-1"><Search className="absolute left-3 top-3 size-4 text-slate-400" /><input aria-label="Поиск сотрудника" value={query} onChange={(e) => setQuery(e.target.value)} className={`${fieldClass} pl-10`} placeholder="Поиск по имени, роли или ID" /></label><select aria-label="Отдел" className={`${fieldClass} !w-56`} value={department} onChange={(e) => setDepartment(e.target.value)}><option value="">Все доступные отделы</option>{(data?.departments ?? viewer.departments).map((d) => <option key={d}>{d}</option>)}</select><select aria-label="Грейд" className={`${fieldClass} !w-36`} value={grade} onChange={(e) => setGrade(e.target.value)}><option value="">Все грейды</option>{GRADES.map((g) => <option key={g}>{g}</option>)}</select>{(department || grade || query) && <Button variant="ghost" onClick={() => { setDepartment(""); setGrade(""); setQuery(""); }}>Сбросить</Button>}</div>}
      {error && <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {data && activeTab === "overview" && <>
        {data.overview && <><div className="mb-6 grid grid-cols-4 gap-4">{[{ title: "Сотрудников в срезе", value: data.overview.employees, icon: UsersRound, note: "В пределах ваших прав" }, { title: "Есть зоны развития", value: data.overview.withGaps, icon: Target, note: "Разрыв до карьерной цели" }, { title: "Нужен план обучения", value: data.overview.withoutPlan, icon: BookOpen, note: "Есть разрыв, ещё нет плана" }, { title: "Планов опубликовано", value: data.overview.activePlans, icon: Check, note: "Доступны сотрудникам" }].map(({ title, value, icon: Icon, note }) => <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="flex justify-between text-sm text-slate-500">{title}<Icon className="size-4 text-emerald-600" /></div><p className="mt-4 text-3xl font-semibold tabular-nums">{value}</p><p className="mt-2 text-xs text-slate-400">{note}</p></div>)}</div>
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6"><div className="mb-5 flex items-center justify-between"><div><h2 className="font-semibold">Приоритеты развития команды</h2><p className="mt-1 text-xs text-slate-500">Сравнение с требованиями карьерной цели. В расчёте только сотрудники, которым нужен этот навык.</p></div><Badge variant="outline">Шкала 0–5</Badge></div><div className="grid grid-cols-3 gap-4">{data.overview.skills.slice(0, 6).map((skill) => <div key={skill.id} className="rounded-xl bg-slate-50 p-4"><div className="flex justify-between gap-3"><p className="text-sm font-medium">{skill.name}</p><span className="text-sm tabular-nums text-emerald-700">{skill.average.toFixed(1)}<span className="text-slate-400"> / {skill.requiredAverage.toFixed(1)}</span></span></div><div className="relative my-3 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${skill.average / 5 * 100}%` }} /><span className="absolute -top-1 h-4 border-l-2 border-slate-600" style={{ left: `${skill.requiredAverage / 5 * 100}%` }} /></div><p className="text-xs text-slate-500">Ниже цели: {skill.below} из {skill.assessed}{skill.criticalBelow > 0 && <span className="text-amber-700"> · ключевой для {skill.criticalBelow}</span>}</p></div>)}</div><p className="mt-4 text-xs text-slate-400">Зелёный — средний уровень, отметка — среднее требование цели. Учитываются завершённые активности после ревью.</p></section></>}
        {(viewer.permissions.profiles || viewer.role === "employee") && <div className="grid grid-cols-[minmax(0,1fr)_370px] items-start gap-5"><section className="overflow-hidden rounded-2xl border border-slate-200 bg-white"><div className="border-b border-slate-100 p-5"><h2 className="font-semibold">{viewer.role === "employee" ? "Мой профиль" : "Компетенции сотрудников"}</h2><p className="mt-1 text-xs text-slate-500">Выберите сотрудника, чтобы рассмотреть навыки и план развития.</p></div><div className="max-h-[560px] overflow-auto"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-400"><tr><th className="p-4 font-medium">Сотрудник</th><th className="p-4 font-medium">Цель</th><th className="p-4 font-medium">Требования</th><th className="p-4 font-medium">План</th></tr></thead><tbody>{data.employees.map((employee) => <tr key={employee.id} className={`border-t border-slate-100 ${focused?.id === employee.id ? "bg-emerald-50/60" : "hover:bg-slate-50"}`}><td className="p-4"><button type="button" onClick={() => setSelected(employee.id)} className="text-left"><span className="block font-medium">{employee.name}</span><span className="mt-1 block text-xs text-slate-400">{employee.role} · {employee.grade}</span></button></td><td className="p-4 text-xs text-slate-500">{employee.target ? <>{employee.target.role}<span className="mt-1 block text-slate-400">{employee.target.grade}</span></> : "Не задана"}</td><td className="p-4"><span className="text-sm tabular-nums">{employee.total ? `${employee.met} / ${employee.total}` : "—"}</span><span className="mt-1 block text-[11px] text-slate-400">{employee.gaps.filter((g) => g.critical).length} ключевых разрывов</span></td><td className="p-4"><Badge variant={employee.planCount ? "secondary" : "outline"}>{employee.planCount || "Нет"}</Badge></td></tr>)}</tbody></table></div></section>{focused && <EmployeeCard employee={focused} data={data} onPlan={() => setEditor({ employee: focused })} />}</div>}
        {!viewer.permissions.overview && !viewer.permissions.profiles && viewer.role !== "employee" && <p className="rounded-xl bg-white p-6 text-sm text-slate-500">Для обзора компетенций администратор должен предоставить соответствующее разрешение.</p>}
      </>}
      {data && activeTab === "plans" && <PlansPanel data={data} onReload={reload} onEdit={(plan) => { const employee = data.employees.find((e) => e.id === plan.employeeId); if (employee) setEditor({ employee, plan }); }} onCreate={() => { if (focused) setEditor({ employee: focused }); else setTab("overview"); }} />}
      {data && activeTab === "access" && <AccessPanel data={data} onSaved={reload} />}
    </div>
    {editor && data && <PlanEditor key={editor.plan?.id ?? editor.employee.id} employee={editor.employee} plan={editor.plan} data={data} onClose={() => setEditor(null)} onSaved={async () => { setEditor(null); setTab("plans"); await reload(); }} />}
  </main>;
}

function EmployeeCard({ employee, data, onPlan }: { employee: EmployeeView; data: HrWorkspace; onPlan: () => void }) {
  const entries = Object.entries(employee.requirements);
  return <aside className="rounded-2xl border border-slate-200 bg-white p-5"><div className="mb-4 flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800">{employee.name.split(" ").slice(0, 2).map((n) => n[0]).join("")}</span><div><h3 className="font-semibold">{employee.name}</h3><p className="mt-1 text-xs text-slate-400">{employee.department}</p></div></div><p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">{employee.target ? <>Цель: <strong className="font-medium">{employee.target.role} · {employee.target.grade}</strong></> : "Карьерная цель пока не задана"}</p><div className="my-5 space-y-4">{entries.map(([id, required]) => { const current = employee.skills[id] ?? 0; const gap = employee.gaps.find((g) => g.skillId === id); return <div key={id}><div className="mb-2 flex justify-between gap-3 text-xs"><span className={gap?.critical ? "font-medium text-amber-800" : "text-slate-600"}>{data.skills.find((s) => s.id === id)?.name ?? id}{gap?.critical ? " *" : ""}</span><span className="whitespace-nowrap tabular-nums text-slate-500">{current} / {required}</span></div><div className="flex gap-1">{[1, 2, 3, 4, 5].map((level) => <span key={level} className={`h-2 flex-1 rounded-sm ${level <= current ? "bg-emerald-500" : level <= required ? "bg-amber-200" : "bg-slate-100"}`} />)}</div></div>; })}</div><p className="mb-5 text-[11px] leading-relaxed text-slate-400">* Ключевой навык для цели. Зелёный — текущий уровень, жёлтый — оставшийся разрыв.</p>{data.account.permissions.plans && <Button className="w-full bg-emerald-800 hover:bg-emerald-900" onClick={onPlan}><Plus />Создать план обучения</Button>}</aside>;
}
