"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { actions, useClientStore } from "@/lib/client-store";
import type { Employee } from "@/lib/types";

const label = (e: Employee) => `${e.full_name} · ${e.role} · ${e.grade}`;

export function EmployeeSelect() {
  const employees = useClientStore((s) => s.employees);
  const employeeId = useClientStore((s) => s.employeeId);

  return (
    <Select
      value={employeeId}
      onValueChange={(id) => {
        if (id) actions.selectEmployee(id);
      }}
    >
      <SelectTrigger size="sm" className="w-60 bg-background">
        <SelectValue placeholder="Сотрудник">
          {(id: string) => {
            const e = employees.find((x) => x.employee_id === id);
            return e ? label(e) : id;
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-96">
        {employees.map((e) => (
          <SelectItem key={e.employee_id} value={e.employee_id}>
            {label(e)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
