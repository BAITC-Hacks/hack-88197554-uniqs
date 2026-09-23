"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { skillName } from "@/features/hud/data";
import type { HrSummary } from "@/lib/types";

const EMPTY = <p className="text-muted-foreground">данные появятся в фиче hr</p>;

export default function HrPage() {
  const [data, setData] = useState<HrSummary | null>(null);

  useEffect(() => {
    void fetch("/api/hr")
      .then((r) => (r.ok ? (r.json() as Promise<HrSummary>) : null))
      .then(setData);
  }, []);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-8">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">HR-обзор</h1>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← в город
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4 text-sm">
        <Card>
          <CardHeader>
            <CardTitle>Проседающие навыки</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data?.weakSkills.length
              ? data.weakSkills.map((w) => (
                  <div key={`${w.department}:${w.skillId}`} className="flex justify-between gap-2">
                    <span>
                      {w.department} · {skillName(w.skillId)}
                    </span>
                    <span className="tabular-nums">{Math.round(w.shareBelow * 100)}%</span>
                  </div>
                ))
              : EMPTY}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Нет следующего шага</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data?.noStep.length
              ? data.noStep.map((n) => (
                  <div key={n.employeeId} className="flex justify-between gap-2">
                    <span className="font-mono">{n.employeeId}</span>
                    <span className="text-muted-foreground">{n.reason}</span>
                  </div>
                ))
              : EMPTY}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Участие</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {data?.participation.length
              ? data.participation.map((p) => (
                  <div key={p.eventId} className="flex justify-between gap-2">
                    <span className="font-mono">{p.eventId}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {p.completed} пройдено · {p.no_show} не пришли · {p.declined} отказ · {p.dropped} брошено
                    </span>
                  </div>
                ))
              : EMPTY}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
