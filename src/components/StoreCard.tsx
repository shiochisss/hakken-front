"use client";

import Link from "next/link";
import type { StoreItem } from "@/lib/types";

/**
 * S2カード＝比べる画面の1行。要約に徹する：写真・店名・カテゴリ・楽さサマリのみ。
 * 歩きとバスの内訳は比較に必須なので残す（乗換バッジ等の詳細はS3へ）。
 */
export default function StoreCard({ item }: { item: StoreItem }) {
  const walk = item.raku.walk1 + item.raku.walk2;
  return (
    <Link href={`/store/${item.store_id}`} className="card-link">
      <div className="card">
        {item.photo ? (
          // 写真はDBに保存せず表示時にAPI取得（ホットペッパー優先→Places）
          // eslint-disable-next-line @next/next/no-img-element
          <img className="photo" src={item.photo.ref} alt={item.name} loading="lazy" />
        ) : (
          <div className="photo">写真なし</div>
        )}
        <div className="cbody">
          <div className="cname">{item.name}</div>
          <div className="ccat">
            {item.category_s || item.category_l}
            {item.area_label ? `・${item.area_label}` : ""}
          </div>
          <span className="raku">
            🚶{walk}分 ＋ 🚌{item.raku.ride}分 ＝ {item.raku.total}分
          </span>
          {/* 合計時間の注意書き（チーム決定 2026-07-04）：時間表示の近くに明記 */}
          <div className="raku-note">※待ち時間・乗換時間は含みません</div>
        </div>
      </div>
    </Link>
  );
}
