export type StoreValue = string;

const store = new Map<string, StoreValue>();

export function set(key: string, value: StoreValue): void {
  store.set(key, value);
}

export function get(key: string): StoreValue | null {
  return store.get(key) ?? null;
}

export function del(keys: string[]): number {
  let deleted = 0;
  for (const key of keys) {
    if (store.delete(key)) deleted++;
  }
  return deleted;
}

export function exists(key: string): boolean {
  return store.has(key);
}
