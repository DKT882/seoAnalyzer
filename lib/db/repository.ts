import 'server-only';
import { getDatabase } from './database';
import {
  AnalysisJob,
  JobStatus,
  SEOReport,
  CrawlSession,
  CrawlStatus,
  CrawlProgressStats,
  CrawlPageSummary,
  WebsiteCrawlReport,
} from '@/types';
import crypto from 'node:crypto';

export const jobRepository = {
  createJob(url: string, normalizedUrl: string): AnalysisJob {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const status: JobStatus = 'pending';

    const stmt = db.prepare(`
      INSERT INTO analysis_jobs (id, url, normalized_url, status, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(id, url, normalizedUrl, status, createdAt);

    return {
      id,
      url,
      normalizedUrl,
      status,
      createdAt,
    };
  },

  updateJobStatus(jobId: string, status: JobStatus, errorMessage?: string): void {
    const db = getDatabase();
    const completedAt = status === 'completed' || status === 'failed' ? new Date().toISOString() : null;

    const stmt = db.prepare(`
      UPDATE analysis_jobs
      SET status = ?, completed_at = ?, error_message = ?
      WHERE id = ?
    `);
    stmt.run(status, completedAt, errorMessage || null, jobId);
  },

  saveReport(jobId: string, report: SEOReport): void {
    const db = getDatabase();

    // Use a transaction for all related inserts
    const insertTransaction = db.transaction(() => {
      // 1. Update job status
      const completedAt = new Date().toISOString();
      db.prepare(`
        UPDATE analysis_jobs
        SET status = 'completed', completed_at = ?, error_message = NULL
        WHERE id = ?
      `).run(completedAt, jobId);

      // 2. Insert Analyzed Page
      db.prepare(`
        INSERT OR REPLACE INTO analyzed_pages (
          id, job_id, url, status_code, content_type, response_time_ms, page_size_bytes,
          title, meta_description, canonical_url, is_indexable
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        jobId,
        report.url,
        report.technical.httpStatus,
        report.technical.contentType,
        report.technical.responseTimeMs,
        report.technical.pageSizeBytes,
        report.onPage.title,
        report.onPage.metaDescription,
        report.onPage.canonicalUrl,
        report.technical.isIndexable ? 1 : 0
      );

      // 3. Insert SEO Metrics
      db.prepare(`
        INSERT OR REPLACE INTO seo_metrics (
          id, job_id, overall_score, on_page_score, technical_score, content_score,
          links_score, mobile_score, word_count, reading_time_min, text_ratio
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        crypto.randomUUID(),
        jobId,
        report.scores.overall,
        report.scores.onPage,
        report.scores.technical,
        report.scores.content,
        report.scores.links,
        report.scores.mobile,
        report.onPage.wordCount,
        report.onPage.readingTimeMinutes,
        report.onPage.textToHtmlRatio
      );

      // 4. Insert Top Keywords
      const kwStmt = db.prepare(`
        INSERT INTO extracted_keywords (
          id, job_id, keyword, n_gram_type, category, frequency, density,
          prominence_score, overall_score, in_title, in_h1, in_h2_h6, in_meta,
          in_url, in_anchor, in_alt, in_body
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const kw of report.keywords.all.slice(0, 50)) {
        kwStmt.run(
          crypto.randomUUID(),
          jobId,
          kw.keyword,
          kw.nGramType,
          kw.category,
          kw.frequency,
          kw.density,
          kw.prominenceScore,
          kw.overallScore,
          kw.inTitle ? 1 : 0,
          kw.inH1 ? 1 : 0,
          kw.inH2H6 ? 1 : 0,
          kw.inMeta ? 1 : 0,
          kw.inUrl ? 1 : 0,
          kw.inAnchor ? 1 : 0,
          kw.inAlt ? 1 : 0,
          kw.inBody ? 1 : 0
        );
      }

      // 5. Insert Technical Issues
      const issueStmt = db.prepare(`
        INSERT INTO technical_issues (
          id, job_id, code, category, severity, title, description,
          why_it_matters, recommendation, affected_element
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      for (const issue of report.issues) {
        issueStmt.run(
          crypto.randomUUID(),
          jobId,
          issue.code,
          issue.category,
          issue.severity,
          issue.title,
          issue.description,
          issue.whyItMatters,
          issue.recommendation,
          issue.affectedElement || null
        );
      }

      // 6. Save Cached Full Report JSON
      db.prepare(`
        INSERT OR REPLACE INTO cached_reports (job_id, report_json, created_at)
        VALUES (?, ?, ?)
      `).run(jobId, JSON.stringify(report), completedAt);
    });

    insertTransaction();
  },

  getJobById(jobId: string): AnalysisJob | null {
    const db = getDatabase();
    const row = db.prepare(`SELECT * FROM analysis_jobs WHERE id = ?`).get(jobId) as any;
    if (!row) return null;

    let report: SEOReport | undefined;
    if (row.status === 'completed') {
      const cacheRow = db.prepare(`SELECT report_json FROM cached_reports WHERE job_id = ?`).get(jobId) as any;
      if (cacheRow && cacheRow.report_json) {
        try {
          report = JSON.parse(cacheRow.report_json);
        } catch {
          // ignore cache parse error
        }
      }
    }

    return {
      id: row.id,
      url: row.url,
      normalizedUrl: row.normalized_url,
      status: row.status,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      errorMessage: row.error_message,
      report,
    };
  },

  getHistory(limit = 30): Array<{
    id: string;
    url: string;
    createdAt: string;
    status: JobStatus;
    overallScore?: number;
    wordCount?: number;
    title?: string;
  }> {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT 
        j.id,
        j.url,
        j.created_at,
        j.status,
        m.overall_score,
        m.word_count,
        p.title
      FROM analysis_jobs j
      LEFT JOIN seo_metrics m ON j.id = m.job_id
      LEFT JOIN analyzed_pages p ON j.id = p.job_id
      ORDER BY j.created_at DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map((r) => ({
      id: r.id,
      url: r.url,
      createdAt: r.created_at,
      status: r.status,
      overallScore: r.overall_score !== null ? r.overall_score : undefined,
      wordCount: r.word_count !== null ? r.word_count : undefined,
      title: r.title || undefined,
    }));
  },
};

export const crawlRepository = {
  createCrawlSession(url: string, domain: string, maxPages: number): CrawlSession {
    const db = getDatabase();
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const status: CrawlStatus = 'pending';

    const stmt = db.prepare(`
      INSERT INTO crawl_sessions (id, url, domain, max_pages, pages_discovered, pages_analyzed, pages_failed, pages_skipped, status, created_at)
      VALUES (?, ?, ?, ?, 0, 0, 0, 0, ?, ?)
    `);
    stmt.run(id, url, domain, maxPages, status, createdAt);

    return {
      id,
      url,
      maxPages,
      status,
      createdAt,
      progress: {
        discovered: 0,
        queued: 0,
        analyzed: 0,
        failed: 0,
        skipped: 0,
        elapsedTimeMs: 0,
        percentComplete: 0,
      },
    };
  },

  updateCrawlProgress(
    sessionId: string,
    stats: Partial<CrawlProgressStats>,
    status?: CrawlStatus,
    currentUrl?: string
  ): void {
    const db = getDatabase();
    const sets: string[] = [];
    const params: any[] = [];

    if (stats.discovered !== undefined) {
      sets.push('pages_discovered = ?');
      params.push(stats.discovered);
    }
    if (stats.analyzed !== undefined) {
      sets.push('pages_analyzed = ?');
      params.push(stats.analyzed);
    }
    if (stats.failed !== undefined) {
      sets.push('pages_failed = ?');
      params.push(stats.failed);
    }
    if (stats.skipped !== undefined) {
      sets.push('pages_skipped = ?');
      params.push(stats.skipped);
    }
    if (status) {
      sets.push('status = ?');
      params.push(status);
    }

    if (sets.length > 0) {
      params.push(sessionId);
      db.prepare(`UPDATE crawl_sessions SET ${sets.join(', ')} WHERE id = ?`).run(...params);
    }
  },

  saveCrawlPage(sessionId: string, pageSummary: CrawlPageSummary, report?: SEOReport): void {
    const db = getDatabase();
    const reportJson = report ? JSON.stringify(report) : null;
    const createdAt = new Date().toISOString();

    db.prepare(`
      INSERT OR REPLACE INTO crawl_pages (
        id, session_id, url, status_code, overall_score, on_page_score, technical_score,
        content_score, links_score, word_count, keywords_count, title, meta_description,
        h1, is_indexable, response_time_ms, issues_count, report_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      pageSummary.id || crypto.randomUUID(),
      sessionId,
      pageSummary.url,
      pageSummary.statusCode,
      pageSummary.overallScore,
      pageSummary.onPageScore,
      pageSummary.technicalScore,
      pageSummary.contentScore,
      pageSummary.linksScore,
      pageSummary.wordCount,
      pageSummary.keywordsCount,
      pageSummary.title,
      pageSummary.metaDescription || null,
      pageSummary.h1 || null,
      pageSummary.isIndexable ? 1 : 0,
      pageSummary.responseTimeMs,
      pageSummary.issuesCount,
      reportJson,
      createdAt
    );
  },

  completeCrawlSession(sessionId: string, report: WebsiteCrawlReport): void {
    const db = getDatabase();
    const completedAt = new Date().toISOString();

    db.prepare(`
      UPDATE crawl_sessions
      SET status = 'completed', completed_at = ?, pages_analyzed = ?, pages_discovered = ?,
          pages_failed = ?, pages_skipped = ?, report_json = ?, error_message = NULL
      WHERE id = ?
    `).run(
      completedAt,
      report.overview.coverage.pagesAnalyzed,
      report.overview.coverage.pagesDiscovered,
      report.overview.coverage.pagesFailed,
      report.overview.coverage.pagesSkipped,
      JSON.stringify(report),
      sessionId
    );
  },

  failCrawlSession(sessionId: string, errorMessage: string): void {
    const db = getDatabase();
    const completedAt = new Date().toISOString();

    db.prepare(`
      UPDATE crawl_sessions
      SET status = 'failed', completed_at = ?, error_message = ?
      WHERE id = ?
    `).run(completedAt, errorMessage, sessionId);
  },

  cancelCrawlSession(sessionId: string): void {
    const db = getDatabase();
    const completedAt = new Date().toISOString();

    db.prepare(`
      UPDATE crawl_sessions
      SET status = 'cancelled', completed_at = ?
      WHERE id = ?
    `).run(completedAt, sessionId);
  },

  getCrawlSession(sessionId: string): CrawlSession | null {
    const db = getDatabase();
    const row = db.prepare(`SELECT * FROM crawl_sessions WHERE id = ?`).get(sessionId) as any;
    if (!row) return null;

    let report: WebsiteCrawlReport | undefined;
    if (row.report_json) {
      try {
        report = JSON.parse(row.report_json);
      } catch {
        // ignore JSON parse error
      }
    }

    const elapsedMs = row.completed_at
      ? new Date(row.completed_at).getTime() - new Date(row.created_at).getTime()
      : Date.now() - new Date(row.created_at).getTime();

    const percent = row.max_pages > 0
      ? Math.min(100, Math.round((row.pages_analyzed / Math.min(row.max_pages, Math.max(1, row.pages_discovered))) * 100))
      : 0;

    return {
      id: row.id,
      url: row.url,
      maxPages: row.max_pages,
      status: row.status,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      errorMessage: row.error_message,
      progress: {
        discovered: row.pages_discovered,
        queued: Math.max(0, row.pages_discovered - row.pages_analyzed - row.pages_failed - row.pages_skipped),
        analyzed: row.pages_analyzed,
        failed: row.pages_failed,
        skipped: row.pages_skipped,
        elapsedTimeMs: elapsedMs,
        percentComplete: row.status === 'completed' ? 100 : percent,
      },
      report,
    };
  },

  getCrawlPages(sessionId: string): CrawlPageSummary[] {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT id, url, status_code, overall_score, on_page_score, technical_score,
             content_score, links_score, word_count, keywords_count, title,
             meta_description, h1, is_indexable, response_time_ms, issues_count
      FROM crawl_pages
      WHERE session_id = ?
      ORDER BY overall_score DESC
    `).all(sessionId) as any[];

    return rows.map((r) => ({
      id: r.id,
      url: r.url,
      statusCode: r.status_code,
      overallScore: r.overall_score,
      onPageScore: r.on_page_score,
      technicalScore: r.technical_score,
      contentScore: r.content_score,
      linksScore: r.links_score,
      wordCount: r.word_count,
      keywordsCount: r.keywords_count,
      title: r.title || 'Untitled',
      metaDescription: r.meta_description || undefined,
      h1: r.h1 || undefined,
      isIndexable: Boolean(r.is_indexable),
      responseTimeMs: r.response_time_ms,
      issuesCount: r.issues_count,
    }));
  },

  getPageReport(sessionId: string, pageUrl: string): SEOReport | null {
    const db = getDatabase();
    const row = db.prepare(`
      SELECT report_json FROM crawl_pages
      WHERE session_id = ? AND url = ?
    `).get(sessionId, pageUrl) as any;

    if (!row || !row.report_json) return null;
    try {
      return JSON.parse(row.report_json);
    } catch {
      return null;
    }
  },

  getCrawlHistory(limit = 20): Array<{
    id: string;
    url: string;
    domain: string;
    maxPages: number;
    pagesAnalyzed: number;
    status: CrawlStatus;
    createdAt: string;
  }> {
    const db = getDatabase();
    const rows = db.prepare(`
      SELECT id, url, domain, max_pages, pages_analyzed, status, created_at
      FROM crawl_sessions
      ORDER BY created_at DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map((r) => ({
      id: r.id,
      url: r.url,
      domain: r.domain,
      maxPages: r.max_pages,
      pagesAnalyzed: r.pages_analyzed,
      status: r.status,
      createdAt: r.created_at,
    }));
  },
};

