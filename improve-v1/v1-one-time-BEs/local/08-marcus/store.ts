/** Isolated local fixtures only. Never opens a remote database or loads environment files. */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export class LocalStore {
  private readonly db: DatabaseSync;
  private inTransaction = false;
  constructor(public readonly path = ':memory:') {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS records (namespace TEXT NOT NULL, key TEXT NOT NULL, value TEXT NOT NULL, PRIMARY KEY(namespace,key))');
  }
  get<T>(namespace: string, key: string): T | undefined {
    const row = this.db.prepare('SELECT value FROM records WHERE namespace=? AND key=?').get(namespace, key);
    return row ? JSON.parse(row.value as string) as T : undefined;
  }
  put(namespace: string, key: string, value: unknown): void {
    this.db.prepare('INSERT INTO records(namespace,key,value) VALUES(?,?,?) ON CONFLICT(namespace,key) DO UPDATE SET value=excluded.value').run(namespace, key, JSON.stringify(value));
  }
  insert(namespace: string, key: string, value: unknown): void {
    this.db.prepare('INSERT INTO records(namespace,key,value) VALUES(?,?,?)').run(namespace, key, JSON.stringify(value));
  }
  update<T>(namespace: string, key: string, change: (value: T) => T): T {
    return this.transaction(() => {
      const value = this.get<T>(namespace, key);
      if (value === undefined) throw new Error('Local record not found.');
      const next = change(value); this.put(namespace, key, next); return next;
    });
  }
  /** Callbacks must be synchronous: no requests or awaited work inside a transaction. */
  transaction<T>(work: () => T): T {
    if (this.inTransaction) throw new Error('Nested local transactions are not supported.');
    this.db.exec('BEGIN IMMEDIATE'); this.inTransaction = true;
    try {
      const value = work();
      if (value && typeof (value as any).then === 'function') throw new Error('Local transactions must be synchronous.');
      this.db.exec('COMMIT'); return value;
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
    finally { this.inTransaction = false; }
  }
  close(): void { this.db.close(); }
}
