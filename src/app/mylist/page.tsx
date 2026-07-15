"use client";

// S4 マイリスト: 「行く予定」＝今日行く（着いたよボタン付き）／「お気に入り」＝いつか行く
import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { getCurrentPosition } from "@/lib/geo";
import type { MyList } from "@/lib/types";
import TabBar from "@/components/TabBar";

export default function MyListPage() {
  const [list, setList] = useState<MyList | null>(null);
  const [tab, setTab] = useState<"going" | "favorites">("going");
  const [holdMsg, setHoldMsg] = useState(false);

  const load = () => api.myList().then(setList).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  // 「着いたよ」= 前面GPSを1回だけ照合（何が起きるかは説明文を常設＝間違えない）
  const arrived = async (goingId: number) => {
    try {
      const pos = await getCurrentPosition();
      const r = await api.arrived(goingId, pos.lat, pos.lng);
      if (r.result === "pending") setHoldMsg(true);
      load();
    } catch {
      alert("位置情報が取得できませんでした。設定を確認してください。");
    }
  };

  const fmtDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <>
      <header className="appbar">
        <div className="loc">📋 マイリスト</div>
      </header>

      {holdMsg && (
        <div className="hold">
          まだ店の近くじゃないみたい。
          <br />
          お店に着いたらもう一度押してね（記録は保留中）
        </div>
      )}

      <main className="main">
        <div className="seg">
          <button className={tab === "going" ? "on" : ""} onClick={() => setTab("going")}>
            行く予定 ({list?.going.length ?? 0})
          </button>
          <button className={tab === "favorites" ? "on" : ""} onClick={() => setTab("favorites")}>
            お気に入り ({list?.favorites.length ?? 0})
          </button>
        </div>

        {!list && <div className="loading">読み込み中…</div>}

        {list && tab === "going" && (
          <>
            {list.going.length === 0 && (
              <div className="empty">
                <p>「ここ行く」した店がここに入ります</p>
              </div>
            )}
            {list.going.map((g) => {
              const walk = g.store.raku.walk1 + g.store.raku.walk2;
              return (
                <div className="card" key={g.going_id}>
                  <div className="cbody">
                    <Link href={`/store/${g.store.store_id}`} className="card-link">
                      <div className="cname">{g.store.name}</div>
                      <div className="ccat">
                        {g.store.category_s || g.store.category_l}
                        {g.store.area_label ? `・${g.store.area_label}` : ""}　｜
                        {fmtDate(g.tapped_at)} に「ここ行く」
                        {g.arrival_status === "verified" && "　✓来店済み"}
                        {g.arrival_status === "pending" && "　（記録は保留中）"}
                      </div>
                      <span className="raku">
                        🚶{walk}分 ＋ 🚌{g.store.raku.ride}分 ＝ {g.store.raku.total}分
                      </span>
                    </Link>
                    {g.arrival_status !== "verified" && (
                      <button className="arrived-btn" onClick={() => arrived(g.going_id)}>
                        📍 着いたよ！
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="sub" style={{ textAlign: "center", marginTop: 16 }}>
              「着いたよ」を押すと現在地を1回だけ確認して
              <br />
              来店の記録をつけます
            </div>
          </>
        )}

        {list && tab === "favorites" && (
          <>
            {list.favorites.length === 0 && (
              <div className="empty">
                <p>♡したお店がここに入ります</p>
              </div>
            )}
            {list.favorites.map((f) => {
              const walk = f.store.raku.walk1 + f.store.raku.walk2;
              return (
                <Link href={`/store/${f.store.store_id}`} className="card-link" key={f.store.store_id}>
                  <div className="card">
                    <div className="cbody">
                      <div className="cname">{f.store.name}</div>
                      <div className="ccat">
                        {f.store.category_s || f.store.category_l}
                        {f.store.area_label ? `・${f.store.area_label}` : ""}
                      </div>
                      <span className="raku">
                        🚶{walk}分 ＋ 🚌{f.store.raku.ride}分 ＝ {f.store.raku.total}分
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </>
        )}
      </main>

      <TabBar active="mylist" />
    </>
  );
}
