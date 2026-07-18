"use client";

// S6 たれ込みフォーム（F11）＝「間違えない」
// 新しいお店を教える／既存店の情報変更・閉店・写真を報告する。
// 投稿は承認待ち（submissions / store_photos:pending）に入り、承認まで stores に反映されない。
// API: submitTip（B-15）／uploadTipPhoto（B-16）。写真は store_id が要るため報告モード（既存店）のみ。
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { SubmissionInput, SubmissionType } from "@/lib/types";

type SegKey = SubmissionType | "photo";

const GMAPS_RE =
  /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)/i;

function TipForm() {
  const router = useRouter();
  const params = useSearchParams();
  const storeIdRaw = params.get("store_id");
  const storeId = storeIdRaw ? Number(storeIdRaw) : null;
  const storeName = params.get("name") ?? "";
  const reportMode = storeId != null && !Number.isNaN(storeId);

  const [seg, setSeg] = useState<SegKey>(reportMode ? "info_edit" : "new_store");
  const [url, setUrl] = useState("");
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // 要ログイン（未ログインは /login へ）。モックでは常に解決。
  useEffect(() => {
    api.me().catch(() => router.replace("/login"));
  }, [router]);

  const segments: { key: SegKey; label: string }[] = useMemo(
    () =>
      reportMode
        ? [
            { key: "info_edit", label: "情報の変更" },
            { key: "closure_report", label: "閉店してた" },
            { key: "photo", label: "写真" },
          ]
        : [{ key: "new_store", label: "新しいお店" }],
    [reportMode]
  );

  const commentLabel =
    seg === "new_store"
      ? "コメント（任意）"
      : seg === "info_edit"
      ? "何がどう違うか（必須）"
      : seg === "closure_report"
      ? "閉店・休業の状況（必須）"
      : "";

  const onPickFiles = (list: FileList | null) => {
    if (!list) return;
    const picked = Array.from(list).filter(
      (f) => f.type === "image/jpeg" || f.type === "image/png"
    );
    setFiles(picked);
  };

  const validate = (): string | null => {
    if (seg === "new_store") {
      if (!url.trim()) return "GoogleマップのURLを貼ってください。";
      if (!GMAPS_RE.test(url.trim())) return "GoogleマップのURL形式で入力してください。";
    } else if (seg === "info_edit" || seg === "closure_report") {
      if (!comment.trim()) return "内容を入力してください。";
    } else if (seg === "photo") {
      if (files.length === 0) return "写真（JPEG／PNG）を選んでください。";
    }
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
      if (seg !== "photo") {
        let payload: SubmissionInput["payload"];
        if (seg === "new_store") {
          payload = { gmaps_url: url.trim(), comment: comment.trim() || undefined };
        } else if (seg === "info_edit") {
          payload = { comment: comment.trim() };
        } else {
          payload = { reason: comment.trim() };
        }
        await api.submitTip({ type: seg, store_id: reportMode ? storeId : null, payload });
      }
      // 写真は store_id が必要（既存店の報告モードのみ）。任意添付＋写真モードの両方に対応。
      if (files.length > 0 && storeId != null) {
        for (const f of files) await api.uploadTipPhoto(f, storeId);
      }
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
          <div className="loc">📮 お店を教える・報告する</div>
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

  const showPhoto = reportMode; // 写真は既存店（store_idあり）のみ添付可
  const photoRequired = seg === "photo";

  return (
    <>
      <header className="appbar">
        <button className="linkback" onClick={() => router.back()} aria-label="戻る">
          ‹ 戻る
        </button>
        <div className="loc">📮 お店を教える・報告する</div>
      </header>

      <main className="main">
        {reportMode && (
          <div className="tip-target">
            対象のお店：<b>{storeName || `#${storeId}`}</b>
          </div>
        )}

        {segments.length > 1 && (
          <div className="seg">
            {segments.map((s) => (
              <button
                key={s.key}
                className={seg === s.key ? "on" : ""}
                onClick={() => setSeg(s.key)}
                type="button"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        {seg === "new_store" && (
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
        )}

        {seg !== "photo" && (
          <div className="tip-field">
            <label>{commentLabel}</label>
            <textarea
              rows={4}
              placeholder={
                seg === "closure_report"
                  ? "例：店頭に閉店の貼り紙がありました"
                  : seg === "info_edit"
                  ? "例：バス停の名前が変わっています"
                  : "補足があれば（任意）"
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
        )}

        {showPhoto && (
          <div className="tip-field">
            <label>写真{photoRequired ? "（必須）" : "（任意）"}</label>
            <input
              type="file"
              accept="image/jpeg,image/png"
              multiple
              onChange={(e) => onPickFiles(e.target.files)}
            />
            <small className="tip-hint">
              自分で撮った写真だけを投稿してください（JPEG／PNG）。
              {files.length > 0 ? ` 選択中: ${files.length}枚` : ""}
            </small>
          </div>
        )}

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
      <TipForm />
    </Suspense>
  );
}
