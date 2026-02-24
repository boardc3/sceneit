import { sql } from '@vercel/postgres';
import type { Transformation, UsageEvent, AdminStats, GalleryResponse } from './types';

function isDbConfigured(): boolean {
  return !!(process.env.POSTGRES_URL || process.env.DATABASE_URL);
}

export async function saveTransformation(data: Omit<Transformation, 'id' | 'created_at'>): Promise<string | null> {
  if (!isDbConfigured()) return null;
  const id = crypto.randomUUID();
  await sql`
    INSERT INTO transformations (id, session_id, original_blob_url, enhanced_blob_url, prompt_used, style_tag, processing_time_ms, original_size_bytes, enhanced_size_bytes, original_dimensions, enhanced_dimensions, opt_in, user_agent, ip_hash)
    VALUES (${id}, ${data.session_id}, ${data.original_blob_url}, ${data.enhanced_blob_url}, ${data.prompt_used}, ${data.style_tag}, ${data.processing_time_ms}, ${data.original_size_bytes}, ${data.enhanced_size_bytes}, ${data.original_dimensions}, ${data.enhanced_dimensions}, ${data.opt_in}, ${data.user_agent}, ${data.ip_hash})
  `;
  return id;
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
  if (!isDbConfigured()) return;
  for (const e of events) {
    const id = crypto.randomUUID();
    await sql`
      INSERT INTO usage_events (id, transformation_id, session_id, event_type, event_data, ip_hash, user_agent, referrer, device_type, screen_size)
      VALUES (${id}, ${e.transformation_id ?? null}, ${e.session_id}, ${e.event_type}, ${JSON.stringify(e.event_data)}, ${e.ip_hash ?? null}, ${e.user_agent ?? null}, ${e.referrer ?? null}, ${e.device_type ?? null}, ${e.screen_size ?? null})
    `;
  }
}

export async function getGallery(page: number = 1, perPage: number = 20, styleTag?: string, search?: string, dateFrom?: string, dateTo?: string): Promise<GalleryResponse> {
  if (!isDbConfigured()) return { transformations: [], total: 0, page, per_page: perPage };

  const offset = (page - 1) * perPage;
  let countResult;
  let rows;

  if (styleTag && search) {
    countResult = await sql`SELECT count(*)::int as total FROM transformations WHERE opt_in = true AND style_tag = ${styleTag} AND (prompt_used ILIKE ${'%' + search + '%'} OR style_tag ILIKE ${'%' + search + '%'})`;
    rows = await sql`SELECT * FROM transformations WHERE opt_in = true AND style_tag = ${styleTag} AND (prompt_used ILIKE ${'%' + search + '%'} OR style_tag ILIKE ${'%' + search + '%'}) ORDER BY created_at DESC LIMIT ${perPage} OFFSET ${offset}`;
  } else if (styleTag) {
    countResult = await sql`SELECT count(*)::int as total FROM transformations WHERE opt_in = true AND style_tag = ${styleTag}`;
    rows = await sql`SELECT * FROM transformations WHERE opt_in = true AND style_tag = ${styleTag} ORDER BY created_at DESC LIMIT ${perPage} OFFSET ${offset}`;
  } else if (search) {
    countResult = await sql`SELECT count(*)::int as total FROM transformations WHERE opt_in = true AND (prompt_used ILIKE ${'%' + search + '%'} OR style_tag ILIKE ${'%' + search + '%'})`;
    rows = await sql`SELECT * FROM transformations WHERE opt_in = true AND (prompt_used ILIKE ${'%' + search + '%'} OR style_tag ILIKE ${'%' + search + '%'}) ORDER BY created_at DESC LIMIT ${perPage} OFFSET ${offset}`;
  } else if (dateFrom && dateTo) {
    countResult = await sql`SELECT count(*)::int as total FROM transformations WHERE opt_in = true AND created_at >= ${dateFrom}::timestamp AND created_at <= ${dateTo}::timestamp`;
    rows = await sql`SELECT * FROM transformations WHERE opt_in = true AND created_at >= ${dateFrom}::timestamp AND created_at <= ${dateTo}::timestamp ORDER BY created_at DESC LIMIT ${perPage} OFFSET ${offset}`;
  } else {
    countResult = await sql`SELECT count(*)::int as total FROM transformations WHERE opt_in = true`;
    rows = await sql`SELECT * FROM transformations WHERE opt_in = true ORDER BY created_at DESC LIMIT ${perPage} OFFSET ${offset}`;
  }

  return {
    transformations: rows.rows as Transformation[],
    total: countResult.rows[0].total,
    page,
    per_page: perPage,
  };
}

export async function getAdminStats(): Promise<AdminStats> {
  if (!isDbConfigured()) {
    return {
      total_transformations: 0, today_count: 0, week_count: 0, month_count: 0,
      total_storage_bytes: 0, avg_processing_time_ms: 0, opt_in_rate: 0,
      daily_counts: [], popular_styles: [], processing_distribution: [], peak_hours: [],
      funnel: { page_views: 0, uploads: 0, enhances: 0, downloads: 0 },
      attribution: [], device_breakdown: [], error_rate: 0, recent_transformations: [],
    };
  }

  const [totals, today, week, month, storage, avgTime, optInRate, daily, styles, procDist, hours, funnel, attribution, devices, errors, recent] = await Promise.all([
    sql`SELECT count(*)::int as c FROM transformations`,
    sql`SELECT count(*)::int as c FROM transformations WHERE created_at >= NOW() - INTERVAL '1 day'`,
    sql`SELECT count(*)::int as c FROM transformations WHERE created_at >= NOW() - INTERVAL '7 days'`,
    sql`SELECT count(*)::int as c FROM transformations WHERE created_at >= NOW() - INTERVAL '30 days'`,
    sql`SELECT COALESCE(SUM(original_size_bytes + enhanced_size_bytes), 0)::bigint as total FROM transformations`,
    sql`SELECT COALESCE(AVG(processing_time_ms), 0)::int as avg FROM transformations`,
    sql`SELECT CASE WHEN count(*) = 0 THEN 0 ELSE (count(*) FILTER (WHERE opt_in = true) * 100.0 / count(*))::int END as rate FROM transformations`,
    sql`SELECT DATE(created_at) as date, count(*)::int as count FROM transformations WHERE created_at >= NOW() - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY date`,
    sql`SELECT COALESCE(style_tag, 'default') as style, count(*)::int as count FROM transformations GROUP BY style_tag ORDER BY count DESC LIMIT 10`,
    sql`SELECT CASE WHEN processing_time_ms < 5000 THEN '<5s' WHEN processing_time_ms < 15000 THEN '5-15s' WHEN processing_time_ms < 30000 THEN '15-30s' ELSE '>30s' END as bucket, count(*)::int as count FROM transformations GROUP BY bucket`,
    sql`SELECT EXTRACT(HOUR FROM created_at)::int as hour, count(*)::int as count FROM transformations GROUP BY hour ORDER BY hour`,
    sql`SELECT
      (SELECT count(*)::int FROM usage_events WHERE event_type = 'page_view') as page_views,
      (SELECT count(*)::int FROM usage_events WHERE event_type = 'upload_complete') as uploads,
      (SELECT count(*)::int FROM usage_events WHERE event_type = 'enhance_complete') as enhances,
      (SELECT count(*)::int FROM usage_events WHERE event_type = 'download') as downloads`,
    sql`SELECT COALESCE(event_data->>'utm_source', referrer, 'direct') as source, count(*)::int as count FROM usage_events WHERE event_type = 'page_view' GROUP BY source ORDER BY count DESC LIMIT 10`,
    sql`SELECT COALESCE(device_type, 'unknown') as device, count(*)::int as count FROM usage_events WHERE event_type = 'page_view' GROUP BY device_type ORDER BY count DESC`,
    sql`SELECT CASE WHEN count(*) = 0 THEN 0 ELSE (count(*) FILTER (WHERE event_type = 'enhance_error') * 100.0 / NULLIF(count(*) FILTER (WHERE event_type = 'enhance_start'), 0)) END as rate FROM usage_events`,
    sql`SELECT * FROM transformations ORDER BY created_at DESC LIMIT 20`,
  ]);

  return {
    total_transformations: totals.rows[0].c,
    today_count: today.rows[0].c,
    week_count: week.rows[0].c,
    month_count: month.rows[0].c,
    total_storage_bytes: Number(storage.rows[0].total),
    avg_processing_time_ms: avgTime.rows[0].avg,
    opt_in_rate: optInRate.rows[0].rate,
    daily_counts: daily.rows as AdminStats['daily_counts'],
    popular_styles: styles.rows as AdminStats['popular_styles'],
    processing_distribution: procDist.rows as AdminStats['processing_distribution'],
    peak_hours: hours.rows as AdminStats['peak_hours'],
    funnel: funnel.rows[0] as AdminStats['funnel'],
    attribution: attribution.rows as AdminStats['attribution'],
    device_breakdown: devices.rows as AdminStats['device_breakdown'],
    error_rate: Number(errors.rows[0].rate) || 0,
    recent_transformations: recent.rows as Transformation[],
  };
}

export async function exportData(type: string, dateFrom?: string, dateTo?: string): Promise<Record<string, unknown>[]> {
  if (!isDbConfigured()) return [];

  const from = dateFrom || '1970-01-01';
  const to = dateTo || '2099-12-31';

  switch (type) {
    case 'transformations': {
      const r = await sql`SELECT id, created_at, session_id, prompt_used, style_tag, processing_time_ms, original_size_bytes, enhanced_size_bytes, original_dimensions, enhanced_dimensions, opt_in FROM transformations WHERE created_at >= ${from}::timestamp AND created_at <= ${to}::timestamp ORDER BY created_at DESC`;
      return r.rows;
    }
    case 'events': {
      const r = await sql`SELECT id, transformation_id, session_id, event_type, event_data, created_at, referrer, device_type, screen_size FROM usage_events WHERE created_at >= ${from}::timestamp AND created_at <= ${to}::timestamp ORDER BY created_at DESC`;
      return r.rows;
    }
    case 'sessions': {
      const r = await sql`SELECT session_id, MIN(created_at) as first_seen, MAX(created_at) as last_seen, count(*)::int as event_count, array_agg(DISTINCT event_type) as event_types FROM usage_events WHERE created_at >= ${from}::timestamp AND created_at <= ${to}::timestamp GROUP BY session_id ORDER BY first_seen DESC`;
      return r.rows;
    }
    case 'attribution': {
      const r = await sql`SELECT COALESCE(event_data->>'utm_source', 'none') as utm_source, COALESCE(event_data->>'utm_medium', 'none') as utm_medium, COALESCE(event_data->>'utm_campaign', 'none') as utm_campaign, referrer, count(*)::int as count FROM usage_events WHERE event_type = 'page_view' AND created_at >= ${from}::timestamp AND created_at <= ${to}::timestamp GROUP BY utm_source, utm_medium, utm_campaign, referrer ORDER BY count DESC`;
      return r.rows;
    }
    default:
      return [];
  }
}
