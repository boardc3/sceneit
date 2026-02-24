export interface Transformation {
  id: string;
  created_at: string;
  session_id: string;
  original_blob_url: string;
  enhanced_blob_url: string;
  prompt_used: string | null;
  style_tag: string | null;
  processing_time_ms: number;
  original_size_bytes: number;
  enhanced_size_bytes: number;
  original_dimensions: string | null;
  enhanced_dimensions: string | null;
  opt_in: boolean;
  user_agent: string | null;
  ip_hash: string | null;
}

export interface UsageEvent {
  id: string;
  transformation_id: string | null;
  session_id: string;
  event_type: EventType;
  event_data: Record<string, unknown>;
  created_at: string;
  ip_hash: string | null;
  user_agent: string | null;
  referrer: string | null;
  device_type: string | null;
  screen_size: string | null;
}

export type EventType =
  | 'page_view'
  | 'upload_start'
  | 'upload_complete'
  | 'enhance_start'
  | 'enhance_complete'
  | 'enhance_error'
  | 'download'
  | 'gallery_view'
  | 'style_selected'
  | 'prompt_custom'
  | 'consent_given'
  | 'consent_revoked'
  | 'share_click';

export interface ClientEvent {
  event_type: EventType;
  event_data?: Record<string, unknown>;
  session_id: string;
  transformation_id?: string;
  referrer?: string;
  device_type?: string;
  screen_size?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

export interface AdminStats {
  total_transformations: number;
  today_count: number;
  week_count: number;
  month_count: number;
  total_storage_bytes: number;
  avg_processing_time_ms: number;
  opt_in_rate: number;
  daily_counts: Array<{ date: string; count: number }>;
  popular_styles: Array<{ style: string; count: number }>;
  processing_distribution: Array<{ bucket: string; count: number }>;
  peak_hours: Array<{ hour: number; count: number }>;
  funnel: {
    page_views: number;
    uploads: number;
    enhances: number;
    downloads: number;
  };
  attribution: Array<{ source: string; count: number }>;
  device_breakdown: Array<{ device: string; count: number }>;
  error_rate: number;
  recent_transformations: Transformation[];
}

export interface GalleryResponse {
  transformations: Transformation[];
  total: number;
  page: number;
  per_page: number;
}
