"use client";

// S1 初期設定（初回のみ・2ステップ）
// S1-a: 位置情報許可（OSダイアログの前に理由を1文で説明）
// S1-b: 楽プリセット選択（3枚から1タップ・数値入力なし＝間違えない）
import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { getCurrentPosition } from "@/lib/geo";
import { PRESETS } from "@/lib/presets";
import type { PresetKey } from "@/lib/types";
import FullScreenLoading from "@/components/FullScreenLoading";

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [geoDenied, setGeoDenied] = useState(false);
  const [saving, setSaving] = useState(false);

  const requestLocation = async () => {
    try {
      await getCurrentPosition();
      setStep(2);
    } catch {
      setGeoDenied(true);
    }
  };

  const choosePreset = async (key: Exclude<PresetKey, "custom">) => {
    if (saving) return;
    setSaving(true);
    try {
      await api.saveConditions({ ...PRESETS[key].values, preset_key: key });
      router.replace("/home");
    } catch {
      setSaving(false);
      alert("保存に失敗しました。通信環境を確認してもう一度お試しください。");
    }
  };

  // プリセット保存→/home 遷移までの初回データ取得中は全画面ローディング（フローを途切れさせない）
  if (saving) {
    return <FullScreenLoading message="読み込んでいます…" />;
  }

  if (step === 1) {
    return (
      <div className="center" style={{ minHeight: "100dvh" }}>
        <div className="stepnum">1 / 2</div>
        <div className="permit-icon">📍</div>
        <div className="tagline">今いる場所から探します</div>
        <p className="why">
          現在地は「楽に行ける範囲」の計算だけに使い、
          <br />
          移動の追跡はしません。
        </p>
        {geoDenied ? (
          <div className="empty">
            <p>
              現在地が分からないと「楽に行ける範囲」を
              <br />
              計算できません
            </p>
            <button className="relax" onClick={requestLocation}>
              もう一度許可を試す
            </button>
            <p className="sub" style={{ marginTop: 12 }}>
              ブラウザの設定から位置情報を許可してください
            </p>
          </div>
        ) : (
          <button className="primary" onClick={requestLocation}>
            位置情報を許可する
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="center" style={{ minHeight: "100dvh", justifyContent: "flex-start", paddingTop: 48 }}>
      <div className="stepnum">2 / 2</div>
      <div className="tagline" style={{ marginBottom: 18 }}>
        あなたの「楽」を教えてください
      </div>
      {(Object.keys(PRESETS) as Exclude<PresetKey, "custom">[]).map((key) => {
        const p = PRESETS[key];
        return (
          <button key={key} className="preset" onClick={() => choosePreset(key)} disabled={saving}>
            <b>
              {p.emoji} {p.label}
            </b>
            <span>
              歩き{p.values.walk_max}分まで／合計{p.values.total_max}分まで／
              {p.values.transfer === "none" ? "乗換なし" : "乗換1回OK"}
            </span>
          </button>
        );
      })}
      <div className="sub" style={{ margin: "10px 0 0" }}>
        ホーム画面でいつでも変えられます
      </div>
    </div>
  );
}
