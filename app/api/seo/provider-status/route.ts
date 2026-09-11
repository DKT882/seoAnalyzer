import { NextResponse } from 'next/server';
import { getSEOProvider } from '@/lib/providers/seo/providerFactory';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const provider = getSEOProvider();
    const status = await provider.getStatus();

    return NextResponse.json({
      success: true,
      data: status,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to retrieve provider status',
      },
      { status: 500 }
    );
  }
}
