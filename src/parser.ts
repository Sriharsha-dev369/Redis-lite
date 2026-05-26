// Parses all RESP array commands from a raw socket string (handles pipelining).
// Returns an array of command token arrays, e.g. [["PING"], ["SET", "k", "v"]].
export function parseAllCommands(raw: string): string[][] {
  const commands: string[][] = [];
  const lines = raw.split("\r\n");
  let i = 0;

  while (i < lines.length) {
    const header = lines[i];
    if (!header || !header.startsWith("*")) break;

    const count = parseInt(header.slice(1), 10);
    if (isNaN(count)) break;
    i++;

    const args: string[] = [];
    let valid = true;

    for (let n = 0; n < count; n++) {
      const lenLine = lines[i];
      if (lenLine === undefined || !lenLine.startsWith("$")) { valid = false; break; }
      const len = parseInt(lenLine.slice(1), 10);
      i++;
      const value = lines[i];
      if (value === undefined || value.length !== len) { valid = false; break; }
      args.push(value);
      i++;
    }

    if (!valid) break;
    commands.push(args);
  }

  return commands;
}
