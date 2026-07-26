"use client";

import type { Conditions } from "@/lib/types";

/**
 * 調整パネル（S2-b）。4パラメータを個別に書き換えるスライダー。
 * 触った瞬間に反映・自動保存（「適用ボタン」概念なし）。件数ライブプレビュー付き。
 */
export default function AdjustPanel({
  conditions,
  liveCount,
  onChange,
  onClose,
}: {
  conditions: Conditions;
  liveCount: number | null;
  onChange: (patch: Partial<Conditions>) => void;
  onClose: () => void;
}) {
  return (
    <div className="panel">
      <h4>細かく調整</h4>
      <div className="autosave">✓ 動かすとすぐ反映・自動保存（次回もこの条件）</div>

      <div className="slider-row">
        <label>
          <span>歩き時間の上限（行き帰り両端の合計）</span>
          <b>{conditions.walk_max}分</b>
        </label>
        <input
          type="range"
          min={5}
          max={30}
          step={1}
          value={conditions.walk_max}
          onChange={(e) => onChange({ walk_max: Number(e.target.value) })}
        />
      </div>

      <div className="slider-row">
        <label>
          <span>バス乗車の上限</span>
          <b>{conditions.ride_max}分</b>
        </label>
        <input
          type="range"
          min={5}
          max={40}
          step={1}
          value={conditions.ride_max}
          onChange={(e) => onChange({ ride_max: Number(e.target.value) })}
        />
      </div>

      <div className="slider-row">
        <label>
          <span>合計時間の上限</span>
          <b>{conditions.total_max}分</b>
        </label>
        <input
          type="range"
          min={10}
          max={90}
          step={5}
          value={conditions.total_max}
          onChange={(e) => onChange({ total_max: Number(e.target.value) })}
        />
      </div>

      <div className="slider-row">
        <label>
          <span>乗り換え</span>
        </label>
        <div className="toggle">
          <button
            className={conditions.transfer === "none" ? "on" : ""}
            onClick={() => onChange({ transfer: "none" })}
          >
            なし
          </button>
          <button
            className={conditions.transfer === "hub1" ? "on" : ""}
            onClick={() => onChange({ transfer: "hub1" })}
          >
            {/* 乗換停はハブに限らなくなった（2026-07-26）ので「ハブで」を外す */}
            1回までOK
          </button>
        </div>
      </div>

      <div className="livecount">
        {liveCount === null ? "件数を計算中…" : `この条件で ${liveCount}件`}
      </div>
      <button className="close-panel" onClick={onClose}>
        閉じる ▴
      </button>
    </div>
  );
}
