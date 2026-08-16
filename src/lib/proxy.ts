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
 * 中継先を正規化する。
 *
 * 2026-08-15、`API_ORIGIN` に `https://` を付けずに設定したため
 * **本番の全リクエストが500になった**（Azureポータルの App Service「概要」に出る
 * 「既定のドメイン」がスキーム無しの表記で、そこからコピーすると起きる）。
 * 設定ミスで本番が落ちるのは割に合わないので、ここで吸収する。
 *   - スキームが無ければ `https://` を補う
 *   - 末尾のスラッシュを落とす（`.../` + `/api/...` で `//` になるのを防ぐ）
 *
 * ※ ローカルの `http://localhost:8000` は既定値・`.env.local` ともスキーム付きで書く。
 *   スキーム無しで `localhost:8000` と書くと https 扱いになり繋がらないので注意。
 */
function normalizeOrigin(raw: string | undefined): string {
  const value = (raw ?? "http://localhost:8000").trim();
  const withScheme = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  return withScheme.replace(/\/+$/, "");
}

/**
 * 中継先。★ NEXT_PUBLIC_ を付けないこと。
 * 付けるとビルド時にJSへ焼き込まれ、URLを隠すという目的そのものが失われる。
 * 本番は Azure Static Web Apps のアプリ設定、ローカルは .env.local で与える。
 */
const API_ORIGIN = normalizeOrigin(process.env.API_ORIGIN);

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
 * 中継に失敗したときの応答。
 *
 * ここが無いと例外がそのまま外に出て **Azure が素の「HTTP ERROR 500」を返す**＝
 * ブラウザからもログからも原因が分からない（2026-08-15 の本番障害がこれ）。
 * 原因の切り分けに要る最小限だけを返す。**バックエンドのURLは含めない**
 * （含めると隠す意味が無くなる。`cause.code` だけで十分切り分けられる）。
 */
function upstreamError(status: number, code: string, err: unknown): Response {
  const cause = (err as { cause?: { code?: string } } | undefined)?.cause;
  const body = JSON.stringify({
    error: code,
    // API_ORIGIN が未設定だと localhost:8000 へ繋ぎに行って ECONNREFUSED になる。
    // 「設定漏れ」と「バックエンド側の障害」をこの1行で見分ける。
    apiOriginConfigured: Boolean(process.env.API_ORIGIN),
    detail: String((err as Error | undefined)?.message ?? err),
    causeCode: cause?.code ?? null,
  });
  return new Response(body, {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
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

  let res: Response;
  try {
    res = await fetch(url, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: "manual", // 302 は自分で追わずブラウザへ返す（Google OAuth の往復に必須）
      cache: "no-store",
    });
  } catch (err) {
    console.error("[bff] upstream fetch failed:", targetPath, err);
    return upstreamError(502, "bff_upstream_unreachable", err);
  }

  try {
    const out = new Headers();
    for (const name of FORWARD_RESPONSE_HEADERS) {
      const value = res.headers.get(name);
      if (value) out.set(name, value);
    }
    out.set("cache-control", "no-store");
    for (const cookie of readSetCookies(res)) out.append("set-cookie", cookie);

    // ★ ストリーム（res.body）をそのまま返さず、いったんバッファに読み切る。
    //   Azure Static Web Apps のマネージドバックエンドは Azure Functions 上で動いており、
    //   Route Handler からストリームを返すと環境によっては応答を組み立てられず 500 になる。
    //   本アプリのレスポンスは検索結果か写真1枚ぶんで、メモリ上の実害が無いため読み切る。
    const body = NULL_BODY_STATUS.has(res.status) ? null : await res.arrayBuffer();

    return new Response(body, { status: res.status, headers: out });
  } catch (err) {
    console.error("[bff] response relay failed:", targetPath, err);
    return upstreamError(502, "bff_response_relay_failed", err);
  }
}
