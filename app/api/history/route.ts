import { NextRequest, NextResponse } from 'next/server';
import { jobRepository } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get('limit');
  const limit = limitParam ? parseInt(limitParam, 10) : 30;

  const history = jobRepository.getHistory(limit);
  return NextResponse.json({ history });
}
