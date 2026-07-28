"use client";

import Link from "next/link";
import type { StoreItem } from "@/lib/types";

/**
 * S2カード＝比べる画面の1行。要約に徹する：写真・店名・カテゴリ・楽さサマリのみ。
 * 歩きとバスの内訳は比較に必須なので残す（乗換バッジ等の詳細はS3へ）。
 * 写真の優先順: ユーザー投稿(store_photos の SAS) → プレースホルダ。
 * 判定は photo の有無ではなく ref（画像URL）の有無で行う。SAS未発行(#14)や写真なしでは
 * photo オブジェクトはあっても ref が null で、そのまま <img src> に入れると壊れた画像に
 * なるため。
 */
export default function StoreCard({ item }: { item: StoreItem }) {
  const walk = item.raku.walk1 + item.raku.walk2;
  return (
    <Link href={`/store/${item.store_id}`} className="card-link">
      <div className="card">
        {item.photo && item.photo.ref ? (
          <div className="photo-wrap">
            {/* 写真はDBに保存しない。user・own は承認済み行の SAS URL（発行は#14で未実装） */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="photo" src={item.photo.ref} alt={item.name} loading="lazy" />
            {item.photo.source === "hotpepper" && (
              <span className="credit">Powered by ホットペッパー グルメ</span>
            )}
          </div>
        ) : (
          <div className="photo">写真なし</div>
        )}
        <div className="cbody">
          <div className="cname">{item.name}</div>
          <div className="ccat">
            {item.category_s || item.category_l}
            {item.area_label ? `・${item.area_label}` : ""}
          </div>
          {/* 徒歩の方が速い店は徒歩を主に見せる（2026-07-28）。距離を併記するのは
              minutes が直線近似の推定値だから＝断定しない。バス経路は下に小さく残す */}
          {item.walk_only ? (
            <span className="raku walk-only">
              🚶 歩いて{item.walk_only.minutes}分（約{item.walk_only.distance_m}m）
              <small>バスなら{item.raku.total}分</small>
            </span>
          ) : (
            <span className="raku">
              🚶{walk}分 ＋ 🚌{item.raku.ride}分 ＝ {item.raku.total}分
            </span>
          )}
          {/* 本数少なめ（土日昼2本未満）。除外はせず開示するだけ＝警告ではなく注記の見た目 */}
          {item.few_trips && <span className="few-trips">🚌 本数少なめ</span>}
          {/* 合計時間の注意書き（チーム決定 2026-07-04）：時間表示の近くに明記 */}
          <div className="raku-note">※待ち時間・乗換時間は含みません</div>
        </div>
      </div>
    </Link>
  );
}
