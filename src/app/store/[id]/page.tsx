"use client";

// S3 店詳細＝確信する画面
// S2に持てないものだけ: ①どのバス停から何行きに乗るか（固有名詞）②営業中か ③写真複数 ④行動ボタン
// 道順の細部と時刻はGoogleマップに委譲
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getCurrentPosition } from "@/lib/geo";
import type { StoreItem } from "@/lib/types";
import TabBar from "@/components/TabBar";

export default function StoreDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [item, setItem] = useState<StoreItem | null>(null);
  const [faved, setFaved] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [badge, setBadge] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const pos = await getCurrentPosition();
        const data = await api.getStore(Number(id), pos.lat, pos.lng);
        setItem(data);
        api.logEvent("store_view", data.store_id);
      } catch {
        router.replace("/home");
      }
    })();
  }, [id, router]);

  if (!item) return <div className="loading">読み込み中…</div>;

  const toggleFav = async () => {
    if (faved) {
      await api.removeFavorite(item.store_id);
      setFaved(false);
    } else {
      await api.addFavorite(item.store_id);
      api.logEvent("favorite", item.store_id);
      setFaved(true);
    }
  };

  // 「ここ行く」＝行く意思の宣言。タップの瞬間に①行く予定リスト登録＋②タップログ記録
  // koko_iku の event_log 記録はサーバ側（POST /api/going）で行う＝二重計上を避けるためフロントでは logEvent しない
  const kokoIku = async () => {
    await api.kokoIku(item.store_id, item.raku);
    setBadge(1);
    setSheetOpen(true);
  };

  // 「経路を見る」＝移動の実行（Google側）。別の行為として分離
  const openGmaps = () => {
    api.logEvent("gmaps_out", item.store_id);
    window.open(item.gmaps_url, "_blank", "noopener");
  };

  return (
    <>
      {item.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="photo detail-photo" src={item.photo.ref} alt={item.name} />
      ) : (
        <div className="photo detail-photo">写真なし</div>
      )}

      <main className="main">
        <div className="dname">{item.name}</div>
        <div className="dmeta">
          <span className="open">{item.status}</span>
          {item.opening_hours ? ` ${item.opening_hours}` : ""}｜ {item.category_s || item.category_l}
          {item.area_label ? `・${item.area_label}` : ""}
        </div>

        <div className="rakubox">
          <h4>あなたの現在地からの行き方の楽さ</h4>
          <div className="steps">
            <div className="node">
              <div className="ico">🏠</div>家
            </div>
            <div className="leg">
              <span>歩{item.raku.walk1}分</span>
            </div>
            <div className="node">
              <div className="ico">🚏</div>
              {item.boarding_stop}
            </div>
            <div className="leg">
              <span>バス{item.raku.ride}分</span>
            </div>
            <div className="node">
              <div className="ico">🚏</div>
              {item.alight_stop}
            </div>
            <div className="leg">
              <span>歩{item.raku.walk2}分</span>
            </div>
            <div className="node">
              <div className="ico">☕</div>店
            </div>
          </div>
          <div className="busline">
            🚌 「{item.boarding_stop}」から <b>{item.route_label}</b>に乗車・
            {item.raku.transfer === "none" ? "乗換なし" : `ハブ（${item.raku.via_hub}）で乗換1回`}
          </div>
          <div className="total">
            合計 {item.raku.total}分
            <small>※待ち時間・乗換時間は含みません</small>
          </div>
        </div>

        {item.address && <div className="info">📍 {item.address}</div>}
      </main>

      <div className="actionbar">
        <button className={`fav ${faved ? "on" : ""}`} onClick={toggleFav}>
          {faved ? "♥ お気に入り済み" : "♡ お気に入り"}
        </button>
        <button className="go" onClick={kokoIku}>
          ここ行く
        </button>
      </div>

      {/* S3-b ここ行くタップ後のボトムシート */}
      {sheetOpen && (
        <div className="dim" onClick={() => setSheetOpen(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h4>✓ マイリスト（行く予定）に追加しました</h4>
            <p>バスの時刻と道順はGoogleマップで確認できます</p>
            <button className="primary" onClick={openGmaps}>
              Googleマップで経路を見る →
            </button>
            <button className="ghost" onClick={() => setSheetOpen(false)}>
              あとで行く（閉じる）
            </button>
          </div>
        </div>
      )}

      <TabBar active="search" badge={badge} />
    </>
  );
}
