import { saveEvents } from './db';

export async function logServerEvent(params: {
  session_id: string;
  event_type: string;
  event_data?: Record<string, unknown>;
  transformation_id?: string;
  ip_hash?: string;
  user_agent?: string;
}): Promise<void> {
  try {
    await saveEvents([{
      session_id: params.session_id,
      event_type: params.event_type,
      event_data: params.event_data || {},
      transformation_id: params.transformation_id,
      ip_hash: params.ip_hash,
      user_agent: params.user_agent,
    }]);
  } catch (e) {
    console.error('Analytics log error:', e);
  }
}
