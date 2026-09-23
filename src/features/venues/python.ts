// Bounded interpreter for the Python subset used by the practice tasks (server only).
// No eval, generated JavaScript, shell, filesystem access, or external runtime.
// One function, numbers, strings, lists, dicts; a hard step limit stops runaway loops.
type Key = string | number;
export type PyValue = number | boolean | null | string | PyValue[] | Map<Key, PyValue>;
type Env = Map<string, PyValue>;
type Expr = (env: Env) => PyValue;
type Target = { kind: "name"; name: string } | { kind: "index"; container: Expr; index: Expr } | { kind: "tuple"; items: Target[] };
type Statement =
  | { kind: "return"; value: Expr | null }
  | { kind: "assign"; target: Target; op: string; value: Expr }
  | { kind: "expr"; value: Expr }
  | { kind: "for"; target: Target; value: Expr; body: Statement[] }
  | { kind: "while"; value: Expr; body: Statement[] }
  | { kind: "if"; branches: { value: Expr; body: Statement[] }[]; otherwise: Statement[] }
  | { kind: "pass" | "break" | "continue" };
type Flow = { kind: "return"; value: PyValue } | { kind: "break" | "continue" } | undefined;

const MAX_STEPS = 20000;
const MAX_ITEMS = 10000;
const BUILTINS = ["sum", "len", "abs", "min", "max", "sorted", "round", "range", "zip", "enumerate", "list", "int", "float"];
const BINARY = new Map<string, number>([
  ["or", 1], ["and", 2],
  ["in", 4], ["not in", 4], ["is", 4], ["is not", 4], ["==", 4], ["!=", 4], ["<", 4], [">", 4], ["<=", 4], [">=", 4],
  ["+", 5], ["-", 5], ["*", 6], ["/", 6], ["//", 6], ["%", 6], ["**", 8],
]);
const COMPARISON = new Set(["in", "not in", "is", "is not", "==", "!=", "<", ">", "<=", ">="]);
const AUGMENTED = new Set(["=", "+=", "-=", "*=", "/="]);
const KEYWORDS = new Set(["and", "or", "not", "in", "is", "if", "else", "elif", "for", "while", "return", "def", "pass", "break", "continue", "lambda", "True", "False", "None"]);

const isDict = (value: PyValue): value is Map<Key, PyValue> => value instanceof Map;
const typeName = (value: PyValue) => value === null ? "None" : typeof value === "boolean" ? "bool" : typeof value === "number" ? "число"
  : typeof value === "string" ? "строка" : Array.isArray(value) ? "список" : "словарь";

function num(value: PyValue): number {
  if (typeof value === "boolean") return Number(value);
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Ожидалось число, получено: ${typeName(value)}.`);
  return value;
}
function truth(value: PyValue): boolean {
  if (value === null) return false;
  if (typeof value === "string" || Array.isArray(value)) return value.length > 0;
  if (isDict(value)) return value.size > 0;
  return Boolean(value);
}
function equal(a: PyValue, b: PyValue): boolean {
  const numeric = (v: PyValue) => typeof v === "number" || typeof v === "boolean";
  if (numeric(a) && numeric(b)) return Number(a) === Number(b);
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, i) => equal(item, b[i]));
  if (isDict(a) && isDict(b)) return a.size === b.size && [...a].every(([key, item]) => b.has(key) && equal(item, b.get(key)!));
  return a === b;
}
function compare(a: PyValue, b: PyValue): number {
  if (typeof a === "string" && typeof b === "string") return a < b ? -1 : a > b ? 1 : 0;
  return num(a) - num(b);
}
function key(value: PyValue): Key {
  if (typeof value === "string" || typeof value === "number") return value;
  if (typeof value === "boolean") return Number(value);
  throw new Error("Ключ словаря должен быть строкой или числом.");
}
function show(value: PyValue): string {
  if (value === null) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(show).join(", ")}]`;
  if (isDict(value)) return `{${[...value].map(([k, v]) => `${show(k)}: ${show(v)}`).join(", ")}}`;
  return String(value);
}
function pyRound(value: number, digits?: number): number {
  if (digits === undefined) {
    const floor = Math.floor(value); const diff = value - floor;
    return diff > 0.5 ? floor + 1 : diff < 0.5 ? floor : floor % 2 === 0 ? floor : floor + 1;
  }
  if (!Number.isInteger(digits) || digits < 0 || digits > 12) throw new Error("round: второй аргумент — целое число от 0 до 12.");
  const scaled = value * 10 ** digits;
  if (Number.isInteger(scaled * 2) && !Number.isInteger(scaled)) return pyRound(scaled) / 10 ** digits;
  return Number(value.toFixed(digits));
}

export function fromJson(value: unknown): PyValue {
  if (value === null || typeof value === "number" || typeof value === "boolean" || typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(fromJson);
  if (typeof value === "object") return new Map(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, fromJson(v)]));
  return null;
}
export function toJson(value: PyValue): unknown {
  if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Результат не является конечным числом.");
  if (Array.isArray(value)) return value.map(toJson);
  if (isDict(value)) return Object.fromEntries([...value].map(([k, v]) => [String(k), toJson(v)]));
  return value;
}

function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let rest = text.trim();
  while (rest) {
    if (rest.startsWith("#")) break;
    const match = rest.match(/^(?:"""[^]*?"""|'''[^]*?'''|"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\d+|[A-Za-z_]\w*|\*\*|\/\/|==|!=|<=|>=|->|\+=|-=|\*=|\/=|[+\-*/%<>()[\]{},:.=])/);
    if (!match) throw new Error(`Неподдерживаемый синтаксис: ${rest.slice(0, 24)}`);
    tokens.push(match[0]);
    rest = rest.slice(match[0].length).trimStart();
  }
  return tokens;
}
function decodeString(token: string): string {
  const body = token.startsWith('"""') || token.startsWith("'''") ? token.slice(3, -3) : token.slice(1, -1);
  return body.replace(/\\(.)/g, (_, ch: string) => ch === "n" ? "\n" : ch === "t" ? "\t" : ch);
}
const isName = (token: string | undefined): token is string => Boolean(token && /^[A-Za-z_]\w*$/.test(token) && !KEYWORDS.has(token));

export function runPython(source: string, functionName: string, args: unknown[]): unknown {
  if (source.length > 6000) throw new Error("Код должен быть не длиннее 6000 символов.");
  let steps = 0;
  const tick = () => { if (++steps > MAX_STEPS) throw new Error("Слишком много операций: возможно, бесконечный цикл."); };
  const guard = (items: PyValue[]) => { if (items.length > MAX_ITEMS) throw new Error("Слишком длинный список для учебной задачи."); return items; };

  function iterate(value: PyValue): PyValue[] {
    if (Array.isArray(value)) return [...value];
    if (typeof value === "string") return [...value];
    if (isDict(value)) return [...value.keys()];
    throw new Error(`Нельзя перебрать значение типа «${typeName(value)}».`);
  }

  function callBuiltin(name: string, values: PyValue[], keywords: Map<string, PyValue>): PyValue {
    const reverse = keywords.has("reverse") ? truth(keywords.get("reverse")!) : false;
    for (const k of keywords.keys()) if (!(k === "reverse" && name === "sorted") && !(k === "start" && (name === "enumerate" || name === "sum"))) throw new Error(`${name}: аргумент ${k}= не поддерживается.`);
    const one = () => { if (values.length !== 1) throw new Error(`${name} ожидает один аргумент.`); return values[0]; };
    switch (name) {
      case "len": {
        const value = one();
        if (typeof value === "string" || Array.isArray(value)) return value.length;
        if (isDict(value)) return value.size;
        throw new Error(`len: нельзя взять длину значения типа «${typeName(value)}».`);
      }
      case "sum": return iterate(one()).reduce<number>((total, item) => { tick(); return total + num(item); }, num(keywords.get("start") ?? 0));
      case "abs": return Math.abs(num(one()));
      case "min": case "max": {
        const items = values.length === 1 ? iterate(values[0]) : values;
        if (!items.length) throw new Error(`${name}: пустая последовательность.`);
        return items.reduce((best, item) => { tick(); return (name === "min" ? compare(item, best) < 0 : compare(item, best) > 0) ? item : best; });
      }
      case "sorted": {
        const items = iterate(one());
        items.sort((a, b) => { tick(); return compare(a, b); });
        return reverse ? items.reverse() : items;
      }
      case "round": {
        if (values.length < 1 || values.length > 2) throw new Error("round ожидает число и, по желанию, количество знаков.");
        return pyRound(num(values[0]), values.length === 2 ? num(values[1]) : undefined);
      }
      case "range": {
        const [start, stop, step] = values.length === 1 ? [0, num(values[0]), 1] : [num(values[0]), num(values[1] ?? null), values.length > 2 ? num(values[2]) : 1];
        if (![start, stop, step].every(Number.isInteger) || step === 0) throw new Error("range принимает целые числа, шаг не равен нулю.");
        const items: PyValue[] = [];
        for (let i = start; step > 0 ? i < stop : i > stop; i += step) { tick(); items.push(i); guard(items); }
        return items;
      }
      case "zip": {
        const lists = values.map(iterate);
        const length = lists.length ? Math.min(...lists.map(list => list.length)) : 0;
        return Array.from({ length }, (_, i) => lists.map(list => list[i]));
      }
      case "enumerate": {
        const start = num(keywords.get("start") ?? values[1] ?? 0);
        return iterate(values[0] ?? null).map((item, i) => [start + i, item]);
      }
      case "list": return values.length ? iterate(one()) : [];
      case "int": {
        const value = one();
        const parsed = typeof value === "string" ? Number(value.trim()) : num(value);
        if (!Number.isFinite(parsed) || (typeof value === "string" && !/^[+-]?\d+$/.test(value.trim()))) throw new Error(`int: не удалось преобразовать ${show(value)}.`);
        return Math.trunc(parsed);
      }
      case "float": {
        const value = one();
        const parsed = typeof value === "string" ? Number(value.trim()) : num(value);
        if (!Number.isFinite(parsed) || (typeof value === "string" && value.trim() === "")) throw new Error(`float: не удалось преобразовать ${show(value)}.`);
        return parsed;
      }
    }
    throw new Error(`Функция ${name} недоступна.`);
  }

  function callMethod(target: PyValue, name: string, values: PyValue[], keywords: Map<string, PyValue>): PyValue {
    tick();
    if (Array.isArray(target)) {
      if (name === "append" && values.length === 1) { target.push(values[0]); guard(target); return null; }
      if (name === "extend" && values.length === 1) { target.push(...iterate(values[0])); guard(target); return null; }
      if (name === "count" && values.length === 1) return target.filter(item => equal(item, values[0])).length;
      if (name === "pop" && values.length <= 1) {
        if (!target.length) throw new Error("pop из пустого списка.");
        const i = values.length ? num(values[0]) : target.length - 1;
        const index = i < 0 ? target.length + i : i;
        if (!Number.isInteger(index) || index < 0 || index >= target.length) throw new Error("Индекс за пределами списка.");
        return target.splice(index, 1)[0];
      }
      if (name === "sort" && values.length === 0) {
        target.sort((a, b) => { tick(); return compare(a, b); });
        if (keywords.has("reverse") && truth(keywords.get("reverse")!)) target.reverse();
        return null;
      }
    } else if (isDict(target)) {
      if (name === "get" && (values.length === 1 || values.length === 2)) { const k = key(values[0]); return target.has(k) ? target.get(k)! : values[1] ?? null; }
      if (name === "items" && !values.length) return [...target].map(([k, v]) => [k, v]);
      if (name === "keys" && !values.length) return [...target.keys()];
      if (name === "values" && !values.length) return [...target.values()];
    } else if (typeof target === "string") {
      if (name === "lower" && !values.length) return target.toLowerCase();
      if (name === "upper" && !values.length) return target.toUpperCase();
      if (name === "strip" && !values.length) return target.trim();
      if (name === "split" && values.length <= 1) return values.length && values[0] !== null ? target.split(String(values[0])) : target.split(/\s+/).filter(Boolean);
      if (name === "startswith" && values.length === 1) return target.startsWith(String(values[0]));
      if (name === "endswith" && values.length === 1) return target.endsWith(String(values[0]));
    }
    throw new Error(`Метод .${name}() для типа «${typeName(target)}» не поддерживается.`);
  }

  function binary(op: string, a: PyValue, b: PyValue): PyValue {
    tick();
    switch (op) {
      case "==": return equal(a, b);
      case "!=": return !equal(a, b);
      case "is": return a === b || (a === null && b === null);
      case "is not": return !(a === b || (a === null && b === null));
      case "<": return compare(a, b) < 0;
      case ">": return compare(a, b) > 0;
      case "<=": return compare(a, b) <= 0;
      case ">=": return compare(a, b) >= 0;
      case "in": case "not in": {
        let found: boolean;
        if (typeof b === "string") { if (typeof a !== "string") throw new Error("Проверка in для строки ожидает строку."); found = b.includes(a); }
        else if (isDict(b)) found = b.has(key(a));
        else if (Array.isArray(b)) found = b.some(item => equal(item, a));
        else throw new Error(`Оператор in не работает с типом «${typeName(b)}».`);
        return op === "in" ? found : !found;
      }
      case "+":
        if (typeof a === "string" && typeof b === "string") return a + b;
        if (Array.isArray(a) && Array.isArray(b)) return guard([...a, ...b]);
        return num(a) + num(b);
      case "*":
        if (Array.isArray(a) || Array.isArray(b)) {
          const [list, times] = Array.isArray(a) ? [a, num(b)] : [b as PyValue[], num(a)];
          if (!Number.isInteger(times)) throw new Error("Список можно умножать только на целое число.");
          return guard(Array.from({ length: Math.max(0, times) * list.length }, (_, i) => list[i % list.length]));
        }
        return num(a) * num(b);
    }
    const x = num(a); const y = num(b);
    if (op === "-") return x - y;
    if (op === "**") return x ** y;
    if (y === 0) throw new Error("Деление на ноль.");
    if (op === "/") return x / y;
    if (op === "//") return Math.floor(x / y);
    return ((x % y) + y) % y;
  }

  function index(container: PyValue, i: PyValue): PyValue {
    if (isDict(container)) {
      const k = key(i);
      if (!container.has(k)) throw new Error(`Ключ ${show(i)} не найден в словаре. Используйте .get(ключ, 0) или проверку in.`);
      return container.get(k)!;
    }
    if (!Array.isArray(container) && typeof container !== "string") throw new Error(`Нельзя индексировать значение типа «${typeName(container)}».`);
    const n = num(i);
    if (!Number.isInteger(n) || n >= container.length || n < -container.length) throw new Error("Индекс за пределами списка.");
    return container[n < 0 ? container.length + n : n];
  }

  // Expression parser over tokens: precedence climbing, closures as compiled code.
  function compile(tokens: string[], what = "выражение"): { parseTuple: () => Expr; parseTarget: () => Target; take: (t: string) => void; peek: () => string | undefined; done: () => void } {
    let position = 0;
    let depth = 0;
    const peek = () => tokens[position];
    const take = (token: string) => {
      if (tokens[position] !== token) throw new Error(`Ожидалось «${token}», получено «${tokens[position] ?? "конец строки"}».`);
      position++;
    };
    const done = () => { if (position !== tokens.length) throw new Error(`Лишняя часть: ${tokens.slice(position).join(" ")}`); };

    function parseTarget(): Target {
      const one = (): Target => {
        if (peek() === "(" || peek() === "[") {
          const close = peek() === "(" ? ")" : "]"; position++;
          const items = [one()];
          while (peek() === ",") { position++; if (peek() !== close) items.push(one()); }
          take(close);
          return { kind: "tuple", items };
        }
        const name = tokens[position++];
        if (!isName(name)) throw new Error(`Ожидалось имя переменной, получено «${name ?? "конец строки"}».`);
        return { kind: "name", name };
      };
      const first = one();
      if (peek() !== ",") return first;
      const items = [first];
      while (peek() === ",") { position++; items.push(one()); }
      return { kind: "tuple", items };
    }

    function comprehension(): (env: Env, emit: (scope: Env) => void) => void {
      const clauses: { target: Target; iterable: Expr; conditions: Expr[] }[] = [];
      while (peek() === "for") {
        position++;
        const target = parseTarget();
        take("in");
        const iterable = parse(1);
        const conditions: Expr[] = [];
        while (peek() === "if") { position++; conditions.push(parse(1)); }
        clauses.push({ target, iterable, conditions });
      }
      return (env, emit) => {
        const walk = (level: number, scope: Env) => {
          if (level === clauses.length) { emit(scope); return; }
          const clause = clauses[level];
          for (const item of iterate(clause.iterable(scope))) {
            tick();
            const inner = new Map(scope); bind(inner, clause.target, item);
            if (clause.conditions.every(condition => truth(condition(inner)))) walk(level + 1, inner);
          }
        };
        walk(0, env);
      };
    }

    function parseTest(): Expr {
      const value = parse(1);
      if (peek() !== "if") return value;
      position++;
      const condition = parse(1); take("else"); const otherwise = parseTest();
      return env => truth(condition(env)) ? value(env) : otherwise(env);
    }
    function parseTuple(): Expr {
      const first = parseTest();
      if (peek() !== ",") return first;
      const items = [first];
      while (peek() === ",") { position++; if (position < tokens.length && peek() !== ")" && peek() !== ":") items.push(parseTest()); }
      return env => items.map(item => item(env));
    }
    function peekOperator(): { op: string; width: number } | null {
      const token = peek();
      if (token === "not" && tokens[position + 1] === "in") return { op: "not in", width: 2 };
      if (token === "is" && tokens[position + 1] === "not") return { op: "is not", width: 2 };
      return token !== undefined && BINARY.has(token) ? { op: token, width: 1 } : null;
    }
    function parse(minimum: number): Expr {
      if (++depth > 60) throw new Error("Слишком глубокая вложенность выражения.");
      let left = prefix();
      for (let found = peekOperator(); found && BINARY.get(found.op)! >= minimum; found = peekOperator()) {
        const precedence = BINARY.get(found.op)!;
        position += found.width;
        if (found.op === "and" || found.op === "or") {
          const before = left; const right = parse(precedence + 1); const op = found.op;
          left = env => { tick(); const a = before(env); return op === "and" ? (truth(a) ? right(env) : a) : (truth(a) ? a : right(env)); };
        } else if (COMPARISON.has(found.op)) {
          const operators = [found.op]; const operands = [left, parse(precedence + 1)];
          for (let next = peekOperator(); next && COMPARISON.has(next.op); next = peekOperator()) {
            position += next.width; operators.push(next.op); operands.push(parse(precedence + 1));
          }
          left = env => {
            let a = operands[0](env);
            for (let i = 0; i < operators.length; i++) {
              const b = operands[i + 1](env);
              if (!binary(operators[i], a, b)) return false;
              a = b;
            }
            return true;
          };
        } else {
          const before = left; const op = found.op; const right = parse(op === "**" ? precedence : precedence + 1);
          left = env => binary(op, before(env), right(env));
        }
      }
      depth--;
      return left;
    }
    function prefix(): Expr {
      const token = peek();
      if (token === "not") { position++; const inner = parse(3); return env => !truth(inner(env)); }
      if (token === "-" || token === "+") {
        position++; const inner = parse(7);
        return env => token === "-" ? -num(inner(env)) : num(inner(env));
      }
      return postfix(atom());
    }
    function callArguments(): { args: Expr[]; keywords: Map<string, Expr> } {
      const args: Expr[] = []; const keywords = new Map<string, Expr>();
      while (peek() !== ")") {
        if (isName(peek()) && tokens[position + 1] === "=") {
          const name = tokens[position]; position += 2; keywords.set(name, parseTest());
        } else {
          const value = parseTest();
          if (peek() === "for") {
            const walk = comprehension();
            args.push(env => { const out: PyValue[] = []; walk(env, scope => { out.push(value(scope)); guard(out); }); return out; });
          } else args.push(value);
        }
        if (peek() !== ",") break;
        position++;
      }
      take(")");
      return { args, keywords };
    }
    function evaluate(args: Expr[], keywords: Map<string, Expr>, env: Env) {
      return { values: args.map(arg => arg(env)), named: new Map([...keywords].map(([k, v]) => [k, v(env)])) };
    }
    function atom(): Expr {
      const token = tokens[position++];
      if (token === undefined) throw new Error(`Неполное ${what}.`);
      if (/^\d|^\.\d/.test(token)) { const value = Number(token); return () => value; }
      if (/^["']/.test(token)) { const value = decodeString(token); return () => value; }
      if (token === "True" || token === "False") { const value = token === "True"; return () => value; }
      if (token === "None") return () => null;
      if (token === "(") {
        if (peek() === ")") { position++; return () => []; }
        const first = parseTest();
        if (peek() === "for") {
          const walk = comprehension(); take(")");
          return env => { const out: PyValue[] = []; walk(env, scope => { out.push(first(scope)); guard(out); }); return out; };
        }
        if (peek() === ",") {
          const items = [first];
          while (peek() === ",") { position++; if (peek() !== ")") items.push(parseTest()); }
          take(")");
          return env => items.map(item => item(env));
        }
        take(")");
        return first;
      }
      if (token === "[") {
        if (peek() === "]") { position++; return () => []; }
        const first = parseTest();
        if (peek() === "for") {
          const walk = comprehension(); take("]");
          return env => { const out: PyValue[] = []; walk(env, scope => { out.push(first(scope)); guard(out); }); return out; };
        }
        const items = [first];
        while (peek() === ",") { position++; if (peek() !== "]") items.push(parseTest()); }
        take("]");
        return env => items.map(item => item(env));
      }
      if (token === "{") {
        if (peek() === "}") { position++; return () => new Map(); }
        const firstKey = parseTest(); take(":"); const firstValue = parseTest();
        if (peek() === "for") {
          const walk = comprehension(); take("}");
          return env => { const out = new Map<Key, PyValue>(); walk(env, scope => { tick(); out.set(key(firstKey(scope)), firstValue(scope)); }); return out; };
        }
        const entries: [Expr, Expr][] = [[firstKey, firstValue]];
        while (peek() === ",") { position++; if (peek() === "}") break; const k = parseTest(); take(":"); entries.push([k, parseTest()]); }
        take("}");
        return env => new Map(entries.map(([k, v]) => [key(k(env)), v(env)]));
      }
      if (token === "lambda") throw new Error("lambda не поддерживается в учебном Python.");
      if (token === "print") throw new Error("print не нужен: верните результат через return.");
      if (isName(token)) {
        if (peek() === "(") {
          position++;
          const { args, keywords } = callArguments();
          if (!BUILTINS.includes(token)) throw new Error(`Функция ${token} недоступна. Можно: ${BUILTINS.join(", ")}.`);
          return env => { tick(); const { values, named } = evaluate(args, keywords, env); return callBuiltin(token, values, named); };
        }
        return env => {
          if (!env.has(token)) throw new Error(`Переменная «${token}» не определена.`);
          return env.get(token)!;
        };
      }
      throw new Error(`Не удалось прочитать ${what} у «${token}».`);
    }
    function postfix(start: Expr): Expr {
      let left = start;
      for (;;) {
        if (peek() === "[") {
          position++;
          const container = left;
          const from = peek() === ":" ? null : parseTest();
          if (peek() === ":") {
            position++;
            const to = peek() === "]" ? null : parseTest();
            take("]");
            left = env => {
              const value = container(env);
              if (!Array.isArray(value) && typeof value !== "string") throw new Error("Срез работает для списков и строк.");
              const length = value.length;
              const clamp = (bound: Expr | null, fallback: number) => {
                if (!bound) return fallback;
                const n = num(bound(env)); if (!Number.isInteger(n)) throw new Error("Границы среза — целые числа.");
                return Math.min(Math.max(n < 0 ? length + n : n, 0), length);
              };
              return value.slice(clamp(from, 0), clamp(to, length));
            };
          } else {
            take("]");
            const at = from!;
            left = env => index(container(env), at(env));
          }
        } else if (peek() === ".") {
          position++;
          const name = tokens[position++];
          if (!isName(name)) throw new Error("После точки ожидается имя метода.");
          take("(");
          const { args, keywords } = callArguments();
          const target = left;
          left = env => { const { values, named } = evaluate(args, keywords, env); return callMethod(target(env), name, values, named); };
        } else return left;
      }
    }
    return { parseTuple, parseTarget, take, peek, done };
  }

  function bind(env: Env, target: Target, value: PyValue) {
    if (target.kind === "name") { env.set(target.name, value); return; }
    if (target.kind === "index") {
      const container = target.container(env); const at = target.index(env);
      if (isDict(container)) container.set(key(at), value);
      else if (Array.isArray(container)) {
        const n = num(at);
        if (!Number.isInteger(n) || n >= container.length || n < -container.length) throw new Error("Индекс за пределами списка.");
        container[n < 0 ? container.length + n : n] = value;
      } else throw new Error(`Нельзя присвоить по индексу в значение типа «${typeName(container)}».`);
      return;
    }
    if (!Array.isArray(value) || value.length !== target.items.length) throw new Error(`Распаковка: ожидалось ${target.items.length} значения, получено ${Array.isArray(value) ? value.length : typeName(value)}.`);
    target.items.forEach((item, i) => bind(env, item, value[i]));
  }
  function read(env: Env, target: Target): PyValue {
    if (target.kind === "name") {
      if (!env.has(target.name)) throw new Error(`Переменная «${target.name}» не определена.`);
      return env.get(target.name)!;
    }
    if (target.kind === "index") return index(target.container(env), target.index(env));
    throw new Error("Составное присваивание работает с одной переменной.");
  }

  // Lines → statements.
  const lines = source.split("\n").map((raw, i) => {
    const indentText = raw.match(/^[ \t]*/)![0];
    if (indentText.includes("\t")) throw new Error(`Строка ${i + 1}: замените табуляцию пробелами.`);
    let tokens: string[];
    try { tokens = tokenize(raw); } catch (error) { throw new Error(`Строка ${i + 1}: ${error instanceof Error ? error.message : "ошибка синтаксиса"}`); }
    return { tokens, indent: indentText.length, number: i + 1 };
  }).filter(line => line.tokens.length);

  const header = lines.shift();
  if (!header || header.indent !== 0 || header.tokens[0] !== "def") throw new Error(`Начните с def ${functionName}(...): и пишите тело функции с отступом.`);
  if (header.tokens[1] !== functionName) throw new Error(`Функция должна называться ${functionName}.`);
  const params = parseParams(header.tokens, header.number);
  if (params.length !== args.length) throw new Error(`Функция ${functionName} должна принимать ${args.length} аргумент(а), как в заготовке.`);

  function parseParams(tokens: string[], lineNumber: number): string[] {
    if (tokens[2] !== "(" || tokens[tokens.length - 1] !== ":") throw new Error(`Строка ${lineNumber}: ожидается def ${functionName}(...):`);
    const close = tokens.indexOf(")");
    if (close < 0) throw new Error(`Строка ${lineNumber}: нет закрывающей скобки.`);
    const names: string[] = [];
    let depthLevel = 0; let expectName = true;
    for (const token of tokens.slice(3, close)) {
      if (token === "[") depthLevel++;
      else if (token === "]") depthLevel--;
      else if (token === "," && depthLevel === 0) expectName = true;
      else if (expectName) {
        if (!isName(token)) throw new Error(`Строка ${lineNumber}: ожидалось имя параметра.`);
        names.push(token); expectName = false;
      }
    }
    return names;
  }

  let cursor = 0;
  function simple(tokens: string[]): Statement {
    const head = tokens[0];
    if (head === "pass" || head === "break" || head === "continue") {
      if (tokens.length !== 1) throw new Error(`После ${head} ничего не пишут.`);
      return { kind: head };
    }
    if (head === "return") {
      if (tokens.length === 1) return { kind: "return", value: null };
      const parser = compile(tokens.slice(1)); const value = parser.parseTuple(); parser.done();
      return { kind: "return", value };
    }
    if (head === "def") throw new Error("Вложенные функции не поддерживаются — всё решение внутри одной функции.");
    if (head === "import" || head === "from") throw new Error("Импорты недоступны: используйте встроенные функции.");
    let level = 0; let split = -1;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token === "(" || token === "[" || token === "{") level++;
      else if (token === ")" || token === "]" || token === "}") level--;
      else if (level === 0 && AUGMENTED.has(token)) { split = i; break; }
    }
    if (split < 0) {
      const parser = compile(tokens); const value = parser.parseTuple(); parser.done();
      return { kind: "expr", value };
    }
    let left = tokens.slice(0, split);
    // Variable annotation: total: int = 0
    if (left.length >= 3 && isName(left[0]) && left[1] === ":") left = [left[0]];
    const parser = compile(left, "цель присваивания");
    const target = assignable(parser);
    parser.done();
    const right = compile(tokens.slice(split + 1)); const value = right.parseTuple(); right.done();
    if (tokens[split] !== "=" && target.kind === "tuple") throw new Error("Составное присваивание работает с одной переменной.");
    return { kind: "assign", target, op: tokens[split], value };
  }
  function assignable(parser: ReturnType<typeof compile>): Target {
    // name | name[expr] | a, b
    const tokensLeft: Target = parser.parseTarget();
    if (parser.peek() === "[" && tokensLeft.kind === "name") {
      let container: Expr = env => read(env, tokensLeft);
      let indexExpr: Expr | null = null;
      while (parser.peek() === "[") {
        parser.take("[");
        const sub = parser.parseTuple();
        parser.take("]");
        if (indexExpr) { const prevContainer = container; const prevIndex = indexExpr; container = env => index(prevContainer(env), prevIndex(env)); }
        indexExpr = sub;
      }
      return { kind: "index", container, index: indexExpr! };
    }
    return tokensLeft;
  }
  function headerColon(tokens: string[]): number {
    let level = 0;
    for (let i = 0; i < tokens.length; i++) {
      const token = tokens[i];
      if (token === "(" || token === "[" || token === "{") level++;
      else if (token === ")" || token === "]" || token === "}") level--;
      else if (token === ":" && level === 0) return i;
    }
    return -1;
  }
  function block(indent: number, nesting = 0): Statement[] {
    if (nesting > 20) throw new Error("Слишком много вложенных блоков.");
    const statements: Statement[] = [];
    while (cursor < lines.length && lines[cursor].indent >= indent) {
      const line = lines[cursor];
      if (line.indent !== indent) throw new Error(`Строка ${line.number}: проверьте отступ.`);
      cursor++;
      try { statements.push(statement(line, indent, nesting)); }
      catch (error) {
        const message = error instanceof Error ? error.message : "ошибка синтаксиса";
        throw new Error(message.startsWith("Строка ") ? message : `Строка ${line.number}: ${message}`);
      }
    }
    return statements;
  }
  function body(line: { tokens: string[]; number: number }, colon: number, indent: number, nesting: number): Statement[] {
    if (colon < line.tokens.length - 1) return [simple(line.tokens.slice(colon + 1))];
    if (!lines[cursor] || lines[cursor].indent <= indent) throw new Error("После двоеточия нужен блок с отступом.");
    return block(lines[cursor].indent, nesting + 1);
  }
  function statement(line: { tokens: string[]; number: number }, indent: number, nesting: number): Statement {
    const head = line.tokens[0];
    if (head === "for" || head === "while" || head === "if") {
      const colon = headerColon(line.tokens);
      if (colon < 0) throw new Error(`После ${head} нужно двоеточие.`);
      const parser = compile(line.tokens.slice(1, colon));
      if (head === "for") {
        const target = parser.parseTarget(); parser.take("in"); const value = parser.parseTuple(); parser.done();
        return { kind: "for", target, value, body: body(line, colon, indent, nesting) };
      }
      const value = parser.parseTuple(); parser.done();
      if (head === "while") return { kind: "while", value, body: body(line, colon, indent, nesting) };
      const branches = [{ value, body: body(line, colon, indent, nesting) }];
      let otherwise: Statement[] = [];
      while (lines[cursor]?.indent === indent && (lines[cursor].tokens[0] === "elif" || lines[cursor].tokens[0] === "else")) {
        const next = lines[cursor]; cursor++;
        const nextColon = headerColon(next.tokens);
        if (nextColon < 0) throw new Error(`Строка ${next.number}: нужно двоеточие.`);
        if (next.tokens[0] === "else") {
          if (nextColon !== 1) throw new Error(`Строка ${next.number}: после else сразу ставится двоеточие.`);
          otherwise = body(next, nextColon, indent, nesting);
          break;
        }
        const nextParser = compile(next.tokens.slice(1, nextColon)); const condition = nextParser.parseTuple(); nextParser.done();
        branches.push({ value: condition, body: body(next, nextColon, indent, nesting) });
      }
      return { kind: "if", branches, otherwise };
    }
    if (head === "elif" || head === "else") throw new Error(`${head} без if.`);
    return simple(line.tokens);
  }

  if (!lines.length || lines[0].indent === 0) throw new Error("Добавьте тело функции с отступом.");
  const program = block(lines[0].indent);
  if (cursor !== lines.length) throw new Error(`Строка ${lines[cursor].number}: весь код должен находиться внутри ${functionName}.`);

  const env: Env = new Map(params.map((name, i) => [name, fromJson(args[i])]));
  function execute(statements: Statement[]): Flow {
    for (const statement of statements) {
      tick();
      switch (statement.kind) {
        case "pass": continue;
        case "break": case "continue": return { kind: statement.kind };
        case "return": return { kind: "return", value: statement.value ? statement.value(env) : null };
        case "expr": statement.value(env); continue;
        case "assign": {
          const value = statement.value(env);
          if (statement.op === "=") bind(env, statement.target, value);
          else bind(env, statement.target, binary(statement.op.slice(0, -1), read(env, statement.target), value));
          continue;
        }
        case "if": {
          const branch = statement.branches.find(candidate => truth(candidate.value(env)));
          const flow = execute(branch ? branch.body : statement.otherwise);
          if (flow) return flow;
          continue;
        }
        case "for": {
          for (const item of iterate(statement.value(env))) {
            tick(); bind(env, statement.target, item);
            const flow = execute(statement.body);
            if (flow?.kind === "break") break;
            if (flow?.kind === "return") return flow;
          }
          continue;
        }
        case "while": {
          while (truth(statement.value(env))) {
            tick();
            const flow = execute(statement.body);
            if (flow?.kind === "break") break;
            if (flow?.kind === "return") return flow;
          }
          continue;
        }
      }
    }
  }
  const flow = execute(program);
  return toJson(flow?.kind === "return" ? flow.value : null);
}
