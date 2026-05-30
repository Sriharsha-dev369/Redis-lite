# Redis-lite

A Redis-compatible TCP server built from scratch in TypeScript/Node.js.  
Implements the RESP protocol, key-value storage with expiry, and RDB file loading.

---

## Run

```bash
npm run dev
# or with RDB persistence
npm run dev -- --dir /path/to/rdb --dbfilename dump.rdb
```

Listens on `127.0.0.1:6379` by default.

---

## Supported Commands

| Command | Example | Response |
|---|---|---|
| `PING` | `PING` | `+PONG` |
| `ECHO` | `ECHO hello` | `"hello"` |
| `SET` | `SET key value` | `+OK` |
| `SET` with expiry | `SET key value EX 10` | `+OK` |
| `SET` with ms expiry | `SET key value PX 500` | `+OK` |
| `GET` | `GET key` | `"value"` or nil |
| `KEYS` | `KEYS *` | array of all live keys |
| `CONFIG GET` | `CONFIG GET dir` | array reply |

---

## Architecture

```
TCP socket (net)
    │
    ▼
parser.ts       — RESP protocol parser
                  handles: + - : $ * types, pipelining, nested arrays
    │
    ▼
server.ts       — command dispatcher
                  reads args[], routes to handlers
    │
    ▼
store.ts        — in-memory key-value store
                  Map<string, { value, expiresAt }>
                  lazy expiry: keys evicted on read
    ▲
    │
rdb.ts          — RDB file loader (read-only)
                  runs once at startup before first client connects
```

---

## RDB Loading

Pass `--dir` and `--dbfilename` at startup to load an existing RDB snapshot:

```bash
npm run dev -- --dir /var/lib/redis --dbfilename dump.rdb
```

Supported RDB opcodes: `0xFE` (DB select), `0xFB` (resize DB), `0xFC` (expiry ms), `0xFD` (expiry sec), `0x00` (string value), `0xFF` (EOF).  
Keys already expired at load time are silently skipped.

---

## Test

```bash
# connect interactively
redis-cli -p 6379

# raw wire format (shows actual RESP bytes)
printf "*2\r\n\$4\r\nECHO\r\n\$5\r\nhello\r\n" | nc 127.0.0.1 6379

# stress test — 20 concurrent clients
npx tsx src/stress-test.ts
```
