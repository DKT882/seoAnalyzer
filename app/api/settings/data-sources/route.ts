import { NextResponse } from 'next/server';
import { DataProviderRegistry } from '@/lib/providers';

export const dynamic = 'force-dynamic';

export async function GET() {
  const providers = DataProviderRegistry.getProviders();
  return NextResponse.json({
    providers,
    disclaimer: 'Zero metric fabrication: external metrics require real API keys or OAuth authentication.',
  });
}
