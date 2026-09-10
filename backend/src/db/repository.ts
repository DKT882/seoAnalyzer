import { getDatabase } from './database.js';
import { AnalysisJob, JobStatus, SEOReport } from '@seo-analyzer/shared';
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
