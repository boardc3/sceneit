import { NextRequest, NextResponse } from 'next/server';
import { loginAdmin, verifyAdmin } from '../../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    return loginAdmin(password);
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}

export async function GET() {
  const isAdmin = await verifyAdmin();
  return NextResponse.json({ authenticated: isAdmin });
}
