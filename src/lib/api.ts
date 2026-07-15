// FastAPI バックエンドとの通信クライアント。
// 認証は Cookie セッション前提（fetch は credentials: "include"）。
// エンドポイントのパス・スキーマは FastAPI 側の実装と要すり合わせ。

import type {
  ArrivalBanner,
  Conditions,
  EventType,
  Me,
  MyList,
  SearchResponse,
  StoreItem,
} from "./types";

import { mockApi } from "./mock";

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

/** NEXT_PUBLIC_MOCK=1 でバックエンドなしのモックモード（ログイン不要・全画面閲覧可） */
export const IS_MOCK = process.env.NEXT_PUBLIC_MOCK === "1";

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (res.status === 401) throw new ApiError(401, "unauthorized");
  if (!res.ok) throw new ApiError(res.status, await res.text());
  if (res.status === 204) return undefined as T;
  return res.json();
}

const realApi = {
  /** ログイン中ユーザー。未ログインは 401 → ApiError */
  me: () => request<Me>("/api/me"),

  /** Google OAuth 開始（FastAPI 側でリダイレクト処理） */
  loginUrl: () =>
    `${BASE}/auth/google/login?next=${encodeURIComponent(
      typeof window !== "undefined" ? window.location.origin : ""
    )}`,

  logout: () => request<void>("/auth/logout", { method: "POST" }),

  /** 楽条件（F3）: 1ユーザー1セット・即時保存 */
  getConditions: () => request<Conditions>("/api/conditions"),
  saveConditions: (c: Conditions) =>
    request<Conditions>("/api/conditions", {
      method: "PUT",
      body: JSON.stringify(c),
    }),

  /** 逆引き検索（F4）。preview=true は件数のみ（ライブプレビュー用） */
  search: (params: {
    lat: number;
    lng: number;
    conditions: Conditions;
    category?: string | null;
    preview?: boolean;
  }) => {
    const q = new URLSearchParams({
      lat: String(params.lat),
      lng: String(params.lng),
      walk_max: String(params.conditions.walk_max),
      ride_max: String(params.conditions.ride_max),
      total_max: String(params.conditions.total_max),
      transfer: params.conditions.transfer,
    });
    if (params.category) q.set("category", params.category);
    if (params.preview) q.set("preview", "1");
    return request<SearchResponse>(`/api/search?${q}`);
  },

  /** 店詳細（S3 直接アクセス用。S2経由なら item をそのまま使う） */
  getStore: (storeId: number, lat: number, lng: number) =>
    request<StoreItem>(`/api/stores/${storeId}?lat=${lat}&lng=${lng}`),

  /** お気に入り（F6） */
  addFavorite: (storeId: number) =>
    request<void>("/api/favorites", {
      method: "POST",
      body: JSON.stringify({ store_id: storeId }),
    }),
  removeFavorite: (storeId: number) =>
    request<void>(`/api/favorites/${storeId}`, { method: "DELETE" }),

  /** ここ行く（F7）: 行く予定リスト登録＋タップログはサーバ側で同時記録 */
  kokoIku: (storeId: number, raku: unknown) =>
    request<{ going_id: number }>("/api/going", {
      method: "POST",
      body: JSON.stringify({ store_id: storeId, meta: { raku } }),
    }),

  /** マイリスト（S4） */
  myList: () => request<MyList>("/api/mylist"),

  /**
   * 着いたよ（F8）: 前面GPS1回照合。判定（150m以内→verified／遠い→pending）はサーバ側。
   */
  arrived: (goingId: number, lat: number, lng: number) =>
    request<{ result: "verified" | "pending" }>(`/api/going/${goingId}/arrived`, {
      method: "POST",
      body: JSON.stringify({ lat, lng }),
    }),

  /**
   * 着いたバナー（F8b）: 「行く予定」×48h以内×150m以内×最近傍の判定はサーバ側。
   * 該当なしは null。
   */
  arrivalBanner: (lat: number, lng: number) =>
    request<ArrivalBanner | null>(`/api/arrival-banner?lat=${lat}&lng=${lng}`),

  /** 計測イベント（event_log へ追記。失敗しても UI は止めない） */
  logEvent: (event_type: EventType, store_id?: number, meta?: unknown) => {
    request<void>("/api/events", {
      method: "POST",
      body: JSON.stringify({ event_type, store_id: store_id ?? null, meta: meta ?? null }),
    }).catch(() => {
      /* 計測はベストエフォート */
    });
  },
};

/** モックモードなら mockApi、通常は FastAPI クライアント */
export const api: typeof realApi = IS_MOCK ? (mockApi as typeof realApi) : realApi;

export { ApiError };
