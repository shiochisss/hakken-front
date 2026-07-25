"use client";

// S6b たれ込み・店の報告（F11）＝「間違えない」
// 既存店の情報変更・閉店報告・写真投稿。対象店（store_id）は S3 から引き継ぎ固定・変更不可。
// タブ（情報の変更／閉店してた／写真）は排他表示：本文は1タブにつき1種のみ。3タブとも同じ store_id を共有。
// 投稿は承認待ち（submissions / store_photos:pending）に入り、承認まで stores に反映されない。
// API: submitTip（B-15・info_edit/closure_report）／uploadTipPhoto（B-16・写真）。
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { PHOTO_ACCEPT, checkPhotoFile } from "@/lib/photo";
import type { SubmissionType } from "@/lib/types";

type Tab = "info_edit" | "closure_report" | "photo";

function ReportForm() {
  const router = useRouter();
  const params = useSearchParams();
  const storeIdRaw = params.get("store_id");
  const storeId = storeIdRaw ? Number(storeIdRaw) : null;
  const storeName = params.get("name") ?? "";
  const validStore = storeId != null && !Number.isNaN(storeId);

  const [tab, setTab] = useState<Tab>("info_edit");
  const [comment, setComment] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // 要ログイン。対象店が無ければ S6b は成立しないのでホームへ戻す。
  useEffect(() => {
    api.me().catch(() => router.replace("/login"));
  }, [router]);
  useEffect(() => {
    if (!validStore) router.replace("/");
  }, [validStore, router]);

  const tabs: { key: Tab; label: string }[] = useMemo(
    () => [
      { key: "info_edit", label: "情報の変更" },
      { key: "closure_report", label: "閉店してた" },
      { key: "photo", label: "写真" },
    ],
    []
  );

  const commentLabel =
    tab === "info_edit" ? "何がどう違うか（必須）" : "閉店・休業の状況（必須）";

  // 投稿できない形式は黙って捨てず、ファイル名と理由を伝える（HEICは受付対象）。
  const onPickFiles = (list: FileList | null) => {
    if (!list) return;
    const accepted: File[] = [];
    const rejected: string[] = [];
    for (const f of Array.from(list)) {
      const r = checkPhotoFile(f);
      if (r.ok) accepted.push(f);
      else rejected.push(`${f.name}（${r.reason}）`);
    }
    setFiles(accepted);
    setError(rejected.length ? `投稿できないファイル: ${rejected.join(" / ")}` : null);
  };

  const validate = (): string | null => {
    if (tab === "photo") {
      if (files.length === 0) return "写真（JPEG／PNG／HEIC）を選んでください。";
    } else if (!comment.trim()) {
      return "内容を入力してください。";
    }
    return null;
  };

  const submit = async () => {
    if (!validStore || storeId == null) return;
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      if (tab === "photo") {
        for (const f of files) await api.uploadTipPhoto(f, storeId);
      } else {
        const type: SubmissionType = tab;
        const payload =
          tab === "info_edit"
            ? { comment: comment.trim() }
            : { reason: comment.trim() };
        await api.submitTip({ type, store_id: storeId, payload });
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
          <div className="loc">📮 店の報告</div>
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
        <div className="loc">📮 店の報告</div>
      </header>

      <main className="main">
        <div className="tip-target">
          対象のお店：<b>{storeName || `#${storeId}`}</b>
        </div>

        <div className="seg">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={tab === t.key ? "on" : ""}
              onClick={() => {
                setTab(t.key);
                setError(null);
              }}
              type="button"
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "photo" ? (
          <div className="tip-field">
            <label>写真（必須）</label>
            <input
              type="file"
              accept={PHOTO_ACCEPT}
              multiple
              onChange={(e) => onPickFiles(e.target.files)}
            />
            <small className="tip-hint">
              自分で撮った写真だけを投稿してください（JPEG／PNG／HEIC）。
              {files.length > 0 ? ` 選択中: ${files.length}枚` : ""}
            </small>
          </div>
        ) : (
          <div className="tip-field">
            <label>{commentLabel}</label>
            <textarea
              rows={4}
              placeholder={
                tab === "closure_report"
                  ? "例：店頭に閉店の貼り紙がありました"
                  : "例：電話番号が変わっているみたいです"
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
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

export default function TipReportPage() {
  return (
    <Suspense fallback={<div className="loading">読み込み中…</div>}>
      <ReportForm />
    </Suspense>
  );
}
