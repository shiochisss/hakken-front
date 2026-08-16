/**
 * 中継の疎通確認用。**バックエンドには一切アクセスしない。**
 *
 * 「Next.js のサーバが SWA 上で動いているか」と「API_ORIGIN が設定されているか」を
 * 切り分けるためだけに存在する。判定の読み方:
 *
 *   404 が返る              … Next.js のサーバが動いていない（SWAが静的サイトとして配信している）
 *   500 が返る              … サーバは動いているが Route Handler が落ちている
 *   apiOriginConfigured:false … SWA のアプリ設定に API_ORIGIN が無い（設定漏れ）
 *   apiOriginConfigured:true  … 設定はある。原因はバックエンド側か中継の実装
 *
 * ★ 一時的な診断用。原因が特定できたら削除すること（API設計書 v1.8 A-12）。
 */
export const dynamic = "force-dynamic";

export function GET(): Response {
  const body = JSON.stringify({
    ok: true,
    // 値そのものは返さない（返すとブラウザからバックエンドURLが読めてしまう）
    apiOriginConfigured: Boolean(process.env.API_ORIGIN),
    node: process.version,
    nextRuntime: process.env.NEXT_RUNTIME ?? null,
  });
  return new Response(body, {
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}
