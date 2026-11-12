export type QueueStatus =
  | 'waiting'
  | 'notified'
  | 'on_the_way'
  | 'seated'
  | 'no_show'
  | 'cancelled'
  | 'postponed';

export type QueueChannel = 'web' | 'telegram' | 'whatsapp';

export type StaffRole = 'admin' | 'operator';

export type ModelKind = 'baseline_rule' | 'baseline_ma' | 'linreg';

export type TravelMode = 'driving-car' | 'foot-walking';

export interface TablesBySize {
  [tableCapacity: string]: number; // e.g. { "2": 6, "4": 8, "6": 2 }
}

export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  lat: number;
  lng: number;
  tables_by_size: TablesBySize;
  notify_margin_min: number;
  created_at: string;
}

export interface QueueEntry {
  id: string;
  restaurant_id: string;
  display_name: string;
  party_size: number;
  status: QueueStatus;
  joined_at: string;
  travel_minutes: number;
  travel_mode: TravelMode;
  origin_area: string | null;
  predicted_wait_min_at_join: number;
  notified_at: string | null;
  seated_at: string | null;
  cancelled_at: string | null;
  channel: QueueChannel;
  consent_at: string;
  link_token: string;
}

export interface Contact {
  id: string;
  queue_entry_id: string;
  telegram_chat_id: string;
  purge_after: string;
}

export interface WaitHistory {
  id: string;
  restaurant_id: string;
  party_size: number;
  dow: number; // 0 (Sunday) to 6 (Saturday)
  hour: number; // 0 to 23
  queue_len_at_join: number;
  tables_free_at_join: number;
  actual_wait_min: number;
  outcome: 'seated' | 'no_show' | 'cancelled';
  is_synthetic: boolean;
  created_at: string;
}

export interface ModelVersion {
  id: string;
  restaurant_id: string;
  kind: ModelKind;
  params: Record<string, unknown>;
  trained_at: string;
  n_samples: number;
  mae_holdout: number;
}

export interface Prediction {
  id: string;
  queue_entry_id: string;
  model_version_id: string | null;
  predicted_min: number;
  made_at: string;
}

export interface MessageLog {
  id: string;
  queue_entry_id: string | null;
  direction: 'incoming' | 'outgoing';
  intent: string | null;
  raw_text_redacted: string;
  created_at: string;
}

export interface Staff {
  id: string;
  user_id: string;
  restaurant_id: string;
  role: StaffRole;
  created_at: string;
}
