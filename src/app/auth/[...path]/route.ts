/**
 * Google OAuth の往復（GET のみ）の中継。
 *   `/auth/google/login`    … Google の認可画面へ 302 ＋ state Cookie
 *   `/auth/google/callback` … セッション Cookie をセットして 302
 *
 * ここを通すことで、state Cookie もセッション Cookie も **フロントのドメインに付く**。
 * これが Safari／Firefox／Brave でログインできるようになる理由（API設計書 v1.8 A-12）。
 *
 * ※ GET だけを公開する。`POST /auth/logout` は SWA に 405 で弾かれるため、
 *   `src/app/api/auth/[...path]/route.ts` 側から中継する。
 */
import type { NextRequest } from "next/server";

import { joinPath, proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ path: string[] }> };

export const GET = async (req: NextRequest, ctx: Ctx) => {
  const { path } = await ctx.params;
  return proxy(req, `/auth/${joinPath(path)}`);
};
