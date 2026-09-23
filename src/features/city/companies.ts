import type { Department } from "@/lib/types";

/** какая компания «снимает» башню отдела: вывеска над входом, подсказка входа, заголовок панели */
export const DEPARTMENT_COMPANY: Record<Department, string> = {
  "Data & Analytics": "OpenAI",
  "Backend Development": "Freedom",
  "Frontend Development": "Kolesa Group",
  "Quality Assurance": "EPAM",
  "Product Management": "Astana Hub",
  "Human Resources": "Halyk Bank",
  Sales: "Chocofamily",
  "Customer Support": "inDrive",
};
