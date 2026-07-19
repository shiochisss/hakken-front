"use client";

// S6a たれ込み・新しいお店（F11）＝「間違えない」
// 未掲載の店を GoogleマップURL で教えるフォーム。対象店（store_id）を持たない。
// 投稿は承認待ち（submissions・type=new_store）に入り、承認まで stores に反映されない。
// API: submitTip（B-15）。写真は store_id が必須のためこの画面には無い（→ 報告は S6b: /tip/report）。
import { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

const GMAPS_RE =
  /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)/i;

function NewStoreForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // 要ログイン（未ログインは /login へ）。モックでは常に解決。
  useEffect(() => {
    api.me().catch(() => router.replace("/login"));
  }, [router]);

  const validate = (): string | null => {
    if (!url.trim()) return "GoogleマップのURLを貼ってください。";
    if (!GMAPS_RE.test(url.trim())) return "GoogleマップのURL形式で入力してください。";
    return null;
  };

  const submit = async () => {
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await api.submitTip({
        type: "new_store",
        store_id: null,
        payload: { gmaps_url: url.trim(), comment: comment.trim() || undefined },
      });
      setDone(true);
    } catch {
      setError("送信に失敗しました。通信環境を確認して、もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <>
        <header className="appbar">
          <div className="loc">📮 お店を教える</div>
        </header>
        <main className="main">
          <div className="tip-done">
            <div className="tip-done-icon">✓</div>
            <h3>ありがとうございます！</h3>
            <p>運営が内容を確認して反映します。反映まで数日かかることがあります。</p>
            <button className="primary" onClick={() => router.back()}>
              元の画面に戻る
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <header className="appbar">
        <button className="linkback" onClick={() => router.back()} aria-label="戻る">
          ‹ 戻る
        </button>
        <div className="loc">📮 お店を教える</div>
      </header>

      <main className="main">
        <div className="tip-field">
          <label>GoogleマップのURL（必須）</label>
          <input
            type="url"
            inputMode="url"
            placeholder="https://maps.app.goo.gl/…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </div>

        <div className="tip-field">
          <label>コメント（任意）</label>
          <textarea
            rows={4}
            placeholder="補足があれば（任意）例：昔ながらの喫茶店。モーニングが良いらしい"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <div className="tip-note">
          投稿は運営が確認してから反映されます。反映まで数日かかることがあります。
        </div>

        {error && <div className="tip-error">{error}</div>}

        <button className="primary" onClick={submit} disabled={submitting}>
          {submitting ? "送信中…" : "送信する"}
        </button>
      </main>
    </>
  );
}

export default function TipPage() {
  return (
    <Suspense fallback={<div className="loading">読み込み中…</div>}>
      <NewStoreForm />
    </Suspense>
  );
}
