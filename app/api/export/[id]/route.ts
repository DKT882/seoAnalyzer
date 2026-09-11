import { NextRequest, NextResponse } from 'next/server';
import { jobRepository, crawlRepository } from '@/lib/db/repository';
import { competitorReportsCache } from '@/lib/reports/competitorCache';
import { generateExcelWorkbook, generateWebsiteExcelWorkbook } from '@/lib/reports/xlsxExporter';
import {
  exportToJson,
  exportKeywordsToCsv,
  exportPrimaryKeywordsToCsv,
  exportSecondaryKeywordsToCsv,
  exportShortTailKeywordsToCsv,
  exportLongTailKeywordsToCsv,
  exportOpportunitiesToCsv,
  exportIssuesToCsv,
  exportTagsToCsv,
  exportLinksToCsv,
  exportImagesToCsv,
  exportCompetitorComparisonToCsv,
  exportKeywordGapToCsv,
  exportContentGapToCsv,
  generatePrintableHtml,
} from '@/lib/reports/exporter';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const id = params.id;
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get('format') || 'json').toLowerCase();
  const type = (searchParams.get('type') || 'keywords').toLowerCase();

  const job = jobRepository.getJobById(id);
  const crawlSession = crawlRepository.getCrawlSession(id);
  const compReport = competitorReportsCache.get(id);

  if (!job?.report && !compReport && !crawlSession?.report) {
    return NextResponse.json(
      { error: 'Report not found or analysis has not completed.' },
      { status: 404 }
    );
  }

  const hostname = crawlSession?.report
    ? crawlSession.report.domain.replace(/[^a-zA-Z0-9.-]/g, '_')
    : job?.report
    ? new URL(job.report.url).hostname.replace(/[^a-zA-Z0-9.-]/g, '_')
    : compReport
    ? new URL(compReport.targetUrl).hostname.replace(/[^a-zA-Z0-9.-]/g, '_')
    : 'seo_report';
  const timestamp = new Date().toISOString().slice(0, 10);

  // 1. XLSX Multi-Sheet Workbook Export
  if (format === 'xlsx') {
    if (crawlSession?.report) {
      const buffer = generateWebsiteExcelWorkbook(crawlSession.report);
      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="website_seo_intelligence_${hostname}_${timestamp}.xlsx"`,
        },
      });
    } else if (job?.report) {
      const buffer = generateExcelWorkbook(job.report, compReport);
      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="seo_intelligence_${hostname}_${timestamp}.xlsx"`,
        },
      });
    }
  }

  // 2. CSV Exports
  if (format === 'csv') {
    let csv = '';
    const filename = `seo_${type}_${hostname}_${timestamp}.csv`;

    if (job?.report) {
      switch (type) {
        case 'keywords-primary':
          csv = exportPrimaryKeywordsToCsv(job.report);
          break;
        case 'keywords-secondary':
          csv = exportSecondaryKeywordsToCsv(job.report);
          break;
        case 'keywords-shorttail':
          csv = exportShortTailKeywordsToCsv(job.report);
          break;
        case 'keywords-longtail':
          csv = exportLongTailKeywordsToCsv(job.report);
          break;
        case 'opportunities':
          csv = exportOpportunitiesToCsv(job.report);
          break;
        case 'issues':
          csv = exportIssuesToCsv(job.report);
          break;
        case 'tags':
          csv = exportTagsToCsv(job.report);
          break;
        case 'links':
          csv = exportLinksToCsv(job.report);
          break;
        case 'images':
          csv = exportImagesToCsv(job.report);
          break;
        default:
          csv = exportKeywordsToCsv(job.report);
          break;
      }
    } else if (compReport) {
      if (type === 'keyword-gap') {
        csv = exportKeywordGapToCsv(compReport);
      } else if (type === 'content-gap') {
        csv = exportContentGapToCsv(compReport);
      } else {
        csv = exportCompetitorComparisonToCsv(compReport);
      }
    }

    return new Response(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  // 3. HTML Printable Export
  if (format === 'html' && job?.report) {
    const html = generatePrintableHtml(job.report);
    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="seo_report_${hostname}_${timestamp}.html"`,
      },
    });
  }

  // 4. JSON Export
  const jsonStr = exportToJson(crawlSession?.report || job?.report || compReport!);
  return new Response(jsonStr, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="seo_report_${hostname}_${timestamp}.json"`,
    },
  });
}
