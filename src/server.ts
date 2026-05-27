import net from "net";
import { parseAllCommands } from "./parser.js";
import type { RespValue } from "./parser.js";
import * as store from "./store.js";

const PORT = 6379;

function bulkString(s: string): string {
  return `$${s.length}\r\n${s}\r\n`;
}

function errorReply(msg: string): string {
  return `-ERR ${msg}\r\n`;
}

const NULL_BULK = "$-1\r\n";

function getArgs(val: RespValue): string[] | null {
  if (val.type !== "array" || val.value === null) return null;
  const args: string[] = [];
  for (const el of val.value) {
    if (el.type !== "bulk" || el.value === null) return null;
    args.push(el.value);
  }
  return args;
}

const server = net.createServer((socket) => {
  const addr = `${socket.remoteAddress}:${socket.remotePort}`;
  console.log(`[+] Client connected: ${addr}`);

  socket.on("data", (data) => {
    const commands = parseAllCommands(data.toString());

    for (const val of commands) {
      const args = getArgs(val);
      if (!args || args.length === 0) {
        socket.write(errorReply("invalid command format"));
        continue;
      }

      const cmd = args[0]!.toUpperCase();

      if (cmd === "PING") {
        socket.write("+PONG\r\n");
      } else if (cmd === "ECHO") {
        if (args.length < 2) {
          socket.write(errorReply("wrong number of arguments for 'echo' command"));
        } else {
          socket.write(bulkString(args[1]!));
        }
      } else if (cmd === "SET") {
        if (args.length < 3) {
          socket.write(errorReply("wrong number of arguments for 'set' command"));
        } else {
          store.set(args[1]!, args[2]!);
          socket.write("+OK\r\n");
        }
      } else if (cmd === "GET") {
        if (args.length < 2) {
          socket.write(errorReply("wrong number of arguments for 'get' command"));
        } else {
          const value = store.get(args[1]!);
          socket.write(value === null ? NULL_BULK : bulkString(value));
        }
      } else {
        socket.write(errorReply(`unknown command '${args[0]!}'`));
      }
    }
  });

  socket.on("end", () => {
    console.log(`[-] Client disconnected: ${addr}`);
  });

  socket.on("error", (err) => {
    console.error(`[!] Socket error (${addr}):`, err.message);
  });
});

server.on("error", (err) => {
  console.error("[!] Server error:", err.message);
  process.exit(1);
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[*] Listening on port ${PORT}`);
});
