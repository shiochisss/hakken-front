/**
 * 業務API（B-1〜B-16）の中継。ブラウザの `/api/...` を FastAPI の `/api/...` へ素通しする。
 * BFF の中心。設計は API設計書 v1.8 A-12。
 *
 * ※ `/api/auth/...` は **このファイルには来ない**。Next.js はより具体的なルートを優先するため
 *    `src/app/api/auth/[...path]/route.ts` が受ける（ログアウト専用・405回避）。
 */
import type { NextRequest } from "next/server";

import { joinPath, proxy } from "@/lib/proxy";

// 毎回サーバで実行する（静的化・キャッシュをさせない）
export const dynamic = "force-dynamic";

type Ctx = { params: { path: string[] } };

const handler = (req: NextRequest, ctx: Ctx) => proxy(req, `/api/${joinPath(ctx.params.path)}`);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
