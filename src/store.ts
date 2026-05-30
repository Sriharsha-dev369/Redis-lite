type Entry = {
  value: string;
  expiresAt: number | null;
};

const store = new Map<string, Entry>();

export function set(key: string, value: string, expiresAt: number | null = null): void {
  store.set(key, { value, expiresAt });
}

export function get(key: string): string | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

export function del(keys: string[]): number {
  let deleted = 0;
  for (const key of keys) {
    if (store.delete(key)) deleted++;
  }
  return deleted;
}

export function exists(key: string): boolean {
  return get(key) !== null;
}

export function keys(): string[] {
  const result: string[] = [];
  for (const key of store.keys()) {
    if (get(key) !== null) result.push(key);
  }
  return result;
}
