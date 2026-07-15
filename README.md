# ハッケンバス フロントエンド

UIモックアップ v3・DB設計書 v1.0 に対応した Next.js（App Router / TypeScript）実装。
バックエンドは FastAPI 前提（Cookie セッション認証・CORS は `credentials` 許可が必要）。

## クイックスタート（バックエンドなしで画面を見る＝モックモード）

```bash
npm install
cp .env.local.example .env.local   # NEXT_PUBLIC_MOCK=1 が入っている
npm run dev                        # http://localhost:3000 を開く
```

モックモードではログイン不要（自動でログイン済み扱い）。ダミーの6店舗でS0〜S5の全画面・全操作（プリセット切替・スライダー・ここ行く・着いたよ・0件緩和）を確認できる。位置情報を拒否しても練馬駅にフォールバックする。状態はブラウザの localStorage に保存され、ログアウトでリセット。

## FastAPI 接続時のセットアップ

`.env.local` の `NEXT_PUBLIC_MOCK` を消す（または0にする）と FastAPI 接続モードになる。
`NEXT_PUBLIC_API_BASE_URL` にバックエンドのURLを設定すること。

## 画面構成（モックv3準拠）

| パス | 画面 |
|---|---|
| `/` | 振り分け（ログイン→S0／未設定→S1／設定済み→S2） |
| `/login` | S0 ログイン（Google OAuth へリダイレクト） |
| `/setup` | S1 初期設定（位置情報許可→楽プリセット、初回のみ） |
| `/home` | S2 ホーム＝発見リスト（条件チップ・調整パネル・着いたバナー・0件緩和） |
| `/store/[id]` | S3 店詳細（行き方の楽さ・ここ行くシート） |
| `/mylist` | S4 マイリスト（行く予定／お気に入り・着いたよボタン） |
| `/settings` | S5 設定（アカウント系のみ） |

## FastAPI 側に想定しているエンドポイント（要すり合わせ）

- `GET /api/me` → `{id, email, has_conditions}`（未ログイン401）
- `GET /auth/google/login` / `POST /auth/logout`
- `GET /api/conditions` / `PUT /api/conditions`
- `GET /api/search?lat&lng&walk_max&ride_max&total_max&transfer&category&preview`
- `GET /api/stores/{id}?lat&lng`
- `POST /api/favorites` / `DELETE /api/favorites/{store_id}`
- `POST /api/going`（ここ行く。going_list登録＋koko_ikuログはサーバ側で同時記録）
- `POST /api/going/{going_id}/arrived`（150m判定はサーバ側→verified/pending）
- `GET /api/arrival-banner?lat&lng`（48h×150m×最近傍の判定はサーバ側→該当なしはnull）
- `GET /api/mylist` → `{going:[], favorites:[]}`
- `POST /api/events`（計測ログ。ベストエフォート）

## 設計メモ

- **条件モデルの一本化（モックv3の核）**: 条件は常に1セット。チップもスライダーも触った瞬間に反映し、保存はデバウンス（400ms）で自動。プリセットとズレたら `custom` 判定（`lib/presets.ts` の `detectPreset`）。
- **位置情報は前面・都度取得のみ**（`lib/geo.ts`）。バックグラウンド追跡なし。
- **写真はDB非保存・表示時取得**: `photo.ref` のURLを `<img>` で直接表示（ホットペッパー優先→Places の振り分けはサーバ側）。
- **合計時間の注意書き**（チーム決定 2026-07-04）: S2カード・S3詳細の時間表示近くに「待ち時間・乗換時間を含まない」を明記済み。
- **たたき台v0.2のAPIレスポンスへの追加提案**: `alight_stop`（S3の降車停表示）・`opening_hours`（S3の営業時間表示）・`area_label`（S2カードのエリア表示。出所はDB設計書9章#11＝未決）。バックエンド実装時に確定のこと。
- プリセット数値・カテゴリチップ対応は**仮値**（TBD。`lib/presets.ts` 参照）。
