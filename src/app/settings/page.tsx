"use client";

// S5 設定: アカウント系＋たれ込み入口（条件設定は置かない＝条件を触る場所はホームだけ）
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type { Me } from "@/lib/types";
import TabBar from "@/components/TabBar";

export default function SettingsPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api.me().then(setMe).catch(() => router.replace("/login"));
  }, [router]);

  const maskEmail = (email: string) => {
    const [local, domain] = email.split("@");
    return `${local.slice(0, 7)}***@${domain}`;
  };

  const logout = async () => {
    await api.logout();
    router.replace("/login");
  };

  return (
    <>
      <header className="appbar">
        <div className="loc">⚙ 設定</div>
      </header>

      <main className="main">
        <button
          className="setrow"
          onClick={() =>
            alert(
              "位置情報の取得は、検索時と「着いたよ」を押した時の1回ずつだけです。移動の追跡（バックグラウンド取得）はしません・できません。"
            )
          }
        >
          <div>
            位置情報について
            <small>取得は検索時と「着いたよ」の時だけ・追跡なし</small>
          </div>
          <div className="arrow">›</div>
        </button>

        {/* たれ込み入口（F11・新規モード）→ S6a（/tip） */}
        <Link href="/tip" className="setrow">
          <div>
            お店を教える
            <small>新しいお店のたれ込み（運営確認後に掲載）</small>
          </div>
          <div className="arrow">›</div>
        </Link>

        <button className="setrow">
          <div>
            アカウント
            <small>{me ? `${maskEmail(me.email)}（Google連携）` : "…"}</small>
          </div>
          <div className="arrow">›</div>
        </button>

        <button
          className="setrow"
          onClick={() => alert("利用規約・プライバシーポリシーは準備中です（MVP期間中に確定）")}
        >
          <div>利用規約・プライバシーポリシー</div>
          <div className="arrow">›</div>
        </button>

        <button className="setrow" onClick={logout}>
          <div className="danger">ログアウト</div>
          <div className="arrow">›</div>
        </button>
      </main>

      <TabBar active="search" />
    </>
  );
}
