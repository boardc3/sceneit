import { NextRequest, NextResponse } from 'next/server';
import { saveEvents } from '../../../lib/db';
import { hashIp } from '../../../lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let body: { events?: Array<Record<string, unknown>> };
    
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      // sendBeacon sends as text/plain
      const text = await request.text();
      body = JSON.parse(text);
    }
    
    const events = body.events;
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({ ok: true });
    }

    const ipHash = hashIp(request);
    const ua = request.headers.get('user-agent') || undefined;

    await saveEvents(events.slice(0, 50).map(e => ({
      session_id: String(e.session_id || 'unknown'),
      event_type: String(e.event_type || 'unknown'),
      event_data: (e.event_data as Record<string, unknown>) || {},
      transformation_id: e.transformation_id ? String(e.transformation_id) : undefined,
      ip_hash: ipHash,
      user_agent: ua,
      referrer: e.referrer ? String(e.referrer) : undefined,
      device_type: e.device_type ? String(e.device_type) : undefined,
      screen_size: e.screen_size ? String(e.screen_size) : undefined,
    })));

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Events ingestion error:', error);
    return NextResponse.json({ ok: true }); // Don't fail client
  }
}
