/**
 * ウォームアップ用 `/health` の中継。
 *
 * `api.ts` の `warmup()` が S0 マウント時に1回叩き、App Service（Free F1・Always On 不可）の
 * コールドスタートを緩和している（画面設計書 A-9）。
 * BFF 化で `BASE` が空文字になるため、この中継が無いと `/health` は **Next.js 側の404**を
 * 叩くだけになる。しかも `warmup()` はエラーを握りつぶすので**失敗しても誰も気付かない**。
 * このファイルは「静かに壊れる」のを防ぐためだけに存在する（API設計書 v1.8 A-12）。
 */
import type { NextRequest } from "next/server";

import { proxy } from "@/lib/proxy";

export const dynamic = "force-dynamic";

export const GET = (req: NextRequest) => proxy(req, "/health");
