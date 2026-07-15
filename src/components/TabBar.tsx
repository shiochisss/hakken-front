"use client";

import Link from "next/link";

/** 下部タブ（「さがす」「マイリスト」の2つのみ＝迷わない） */
export default function TabBar({
  active,
  badge,
}: {
  active: "search" | "mylist";
  badge?: number;
}) {
  return (
    <nav className="tabs">
      <Link href="/home" className={`tab ${active === "search" ? "on" : ""}`}>
        🔍 さがす
      </Link>
      <Link href="/mylist" className={`tab ${active === "mylist" ? "on" : ""}`}>
        📋 マイリスト
        {badge ? <span className="dot">{badge}</span> : null}
      </Link>
    </nav>
  );
}
