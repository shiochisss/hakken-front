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
    // walk_max は当初20だったが、reachが短距離モデル(直行1区間+hub2区間)のため
    // 広い徒歩上限では「ほぼ徒歩＋おまけバス」の経路が最短で返る事象が判明し15に調整
    // (2026-07-24 応急処置。根本はreach探索拡張=発表後の宿題)。
    values: { walk_max: 15, ride_max: 30, total_max: 60, transfer: "hub1" },
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
