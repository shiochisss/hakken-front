import type { Conditions, PresetKey } from "./types";

/**
 * プリセット3種（数値は仮＝TBD）。
 * 本番値はバス停DB完成後の件数シミュレーションで確定する
 * （最も厳しいプリセットでも10件以上出る値。要件定義書13章）。
 */
export const PRESETS: Record<
  Exclude<PresetKey, "custom">,
  { label: string; emoji: string; values: Omit<Conditions, "preset_key"> }
> = {
  no_walk: {
    label: "とにかく歩かない",
    emoji: "🚶",
    values: { walk_max: 10, ride_max: 15, total_max: 30, transfer: "none" },
  },
  balance: {
    label: "バランス",
    emoji: "⚖️",
    values: { walk_max: 15, ride_max: 20, total_max: 40, transfer: "none" },
  },
  far_ok: {
    label: "遠出OK",
    emoji: "🚌",
    values: { walk_max: 20, ride_max: 30, total_max: 60, transfer: "hub1" },
  },
};

/** 現在の条件がどのプリセットと一致するか判定（一致しなければ custom） */
export function detectPreset(c: Omit<Conditions, "preset_key">): PresetKey {
  for (const [key, p] of Object.entries(PRESETS)) {
    const v = p.values;
    if (
      v.walk_max === c.walk_max &&
      v.ride_max === c.ride_max &&
      v.total_max === c.total_max &&
      v.transfer === c.transfer
    ) {
      return key as PresetKey;
    }
  }
  return "custom";
}

/** カテゴリチップ（category_l/s との対応表は未決＝DB設計書9章#12。仮実装） */
export const CATEGORY_CHIPS: { key: string | null; label: string }[] = [
  { key: null, label: "すべて" },
  { key: "cafe", label: "カフェ" },
  { key: "food", label: "ごはん" },
  { key: "bakery", label: "パン" },
  { key: "sento", label: "銭湯" },
];
