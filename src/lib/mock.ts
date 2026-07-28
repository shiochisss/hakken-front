// モックモード（NEXT_PUBLIC_MOCK=1）: FastAPI なしで全画面を動かすためのダミー実装。
// 状態（条件・マイリスト）は localStorage に保存する（モック専用。本番はサーバ側）。
import type {
  ArrivalBanner,
  Conditions,
  EventType,
  Me,
  MyList,
  PhotoUploadResult,
  SearchResponse,
  StoreItem,
  SubmissionInput,
  SubmissionResult,
} from "./types";

const KEY = "hakken_mock_state";

interface MockState {
  conditions: Conditions | null;
  going: { going_id: number; store_id: number; tapped_at: string; arrival_status: "none" | "pending" | "verified" }[];
  favorites: { store_id: number; created_at: string }[];
  seq: number;
}

function load(): MockState {
  if (typeof window === "undefined") return { conditions: null, going: [], favorites: [], seq: 1 };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { conditions: null, going: [], favorites: [], seq: 1 };
}

function save(s: MockState) {
  if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(s));
}

// サンプル店データ（stores.csv サンプル＋モックv3の例に基づくダミー）
// 写真は全て null（＝プレースホルダ表示）。実写真はホットペッパー表示時取得／store_photosのSAS（本番）。
const STORES: StoreItem[] = [
  {
    store_id: 1, name: "喫茶ロマン", category_l: "カフェ", category_s: "純喫茶",
    status: "営業中", photo: null,
    raku: { walk1: 4, ride: 7, walk2: 0, total: 11, transfer: "none", via_hub: null },
    few_trips: false,
    // 1店目だけ「徒歩の方が速い」状態にしてモックで表示を確認できるようにする（2026-07-28）
    walk_only: { minutes: 5, distance_m: 310 },
    out_of_conditions: null,
    boarding_stop: "豊玉北", alight_stop: "江古田駅前", route_label: "江古田駅前行き（西武バス）",
    address: "練馬区旭丘1-99-9", area_label: "江古田", lat: 35.7379, lng: 139.6727,
    gmaps_url: "https://www.google.com/maps/place/sample-roman",
  },
  {
    store_id: 2, name: "ベーカリー麦畑", category_l: "飲食", category_s: "パン",
    status: "営業中", photo: null,
    raku: { walk1: 6, ride: 9, walk2: 0, total: 15, transfer: "none", via_hub: null },
    few_trips: false,
    walk_only: null,
    out_of_conditions: null,
    boarding_stop: "練馬駅前", alight_stop: "桜台駅前", route_label: "桜台駅経由 中村橋行き（西武バス）",
    address: "練馬区桜台1-99-9", area_label: "桜台", lat: 35.7386, lng: 139.6636,
    gmaps_url: "https://www.google.com/maps/place/sample-bakery",
  },
  {
    store_id: 3, name: "スパイス食堂カルダモン", category_l: "飲食", category_s: "カレー",
    status: "営業中", photo: null,
    raku: { walk1: 8, ride: 12, walk2: 0, total: 20, transfer: "none", via_hub: null },
    few_trips: false,
    walk_only: null,
    out_of_conditions: null,
    boarding_stop: "豊玉北", alight_stop: "練馬駅前", route_label: "練馬駅行き（西武バス）",
    address: "練馬区練馬1-99-9", area_label: "練馬", lat: 35.7357, lng: 139.6518,
    gmaps_url: "https://www.google.com/maps/place/sample-cardamon",
  },
  {
    store_id: 4, name: "麺屋ねりま", category_l: "飲食", category_s: "ラーメン",
    status: "営業中", photo: null,
    raku: { walk1: 5, ride: 14, walk2: 4, total: 23, transfer: "none", via_hub: null },
    few_trips: false,
    walk_only: null,
    out_of_conditions: null,
    boarding_stop: "練馬駅前", alight_stop: "豊玉北", route_label: "新江古田駅行き（都営バス）",
    address: "練馬区豊玉北5-99-9", area_label: "豊玉", lat: 35.7379, lng: 139.6531,
    gmaps_url: "https://www.google.com/maps/place/sample-menya",
  },
  {
    store_id: 5, name: "湯処 ひかり湯", category_l: "銭湯", category_s: "銭湯",
    status: "営業中", photo: null,
    raku: { walk1: 7, ride: 18, walk2: 6, total: 31, transfer: "hub1", via_hub: "練馬駅" },
    few_trips: true,
    walk_only: null,
    out_of_conditions: null,
    boarding_stop: "豊玉北", alight_stop: "光が丘駅前", route_label: "練馬駅行き（西武バス）",
    address: "練馬区光が丘2-99-9", area_label: "光が丘", lat: 35.7583, lng: 139.6291,
    gmaps_url: "https://www.google.com/maps/place/sample-hikariyu",
  },
  {
    store_id: 6, name: "古書と珈琲 ふくろう堂", category_l: "カフェ", category_s: "ブックカフェ",
    status: "営業中", photo: null,
    raku: { walk1: 3, ride: 22, walk2: 5, total: 30, transfer: "hub1", via_hub: "練馬駅" },
    few_trips: true,
    walk_only: null,
    out_of_conditions: null,
    boarding_stop: "豊玉北", alight_stop: "石神井公園駅前", route_label: "練馬駅行き（西武バス）",
    address: "練馬区石神井町3-99-9", area_label: "石神井公園", lat: 35.7433, lng: 139.6065,
    gmaps_url: "https://www.google.com/maps/place/sample-fukurou",
  },
];

const CATEGORY_MAP: Record<string, (s: StoreItem) => boolean> = {
  cafe: (s) => s.category_l === "カフェ",
  food: (s) => s.category_l === "飲食" && s.category_s !== "パン",
  bakery: (s) => s.category_s === "パン",
  sento: (s) => s.category_l === "銭湯",
};

function filterStores(c: Conditions, category?: string | null): StoreItem[] {
  return STORES.filter((s) => {
    const walk = s.raku.walk1 + s.raku.walk2;
    if (walk > c.walk_max) return false;
    if (s.raku.ride > c.ride_max) return false;
    if (s.raku.total > c.total_max) return false;
    if (c.transfer === "none" && s.raku.transfer !== "none") return false;
    if (category && CATEGORY_MAP[category] && !CATEGORY_MAP[category](s)) return false;
    return true;
  }).sort((a, b) => a.raku.total - b.raku.total);
}

const delay = <T,>(v: T, ms = 150): Promise<T> => new Promise((r) => setTimeout(() => r(v), ms));

export const mockApi = {
  me: (): Promise<Me> => {
    const s = load();
    return delay({ id: 1, email: "demo.user@example.com", has_conditions: !!s.conditions });
  },

  loginUrl: () => "/", // モックでは即ログイン扱いで振り分けへ

  warmup: (): Promise<void> => Promise.resolve(), // モックはウォームアップ不要（no-op）

  logout: (): Promise<void> => {
    if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
    return delay(undefined);
  },

  getConditions: (): Promise<Conditions> => {
    const s = load();
    return delay(
      s.conditions ?? { walk_max: 15, ride_max: 20, total_max: 40, transfer: "none", preset_key: "balance" }
    );
  },

  saveConditions: (c: Conditions): Promise<Conditions> => {
    const s = load();
    s.conditions = c;
    save(s);
    return delay(c);
  },

  search: (params: {
    lat: number; lng: number; conditions: Conditions; category?: string | null; preview?: boolean;
  }): Promise<SearchResponse> => {
    const items = filterStores(params.conditions, params.category);
    const relax =
      items.length === 0
        ? [{
            param: "walk_max" as const, delta: 5,
            count: filterStores({ ...params.conditions, walk_max: params.conditions.walk_max + 5 }, params.category).length,
          }]
        : undefined;
    return delay({
      items: params.preview ? [] : items,
      meta: {
        count: items.length,
        relax_suggestions: relax,
        // 起点の住所。モックは外部にも自前データにも触らないので固定値
        // （フォールバック地点＝練馬駅付近の住所。本番はサーバが解決する）
        origin: params.preview
          ? undefined
          : { label: "東京都練馬区豊玉北六丁目", nearest_stop: "練馬駅北口", source: "oaza" as const },
      },
    });
  },

  getStore: (storeId: number): Promise<StoreItem> => {
    const item = STORES.find((s) => s.store_id === storeId);
    if (!item) return Promise.reject(new Error("not_found"));
    return delay(item);
  },

  addFavorite: (storeId: number): Promise<void> => {
    const s = load();
    if (!s.favorites.some((f) => f.store_id === storeId)) {
      s.favorites.push({ store_id: storeId, created_at: new Date().toISOString() });
      save(s);
    }
    return delay(undefined);
  },

  removeFavorite: (storeId: number): Promise<void> => {
    const s = load();
    s.favorites = s.favorites.filter((f) => f.store_id !== storeId);
    save(s);
    return delay(undefined);
  },

  kokoIku: (storeId: number): Promise<{ going_id: number }> => {
    const s = load();
    const going_id = s.seq++;
    s.going.push({ going_id, store_id: storeId, tapped_at: new Date().toISOString(), arrival_status: "none" });
    save(s);
    return delay({ going_id });
  },

  myList: (): Promise<MyList> => {
    const s = load();
    return delay({
      going: s.going
        .map((g) => ({
          going_id: g.going_id,
          store: STORES.find((st) => st.store_id === g.store_id)!,
          tapped_at: g.tapped_at,
          arrival_status: g.arrival_status,
        }))
        .filter((g) => g.store),
      favorites: s.favorites
        .map((f) => ({ store: STORES.find((st) => st.store_id === f.store_id)!, created_at: f.created_at }))
        .filter((f) => f.store),
    });
  },

  arrived: (goingId: number): Promise<{ result: "verified" | "pending" }> => {
    const s = load();
    const g = s.going.find((x) => x.going_id === goingId);
    if (g) {
      // モックでは交互に verified / pending を返して両方の挙動を確認できるようにする
      g.arrival_status = g.arrival_status === "pending" ? "verified" : "pending";
      save(s);
      return delay({ result: g.arrival_status === "verified" ? "verified" : "pending" });
    }
    return delay({ result: "pending" });
  },

  arrivalBanner: (): Promise<ArrivalBanner | null> => {
    // 直近48h以内・未着の「行く予定」があればバナーを出す（距離判定はモックでは省略）
    const s = load();
    const recent = [...s.going]
      .reverse()
      .find((g) => g.arrival_status === "none" && Date.now() - new Date(g.tapped_at).getTime() < 48 * 3600 * 1000);
    if (!recent) return delay(null);
    const store = STORES.find((st) => st.store_id === recent.store_id);
    return delay(store ? { going_id: recent.going_id, store_id: store.store_id, store_name: store.name } : null);
  },

  logEvent: (_event_type: EventType, _store_id?: number, _meta?: unknown): void => {
    // モックでは console に出すだけ
    if (typeof window !== "undefined") console.debug("[mock event]", _event_type, _store_id ?? "", _meta ?? "");
  },

  // ───────── F11 たれ込み（モック） ─────────
  submitTip: (input: SubmissionInput): Promise<SubmissionResult> => {
    const s = load();
    const submission_id = s.seq++;
    save(s);
    if (typeof window !== "undefined") console.debug("[mock submitTip]", input);
    return delay({ submission_id });
  },

  uploadTipPhoto: (file: File, storeId: number): Promise<PhotoUploadResult> => {
    const s = load();
    const photo_id = s.seq++;
    save(s);
    if (typeof window !== "undefined") console.debug("[mock uploadTipPhoto]", file.name, storeId);
    return delay({ photo_id });
  },
};
