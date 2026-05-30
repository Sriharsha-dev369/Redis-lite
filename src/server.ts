import net from "net";
import { parseAllCommands } from "./parser.js";
import type { RespValue } from "./parser.js";
import * as store from "./store.js";
import { loadRDB } from "./rdb.js";

// Parse --dir and --dbfilename from process.argv
function getArg(flag: string): string {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1]! : "";
}

const config = {
  dir: getArg("--dir"),
  dbfilename: getArg("--dbfilename"),
};

const PORT = 6379;

function bulkString(s: string): string {
  return `$${s.length}\r\n${s}\r\n`;
}

function errorReply(msg: string): string {
  return `-ERR ${msg}\r\n`;
}

const NULL_BULK = "$-1\r\n";

function arrayReply(items: string[]): string {
  const parts = [`*${items.length}\r\n`];
  for (const item of items) parts.push(bulkString(item));
  return parts.join("");
}

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
          socket.write(
            errorReply("wrong number of arguments for 'echo' command"),
          );
        } else {
          socket.write(bulkString(args[1]!));
        }
      } else if (cmd === "SET") {
        if (args.length < 3) {
          socket.write(
            errorReply("wrong number of arguments for 'set' command"),
          );
        } else {
          const key = args[1]!;
          const value = args[2]!;
          let expiresAt: number | null = null;
          let err: string | null = null;

          let i = 3;
          while (i < args.length) {
            const opt = args[i]!.toUpperCase();
            if (opt === "EX" || opt === "PX") {
              const n = Number(args[i + 1]);
              if (!args[i + 1] || !Number.isInteger(n) || n <= 0) {
                err = "invalid expire time in 'set' command";
                break;
              }
              expiresAt = Date.now() + (opt === "EX" ? n * 1000 : n);
              i += 2;
            } else {
              err = "syntax error";
              break;
            }
          }

          if (err) {
            socket.write(errorReply(err));
          } else {
            store.set(key, value, expiresAt);
            socket.write("+OK\r\n");
          }
        }
      } else if (cmd === "GET") {
        if (args.length < 2) {
          socket.write(
            errorReply("wrong number of arguments for 'get' command"),
          );
        } else {
          const value = store.get(args[1]!);
          socket.write(value === null ? NULL_BULK : bulkString(value));
        }
      } else if (cmd === "CONFIG" && args[1]?.toUpperCase() === "GET") {
        const param = args[2]?.toLowerCase();
        if (param === "dir") {
          socket.write(arrayReply(["dir", config.dir]));
        } else if (param === "dbfilename") {
          socket.write(arrayReply(["dbfilename", config.dbfilename]));
        } else {
          socket.write(arrayReply([]));
        }
      } else if (cmd === "KEYS") {
        const pattern = args[1];
        if (!pattern) {
          socket.write(errorReply("wrong number of arguments for 'keys' command"));
        } else {
          // Only support * for now
          const all = store.keys();
          socket.write(arrayReply(all));
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

if (config.dir && config.dbfilename) {
  loadRDB(config.dir, config.dbfilename);
}

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[*] Listening on port ${PORT}`);
});
