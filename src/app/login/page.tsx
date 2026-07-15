"use client";

// S0 ログイン：選択肢はボタン1個だけ＝迷わない。パスワードは自社で持たない。
import { api } from "@/lib/api";

export default function LoginPage() {
  return (
    <div className="center" style={{ minHeight: "100dvh" }}>
      <div className="logo">ハッケン</div>
      <div className="tagline">
        楽に行ける範囲から、
        <br />
        知らない店を発見。
      </div>
      <div className="sub">歩かない・迷わない・計画しない</div>
      <button
        className="gbtn"
        onClick={() => {
          window.location.href = api.loginUrl();
        }}
      >
        G　Googleでログイン
      </button>
    </div>
  );
}
