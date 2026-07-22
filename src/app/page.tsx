"use client";

// エントリ: ログイン状態と初期設定の有無で振り分ける（S0/S1/S2）
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import FullScreenLoading from "@/components/FullScreenLoading";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    api
      .me()
      .then((me) => {
        router.replace(me.has_conditions ? "/home" : "/setup");
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [router]);

  // Google コールバック直後の着地点。/api/me の判定中はフローを途切れさせず表示を維持する。
  return <FullScreenLoading message="読み込んでいます…" />;
}
