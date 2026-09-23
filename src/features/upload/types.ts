import type { Employee, UploadResult } from "@/lib/types";

export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export interface ImportResult extends UploadResult {
  addedEmployees: number;
  updatedEmployees: number;
  skippedHistory: number;
  renamedHistory: number;
  affectedEmployees: Pick<Employee, "employee_id" | "full_name" | "role" | "grade">[];
}

export class ImportError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
