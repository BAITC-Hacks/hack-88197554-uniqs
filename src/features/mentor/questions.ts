"use client";

import { actions, getState } from "@/lib/client-store";

const drafts = new Map<string, string>();

export function askMentor(question: string) {
  drafts.set(getState().employeeId, question);
  actions.openPanel("mentor");
}

export function mentorDraft(employeeId: string) {
  return drafts.get(employeeId) ?? "";
}

export function clearMentorDraft(employeeId: string) {
  drafts.delete(employeeId);
}
