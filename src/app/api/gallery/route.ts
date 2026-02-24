import { NextRequest, NextResponse } from 'next/server';
import { getGallery } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const page = Math.max(1, parseInt(params.get('page') || '1'));
    const perPage = Math.min(50, Math.max(1, parseInt(params.get('per_page') || '20')));
    const styleTag = params.get('style') || undefined;
    const search = params.get('search') || undefined;
    const dateFrom = params.get('date_from') || undefined;
    const dateTo = params.get('date_to') || undefined;

    const result = await getGallery(page, perPage, styleTag, search, dateFrom, dateTo);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Gallery error:', error);
    return NextResponse.json({ error: 'Failed to load gallery' }, { status: 500 });
  }
}
