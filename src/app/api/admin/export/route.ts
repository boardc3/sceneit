import { NextRequest, NextResponse } from 'next/server';
import { verifyAdmin, adminUnauthorized } from '../../../../lib/auth';
import { exportData } from '../../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!(await verifyAdmin())) return adminUnauthorized();

  try {
    const params = request.nextUrl.searchParams;
    const format = params.get('format') || 'json';
    const type = params.get('type') || 'transformations';
    const dateFrom = params.get('date_from') || undefined;
    const dateTo = params.get('date_to') || undefined;

    const data = await exportData(type, dateFrom, dateTo);

    if (format === 'csv') {
      if (data.length === 0) {
        return new NextResponse('No data', { status: 200, headers: { 'Content-Type': 'text/csv' } });
      }
      const headers = Object.keys(data[0]);
      const csvRows = [
        headers.join(','),
        ...data.map(row => headers.map(h => {
          const val = row[h];
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '');
          return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(','))
      ];
      return new NextResponse(csvRows.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename=sceneit-${type}-${new Date().toISOString().slice(0, 10)}.csv`,
        },
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
