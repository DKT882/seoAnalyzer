import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'SEO Keyword & Website Analyzer API (Next.js Unified)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    config: {
      port: config.port,
      environment: config.nodeEnv,
      crawlerUserAgent: config.crawlerUserAgent,
    },
  });
}

