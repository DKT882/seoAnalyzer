import { NextRequest, NextResponse } from 'next/server';
import { jobRepository } from '@/lib/db/repository';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const id = params.id;
  const job = jobRepository.getJobById(id);

  if (!job) {
    return NextResponse.json(
      { error: `Analysis job with ID "${id}" was not found.` },
      { status: 404 }
    );
  }

  return NextResponse.json(job);
}
