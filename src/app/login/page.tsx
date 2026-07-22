"use client";

// S0 ログイン：選択肢はボタン1個だけ＝迷わない。パスワードは自社で持たない。
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import FullScreenLoading from "@/components/FullScreenLoading";

export default function LoginPage() {
  const [starting, setStarting] = useState(false);

  // マウント時に /health を1回ウォームアップし、コールドスタートを前倒しする
  // （ユーザーがボタンを押す前に App Service を起こしておく）。
  useEffect(() => {
    api.warmup();
  }, []);

  // ボタン押下の瞬間に全画面ローディングへ切り替える。
  // window.location.href への代入後もサーバ応答（302）まで現在の document は表示され続けるため、
  // このローディングはコールドスタートの数秒間ずっと見えたままになる。
  if (starting) {
    return <FullScreenLoading message={"サーバーを起動しています…\n（初回は数秒かかります）"} />;
  }

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
        disabled={starting}
        onClick={() => {
          setStarting(true);
          window.location.href = api.loginUrl();
        }}
      >
        G　Googleでログイン
      </button>
    </div>
  );
}
