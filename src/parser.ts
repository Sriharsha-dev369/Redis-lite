export type RespValue =
  | { type: "simple"; value: string }
  | { type: "error"; value: string }
  | { type: "integer"; value: number }
  | { type: "bulk"; value: string | null }
  | { type: "array"; value: RespValue[] | null };

export type ParseResult = { value: RespValue; remaining: string } | null;

export function parseRespValue(raw: string): ParseResult {
  if (!raw.length) return null;

  const crlf = raw.indexOf("\r\n");
  if (crlf === -1) return null;

  const kind = raw[0];
  const line = raw.slice(1, crlf);
  const after = raw.slice(crlf + 2);

  switch (kind) {
    case "+":
      return { value: { type: "simple", value: line }, remaining: after };

    case "-":
      return { value: { type: "error", value: line }, remaining: after };

    case ":": {
      const n = parseInt(line, 10);
      if (isNaN(n)) return null;
      return { value: { type: "integer", value: n }, remaining: after };
    }

    case "$": {
      const len = parseInt(line, 10);
      if (isNaN(len)) return null;
      if (len === -1) return { value: { type: "bulk", value: null }, remaining: after };
      if (after.length < len + 2) return null;
      const data = after.slice(0, len);
      if (after.slice(len, len + 2) !== "\r\n") return null;
      return { value: { type: "bulk", value: data }, remaining: after.slice(len + 2) };
    }

    case "*": {
      const count = parseInt(line, 10);
      if (isNaN(count)) return null;
      if (count === -1) return { value: { type: "array", value: null }, remaining: after };
      const elements: RespValue[] = [];
      let rest = after;
      for (let i = 0; i < count; i++) {
        const result = parseRespValue(rest);
        if (!result) return null;
        elements.push(result.value);
        rest = result.remaining;
      }
      return { value: { type: "array", value: elements }, remaining: rest };
    }

    default:
      return null;
  }
}

export function parseAllCommands(raw: string): RespValue[] {
  const commands: RespValue[] = [];
  let rest = raw;
  while (rest.length) {
    const result = parseRespValue(rest);
    if (!result) break;
    commands.push(result.value);
    rest = result.remaining;
  }
  return commands;
}
