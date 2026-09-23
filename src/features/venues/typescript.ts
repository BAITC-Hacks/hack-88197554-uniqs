// TypeScript/JavaScript runner for practice tasks (server only).
// Types are stripped by Node itself; code runs in an empty vm context with a timeout.
// Only JSON strings cross the boundary, so no host objects leak into the sandbox or back out.
import * as nodeModule from "node:module";
import vm from "node:vm";

type Strip = (code: string, options?: { mode?: "strip" | "transform" }) => string;
const strip = (nodeModule as unknown as { stripTypeScriptTypes?: Strip }).stripTypeScriptTypes;

const TIMEOUT_MS = 200;
const MAX_OUTPUT = 20000;

export interface TsRun { value: unknown; argsAfter: unknown[] }

const own = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;

function lineOf(stack: unknown): string {
  const match = typeof stack === "string" ? stack.match(/solution\.ts:(\d+)/) : null;
  return match ? `Строка ${match[1]}: ` : "";
}

export function runTypeScript(source: string, functionName: string, args: unknown[]): TsRun {
  if (source.length > 6000) throw new Error("Код должен быть не длиннее 6000 символов.");
  if (/^\s*import\s/m.test(source) || /\brequire\s*\(/.test(source)) throw new Error("Импорты недоступны: решение пишется без внешних модулей.");
  const code = source.replace(/^(\s*)export\s+(default\s+)?/gm, "$1");
  let js: string;
  try {
    js = strip ? strip(code, { mode: "transform" }) : code;
  } catch (error) {
    throw new Error(`Не удалось разобрать TypeScript: ${error instanceof Error ? error.message.split("\n")[0] : "синтаксическая ошибка"}`);
  }
  // User code is wrapped in a function scope; the input is a JSON string literal, the output is a JSON string.
  const header = `(function () {\n"use strict";\ntry {\nconst __fn = (function () {\n`;
  const program = `${header}${js}\n;return typeof ${functionName} === "function" ? ${functionName} : undefined;\n})();
if (!__fn) return JSON.stringify({ error: "Функция ${functionName} не найдена. Не меняйте её имя." });
const __args = JSON.parse(${JSON.stringify(JSON.stringify(args))});
const __value = __fn(...__args);
if (__value && typeof __value.then === "function") return JSON.stringify({ error: "Функция должна вернуть результат сразу, без async и Promise." });
return JSON.stringify({ value: __value === undefined ? null : __value, undefined: __value === undefined, args: __args });
} catch (__error) {
  try {
    const __stack = __error && typeof __error.stack === "string" ? __error.stack : "";
    const __line = (__stack.match(/solution\\.ts:(\\d+)/) || [])[1];
    const __message = __error instanceof Error ? __error.name + ": " + __error.message : "Код выбросил исключение.";
    return JSON.stringify({ error: (__line ? "Строка " + __line + ": " : "") + String(__message).slice(0, 500) });
  } catch (__ignored) {
    return JSON.stringify({ error: "Код выбросил исключение." });
  }
}
})()`;

  let output: unknown;
  try {
    const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false }, microtaskMode: "afterEvaluate" });
    vm.runInContext("delete globalThis.Atomics; delete globalThis.SharedArrayBuffer; delete globalThis.WebAssembly;", context);
    output = vm.runInContext(program, context, { timeout: TIMEOUT_MS, filename: "solution.ts", lineOffset: -header.split("\n").length + 1 });
  } catch (error) {
    // Errors here may come from the sandbox realm: read own data properties only, never call getters.
    if (own(error, "code") === "ERR_SCRIPT_EXECUTION_TIMEOUT") throw new Error(`Код выполнялся дольше ${TIMEOUT_MS} мс: проверьте, нет ли бесконечного цикла.`);
    const message = own(error, "message");
    if (typeof message === "string") throw new Error(`${lineOf(own(error, "stack"))}Ошибка: ${message.slice(0, 300)}`);
    throw new Error("Код завершился с ошибкой.");
  }
  if (typeof output !== "string") throw new Error("Код завершился без результата.");
  if (output.length > MAX_OUTPUT) throw new Error("Результат слишком большой для проверки.");
  const parsed = JSON.parse(output) as { value?: unknown; undefined?: boolean; args?: unknown[]; error?: string };
  if (parsed.error) throw new Error(parsed.error);
  if (parsed.undefined) throw new Error(`Функция ${functionName} ничего не вернула: добавьте return.`);
  return { value: parsed.value, argsAfter: parsed.args ?? [] };
}
