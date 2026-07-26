// ハッケンバス フロントエンド型定義
// 対応資料: DB設計書 v1.3 ／ API設計書 v1.2

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
 * 検索結果アイテム（S2カード・S3詳細を同一itemで賄う）
 * 対応: API設計書 B-6 レスポンス。
 * 写真: source=own・user（store_photos の status='approved' 行の SAS URL・有効期限あり）／
 *       none（写真なし）。Places API は全廃（呼ばない）。
 *       ref は「画像URL」。SAS未発行（#14）や写真なしでは null になるため、
 *       表示側は photo の有無ではなく **ref の有無** で分岐する（null を <img src> に
 *       入れると壊れた画像アイコンになる）。
 *       source=hotpepper は当面サーバから返らない（hotpepper_url は店ページのURLで
 *       画像ではないため。画像URL取得はAPI連携＝別件・未実装）。型は将来用に残す。
 * 注: alight_stop / area_label は types.ts の追加提案（DB設計書 未決#2・#11 連動）。
 *     opening_hours は廃止（営業時間は非表示・S3「Googleマップで見る」に委譲）。
 */
export interface StoreItem {
  store_id: number;
  name: string;
  category_l: string;
  category_s: string;
  status: string; // "営業中" のみ配信される想定
  photo: { source: "hotpepper" | "own" | "user" | "none"; ref: string | null } | null;
  raku: Raku;
  /**
   * 「本数少なめ」＝この経路の土日10-16時の便数が2本未満（しきい値は暫定・2026-07-26）。
   * 検索からは除外せず、S2カードとS3詳細でバッジとして開示する（ユーザーに判断を委ねる）。
   * 判定はサーバ側（reach.min_trip_count）。未計算のときは false が返る。
   */
  few_trips: boolean;
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

// ───────── F11 たれ込み（ユーザー報告） ─────────
// 対応: API設計書 B-15（投稿）／B-16（写真アップロード）。
// 投稿は submissions/store_photos に status='pending' で入り、承認まで stores に反映されない。

export type SubmissionType = "new_store" | "info_edit" | "closure_report";

export interface NewStorePayload {
  gmaps_url: string; // GoogleマップURL（必須）
  comment?: string;
}
export interface InfoEditPayload {
  comment: string; // 自由記述（何がどう間違っているか）
}
export interface ClosureReportPayload {
  reason: string; // 閉店・休業の理由
}

/** POST /api/submissions のリクエスト（B-15） */
export interface SubmissionInput {
  type: SubmissionType;
  store_id?: number | null; // new_store は null
  payload: NewStorePayload | InfoEditPayload | ClosureReportPayload;
}

export interface SubmissionResult {
  submission_id: number;
}

/** POST /api/submissions/photo-upload のレスポンス（B-16） */
export interface PhotoUploadResult {
  photo_id: number;
}
