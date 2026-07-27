"use client";

// S2 ホーム＝発見リスト（本体）
// ・開いた瞬間、保存済みの条件で計算済みリストを表示（入力ゼロ＝計画ゼロの実装）
// ・条件を触れる場所はこの画面だけ。プリセットチップ＝一発書き換え／調整スライダー＝個別書き換え
// ・どちらも触った瞬間に反映・自動保存。プリセットとズレたら「✎ カスタム」表示
// ・並び順は「楽な順」固定（サーバ側ソート）
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { getCurrentPosition } from "@/lib/geo";
import { CATEGORY_CHIPS, PRESETS, detectPreset } from "@/lib/presets";
import type { ArrivalBanner, Conditions, PresetKey, SearchOrigin, SearchResponse } from "@/lib/types";
import StoreCard from "@/components/StoreCard";
import AdjustPanel from "@/components/AdjustPanel";
import TabBar from "@/components/TabBar";
import FullScreenLoading from "@/components/FullScreenLoading";

/**
 * ヘッダの「どこから探しているか」の文言（画面設計書 B-S2）。
 * 実機で「現在地がどこからなのか分からないため、提示されるルートの信ぴょう性が薄い」と
 * 指摘されたため、起点を住所で明示する（2026-07-27）。住所の解決はサーバ側。
 * 起点が取れないとき（データ圏外・古いサーバ）は従来文言に戻す＝表示が空にならない。
 */
function originText(origin: SearchOrigin | undefined): { main: string; sub: string } {
  if (origin?.source === "oaza" && origin.label) {
    return {
      main: `📍 ${origin.label} から探しています`,
      sub: origin.nearest_stop ? `最寄りのバス停: ${origin.nearest_stop}` : "",
    };
  }
  if (origin?.source === "stop" && origin.nearest_stop) {
    return { main: `📍 ${origin.nearest_stop} の近くから探しています`, sub: "" };
  }
  return { main: "📍 現在地から", sub: "現在地から探しています" };
}

export default function HomePage() {
  const router = useRouter();
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoDenied, setGeoDenied] = useState(false);
  const [conditions, setConditions] = useState<Conditions | null>(null);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [liveCount, setLiveCount] = useState<number | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [banner, setBanner] = useState<ArrivalBanner | null>(null);
  const [loading, setLoading] = useState(true);
  // 初回ロード（着地→GPS→条件→初回検索）中は全画面ローディング。
  // 以降の条件変更による再検索は loading（リスト内表示）で扱い、チップは見せ続ける。
  const [initializing, setInitializing] = useState(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 起動処理: 前面GPS1回 → 保存済み条件 → 検索 → 着いたバナー照合
  useEffect(() => {
    (async () => {
      api.logEvent("app_open");
      let p: { lat: number; lng: number };
      try {
        p = await getCurrentPosition();
      } catch {
        setGeoDenied(true);
        setLoading(false);
        return;
      }
      setPos(p);
      try {
        const c = await api.getConditions();
        setConditions(c);
        api.arrivalBanner(p.lat, p.lng).then(setBanner).catch(() => {});
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) router.replace("/login");
        else router.replace("/setup");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 検索実行（条件・カテゴリが変わるたび）
  const runSearch = useCallback(
    async (c: Conditions, cat: string | null) => {
      if (!pos) return;
      setLoading(true);
      try {
        const res = await api.search({ ...pos, conditions: c, category: cat });
        setResult(res);
        setLiveCount(res.meta.count);
        api.logEvent("list_shown", undefined, { count: res.meta.count, conditions: c });
      } finally {
        setLoading(false);
        setInitializing(false); // 初回検索が終わったら全画面ローディングを解除
      }
    },
    [pos]
  );

  useEffect(() => {
    if (conditions && pos) runSearch(conditions, category);
  }, [conditions, category, pos, runSearch]);

  // 条件変更: 触った瞬間に反映＋自動保存（保存はデバウンス）
  const updateConditions = (patch: Partial<Conditions>) => {
    if (!conditions) return;
    const merged = { ...conditions, ...patch };
    const preset_key: PresetKey =
      "preset_key" in patch ? merged.preset_key : detectPreset(merged);
    const next = { ...merged, preset_key };
    setConditions(next);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      api.saveConditions(next).catch(() => {});
    }, 400);
  };

  const applyPreset = (key: Exclude<PresetKey, "custom">) => {
    updateConditions({ ...PRESETS[key].values, preset_key: key });
  };

  const onArrived = async () => {
    if (!banner || !pos) return;
    try {
      const r = await api.arrived(banner.going_id, pos.lat, pos.lng);
      setBanner(null);
      if (r.result === "pending") {
        alert("まだ店の近くじゃないみたい。お店に着いたらもう一度押してね（記録は保留中）");
      }
    } catch {
      // 記録できていないのでバナーは消さない（もう一度押せる状態を保つ）
      alert("記録できませんでした。通信状況を確認してもう一度お試しください。");
    }
  };

  // 初回ロード中はフロー全体を途切れさせないため全画面ローディング（コールバック→/home の続き）
  if (initializing && !geoDenied) {
    return <FullScreenLoading message="読み込んでいます…" />;
  }

  if (geoDenied) {
    return (
      <>
        <div className="empty" style={{ paddingTop: 80 }}>
          <p>
            現在地が分からないと
            <br />
            「楽に行ける範囲」を計算できません
          </p>
          <button className="relax" onClick={() => window.location.reload()}>
            設定で位置情報を許可して再読み込み
          </button>
        </div>
        <TabBar active="search" />
      </>
    );
  }

  const isCustom = conditions?.preset_key === "custom";
  // 再検索中は前回の result を保持しているので、ヘッダの起点表示はちらつかない
  const origin = originText(result?.meta.origin);

  return (
    <>
      <header className="appbar">
        <div className="loc">
          {origin.main}
          {origin.sub && <small>{origin.sub}</small>}
        </div>
        <button className="gear" onClick={() => router.push("/settings")} aria-label="設定">
          ⚙
        </button>
      </header>

      {/* 着いたバナー（F8b）: 行く予定×48h×150m×最近傍。判定はサーバ側 */}
      {banner && (
        <div className="banner">
          <span>📍 {banner.store_name}に着いた？</span>
          <button onClick={onArrived}>着いたよ！</button>
        </div>
      )}

      <main className="main">
        {/* 条件チップ: 現在状態が常に見える */}
        <div className="chips">
          {isCustom && <button className="chip custom">✎ カスタム</button>}
          {(Object.keys(PRESETS) as Exclude<PresetKey, "custom">[]).map((key) => (
            <button
              key={key}
              className={`chip ${conditions?.preset_key === key ? "on" : ""}`}
              onClick={() => applyPreset(key)}
            >
              {PRESETS[key].emoji} {PRESETS[key].label}
            </button>
          ))}
          <button className="chip adjust" onClick={() => setPanelOpen((v) => !v)}>
            調整 {panelOpen ? "▴" : "▾"}
          </button>
        </div>

        {/* カテゴリチップ */}
        <div className="chips">
          {CATEGORY_CHIPS.map((c) => (
            <button
              key={c.label}
              className={`chip ${category === c.key ? "on" : ""}`}
              onClick={() => setCategory(c.key)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {panelOpen && conditions && (
          <AdjustPanel
            conditions={conditions}
            liveCount={liveCount}
            onChange={updateConditions}
            onClose={() => setPanelOpen(false)}
          />
        )}

        {loading && <div className="loading">計算済みリストを読み込み中…</div>}

        {!loading && result && result.items.length === 0 && (
          <div className="empty">
            <p>この条件で行ける店が見つかりません</p>
            {/* 0件は行き止まりにしない: 緩和ボタンで次の一手 */}
            {result.meta.relax_suggestions?.map((s) => (
              <button
                key={s.param}
                className="relax"
                onClick={() => updateConditions({ [s.param]: (conditions?.[s.param] ?? 0) + s.delta })}
              >
                {s.param === "walk_max" ? "歩き" : s.param === "ride_max" ? "バス" : "合計"}を +
                {s.delta}分 ゆるめる（{s.count}件）
              </button>
            ))}
          </div>
        )}

        {!loading && result?.items.map((item) => <StoreCard key={item.store_id} item={item} />)}
      </main>

      <TabBar active="search" />
    </>
  );
}
