import { neon } from '@neondatabase/serverless';
import type { Transformation, UsageEvent, AdminStats, GalleryResponse } from './types';

function getSQL() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

export async function saveTransformation(data: Omit<Transformation, 'id' | 'created_at'>): Promise<string | null> {
  const sql = getSQL();
  if (!sql) return null;
  try {
    const rows = await sql`
      INSERT INTO transformations (session_id, original_blob_url, enhanced_blob_url, prompt_used, style_key, style_name, processing_time_ms, original_size_bytes, enhanced_size_bytes, opt_in, user_agent, ip_hash, referrer)
      VALUES (${data.session_id}, ${data.original_blob_url}, ${data.enhanced_blob_url}, ${data.prompt_used}, ${data.style_key}, ${data.style_name}, ${data.processing_time_ms}, ${data.original_size_bytes}, ${data.enhanced_size_bytes}, ${data.opt_in}, ${data.user_agent}, ${data.ip_hash}, ${data.referrer ?? null})
      RETURNING id
    `;
    return rows[0]?.id ?? null;
  } catch (e) {
    console.error('saveTransformation error:', e);
    return null;
  }
}

export async function saveEvents(events: Array<{
  session_id: string;
  event_type: string;
  event_data: Record<string, unknown>;
  transformation_id?: string;
  ip_hash?: string;
  user_agent?: string;
  referrer?: string;
  device_type?: string;
  screen_size?: string;
}>): Promise<void> {
  const sql = getSQL();
  if (!sql) return;
  try {
    for (const e of events) {
      await sql`
        INSERT INTO usage_events (session_id, event_type, event_data, transformation_id, ip_hash, user_agent, referrer, device_type, screen_size)
        VALUES (${e.session_id}, ${e.event_type}, ${JSON.stringify(e.event_data)}, ${e.transformation_id ?? null}, ${e.ip_hash ?? null}, ${e.user_agent ?? null}, ${e.referrer ?? null}, ${e.device_type ?? null}, ${e.screen_size ?? null})
      `;
    }
  } catch (e) {
    console.error('saveEvents error:', e);
  }
}

export async function getGallery(page: number = 1, perPage: number = 20, styleKey?: string, search?: string, dateFrom?: string, dateTo?: string): Promise<GalleryResponse> {
  const sql = getSQL();
  if (!sql) return { transformations: [], total: 0, page, per_page: perPage };
  try {
    const offset = (page - 1) * perPage;
    const searchPattern = search ? `%${search}%` : '%';
    const fromDate = dateFrom || '1970-01-01';
    const toDate = dateTo || '2099-12-31';
    const styleFilter = styleKey || '';

    const countResult = await sql`
      SELECT COUNT(*) as total FROM transformations
      WHERE opt_in = true
        AND (${styleFilter} = '' OR style_key = ${styleFilter})
        AND (${search || ''} = '' OR prompt_used ILIKE ${searchPattern} OR style_name ILIKE ${searchPattern} OR style_key ILIKE ${searchPattern})
        AND created_at >= ${fromDate}
        AND created_at <= ${toDate}
    `;
    const total = parseInt(countResult[0]?.total ?? '0');

    const rows = await sql`
      SELECT * FROM transformations
      WHERE opt_in = true
        AND (${styleFilter} = '' OR style_key = ${styleFilter})
        AND (${search || ''} = '' OR prompt_used ILIKE ${searchPattern} OR style_name ILIKE ${searchPattern} OR style_key ILIKE ${searchPattern})
        AND created_at >= ${fromDate}
        AND created_at <= ${toDate}
      ORDER BY created_at DESC
      LIMIT ${perPage} OFFSET ${offset}
    `;

    return {
      transformations: rows as unknown as Transformation[],
      total,
      page,
      per_page: perPage,
    };
  } catch (e) {
    console.error('getGallery error:', e);
    return { transformations: [], total: 0, page, per_page: perPage };
  }
}

export async function getAdminStats(): Promise<AdminStats> {
  const empty: AdminStats = {
    total_transformations: 0, today_count: 0, week_count: 0, month_count: 0,
    total_storage_bytes: 0, avg_processing_time_ms: 0, opt_in_rate: 0,
    daily_counts: [], popular_styles: [], processing_distribution: [], peak_hours: [],
    funnel: { page_views: 0, uploads: 0, enhances: 0, downloads: 0 },
    attribution: [], device_breakdown: [], error_rate: 0, recent_transformations: [],
  };

  const sql = getSQL();
  if (!sql) return empty;

  try {
    // Basic counts
    const [totalRow] = await sql`SELECT COUNT(*) as c FROM transformations`;
    const [todayRow] = await sql`SELECT COUNT(*) as c FROM transformations WHERE created_at > NOW() - INTERVAL '1 day'`;
    const [weekRow] = await sql`SELECT COUNT(*) as c FROM transformations WHERE created_at > NOW() - INTERVAL '7 days'`;
    const [monthRow] = await sql`SELECT COUNT(*) as c FROM transformations WHERE created_at > NOW() - INTERVAL '30 days'`;

    const [storageRow] = await sql`SELECT COALESCE(SUM(COALESCE(original_size_bytes,0) + COALESCE(enhanced_size_bytes,0)), 0) as s FROM transformations`;
    const [avgRow] = await sql`SELECT COALESCE(AVG(processing_time_ms), 0) as a FROM transformations`;
    const [optRow] = await sql`SELECT COUNT(*) FILTER (WHERE opt_in) as yes, COUNT(*) as total FROM transformations`;

    const total = parseInt(totalRow.c);
    const optInRate = parseInt(optRow.total) > 0 ? Math.round(parseInt(optRow.yes) * 100 / parseInt(optRow.total)) : 0;

    // Daily counts
    const dailyRows = await sql`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM transformations WHERE created_at > NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at) ORDER BY date
    `;
    const daily_counts = dailyRows.map((r: Record<string, unknown>) => ({ date: String(r.date), count: parseInt(String(r.count)) }));

    // Popular styles
    const styleRows = await sql`
      SELECT COALESCE(style_key, 'default') as style, COUNT(*) as count
      FROM transformations GROUP BY style_key ORDER BY count DESC LIMIT 10
    `;
    const popular_styles = styleRows.map((r: Record<string, unknown>) => ({ style: String(r.style), count: parseInt(String(r.count)) }));

    // Processing distribution
    const procRows = await sql`
      SELECT
        CASE
          WHEN processing_time_ms < 5000 THEN '<5s'
          WHEN processing_time_ms < 15000 THEN '5-15s'
          WHEN processing_time_ms < 30000 THEN '15-30s'
          ELSE '>30s'
        END as bucket,
        COUNT(*) as count
      FROM transformations GROUP BY bucket
    `;
    const processing_distribution = procRows.map((r: Record<string, unknown>) => ({ bucket: String(r.bucket), count: parseInt(String(r.count)) }));

    // Peak hours
    const hourRows = await sql`
      SELECT EXTRACT(HOUR FROM created_at) as hour, COUNT(*) as count
      FROM transformations GROUP BY hour ORDER BY hour
    `;
    const peak_hours = hourRows.map((r: Record<string, unknown>) => ({ hour: parseInt(String(r.hour)), count: parseInt(String(r.count)) }));

    // Funnel
    const funnelRows = await sql`
      SELECT event_type, COUNT(*) as count FROM usage_events
      WHERE event_type IN ('page_view','upload_complete','enhance_complete','download')
      GROUP BY event_type
    `;
    const funnelMap = Object.fromEntries(funnelRows.map((r: Record<string, unknown>) => [r.event_type, parseInt(String(r.count))]));
    const funnel = {
      page_views: funnelMap['page_view'] || 0,
      uploads: funnelMap['upload_complete'] || 0,
      enhances: funnelMap['enhance_complete'] || 0,
      downloads: funnelMap['download'] || 0,
    };

    // Attribution
    const attrRows = await sql`
      SELECT COALESCE(event_data->>'utm_source', referrer, 'direct') as source, COUNT(*) as count
      FROM usage_events WHERE event_type = 'page_view'
      GROUP BY source ORDER BY count DESC LIMIT 10
    `;
    const attribution = attrRows.map((r: Record<string, unknown>) => ({ source: String(r.source), count: parseInt(String(r.count)) }));

    // Device breakdown
    const deviceRows = await sql`
      SELECT COALESCE(device_type, 'unknown') as device, COUNT(*) as count
      FROM usage_events WHERE event_type = 'page_view'
      GROUP BY device ORDER BY count DESC
    `;
    const device_breakdown = deviceRows.map((r: Record<string, unknown>) => ({ device: String(r.device), count: parseInt(String(r.count)) }));

    // Error rate
    const [errRow] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE event_type = 'enhance_start') as starts,
        COUNT(*) FILTER (WHERE event_type = 'enhance_error') as errors
      FROM usage_events
    `;
    const starts = parseInt(errRow.starts);
    const errors = parseInt(errRow.errors);
    const error_rate = starts > 0 ? (errors * 100 / starts) : 0;

    // Recent
    const recentRows = await sql`SELECT * FROM transformations ORDER BY created_at DESC LIMIT 20`;

    return {
      total_transformations: total,
      today_count: parseInt(todayRow.c),
      week_count: parseInt(weekRow.c),
      month_count: parseInt(monthRow.c),
      total_storage_bytes: parseInt(storageRow.s),
      avg_processing_time_ms: Math.round(parseFloat(avgRow.a)),
      opt_in_rate: optInRate,
      daily_counts,
      popular_styles,
      processing_distribution,
      peak_hours,
      funnel,
      attribution,
      device_breakdown,
      error_rate,
      recent_transformations: recentRows as unknown as Transformation[],
    };
  } catch (e) {
    console.error('getAdminStats error:', e);
    return empty;
  }
}

export async function exportData(type: string, dateFrom?: string, dateTo?: string): Promise<Record<string, unknown>[]> {
  const sql = getSQL();
  if (!sql) return [];

  try {
    const from = dateFrom || '1970-01-01';
    const to = dateTo || '2099-12-31';

    switch (type) {
      case 'transformations': {
        const rows = await sql`
          SELECT id, created_at, session_id, prompt_used, style_key, style_name, processing_time_ms, original_size_bytes, enhanced_size_bytes, opt_in
          FROM transformations WHERE created_at >= ${from} AND created_at <= ${to}
          ORDER BY created_at DESC
        `;
        return rows as unknown as Record<string, unknown>[];
      }
      case 'events': {
        const rows = await sql`
          SELECT id, transformation_id, session_id, event_type, event_data, created_at, referrer, device_type, screen_size
          FROM usage_events WHERE created_at >= ${from} AND created_at <= ${to}
          ORDER BY created_at DESC
        `;
        return rows as unknown as Record<string, unknown>[];
      }
      case 'sessions': {
        const rows = await sql`
          SELECT session_id, MIN(created_at) as first_seen, MAX(created_at) as last_seen,
                 COUNT(*) as event_count, ARRAY_AGG(DISTINCT event_type) as event_types
          FROM usage_events WHERE created_at >= ${from} AND created_at <= ${to}
          GROUP BY session_id ORDER BY first_seen DESC
        `;
        return rows as unknown as Record<string, unknown>[];
      }
      case 'attribution': {
        const rows = await sql`
          SELECT
            COALESCE(event_data->>'utm_source', 'none') as utm_source,
            COALESCE(event_data->>'utm_medium', 'none') as utm_medium,
            COALESCE(event_data->>'utm_campaign', 'none') as utm_campaign,
            COALESCE(referrer, '') as referrer,
            COUNT(*) as count
          FROM usage_events WHERE event_type = 'page_view' AND created_at >= ${from} AND created_at <= ${to}
          GROUP BY utm_source, utm_medium, utm_campaign, referrer
          ORDER BY count DESC
        `;
        return rows as unknown as Record<string, unknown>[];
      }
      default:
        return [];
    }
  } catch (e) {
    console.error('exportData error:', e);
    return [];
  }
}
