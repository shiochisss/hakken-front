# ハッケンバス フロントエンド

UIモックアップ v3・DB設計書 v1.7・API設計書 v1.4・画面設計書 v1.5 に対応した
Next.js（App Router / TypeScript）実装。
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
| `/tip` | S6a たれ込み・新しいお店（F11） |
| `/tip/report` | S6b たれ込み・店の報告（F11。`?store_id=&name=` 付きでS3から遷移） |

## FastAPI 側のエンドポイント（2026-07-26 時点で全て実装済み）

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
- `POST /api/submissions` / `POST /api/submissions/photo-upload`（F11 たれ込み）

## 設計メモ

- **条件モデルの一本化（モックv3の核）**: 条件は常に1セット。チップもスライダーも触った瞬間に反映し、保存はデバウンス（400ms）で自動。プリセットとズレたら `custom` 判定（`lib/presets.ts` の `detectPreset`）。
- **位置情報は前面・都度取得のみ**（`lib/geo.ts`）。バックグラウンド追跡なし。
- **写真はDB非保存・表示時取得**: `photo.ref` のURLを `<img>` で直接表示。優先順はサーバ側で決める（ホットペッパー → `store_photos` の承認済み写真のSAS URL → プレースホルダ）。**Places API は全廃**（v1.1）。`ref` は null になりうるので、表示側は `photo` の有無ではなく **`ref` の有無**で分岐する。
- **合計時間の注意書き**（チーム決定 2026-07-04）: S2カード・S3詳細の時間表示近くに「待ち時間・乗換時間を含まない」を明記済み。
- **たたき台v0.2のAPIレスポンスへの追加**: `alight_stop`（S3の降車停表示）・`area_label`（S2カードのエリア表示。出所はDB設計書9章#11＝未決）。いずれもバックエンド実装済み。`opening_hours` は**廃止**（v1.2 で営業時間は非表示に確定し、Googleマップへ委譲）。
- **S2ヘッダの起点表示**: 「現在地から探しています」ではなく**起点の住所**を出す（実機で「現在地がどこからなのか分からずルートの信ぴょう性が薄い」と指摘されたため）。住所はサーバが `search` の `meta.origin` で返す（`home/page.tsx` の `originText`）。`source` で3分岐し、**取得できないときは従来文言に戻す**ので表示が空にならない。

| `source` | 表示 |
|---|---|
| `oaza` | `📍 東京都練馬区豊玉北六丁目 から探しています` ＋小さく `最寄りのバス停: 練馬区役所` |
| `stop` | `📍 練馬区役所 の近くから探しています` |
| `none`・未取得 | `📍 現在地から` / `現在地から探しています`（従来文言） |

  住所は判断材料なので**省略（…）せず折り返す**。モックモードは固定値を返す（外部にも自前データにも触らない）。S5「位置情報について」には、起点を約110m格子に丸めて記録する旨と出典（大字・町丁目位置参照情報 国土交通省）を表示している。
- **「🚶 歩いて○分」（`walk_only`）**: 徒歩の方が速い店は徒歩を主に見せる（2026-07-28）。駅前の店にバス経路を提示していたため。S2カードは `🚶 歩いて3分（約280m）` ＋小さく `バスなら11分`、S3は経路図の**上に2行ブロックを追加するだけ**（見出し・経路図は変更なし）。**距離を併記し「※直線距離からの目安です」を添える**のは、サーバ側の値が直線×1.3の推定で迂回の大きい地形では外れるため＝断定しない。判定・並び替えはサーバ側（`WALK_BEATS_BUS_MARGIN`）。
- **「⚙ 条件外」（`out_of_conditions`）**: S2に出ない店をマイリスト・お気に入り・直リンクから開いたとき、経路は隠さず**どの条件を外れているかを開示**する。文言の組み立てはフロント（`describeOutOfConditions`）でサーバは真偽値のみ返す。**条件を変える導線は置かない**（画面設計書 A-5「条件を触れる場所はS2だけ」）。`few_trips` と同じく警告色は使わない。
- **「🚌 本数少なめ」バッジ**: `few_trips`（土日10-16時の便数が2本未満）を S2カード・S3詳細で開示する。検索からは除外しない。しきい値はサーバ側の暫定値（hakken-api の `FEW_TRIPS_THRESHOLD`）。
- プリセット数値・カテゴリチップ対応は**仮値**（TBD。`lib/presets.ts` 参照）。
