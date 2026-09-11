import 'server-only';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { config } from '../config';
import { logger } from '../utils/logger';

let dbInstance: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (dbInstance) return dbInstance;

  const dbPath = path.resolve(config.databasePath);
  const dbDir = path.dirname(dbPath);

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  logger.info(`Initializing SQLite database at: ${dbPath}`);
  dbInstance = new Database(dbPath);

  // Enable WAL mode and foreign keys for high concurrent performance
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  initSchema(dbInstance);
  return dbInstance;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS analysis_jobs (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      normalized_url TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      error_message TEXT
    );

    CREATE TABLE IF NOT EXISTS analyzed_pages (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      status_code INTEGER NOT NULL,
      content_type TEXT,
      response_time_ms INTEGER,
      page_size_bytes INTEGER,
      title TEXT,
      meta_description TEXT,
      canonical_url TEXT,
      is_indexable INTEGER
    );

    CREATE TABLE IF NOT EXISTS extracted_keywords (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
      keyword TEXT NOT NULL,
      n_gram_type TEXT NOT NULL,
      category TEXT NOT NULL,
      frequency INTEGER NOT NULL,
      density REAL NOT NULL,
      prominence_score REAL NOT NULL,
      overall_score REAL NOT NULL,
      in_title INTEGER,
      in_h1 INTEGER,
      in_h2_h6 INTEGER,
      in_meta INTEGER,
      in_url INTEGER,
      in_anchor INTEGER,
      in_alt INTEGER,
      in_body INTEGER
    );

    CREATE TABLE IF NOT EXISTS seo_metrics (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
      overall_score INTEGER NOT NULL,
      on_page_score INTEGER NOT NULL,
      technical_score INTEGER NOT NULL,
      content_score INTEGER NOT NULL,
      links_score INTEGER NOT NULL,
      mobile_score INTEGER NOT NULL,
      word_count INTEGER,
      reading_time_min REAL,
      text_ratio REAL
    );

    CREATE TABLE IF NOT EXISTS technical_issues (
      id TEXT PRIMARY KEY,
      job_id TEXT NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
      code TEXT NOT NULL,
      category TEXT NOT NULL,
      severity TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      why_it_matters TEXT,
      recommendation TEXT,
      affected_element TEXT
    );

    CREATE TABLE IF NOT EXISTS cached_reports (
      job_id TEXT PRIMARY KEY REFERENCES analysis_jobs(id) ON DELETE CASCADE,
      report_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS crawl_sessions (
      id TEXT PRIMARY KEY,
      url TEXT NOT NULL,
      domain TEXT NOT NULL,
      max_pages INTEGER NOT NULL,
      pages_discovered INTEGER DEFAULT 0,
      pages_analyzed INTEGER DEFAULT 0,
      pages_failed INTEGER DEFAULT 0,
      pages_skipped INTEGER DEFAULT 0,
      status TEXT NOT NULL,
      created_at TEXT NOT NULL,
      completed_at TEXT,
      error_message TEXT,
      report_json TEXT
    );

    CREATE TABLE IF NOT EXISTS crawl_pages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL REFERENCES crawl_sessions(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      status_code INTEGER,
      overall_score INTEGER,
      on_page_score INTEGER,
      technical_score INTEGER,
      content_score INTEGER,
      links_score INTEGER,
      word_count INTEGER,
      keywords_count INTEGER,
      title TEXT,
      meta_description TEXT,
      h1 TEXT,
      is_indexable INTEGER,
      response_time_ms INTEGER,
      issues_count INTEGER,
      report_json TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS seo_provider_cache (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      cache_key TEXT NOT NULL UNIQUE,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS keyword_market_data (
      id TEXT PRIMARY KEY,
      keyword TEXT NOT NULL,
      country TEXT NOT NULL,
      language TEXT NOT NULL,
      provider TEXT NOT NULL,
      search_volume INTEGER,
      keyword_difficulty REAL,
      cpc REAL,
      competition REAL,
      serp_features TEXT,
      top_competitors TEXT,
      volume_trend TEXT,
      updated_at TEXT NOT NULL,
      UNIQUE(keyword, country, language, provider)
    );

    CREATE TABLE IF NOT EXISTS serp_results (
      id TEXT PRIMARY KEY,
      keyword TEXT NOT NULL,
      country TEXT NOT NULL,
      language TEXT NOT NULL,
      provider TEXT NOT NULL,
      total_results INTEGER,
      items_json TEXT NOT NULL,
      features_json TEXT,
      competitor_domains_json TEXT,
      created_at TEXT NOT NULL,
      UNIQUE(keyword, country, language, provider)
    );

    CREATE INDEX IF NOT EXISTS idx_kmd_lookup ON keyword_market_data(keyword, country, language);
    CREATE INDEX IF NOT EXISTS idx_serp_lookup ON serp_results(keyword, country, language);
    CREATE INDEX IF NOT EXISTS idx_provider_cache ON seo_provider_cache(cache_key);
  `);
}
