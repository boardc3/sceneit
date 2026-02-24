'use client';

import { useCallback, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { EventType } from '../lib/types';

function getSessionId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('sceneit_session_id');
  if (!id) {
    id = uuidv4();
    localStorage.setItem('sceneit_session_id', id);
  }
  return id;
}

function getUtmParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem('sceneit_utm');
  if (stored) {
    try { return JSON.parse(stored); } catch { /* ignore */ }
  }
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign']) {
    const val = params.get(key);
    if (val) utm[key] = val;
  }
  if (Object.keys(utm).length > 0) {
    localStorage.setItem('sceneit_utm', JSON.stringify(utm));
  }
  return utm;
}

function getDeviceType(): string {
  if (typeof window === 'undefined') return 'unknown';
  const w = window.innerWidth;
  if (w < 768) return 'mobile';
  if (w < 1024) return 'tablet';
  return 'desktop';
}

function getScreenSize(): string {
  if (typeof window === 'undefined') return '';
  return `${window.innerWidth}x${window.innerHeight}`;
}

export function useAnalytics() {
  const queue = useRef<Array<Record<string, unknown>>>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(() => {
    if (queue.current.length === 0) return;
    const events = [...queue.current];
    queue.current = [];

    const body = JSON.stringify({ events });
    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      navigator.sendBeacon('/api/events', body);
    } else {
      fetch('/api/events', { method: 'POST', body, headers: { 'Content-Type': 'application/json' }, keepalive: true }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    return () => { flush(); };
  }, [flush]);

  const track = useCallback((eventType: EventType, eventData: Record<string, unknown> = {}, transformationId?: string) => {
    const utm = getUtmParams();
    queue.current.push({
      event_type: eventType,
      event_data: { ...eventData, ...utm },
      session_id: getSessionId(),
      transformation_id: transformationId,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      device_type: getDeviceType(),
      screen_size: getScreenSize(),
    });

    if (timerRef.current) clearTimeout(timerRef.current);
    // Batch: flush after 1s or when 10 events
    if (queue.current.length >= 10) {
      flush();
    } else {
      timerRef.current = setTimeout(flush, 1000);
    }
  }, [flush]);

  return { track, getSessionId, flush };
}
