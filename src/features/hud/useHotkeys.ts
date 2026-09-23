"use client";

import { useEffect } from "react";
import { actions, getState } from "@/lib/client-store";
import type { PanelId } from "@/lib/types";

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

function togglePanel(panel: PanelId) {
  const open = getState().openPanel;
  if (open?.panel === panel && !open.placeId) actions.closePanel();
  else actions.openPanel(panel);
}

/** E/Enter — войти, Esc — закрыть, C — персонаж, J — квесты. WASD обрабатывает город.
 *  По e.code, чтобы работало и в русской раскладке. */
export function useHotkeys(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || isTyping(e.target)) return;
      const onControl = e.target instanceof HTMLElement && !!e.target.closest("button, a, [role=option], [role=combobox]");
      switch (e.code) {
        case "Enter":
        case "NumpadEnter":
          if (onControl) return; // Enter на кнопке нажимает кнопку
        // fallthrough
        case "KeyE": {
          const near = getState().nearPlaceId;
          if (near) actions.openPlace(near);
          break;
        }
        case "Escape":
          actions.closePanel();
          break;
        case "KeyC":
          togglePanel("character");
          break;
        case "KeyJ":
          togglePanel("quests");
          break;
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
