"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { STEPS } from "./content";
import { IntroChat } from "./IntroChat";
import { Roadmap } from "./Roadmap";

/** Интро перед лобби: роадмап продукта справа, чат-гид слева. Esc или «Пропустить» — сразу в лобби. */
export function Intro({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const go = (i: number) => setStep(Math.max(0, Math.min(STEPS.length - 1, i)));

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onDone(); return; }
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") setStep((s) => Math.min(STEPS.length - 1, s + 1));
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") setStep((s) => Math.max(0, s - 1));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onDone]);

  return (
    <section aria-label="Знакомство с продуктом" className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-slate-900/35 backdrop-blur-sm animate-in fade-in-0 duration-500">
      <Card className="relative w-[1280px] gap-0 overflow-visible bg-white py-0 shadow-2xl">
        <Button variant="ghost" size="sm" className="absolute right-4 top-4 z-10 text-slate-300 hover:bg-white/10 hover:text-white" onClick={onDone}>
          Пропустить<X />
        </Button>
        <CardContent className="grid h-[720px] grid-cols-[380px_1fr] p-0">
          <div className="min-h-0 rounded-l-xl border-r bg-white">
            <IntroChat />
          </div>
          <div className="min-h-0 rounded-r-xl bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 text-white">
            <Roadmap step={step} onStep={go} onFinish={onDone} />
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
