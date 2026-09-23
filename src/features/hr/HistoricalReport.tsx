import type { HrWorkspace } from "./types";

/** Keep the main branch's reporting features inside the permission-scoped workspace. */
export function HistoricalReport({ data }: { data: HrWorkspace }) {
  if (!data.report) return null;
  const { summary, weakSkillRows } = data.report;
  const employees = new Map(data.employees.map(employee => [employee.id, employee]));
  const events = new Map(data.events.map(event => [event.event_id, event]));
  const names = new Map(data.skills.map(skill => [skill.id, skill.name]));
  return <details className="my-6 rounded-2xl border border-slate-200 bg-white p-6">
    <summary className="cursor-pointer font-semibold">Подробный HR-отчёт · навыки и участие в обучении</summary>
    <div className="mt-6 grid grid-cols-2 items-start gap-6">
      <section><h2 className="font-semibold">Проседающие навыки по отделам</h2>
        <p className="my-2 text-xs text-slate-500">Доля среди сотрудников отдела, которым этот навык нужен для карьерной цели.</p>
        <div className="max-h-80 overflow-y-auto"><table className="w-full text-left text-sm">
          <thead><tr><th className="py-2">Отдел / навык</th><th className="text-right">С дефицитом</th></tr></thead>
          <tbody>{weakSkillRows.map(row => <tr key={`${row.department}:${row.skillId}`} className="border-t border-slate-100">
            <td className="py-2 pr-3"><span className="block text-xs text-slate-500">{row.department}</span>{names.get(row.skillId) ?? row.skillId}</td>
            <td className="text-right tabular-nums">{Math.round(row.shareBelow * 100)}%<span className="block text-xs text-slate-500">{row.below} из {row.required}</span></td>
          </tr>)}</tbody>
        </table></div>
      </section>
      {data.account.permissions.profiles && <section><h2 className="font-semibold">Без следующего шага · {summary.noStep.length}</h2>
        <p className="my-2 text-xs text-slate-500">Сотрудники без доступной рекомендации, по имени.</p>
        <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto">{[...summary.noStep].sort((a, b) => (employees.get(a.employeeId)?.name ?? a.employeeId).localeCompare(employees.get(b.employeeId)?.name ?? b.employeeId)).map(item => <li key={item.employeeId} className="py-3 text-sm">
          <p className="font-medium">{employees.get(item.employeeId)?.name ?? item.employeeId}</p><p className="mt-1 text-xs text-slate-500">{item.reason}</p>
        </li>)}</ul>
      </section>}
    </div>
    <section className="mt-6"><h2 className="font-semibold">Участие в мероприятиях</h2>
      <p className="my-2 text-xs text-slate-500">Записи истории в выбранном срезе, включая обязательное обучение и повторные участия.</p>
      <div className="max-h-80 overflow-y-auto"><table className="w-full text-sm">
        <thead><tr className="text-right"><th className="py-2 text-left">Мероприятие</th><th>Завершено</th><th>Не пришли</th><th>Отказались</th><th>Бросили</th></tr></thead>
        <tbody>{summary.participation.map(item => <tr key={item.eventId} className="border-t border-slate-100 text-right tabular-nums">
          <td className="py-2 pr-3 text-left">{events.get(item.eventId)?.title ?? item.eventId}</td><td>{item.completed}</td><td>{item.no_show}</td><td>{item.declined}</td><td>{item.dropped}</td>
        </tr>)}</tbody>
      </table></div>
    </section>
  </details>;
}
