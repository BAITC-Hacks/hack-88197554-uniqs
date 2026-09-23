// Bounded interpreter for the Python subset used by the introductory exercises.
// No eval, generated JavaScript, shell, filesystem access, or external runtime.
type Value = number | boolean | null | Value[];
type Env = Map<string, Value>;
type Expr = (env: Env) => Value;
type Statement =
  | { kind: "return"; value: Expr }
  | { kind: "assign"; name: string; value: Expr; add: boolean }
  | { kind: "for"; name: string; value: Expr; body: Statement[] }
  | { kind: "if"; value: Expr; body: Statement[]; otherwise: Statement[] }
  | { kind: "pass" };

const number = (value: Value): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("Ожидалось конечное число.");
  return value;
};
const array = (value: Value): Value[] => {
  if (!Array.isArray(value)) throw new Error("Ожидался список чисел.");
  return value;
};
const truth = (value: Value) => Array.isArray(value) ? value.length > 0 : Boolean(value);

export function runPython(source: string, input: number[]): Value {
  let steps = 0;
  const tick = () => { if (++steps > 10000) throw new Error("Слишком много операций. Упростите решение."); };
  if (source.length > 6000) throw new Error("Для упражнения достаточно 6000 символов кода.");

  function expression(source: string): Expr {
    const tokens: string[] = [];
    let rest = source.trim();
    while (rest) {
      const match = rest.match(/^(?:\d+(?:\.\d+)?|[A-Za-z_]\w*|==|!=|<=|>=|\/\/|[+\-*/%<>()\[\],])/);
      if (!match) throw new Error(`Неподдерживаемый синтаксис: ${rest.slice(0, 24)}. Используйте конструкции из памятки.`);
      tokens.push(match[0]);
      rest = rest.slice(match[0].length).trimStart();
    }
    let position = 0;
    let depth = 0;
    const take = (token: string) => {
      if (tokens[position] !== token) throw new Error(`Ожидалось «${token}», получено «${tokens[position] ?? "конец строки"}».`);
      position++;
    };
    const precedence: Record<string, number> = { or: 1, and: 2, "==": 3, "!=": 3, "<": 3, ">": 3, "<=": 3, ">=": 3, "+": 4, "-": 4, "*": 5, "/": 5, "//": 5, "%": 5 };

    function parse(minimum = 0): Expr {
      if (++depth > 40) throw new Error("Слишком глубокая вложенность выражения.");
      const token = tokens[position++];
      let left: Expr;
      if (token === "-" || token === "+" || token === "not") {
        const inner = parse(token === "not" ? 3 : 6);
        left = env => token === "not" ? !truth(inner(env)) : number(inner(env)) * (token === "-" ? -1 : 1);
      } else if (token === "(") {
        left = parse(); take(")");
      } else if (token === "[") {
        if (tokens[position] === "]") { position++; left = () => []; }
        else {
          const first = parse();
          if (tokens[position] === "for") {
            position++;
            const name = tokens[position++];
            if (!name || !/^[A-Za-z_]\w*$/.test(name)) throw new Error("После for укажите имя переменной.");
            take("in");
            const iterable = parse();
            let condition: Expr = () => true;
            if (tokens[position] === "if") { position++; condition = parse(); }
            take("]");
            left = env => {
              const result: Value[] = [];
              for (const item of array(iterable(env))) {
                tick();
                const scope = new Map(env); scope.set(name, item);
                if (truth(condition(scope))) result.push(first(scope));
              }
              return result;
            };
          } else {
            const entries = [first];
            while (tokens[position] === ",") { position++; if (tokens[position] !== "]") entries.push(parse()); }
            take("]"); left = env => entries.map(entry => entry(env));
          }
        }
      } else if (token && /^\d/.test(token)) {
        left = () => Number(token);
      } else if (token === "True" || token === "False" || token === "None") {
        left = () => token === "None" ? null : token === "True";
      } else if (token && /^[A-Za-z_]\w*$/.test(token)) {
        if (tokens[position] === "(") {
          position++;
          const args: Expr[] = [];
          if (tokens[position] !== ")") {
            args.push(parse());
            while (tokens[position] === ",") { position++; args.push(parse()); }
          }
          take(")");
          if (!["sum", "len", "abs", "min", "max"].includes(token)) throw new Error(`Функция ${token} не входит в учебный Python. Доступны sum, len, abs, min, max.`);
          left = env => {
            tick();
            const values = args.map(arg => arg(env));
            if (token === "sum" || token === "len" || token === "abs") {
              if (values.length !== 1) throw new Error(`${token} ожидает один аргумент.`);
              if (token === "abs") return Math.abs(number(values[0]));
              const items = array(values[0]);
              return token === "len" ? items.length : items.reduce<number>((total, item) => total + number(item), 0);
            }
            const items = (values.length === 1 ? array(values[0]) : values).map(number);
            if (!items.length) throw new Error(`${token}: пустой список.`);
            return token === "min" ? Math.min(...items) : Math.max(...items);
          };
        } else {
          left = env => {
            if (!env.has(token)) throw new Error(`Переменная «${token}» не определена.`);
            return env.get(token)!;
          };
        }
      } else throw new Error(`Не удалось прочитать выражение «${token ?? ""}».`);

      while (tokens[position] === "[") {
        position++; const index = parse(); take("]"); const container = left;
        left = env => {
          const items = array(container(env)); const i = number(index(env));
          if (!Number.isInteger(i) || i >= items.length || i < -items.length) throw new Error("Индекс за пределами списка.");
          return items[i < 0 ? items.length + i : i];
        };
      }
      while ((precedence[tokens[position]] ?? -1) >= minimum) {
        const op = tokens[position++]; const before = left; const right = parse(precedence[op] + 1);
        left = env => {
          tick(); const a = before(env);
          if (op === "and") return truth(a) ? right(env) : a;
          if (op === "or") return truth(a) ? a : right(env);
          const b = right(env);
          if (op === "==") return JSON.stringify(a) === JSON.stringify(b);
          if (op === "!=") return JSON.stringify(a) !== JSON.stringify(b);
          const x = number(a); const y = number(b);
          if (op === "+") return x + y;
          if (op === "-") return x - y;
          if (op === "*") return x * y;
          if (["/", "//", "%"].includes(op) && y === 0) throw new Error("Деление на ноль.");
          if (op === "/") return x / y;
          if (op === "//") return Math.floor(x / y);
          if (op === "%") return ((x % y) + y) % y;
          if (op === "<") return x < y;
          if (op === ">") return x > y;
          if (op === "<=") return x <= y;
          return x >= y;
        };
      }
      depth--;
      return left;
    }
    const result = parse();
    if (position !== tokens.length) throw new Error(`Лишняя часть выражения: ${tokens.slice(position).join(" ")}.`);
    return result;
  }

  const lines = source.split("\n").map((text, index) => {
    const cleaned = text.replace(/#.*$/, "").trimEnd();
    if (/^\s*\t/.test(cleaned)) throw new Error(`Строка ${index + 1}: замените табуляцию пробелами.`);
    return { text: cleaned.trim(), indent: cleaned.length - cleaned.trimStart().length, number: index + 1 };
  }).filter(line => line.text);
  const header = lines.shift();
  if (!header || header.indent !== 0 || !/^def total_income\(amounts\):$/.test(header.text)) {
    throw new Error("Начните с def total_income(amounts): и пишите тело функции с отступом.");
  }
  let cursor = 0;
  function block(indent: number, nesting = 0): Statement[] {
    if (nesting > 20) throw new Error("Слишком много вложенных блоков.");
    const statements: Statement[] = [];
    while (cursor < lines.length && lines[cursor].indent >= indent) {
      const line = lines[cursor];
      if (line.indent !== indent) throw new Error(`Строка ${line.number}: проверьте отступ.`);
      cursor++;
      const nested = () => {
        if (!lines[cursor] || lines[cursor].indent <= indent) throw new Error(`Строка ${line.number}: после двоеточия нужен блок с отступом.`);
        return block(lines[cursor].indent, nesting + 1);
      };
      const loop = line.text.match(/^for ([A-Za-z_]\w*) in (.+):$/);
      const condition = line.text.match(/^if (.+):$/);
      const assignment = line.text.match(/^([A-Za-z_]\w*)\s*(\+=|=)\s*(.+)$/);
      try {
        if (line.text.startsWith("return ")) statements.push({ kind: "return", value: expression(line.text.slice(7)) });
        else if (line.text === "pass") statements.push({ kind: "pass" });
        else if (loop) statements.push({ kind: "for", name: loop[1], value: expression(loop[2]), body: nested() });
        else if (condition) {
          const value = expression(condition[1]); const body = nested(); let otherwise: Statement[] = [];
          if (lines[cursor]?.indent === indent && lines[cursor].text === "else:") { cursor++; otherwise = nested(); }
          statements.push({ kind: "if", value, body, otherwise });
        } else if (assignment) statements.push({ kind: "assign", name: assignment[1], add: assignment[2] === "+=", value: expression(assignment[3]) });
        else throw new Error("Поддерживаются присваивание, for, if/else, return и pass.");
      } catch (error) {
        throw new Error(`Строка ${line.number}: ${error instanceof Error ? error.message : "ошибка синтаксиса"}`);
      }
    }
    return statements;
  }
  if (!lines.length || lines[0].indent === 0) throw new Error("Добавьте тело функции с отступом.");
  const program = block(lines[0].indent);
  if (cursor !== lines.length) throw new Error("Весь код упражнения должен находиться внутри total_income.");
  const env: Env = new Map([["amounts", [...input]]]);
  function execute(statements: Statement[]): { value: Value } | undefined {
    for (const statement of statements) {
      tick();
      if (statement.kind === "pass") continue;
      if (statement.kind === "return") return { value: statement.value(env) };
      if (statement.kind === "assign") {
        const value = statement.value(env);
        env.set(statement.name, statement.add ? number(env.get(statement.name) ?? null) + number(value) : value);
      } else if (statement.kind === "if") {
        const result = execute(truth(statement.value(env)) ? statement.body : statement.otherwise);
        if (result) return result;
      } else {
        for (const item of [...array(statement.value(env))]) {
          tick(); env.set(statement.name, item);
          const result = execute(statement.body);
          if (result) return result;
        }
      }
    }
  }
  return execute(program)?.value ?? null;
}
