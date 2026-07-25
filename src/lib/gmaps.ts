// Googleマップ連携のURL組み立て（Maps URLs API）。
//
// 用途は2つあり、混同しないこと:
//   ①「Googleマップで見る」  … stores.gmaps_url をそのまま開く＝店ページ（営業時間・写真・口コミ）。
//                              この関数群は使わない。
//   ②「Googleマップで経路を見る」… ここで組む /maps/dir/ URL＝現在地→店の経路。
//
// ②の技術的制約: 経路はGoogleマップ側が独自に計算するため、S3上部の「行き方の楽さ」
// （アプリの reach が算出した乗車停・降車停・系統）と一致しない場合がある。
// Maps URLs API は「この系統・このバス停で」と経路を指定する手段を持たない（渡せるのは
// 出発地・目的地・移動手段だけ）。よって②は「時刻と道順の確認先」と割り切る。

/** 現在地・店の座標 */
export interface LatLng {
  lat: number;
  lng: number;
}

/** 経路URLの組み立てに必要な店の情報（StoreItem の部分集合） */
export interface RouteDestination {
  name: string;
  lat: number;
  lng: number;
  gmaps_url?: string | null;
}

/**
 * stores.gmaps_url から place_id を取り出す。無ければ null。
 * 本番の gmaps_url は `?api=1&query=<店名>&query_place_id=<place_id>` 形式のため
 * query_place_id を拾う（place_id= / destination_place_id= 形式も一応許容）。
 */
export function extractPlaceId(gmapsUrl: string | null | undefined): string | null {
  if (!gmapsUrl) return null;
  const m = /[?&](?:query_place_id|destination_place_id|place_id)=([^&#]+)/.exec(gmapsUrl);
  if (m) return decodeURIComponent(m[1]);
  // `?q=place_id:ChIJ...` 形式
  const m2 = /[?&]q=place_id:([^&#]+)/.exec(gmapsUrl);
  return m2 ? decodeURIComponent(m2[1]) : null;
}

/**
 * 現在地→店の経路URL（公共交通機関）。
 *
 * place_id が取れる場合はそれを destination_place_id に使う（座標より正確に店を指せる）。
 * その際 Google の仕様上 destination（テキスト）も必須なので店名を併記する
 * ＝両者が食い違う場合は destination_place_id が優先される。
 * place_id が無い場合は座標を destination にする。
 */
export function buildTransitDirectionsUrl(origin: LatLng, store: RouteDestination): string {
  const params = [
    "api=1",
    // 座標は数値なのでエンコード不要（カンマはクエリ値として合法）
    `origin=${origin.lat},${origin.lng}`,
  ];
  const placeId = extractPlaceId(store.gmaps_url);
  if (placeId) {
    params.push(`destination=${encodeURIComponent(store.name)}`);
    params.push(`destination_place_id=${encodeURIComponent(placeId)}`);
  } else {
    params.push(`destination=${store.lat},${store.lng}`);
  }
  params.push("travelmode=transit");
  return `https://www.google.com/maps/dir/?${params.join("&")}`;
}
