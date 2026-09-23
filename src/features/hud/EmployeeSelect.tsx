"use client";

import { useRef, useState } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { Check, ChevronDown, Search } from "lucide-react";
import { setAvatar } from "@/features/city/avatar";
import { actions, useClientStore } from "@/lib/client-store";
import type { Employee } from "@/lib/types";

const label = (e: Employee) => `${e.full_name} · ${e.role} · ${e.grade}`;
const normalize = (value: string) => value.normalize("NFKC").toLocaleLowerCase().replace(/ё/g, "е").trim();

function matches(employee: Employee, query: string) {
  const searchable = normalize(`${employee.full_name} ${employee.employee_id} ${employee.role} ${employee.grade} ${employee.department}`);
  return normalize(query).split(/\s+/).every(word => searchable.includes(word));
}

export function EmployeeSelect({ expanded = false }: { expanded?: boolean }) {
  const employees = useClientStore((s) => s.employees);
  const employeeId = useClientStore((s) => s.employeeId);
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const selected = employees.find(e => e.employee_id === employeeId) ?? null;
  const count = employees.filter(e => matches(e, query)).length;

  return (
    <Combobox.Root
      items={employees}
      value={selected}
      itemToStringLabel={label}
      itemToStringValue={employee => employee.employee_id}
      isItemEqualToValue={(a, b) => a.employee_id === b.employee_id}
      filter={matches}
      inputValue={query}
      onInputValueChange={setQuery}
      onOpenChange={() => setQuery("")}
      autoHighlight
      onValueChange={(employee) => {
        if (!employee) return;
        setAvatar(null);
        actions.selectEmployee(employee.employee_id);
      }}
    >
      <Combobox.Trigger className={`flex items-center justify-between gap-2 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring ${expanded ? "h-9 w-full" : "h-7 w-60"}`} aria-label="Выбрать сотрудника">
        <span className="truncate">{selected ? label(selected) : "Сотрудник"}</span><ChevronDown className="size-4 shrink-0" />
      </Combobox.Trigger>
      <Combobox.Portal>
        <Combobox.Positioner sideOffset={4} align="start" className="z-50">
          <Combobox.Popup initialFocus={input} className="w-(--anchor-width) min-w-72 overflow-hidden rounded-lg bg-popover text-popover-foreground shadow-lg ring-1 ring-foreground/10">
            <div className="flex items-center gap-2 border-b px-3 py-2">
              <Search className="size-4 shrink-0 text-muted-foreground" />
              <Combobox.Input ref={input} aria-label="Поиск сотрудника" placeholder="Имя, ID, должность или грейд" className="h-8 w-full bg-transparent text-sm outline-none" />
            </div>
            <p aria-live="polite" className="px-3 py-2 text-xs text-muted-foreground">Найдено: {count} из {employees.length}</p>
            <Combobox.Empty className="px-3 pb-4 text-sm text-muted-foreground">Сотрудник не найден. Попробуйте другое имя или ID.</Combobox.Empty>
            <Combobox.List className="max-h-64 overflow-y-auto p-1">
              {(employee: Employee) => <Combobox.Item key={employee.employee_id} value={employee} className="relative cursor-default rounded-md py-2 pr-8 pl-2 text-sm outline-none data-highlighted:bg-accent data-highlighted:text-accent-foreground">
                <span className="block font-medium">{employee.full_name}</span>
                <span className="block text-xs text-muted-foreground">{employee.employee_id} · {employee.role} · {employee.grade}</span>
                <Combobox.ItemIndicator className="absolute right-2 top-3"><Check className="size-4" /></Combobox.ItemIndicator>
              </Combobox.Item>}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
