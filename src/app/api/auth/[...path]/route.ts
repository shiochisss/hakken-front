/**
 * 認証系のうち **非GET** のものだけをここから中継する。現状は `POST /api/auth/logout` の1本。
 * 中継先は FastAPI の `/auth/...`（API本体のパスは変わらない）。
 *
 * ★なぜログインと分けるのか
 *   Azure Static Web Apps のハイブリッドNext.jsには、**`/api/` 配下でないパスへの非GETを
 *   405 Method Not Allowed で弾く**既知の不具合がある（Azure/static-web-apps#1132）。
 *   `POST /auth/logout` がこれに該当するため、ログアウトだけ `/api/` 配下へ逃がす。
 *   ログイン・コールバックは GET なので `src/app/auth/[...path]/route.ts` のままでよい
 *   （そちらに置いておけば、OAuth の state Cookie（path=/auth）に手を入れずに済む）。
 *   詳細は API設計書 v1.8 A-12。
 */
import type { NextRequest } from "next/server";

import { joinPath, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

type Ctx = { params: { path: string[] } };

const handler = (req: NextRequest, ctx: Ctx) => proxy(req, `/auth/${joinPath(ctx.params.path)}`);

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
