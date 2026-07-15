// ハッケンバス フロントエンド型定義
// 対応資料: DB設計書 v1.0 ／ F4 API入出力・DB設計たたき台 v0.2

export type Transfer = "none" | "hub1";
export type PresetKey = "no_walk" | "balance" | "far_ok" | "custom";
export type ArrivalStatus = "none" | "pending" | "verified";

export type EventType =
  | "app_open"
  | "list_shown"
  | "store_view"
  | "favorite"
  | "koko_iku"
  | "gmaps_out"
  | "arrived_pending"
  | "arrived_verified";

/** 楽条件（user_conditions と1対1） */
export interface Conditions {
  walk_max: number; // 歩き上限（両端合計・分）
  ride_max: number; // バス乗車上限（分）
  total_max: number; // 合計上限（分）
  transfer: Transfer;
  preset_key: PresetKey;
}

/** 楽さの内訳 */
export interface Raku {
  walk1: number; // 現在地→乗車停 徒歩分
  ride: number; // バス乗車分
  walk2: number; // 降車停→店 徒歩分
  total: number;
  transfer: Transfer;
  via_hub: string | null; // 経由ハブ停名（乗換時のみ）
}

/**
 * 検索結果アイテム（S2カード・S3詳細を同一itemで賄う＝たたき台v0.2 2-2）
 * 注: alight_stop / opening_hours はたたき台v0.2のレスポンスに無いが、
 * UIモックv3のS3（降車停名・営業時間表示）に必要なため追加提案している。
 */
export interface StoreItem {
  store_id: number;
  name: string;
  category_l: string;
  category_s: string;
  status: string; // "営業中" のみ配信される想定
  opening_hours: string | null; // 例: "〜19:00（水休）" ※追加提案
  photo: { source: "hotpepper" | "places"; ref: string } | null;
  raku: Raku;
  boarding_stop: string;
  alight_stop: string; // ※追加提案
  route_label: string;
  address: string | null;
  area_label: string | null; // S2カードのエリア表示（出所はDB設計書9章#11＝未決）
  lat: number;
  lng: number;
  gmaps_url: string;
}

export interface RelaxSuggestion {
  param: "walk_max" | "ride_max" | "total_max";
  delta: number;
  count: number;
}

export interface SearchResponse {
  items: StoreItem[];
  meta: {
    count: number;
    relax_suggestions?: RelaxSuggestion[];
  };
}

export interface Me {
  id: number;
  email: string;
  has_conditions: boolean; // 初期設定済みか（S1スキップ判定）
}

export interface GoingEntry {
  going_id: number;
  store: StoreItem;
  tapped_at: string; // ISO8601
  arrival_status: ArrivalStatus;
}

export interface FavoriteEntry {
  store: StoreItem;
  created_at: string;
}

export interface MyList {
  going: GoingEntry[];
  favorites: FavoriteEntry[];
}

/** 着いたバナー（照合ロジックはサーバ側: 150m以内・48h以内・最近傍） */
export interface ArrivalBanner {
  going_id: number;
  store_id: number;
  store_name: string;
}
