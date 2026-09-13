import { NextRequest, NextResponse } from 'next/server';
import { checkAIHealth, runAIDiagnostic } from '@/lib/ai-seo/health-check';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = await checkAIHealth();
    return NextResponse.json({
      success: true,
      health,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Failed to check AI status',
        fallbackAvailable: true,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const diagnostic = await runAIDiagnostic(body.testPrompt);
    return NextResponse.json({
      success: diagnostic.success,
      diagnostic,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Diagnostic execution failed',
      },
      { status: 500 }
    );
  }
}
