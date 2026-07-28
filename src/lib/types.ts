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
  via_hub: string | null; // 乗換する停の名前（乗換時のみ）。2026-07-26 以降ハブ停に限らない
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
  /** 徒歩の方が速いときのみ。null ならバス経路をそのまま見せる（従来どおり） */
  walk_only: WalkOnly | null;
  /** 楽条件を満たさない経路のとき（S3のみ発生）。S2 は常に null */
  out_of_conditions: OutOfConditions | null;
  boarding_stop: string;
  alight_stop: string; // ※追加提案
  route_label: string;
  address: string | null;
  area_label: string | null; // S2カードのエリア表示（出所はDB設計書9章#11＝未決）
  lat: number;
  lng: number;
  gmaps_url: string;
}

/**
 * 徒歩の方が速いとき（2026-07-28 追加）。バス経路（`raku`・`boarding_stop`・
 * `route_label`）は**消えずにそのまま入っている**ので、両方を並べて見せられる。
 *
 * 背景: それまで検索は reach（バス経路）しか見ておらず、駅前の店にもバスを勧めていた
 * （江古田駅→焼肉レストラン三宝苑は直線徒歩0分なのに「歩2＋バス2＋歩5＝9分」）。
 *
 * `minutes` は直線距離×1.3÷80m/分の**推定**で、川・線路・高低差を無視する。そのため
 * 表示では `distance_m` を併記し「※直線距離からの目安です」と添えて断定を避ける。
 */
export interface WalkOnly {
  minutes: number;
  distance_m: number;
}

/**
 * いまの楽条件を満たさない経路を返しているとき、破っている条件（2026-07-28 追加）。
 * 満たしているとき（＝S2と一致するとき）は null。
 *
 * 背景: B-7（店詳細）が楽条件を一切見ずに最小 total を選んでいたため、**S2 と S3 で
 * 所要時間が食い違っていた**（同じ店が S2 29分／S3 18分。18分は乗換1回で、
 * 「乗換なし」設定の S2 は除外していた）。B-7 も条件で選ぶよう修正したが、条件を満たす
 * 経路が1件も無い店（マイリスト・お気に入り・直リンクから開いた場合）は、経路を隠さず
 * 返して**どの条件を外れているかを開示する**（「除外せず開示する」＝`few_trips` と同じ方針）。
 */
export interface OutOfConditions {
  transfer: boolean;
  walk: boolean;
  ride: boolean;
  total: boolean;
}

export interface RelaxSuggestion {
  param: "walk_max" | "ride_max" | "total_max";
  delta: number;
  count: number;
}

/**
 * 検索の起点（S2ヘッダの「〈住所〉から探しています」）。
 * 実機で「現在地がどこからなのか分からず、提示されるルートの信ぴょう性が薄い」と
 * 指摘されたため追加（2026-07-27）。住所はサーバ側が同梱データの最寄り探索で解決する
 * （外部APIは呼ばない）。`source` で表示を3分岐する:
 *   `oaza` … 住所が出た（`label` を表示・`nearest_stop` は補助表示）
 *   `stop` … 住所は出ず最寄停名で代替（`label` は null）
 *   `none` … どちらも出ない → 従来文言「現在地から探しています」に戻す
 * `preview=1`（件数のみ）のレスポンスには含まれない。
 */
export interface SearchOrigin {
  label: string | null;
  nearest_stop: string | null;
  source: "oaza" | "stop" | "none";
}

export interface SearchResponse {
  items: StoreItem[];
  meta: {
    count: number;
    relax_suggestions?: RelaxSuggestion[];
    origin?: SearchOrigin;
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
