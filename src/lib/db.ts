import { put } from '@vercel/blob';
import type { Transformation, UsageEvent, AdminStats, GalleryResponse } from './types';

const TRANSFORMATIONS_KEY = 'metadata/transformations.json';
const EVENTS_KEY = 'metadata/events.json';

function isBlobConfigured(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

async function readMetadata<T>(key: string): Promise<T[]> {
  if (!isBlobConfigured()) return [];
  try {
    // Use the Vercel Blob store URL pattern
    const storeId = process.env.BLOB_READ_WRITE_TOKEN?.split('_')[3];
    const url = `https://${storeId}.public.blob.vercel-storage.com/${key}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    return await res.json() as T[];
  } catch {
    return [];
  }
}

async function writeMetadata<T>(key: string, data: T[]): Promise<void> {
  await put(key, JSON.stringify(data), {
    access: 'public',
    addRandomSuffix: false,
    contentType: 'application/json',
  });
}

export async function saveTransformation(data: Omit<Transformation, 'id' | 'created_at'>): Promise<string | null> {
  if (!isBlobConfigured()) return null;
  const id = crypto.randomUUID();
  const record: Transformation = {
    id,
    created_at: new Date().toISOString(),
    ...data,
  };
  const existing = await readMetadata<Transformation>(TRANSFORMATIONS_KEY);
  existing.push(record);
  await writeMetadata(TRANSFORMATIONS_KEY, existing);
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
  if (!isBlobConfigured()) return;
  const existing = await readMetadata<UsageEvent>(EVENTS_KEY);
  for (const e of events) {
    existing.push({
      id: crypto.randomUUID(),
      transformation_id: e.transformation_id ?? null,
      session_id: e.session_id,
      event_type: e.event_type as UsageEvent['event_type'],
      event_data: e.event_data,
      created_at: new Date().toISOString(),
      ip_hash: e.ip_hash ?? null,
      user_agent: e.user_agent ?? null,
      referrer: e.referrer ?? null,
      device_type: e.device_type ?? null,
      screen_size: e.screen_size ?? null,
    });
  }
  await writeMetadata(EVENTS_KEY, existing);
}

export async function getGallery(page: number = 1, perPage: number = 20, styleTag?: string, search?: string, dateFrom?: string, dateTo?: string): Promise<GalleryResponse> {
  if (!isBlobConfigured()) return { transformations: [], total: 0, page, per_page: perPage };

  const all = await readMetadata<Transformation>(TRANSFORMATIONS_KEY);
  let filtered = all.filter(t => t.opt_in);

  if (styleTag) {
    filtered = filtered.filter(t => t.style_tag === styleTag);
  }
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(t =>
      (t.prompt_used?.toLowerCase().includes(s)) ||
      (t.style_tag?.toLowerCase().includes(s))
    );
  }
  if (dateFrom) {
    filtered = filtered.filter(t => t.created_at >= dateFrom);
  }
  if (dateTo) {
    filtered = filtered.filter(t => t.created_at <= dateTo);
  }

  // Sort by created_at descending
  filtered.sort((a, b) => b.created_at.localeCompare(a.created_at));

  const offset = (page - 1) * perPage;
  return {
    transformations: filtered.slice(offset, offset + perPage),
    total: filtered.length,
    page,
    per_page: perPage,
  };
}

export async function getAdminStats(): Promise<AdminStats> {
  if (!isBlobConfigured()) {
    return {
      total_transformations: 0, today_count: 0, week_count: 0, month_count: 0,
      total_storage_bytes: 0, avg_processing_time_ms: 0, opt_in_rate: 0,
      daily_counts: [], popular_styles: [], processing_distribution: [], peak_hours: [],
      funnel: { page_views: 0, uploads: 0, enhances: 0, downloads: 0 },
      attribution: [], device_breakdown: [], error_rate: 0, recent_transformations: [],
    };
  }

  const [transformations, events] = await Promise.all([
    readMetadata<Transformation>(TRANSFORMATIONS_KEY),
    readMetadata<UsageEvent>(EVENTS_KEY),
  ]);

  const now = Date.now();
  const DAY = 86400000;

  const todayCount = transformations.filter(t => now - new Date(t.created_at).getTime() < DAY).length;
  const weekCount = transformations.filter(t => now - new Date(t.created_at).getTime() < 7 * DAY).length;
  const monthCount = transformations.filter(t => now - new Date(t.created_at).getTime() < 30 * DAY).length;

  const totalStorage = transformations.reduce((s, t) => s + (t.original_size_bytes || 0) + (t.enhanced_size_bytes || 0), 0);
  const avgTime = transformations.length ? Math.round(transformations.reduce((s, t) => s + (t.processing_time_ms || 0), 0) / transformations.length) : 0;
  const optInRate = transformations.length ? Math.round(transformations.filter(t => t.opt_in).length * 100 / transformations.length) : 0;

  // Daily counts (last 30 days)
  const dailyMap = new Map<string, number>();
  transformations.filter(t => now - new Date(t.created_at).getTime() < 30 * DAY).forEach(t => {
    const date = t.created_at.substring(0, 10);
    dailyMap.set(date, (dailyMap.get(date) || 0) + 1);
  });
  const daily_counts = Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count })).sort((a, b) => a.date.localeCompare(b.date));

  // Popular styles
  const styleMap = new Map<string, number>();
  transformations.forEach(t => {
    const s = t.style_tag || 'default';
    styleMap.set(s, (styleMap.get(s) || 0) + 1);
  });
  const popular_styles = Array.from(styleMap.entries()).map(([style, count]) => ({ style, count })).sort((a, b) => b.count - a.count).slice(0, 10);

  // Processing distribution
  const buckets = { '<5s': 0, '5-15s': 0, '15-30s': 0, '>30s': 0 };
  transformations.forEach(t => {
    const ms = t.processing_time_ms || 0;
    if (ms < 5000) buckets['<5s']++;
    else if (ms < 15000) buckets['5-15s']++;
    else if (ms < 30000) buckets['15-30s']++;
    else buckets['>30s']++;
  });
  const processing_distribution = Object.entries(buckets).map(([bucket, count]) => ({ bucket, count }));

  // Peak hours
  const hourMap = new Map<number, number>();
  transformations.forEach(t => {
    const hour = new Date(t.created_at).getHours();
    hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
  });
  const peak_hours = Array.from(hourMap.entries()).map(([hour, count]) => ({ hour, count })).sort((a, b) => a.hour - b.hour);

  // Funnel
  const funnel = {
    page_views: events.filter(e => e.event_type === 'page_view').length,
    uploads: events.filter(e => e.event_type === 'upload_complete').length,
    enhances: events.filter(e => e.event_type === 'enhance_complete').length,
    downloads: events.filter(e => e.event_type === 'download').length,
  };

  // Attribution
  const attrMap = new Map<string, number>();
  events.filter(e => e.event_type === 'page_view').forEach(e => {
    const source = (e.event_data as Record<string, string>)?.utm_source || e.referrer || 'direct';
    attrMap.set(source, (attrMap.get(source) || 0) + 1);
  });
  const attribution = Array.from(attrMap.entries()).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count).slice(0, 10);

  // Device breakdown
  const deviceMap = new Map<string, number>();
  events.filter(e => e.event_type === 'page_view').forEach(e => {
    const device = e.device_type || 'unknown';
    deviceMap.set(device, (deviceMap.get(device) || 0) + 1);
  });
  const device_breakdown = Array.from(deviceMap.entries()).map(([device, count]) => ({ device, count })).sort((a, b) => b.count - a.count);

  // Error rate
  const enhanceStarts = events.filter(e => e.event_type === 'enhance_start').length;
  const enhanceErrors = events.filter(e => e.event_type === 'enhance_error').length;
  const error_rate = enhanceStarts ? (enhanceErrors * 100 / enhanceStarts) : 0;

  // Recent transformations
  const recent_transformations = [...transformations].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 20);

  return {
    total_transformations: transformations.length,
    today_count: todayCount,
    week_count: weekCount,
    month_count: monthCount,
    total_storage_bytes: totalStorage,
    avg_processing_time_ms: avgTime,
    opt_in_rate: optInRate,
    daily_counts,
    popular_styles,
    processing_distribution,
    peak_hours,
    funnel,
    attribution,
    device_breakdown,
    error_rate,
    recent_transformations,
  };
}

export async function exportData(type: string, dateFrom?: string, dateTo?: string): Promise<Record<string, unknown>[]> {
  if (!isBlobConfigured()) return [];

  const from = dateFrom || '1970-01-01';
  const to = dateTo || '2099-12-31';

  switch (type) {
    case 'transformations': {
      const all = await readMetadata<Transformation>(TRANSFORMATIONS_KEY);
      return all
        .filter(t => t.created_at >= from && t.created_at <= to)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(({ id, created_at, session_id, prompt_used, style_tag, processing_time_ms, original_size_bytes, enhanced_size_bytes, original_dimensions, enhanced_dimensions, opt_in }) => ({
          id, created_at, session_id, prompt_used, style_tag, processing_time_ms, original_size_bytes, enhanced_size_bytes, original_dimensions, enhanced_dimensions, opt_in,
        }));
    }
    case 'events': {
      const all = await readMetadata<UsageEvent>(EVENTS_KEY);
      return all
        .filter(e => e.created_at >= from && e.created_at <= to)
        .sort((a, b) => b.created_at.localeCompare(a.created_at))
        .map(({ id, transformation_id, session_id, event_type, event_data, created_at, referrer, device_type, screen_size }) => ({
          id, transformation_id, session_id, event_type, event_data, created_at, referrer, device_type, screen_size,
        }));
    }
    case 'sessions': {
      const all = await readMetadata<UsageEvent>(EVENTS_KEY);
      const filtered = all.filter(e => e.created_at >= from && e.created_at <= to);
      const sessionMap = new Map<string, { events: UsageEvent[] }>();
      filtered.forEach(e => {
        if (!sessionMap.has(e.session_id)) sessionMap.set(e.session_id, { events: [] });
        sessionMap.get(e.session_id)!.events.push(e);
      });
      return Array.from(sessionMap.entries()).map(([session_id, { events }]) => ({
        session_id,
        first_seen: events.reduce((min, e) => e.created_at < min ? e.created_at : min, events[0].created_at),
        last_seen: events.reduce((max, e) => e.created_at > max ? e.created_at : max, events[0].created_at),
        event_count: events.length,
        event_types: [...new Set(events.map(e => e.event_type))],
      })).sort((a, b) => (b.first_seen as string).localeCompare(a.first_seen as string));
    }
    case 'attribution': {
      const all = await readMetadata<UsageEvent>(EVENTS_KEY);
      const filtered = all.filter(e => e.event_type === 'page_view' && e.created_at >= from && e.created_at <= to);
      const attrMap = new Map<string, number>();
      filtered.forEach(e => {
        const data = e.event_data as Record<string, string>;
        const key = `${data?.utm_source || 'none'}|${data?.utm_medium || 'none'}|${data?.utm_campaign || 'none'}|${e.referrer || ''}`;
        attrMap.set(key, (attrMap.get(key) || 0) + 1);
      });
      return Array.from(attrMap.entries()).map(([key, count]) => {
        const [utm_source, utm_medium, utm_campaign, referrer] = key.split('|');
        return { utm_source, utm_medium, utm_campaign, referrer, count };
      }).sort((a, b) => b.count - a.count);
    }
    default:
      return [];
  }
}
