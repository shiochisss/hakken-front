// 全画面ローディング（スピナー＋メッセージ）。
// Free F1 プラン（Always On 不可）のコールドスタート／DB(B1ms) の初回ロード中に、
// フローを途切れさせず「動いている」ことを伝える体感緩和用の共通部品。
// 遅延そのものは解消しない（UX改善）。
export default function FullScreenLoading({ message }: { message: string }) {
  return (
    <div className="fsloading" role="status" aria-live="polite">
      <div className="fsloading-spinner" aria-hidden="true" />
      <p className="fsloading-msg">{message}</p>
    </div>
  );
}
