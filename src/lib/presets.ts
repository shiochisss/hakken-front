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
    // walk_max は 2026-07-24 に 20→15 へ下げていた。reach が短距離モデル(直行1区間+hub2区間)
    // だったため、広い徒歩上限では「ほぼ徒歩＋おまけバス」（乗車停まで徒歩16分＋バス1分）の
    // 経路が最短で返っていたための応急処置。
    // → 2026-07-26 に根本解消したので **20 に戻した**（DB設計書9章#16）。route_segments を
    //   同一便の下流全停ペアにしたことで「近くの停から数停乗る」経路が選ばれるようになり、
    //   本番実測でも 徒歩20＋バス1＝25分 → 徒歩10＋バス12＝22分 に改善している。
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

/**
 * カテゴリチップ（対応表は DB設計書9章#12・サーバ側の絞り込みは `search.py` の `_CATEGORY_SQL`）。
 *
 * 2026-07-28 まで**サーバが category を絞り込みに使っておらず、どのチップを押しても
 * 全件が返っていた**（本番で発見）。サーバ側の実装で解消。
 *
 * 掲載146店の実データでは「パン」（`category_s='パン'`）と「銭湯」（`category_l='銭湯'`）は
 * 該当0件だが、**チップは残す**（2026-07-28 判断）。押した結果が正しく0件になるほうが
 * 実態を伝えられるうえ、掲載が増えれば自動で出るようになるため。
 *
 * キーを増減するときは**サーバの `_CATEGORY_SQL` と必ず両方**直すこと。サーバは対応表に
 * 無いキーを 400 で弾くので、片方だけ変えると検索が失敗する（テストで固定してある）。
 */
export const CATEGORY_CHIPS: { key: string | null; label: string }[] = [
  { key: null, label: "すべて" },
  { key: "cafe", label: "カフェ" },
  { key: "food", label: "ごはん" },
  { key: "bakery", label: "パン" },
  { key: "sento", label: "銭湯" },
];
