"use client";

import { useState } from "react";
import { LockKeyhole, Plus, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fieldClass, hrRequest } from "./client";
import { PERMISSION_LABELS, ROLE_LABELS, ROLE_PERMISSIONS, type Account, type HrRole, type HrWorkspace } from "./types";

export function AccessPanel({ data, onSaved }: { data: HrWorkspace; onSaved: () => Promise<void> }) {
  const [editing, setEditing] = useState<Account | null | undefined>(undefined);
  return <div className="grid grid-cols-[1fr_390px] gap-6">
    <section className="rounded-2xl border border-slate-200 bg-white p-6">
      <div className="mb-5 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Права и зоны ответственности</h2><p className="mt-1 text-sm text-slate-500">Доступ к отделам и действиям настраивается для каждого аккаунта.</p></div><Button onClick={() => setEditing(null)}><Plus />Добавить</Button></div>
      <div className="space-y-2">{data.accounts?.map((a) => <button type="button" key={a.id} onClick={() => setEditing(a)} className={`flex w-full items-start gap-4 rounded-xl border p-4 text-left hover:border-emerald-400 ${editing?.id === a.id ? "border-emerald-500 bg-emerald-50/50" : "border-slate-100"}`}>
        <div className="rounded-lg bg-slate-100 p-2"><ShieldCheck className="size-5 text-slate-600" /></div>
        <div className="min-w-0 flex-1"><p className="font-medium">{a.name} <span className="font-normal text-slate-400">@{a.login}</span></p><p className="mt-1 text-xs text-slate-500">{a.role === "admin" ? "Все отделы" : a.role === "employee" ? `Только свой профиль · ${a.employeeId}` : a.departments.join(" · ")}</p><p className="mt-2 text-xs text-slate-500">{Object.entries(a.permissions).filter(([, allowed]) => allowed).map(([p]) => PERMISSION_LABELS[p as keyof typeof PERMISSION_LABELS]).join(" · ") || "Личный план обучения"}</p></div>
        <div className="space-y-1 text-right"><Badge variant="secondary">{ROLE_LABELS[a.role]}</Badge>{!a.enabled && <p className="text-xs text-red-600">Отключён</p>}</div>
      </button>)}</div>
    </section>
    {editing !== undefined ? <AccountForm key={editing?.id ?? "new"} account={editing} data={data} onSaved={async () => { await onSaved(); setEditing(undefined); }} onCancel={() => setEditing(undefined)} /> : <aside className="h-fit rounded-2xl bg-emerald-950 p-6 text-emerald-50"><LockKeyhole className="mb-4 size-7 text-emerald-300" /><h3 className="font-semibold">Каждому — своя область доступа</h3><div className="mt-4 space-y-4 text-sm text-emerald-100/80"><p><strong className="text-white">Администратор</strong><br />Управляет аккаунтами, отделами и всеми планами.</p><p><strong className="text-white">HR и руководитель</strong><br />Работают с назначенными отделами. Просмотр карточек и редактирование планов можно отключить.</p><p><strong className="text-white">Сотрудник</strong><br />Видит свой профиль и опубликованные планы. Может принять план или выбрать «Не сейчас».</p></div></aside>}
  </div>;
}

function AccountForm({ account, data, onSaved, onCancel }: { account: Account | null; data: HrWorkspace; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [name, setName] = useState(account?.name ?? "");
  const [login, setLogin] = useState(account?.login ?? "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<HrRole>(account?.role ?? "manager");
  const [employeeId, setEmployeeId] = useState(account?.employeeId ?? "");
  const [departments, setDepartments] = useState(account?.departments ?? []);
  const [permissions, setPermissions] = useState(account?.permissions ?? { ...ROLE_PERMISSIONS.manager });
  const [enabled, setEnabled] = useState(account?.enabled ?? true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const allDepartments = [...new Set(data.directory.map((e) => e.department))].sort();
  return <form className="h-fit space-y-4 rounded-2xl border border-slate-200 bg-white p-6" onSubmit={async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try { await hrRequest("/access", { id: account?.id, name, login, password, role, employeeId, departments, permissions, enabled }); await onSaved(); }
    catch (e) { setError(e instanceof Error ? e.message : "Не удалось сохранить"); } finally { setBusy(false); }
  }}>
    <h3 className="font-semibold">{account ? "Настроить доступ" : "Новый аккаунт"}</h3>
    <label className="block space-y-1 text-sm"><span>Имя</span><input required value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} maxLength={200} /></label>
    <div className="grid grid-cols-2 gap-3"><label className="space-y-1 text-sm"><span>Логин</span><input required minLength={3} value={login} onChange={(e) => setLogin(e.target.value)} className={fieldClass} autoComplete="off" /></label><label className="space-y-1 text-sm"><span>Роль</span><select className={fieldClass} value={role} onChange={(e) => { const value = e.target.value as HrRole; setRole(value); setPermissions({ ...ROLE_PERMISSIONS[value] }); }}>{Object.entries(ROLE_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>
    <label className="block space-y-1 text-sm"><span>{account ? "Новый пароль (необязательно)" : "Пароль"}</span><input type="password" autoComplete="new-password" required={!account} minLength={10} maxLength={256} value={password} onChange={(e) => setPassword(e.target.value)} className={fieldClass} placeholder="Не менее 10 символов" /></label>
    {role === "employee" && <label className="block space-y-1 text-sm"><span>Профиль сотрудника</span><select required className={fieldClass} value={employeeId} onChange={(e) => { setEmployeeId(e.target.value); if (!name) setName(data.directory.find((x) => x.id === e.target.value)?.name ?? ""); }}><option value="">Выберите сотрудника</option>{data.directory.map((e) => <option key={e.id} value={e.id}>{e.name} · {e.id}</option>)}</select></label>}
    {(role === "hr" || role === "manager") && <><fieldset className="space-y-2 rounded-xl bg-slate-50 p-3"><legend className="px-1 text-sm font-medium">Доступные отделы</legend>{allDepartments.map((d) => <label key={d} className="flex items-center gap-2 text-xs"><input type="checkbox" className="accent-emerald-700" checked={departments.includes(d)} onChange={(e) => setDepartments(e.target.checked ? [...departments, d] : departments.filter((x) => x !== d))} />{d}</label>)}</fieldset><fieldset className="space-y-2"><legend className="mb-2 text-sm font-medium">Разрешённые действия</legend>{(["overview", "profiles", "plans"] as const).map((p) => <label key={p} className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-emerald-700" checked={permissions[p]} onChange={(e) => setPermissions({ ...permissions, [p]: e.target.checked })} />{PERMISSION_LABELS[p]}</label>)}</fieldset></>}
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="accent-emerald-700" />Аккаунт активен</label>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="flex gap-2"><Button type="submit" disabled={busy}><Save />Сохранить</Button><Button type="button" variant="ghost" onClick={onCancel}>Отмена</Button></div>
    {account?.id === data.account.id && <p className="text-xs text-slate-500">При смене своего пароля потребуется войти заново.</p>}
  </form>;
}
