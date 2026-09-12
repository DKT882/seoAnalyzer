import { NormalizedSerpSnapshot } from './searchTypes';
import { getDatabase } from '../db/database';
import { logger } from '../utils/logger';

export interface SerpSnapshotStore {
  getSnapshot(fingerprint: string): Promise<NormalizedSerpSnapshot | null>;
  saveSnapshot(snapshot: NormalizedSerpSnapshot): Promise<void>;
  listSnapshots(options?: { query?: string; limit?: number }): Promise<NormalizedSerpSnapshot[]>;
  deleteSnapshot(id: string): Promise<boolean>;
}

/**
 * In-Memory Snapshot Store implementation (used in unit tests and memory fallback).
 */
export class MemorySerpSnapshotStore implements SerpSnapshotStore {
  private snapshots = new Map<string, NormalizedSerpSnapshot>(); // key = fingerprint

  public async getSnapshot(fingerprint: string): Promise<NormalizedSerpSnapshot | null> {
    const snap = this.snapshots.get(fingerprint);
    if (!snap) return null;

    const ageMinutes = Math.floor((Date.now() - new Date(snap.collectedAt).getTime()) / 60000);
    return {
      ...snap,
      freshnessAgeMinutes: Math.max(0, ageMinutes),
    };
  }

  public async saveSnapshot(snapshot: NormalizedSerpSnapshot): Promise<void> {
    this.snapshots.set(snapshot.fingerprint, { ...snapshot });
  }

  public async listSnapshots(options: { query?: string; limit?: number } = {}): Promise<NormalizedSerpSnapshot[]> {
    let list = Array.from(this.snapshots.values());
    if (options.query) {
      const q = options.query.toLowerCase().trim();
      list = list.filter((s) => s.normalizedQuery.toLowerCase().includes(q));
    }
    list.sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime());
    return list.slice(0, options.limit || 50);
  }

  public async deleteSnapshot(id: string): Promise<boolean> {
    for (const [key, snap] of this.snapshots.entries()) {
      if (snap.id === id || snap.fingerprint === id) {
        this.snapshots.delete(key);
        return true;
      }
    }
    return false;
  }
}

/**
 * SQLite Snapshot Store implementation.
 */
export class SqliteSerpSnapshotStore implements SerpSnapshotStore {
  public async getSnapshot(fingerprint: string): Promise<NormalizedSerpSnapshot | null> {
    try {
      const db = getDatabase();
      const row = db
        .prepare('SELECT data_json, collected_at FROM serp_snapshots WHERE fingerprint = ?')
        .get(fingerprint) as { data_json: string; collected_at: string } | undefined;

      if (!row) return null;

      const snap: NormalizedSerpSnapshot = JSON.parse(row.data_json);
      const ageMinutes = Math.floor((Date.now() - new Date(row.collected_at).getTime()) / 60000);
      snap.freshnessAgeMinutes = Math.max(0, ageMinutes);
      return snap;
    } catch (err) {
      logger.warn(`Failed to retrieve SERP snapshot for fingerprint ${fingerprint} from SQLite:`, err);
      return null;
    }
  }

  public async saveSnapshot(snapshot: NormalizedSerpSnapshot): Promise<void> {
    try {
      const db = getDatabase();
      db.prepare(`
        INSERT INTO serp_snapshots (
          id, fingerprint, query, normalized_query, provider, location, language, device, collected_at, organic_count, data_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(fingerprint) DO UPDATE SET
          data_json = excluded.data_json,
          collected_at = excluded.collected_at,
          organic_count = excluded.organic_count
      `).run(
        snapshot.id,
        snapshot.fingerprint,
        snapshot.query,
        snapshot.normalizedQuery,
        snapshot.provider,
        snapshot.location,
        snapshot.language,
        snapshot.device,
        snapshot.collectedAt,
        snapshot.organicCount,
        JSON.stringify(snapshot)
      );
    } catch (err) {
      logger.warn(`Failed to save SERP snapshot ${snapshot.id} to SQLite:`, err);
    }
  }

  public async listSnapshots(options: { query?: string; limit?: number } = {}): Promise<NormalizedSerpSnapshot[]> {
    try {
      const db = getDatabase();
      const limit = options.limit || 50;

      let rows: Array<{ data_json: string; collected_at: string }>;
      if (options.query) {
        const q = `%${options.query.toLowerCase().trim()}%`;
        rows = db
          .prepare(
            'SELECT data_json, collected_at FROM serp_snapshots WHERE normalized_query LIKE ? ORDER BY collected_at DESC LIMIT ?'
          )
          .all(q, limit) as any;
      } else {
        rows = db
          .prepare('SELECT data_json, collected_at FROM serp_snapshots ORDER BY collected_at DESC LIMIT ?')
          .all(limit) as any;
      }

      return rows.map((r) => {
        const snap: NormalizedSerpSnapshot = JSON.parse(r.data_json);
        const ageMinutes = Math.floor((Date.now() - new Date(r.collected_at).getTime()) / 60000);
        snap.freshnessAgeMinutes = Math.max(0, ageMinutes);
        return snap;
      });
    } catch (err) {
      logger.warn('Failed to list SERP snapshots from SQLite:', err);
      return [];
    }
  }

  public async deleteSnapshot(id: string): Promise<boolean> {
    try {
      const db = getDatabase();
      const res = db.prepare('DELETE FROM serp_snapshots WHERE id = ? OR fingerprint = ?').run(id, id);
      return res.changes > 0;
    } catch (err) {
      logger.warn(`Failed to delete SERP snapshot ${id} from SQLite:`, err);
      return false;
    }
  }
}

// Global storage singleton instance
let defaultStorage: SerpSnapshotStore | null = null;

export function getSerpStorage(): SerpSnapshotStore {
  if (defaultStorage) return defaultStorage;

  // Use Sqlite if database is accessible, fallback to Memory
  try {
    defaultStorage = new SqliteSerpSnapshotStore();
  } catch (err) {
    logger.warn('SQLite unavailable for SERP storage, using in-memory store fallback');
    defaultStorage = new MemorySerpSnapshotStore();
  }

  return defaultStorage;
}

export function setSerpStorageForTesting(store: SerpSnapshotStore): void {
  defaultStorage = store;
}
