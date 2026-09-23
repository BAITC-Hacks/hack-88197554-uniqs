import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getEmployees, getEvents, getSkills } from "@/lib/store";
import { getHrReport } from "./summary";

const number = new Intl.NumberFormat("ru-RU");
const percent = new Intl.NumberFormat("ru-RU", { style: "percent", maximumFractionDigits: 1 });

export default function HrPage() {
  const { summary, weakSkillRows } = getHrReport();
  const employees = getEmployees();
  const employeeById = new Map(employees.map((employee) => [employee.employee_id, employee]));
  const eventById = new Map(getEvents().map((event) => [event.event_id, event]));
  const skillNames = new Map(getSkills().map((skill) => [skill.skill_id, skill.name]));
  const participation = summary.participation;
  const total = participation.reduce(
    (sum, item) => sum + item.completed + item.no_show + item.declined + item.dropped,
    0,
  );
  const completed = participation.reduce((sum, item) => sum + item.completed, 0);

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-8">
      <div className="flex items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">HR-обзор развития</h1>
          <p className="text-sm text-muted-foreground">Дефициты относительно карьерных целей · на 1 октября 2026</p>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-4" /> В город
          </Link>
          <form action="/hr">
            <Button type="submit" variant="outline"><RefreshCw /> Обновить данные</Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardDescription>Сотрудников в обзоре</CardDescription></CardHeader>
          <CardContent className="text-3xl font-semibold tabular-nums">{number.format(employees.length)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardDescription>Без рекомендации следующего шага</CardDescription></CardHeader>
          <CardContent className="text-3xl font-semibold tabular-nums">{number.format(summary.noStep.length)}</CardContent>
        </Card>
        <Card>
          <CardHeader><CardDescription>Завершений в истории</CardDescription></CardHeader>
          <CardContent className="text-3xl font-semibold tabular-nums">
            {number.format(completed)} <span className="text-base font-normal text-muted-foreground">из {number.format(total)} исходов</span>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-[1.35fr_1fr] items-start gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Проседающие навыки по отделам</CardTitle>
            <CardDescription>
              Доля = сотрудники с дефицитом / сотрудники отдела, которым этот навык нужен для цели.
              Цель — выбранная роль и грейд или следующий грейд своей роли. Уровни учитывают завершённое обучение после ревью.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
                  <tr><th scope="col" className="pb-3 pr-4 font-medium">Отдел / навык</th><th scope="col" className="pb-3 text-right font-medium">С дефицитом</th></tr>
                </thead>
                <tbody>
                  {weakSkillRows.map((row, index) => (
                    <tr key={`${row.department}:${row.skillId}`} className="border-t align-top">
                      <td className="py-3 pr-4">
                        {(index === 0 || weakSkillRows[index - 1].department !== row.department) && (
                          <div className="mb-1 text-xs text-muted-foreground">{row.department}</div>
                        )}
                        {skillNames.get(row.skillId) ?? row.skillId}
                      </td>
                      <td className="w-36 py-3 text-right tabular-nums">
                        <div className="font-medium">{percent.format(row.shareBelow)}</div>
                        <div className="text-xs text-muted-foreground">{row.below} из {row.required} чел.</div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                          <div className="h-full rounded-full bg-primary" style={{ width: `${row.shareBelow * 100}%` }} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Без следующего шага · {summary.noStep.length}</CardTitle>
            <CardDescription>Причина проверена по цели, навыкам и каталогу. Список по имени, без рейтинга сотрудников.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-[480px] divide-y overflow-y-auto">
              {[...summary.noStep]
                .sort((a, b) => (employeeById.get(a.employeeId)?.full_name ?? a.employeeId).localeCompare(employeeById.get(b.employeeId)?.full_name ?? b.employeeId))
                .map((item) => {
                  const employee = employeeById.get(item.employeeId);
                  return (
                    <div key={item.employeeId} className="space-y-1 py-3 first:pt-0">
                      <div className="font-medium">{employee?.full_name ?? item.employeeId}</div>
                      <div className="text-xs text-muted-foreground">{employee?.department} · {employee?.grade} · {item.employeeId}</div>
                      <p className="text-sm">{item.reason}</p>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Участие в мероприятиях</CardTitle>
          <CardDescription>
            Число записей истории по каждому исходу, включая обязательное обучение. Повторные участия считаются отдельно.
            «В процессе» и «Просрочено» не входят в эти четыре исхода.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="pb-3 text-left font-medium">Мероприятие</th>
                  <th scope="col" className="px-3 pb-3 text-right font-medium">Завершено</th>
                  <th scope="col" className="px-3 pb-3 text-right font-medium">Не пришли</th>
                  <th scope="col" className="px-3 pb-3 text-right font-medium">Отказались</th>
                  <th scope="col" className="pl-3 pb-3 text-right font-medium">Бросили</th>
                </tr>
              </thead>
              <tbody>
                {participation.map((item) => (
                  <tr key={item.eventId} className="border-t">
                    <td className="py-3 pr-4 text-left">
                      {eventById.get(item.eventId)?.title ?? item.eventId}
                      {eventById.get(item.eventId)?.mandatory && <span className="ml-2 text-xs text-muted-foreground">Обязательное</span>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{number.format(item.completed)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{number.format(item.no_show)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{number.format(item.declined)}</td>
                    <td className="py-3 pl-3 text-right tabular-nums">{number.format(item.dropped)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
