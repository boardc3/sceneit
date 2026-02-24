import { NextResponse } from 'next/server';
import { verifyAdmin, adminUnauthorized } from '../../../../lib/auth';
import { getAdminStats } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await verifyAdmin())) return adminUnauthorized();
  try {
    const stats = await getAdminStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to load stats' }, { status: 500 });
  }
}
