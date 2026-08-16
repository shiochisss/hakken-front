/**
 * BFF（サーバーサイドプロキシ）の中継本体。
 *
 * ブラウザは同一オリジンの相対パスだけを叩き、この関数が Next.js のサーバ上で
 * バックエンド（FastAPI）へ素通しする。目的は2つ（API設計書 v1.8 A-12）:
 *   ① バックエンドURLをブラウザから隠す（セキュリティ点検 2026-08-10 の講義項目③）
 *   ② フロントとAPIが same-site になり、Safari／Firefox／Brave のログイン不可が解消する
 *
 * ここに業務ロジック・判断・キャッシュを持たせないこと。持たせた瞬間に
 * 「サーバでもクライアントでもない第3の実装」が生まれ、設計書のどこにも載らなくなる。
 */
import type { NextRequest } from "next/server";

/**
 * 中継先。★ NEXT_PUBLIC_ を付けないこと。
 * 付けるとビルド時にJSへ焼き込まれ、URLを隠すという目的そのものが失われる。
 * 本番は Azure Static Web Apps のアプリ設定、ローカルは .env.local で与える。
 */
const API_ORIGIN = process.env.API_ORIGIN ?? "http://localhost:8000";

/** ブラウザ → API へ引き継ぐリクエストヘッダ（これ以外は送らない） */
const FORWARD_REQUEST_HEADERS = ["cookie", "content-type", "accept"] as const;

/** API → ブラウザへ返すレスポンスヘッダ（set-cookie は複数個あるので別扱い） */
const FORWARD_RESPONSE_HEADERS = ["content-type", "location", "content-disposition"] as const;

/** ボディを持てないステータス（ログアウトの204が該当。body を付けると TypeError になる） */
const NULL_BODY_STATUS = new Set([204, 205, 304]);

/**
 * Set-Cookie を全部取り出す。
 * ログイン成功時のコールバックは **3個**返す（セッション＋state削除＋next削除）ため、
 * 1個しか拾わないとログインが壊れる。
 * `Headers.getSetCookie()` は比較的新しい API で、古い Node には存在しない。
 * 落ちるより1個でも返すほうがマシなのでフォールバックを置く（API設計書 A-12 の既知リスク）。
 */
function readSetCookies(res: Response): string[] {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

/** Next.js が渡してくるパスセグメントを URL に戻す（`["stores","12"]` → `"stores/12"`） */
export function joinPath(segments: string[] | undefined): string {
  return (segments ?? []).map(encodeURIComponent).join("/");
}

/**
 * `targetPath` は先頭スラッシュ付きの、**バックエンド側の**パス（例 `/api/search`・`/auth/logout`）。
 * クエリ文字列は呼び出し元のものをそのまま引き継ぐ。
 */
export async function proxy(req: NextRequest, targetPath: string): Promise<Response> {
  const url = `${API_ORIGIN}${targetPath}${req.nextUrl.search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }

  // GET/HEAD にボディを付けると fetch がエラーになる。
  // multipart（写真アップロード）は arrayBuffer でそのまま素通しする。
  const hasBody = req.method !== "GET" && req.method !== "HEAD";

  const res = await fetch(url, {
    method: req.method,
    headers,
    body: hasBody ? await req.arrayBuffer() : undefined,
    redirect: "manual", // 302 は自分で追わずブラウザへ返す（Google OAuth の往復に必須）
    cache: "no-store",
  });

  const out = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = res.headers.get(name);
    if (value) out.set(name, value);
  }
  out.set("cache-control", "no-store");
  for (const cookie of readSetCookies(res)) out.append("set-cookie", cookie);

  return new Response(NULL_BODY_STATUS.has(res.status) ? null : res.body, {
    status: res.status,
    headers: out,
  });
}
