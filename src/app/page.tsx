"use client";

// エントリ: ログイン状態と初期設定の有無で振り分ける（S0/S1/S2）
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

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

  return <div className="loading">読み込み中…</div>;
}
