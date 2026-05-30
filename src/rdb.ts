import fs from "fs";
import path from "path";
import * as store from "./store.js";

const MAGIC_HEADER_LENGTH = 9; // "REDIS" + 4-char version

function readString(buf: Buffer, offset: number): { value: string; newOffset: number } {
  const len = buf[offset]! & 0x3f;
  offset += 1;
  const value = buf.subarray(offset, offset + len).toString("utf8");
  return { value, newOffset: offset + len };
}

export function loadRDB(dir: string, dbfilename: string): void {
  const filepath = path.join(dir, dbfilename);

  if (!fs.existsSync(filepath)) return;

  const buf = fs.readFileSync(filepath);
  let offset = MAGIC_HEADER_LENGTH;
  let expiresAt: number | null = null;

  while (offset < buf.length) {
    const byte = buf[offset]!;
    offset += 1;

    if (byte === 0xff) break; // EOF marker

    if (byte === 0xfe) {
      // DB selector — skip 1 byte (db index)
      offset += 1;
      continue;
    }

    if (byte === 0xfb) {
      // Resize DB — skip 2 length-encoded ints (hash table sizes)
      // Each is a simple 1-byte 6-bit length for our purposes
      offset += 2;
      continue;
    }

    if (byte === 0xfc) {
      // Expiry in milliseconds — 8 bytes little-endian
      expiresAt = Number(buf.readBigUInt64LE(offset));
      offset += 8;
      continue;
    }

    if (byte === 0xfd) {
      // Expiry in seconds — 4 bytes little-endian
      expiresAt = buf.readUInt32LE(offset) * 1000;
      offset += 4;
      continue;
    }

    if (byte === 0x00) {
      // Value type: string
      const keyResult = readString(buf, offset);
      offset = keyResult.newOffset;
      const valResult = readString(buf, offset);
      offset = valResult.newOffset;

      const now = Date.now();
      if (expiresAt !== null && expiresAt <= now) {
        // Already expired — skip
        expiresAt = null;
        continue;
      }

      store.set(keyResult.value, valResult.value, expiresAt);
      expiresAt = null;
      continue;
    }

    // Unknown type byte — stop parsing
    break;
  }
}
