# 実装サマリー（武士は食わねど高楊枝）

更新日: 2026-02-21

## 1. 事前に確定した方針

- フレームワークは `Nuxt 4`
- 初期デプロイ先は `Netlify`
- 画面言語は `日本語`
- 認証は `GitHub OAuth + Supabase Auth`
- DBは `Supabase Postgres + RLS`

## 2. 設定・ドキュメント反映

- `.env` を作成し、以下を設定
  - `NUXT_PUBLIC_SUPABASE_URL`
  - `NUXT_PUBLIC_SUPABASE_ANON_KEY`
- `README.md` を実装内容に合わせて更新
- `AGENT.md` に確定方針（Nuxt 4 / Netlify / 日本語）を反映

## 3. アプリ基盤の実装

- Nuxt 4 プロジェクトを初期化
- 依存関係を追加
  - `@supabase/supabase-js`
  - `@nuxtjs/tailwindcss`
  - `vitest`
  - `typescript`
  - `vue-tsc`
- `nuxt.config.ts` に以下を設定
  - `Tailwind`有効化
  - `runtimeConfig.public` に Supabase 環境変数
  - ページタイトル/description
- 共通スタイルを追加
  - `app/assets/css/tailwind.css`
- 共通レイアウトを追加
  - `app/layouts/default.vue`

## 4. 認証と初期セットアップ

- Supabaseクライアントプラグインを実装
  - `app/plugins/supabase.client.ts`
- 認証状態管理を実装
  - `app/composables/useAuth.ts`
  - `app/plugins/auth.client.ts`
  - `app/middleware/auth.ts`
- 初回ログイン時の `settings` 自動作成を実装
  - `app/composables/useSettings.ts`

## 5. ドメインロジック実装

- 質問定義（A〜F、inputType混在）
  - `app/utils/questions.ts`
- 日付・夜判定ロジック
  - `app/utils/date.ts`
- 正規化、セクション平均、総合スコア、フラグ、提案生成
  - `app/utils/scoring.ts`
- 型定義
  - `app/types/models.ts`
  - `app/types/nuxt.d.ts`

## 6. 画面実装（MVP）

- `/login` GitHubログイン
  - `app/pages/login.vue`
- `/auth/callback` 認証コールバック
  - `app/pages/auth/callback.vue`
- `/` ホーム（今日の状態、回収メーター、直近ログ）
  - `app/pages/index.vue`
- `/check` 今日のチェック入力・保存
  - `app/pages/check.vue`
- `/result/:date` 結果表示
  - `app/pages/result/[date].vue`
- `/logs` ログ一覧
  - `app/pages/logs/index.vue`
- `/logs/:id` ログ詳細
  - `app/pages/logs/[id].vue`
- `/insights` 週次インサイト
  - `app/pages/insights.vue`
- `/settings` 設定 + JSON export/import
  - `app/pages/settings.vue`

## 7. Supabaseスキーマ・RLS

- `supabase/schema.sql` を作成
- テーブル
  - `settings`
  - `daily_entries`
  - `recovery_logs`
- 追加要素
  - `updated_at` 自動更新トリガー
  - `user_id + date` ユニーク制約
  - 主要インデックス
- RLS
  - 全テーブルで `SELECT/INSERT/UPDATE/DELETE` を `auth.uid() = user_id` で制限

## 8. テスト実装

- `test/date.test.ts`
  - 夜判定（20:00〜06:00）を検証
- `test/scoring.test.ts`
  - 正規化（boolean/likert/select）
  - フラグ検知
- `vitest.config.ts` を追加

## 9. 検証結果

- `pnpm test` 成功
- `pnpm exec nuxt typecheck` 成功
- `pnpm build` 成功

## 10. 発生した障害と対応

事象:
- 500エラー
- `Cannot read properties of undefined (reading 'auth')`

原因:
- `auth` プラグインが `supabase` プラグインより先に実行され、`$supabase` 未初期化で参照

対応:
- `app/plugins/supabase.client.ts`
  - プラグイン名 `supabase-client` を付与
- `app/plugins/auth.client.ts`
  - `dependsOn: ['supabase-client']` を設定

結果:
- エラー解消を確認

## 11. 追加・更新ファイル（主要）

- `nuxt.config.ts`
- `package.json`
- `README.md`
- `.env`
- `supabase/schema.sql`
- `vitest.config.ts`
- `app/**` 一式（ページ、composables、plugins、utils、types、layout、style）
- `test/date.test.ts`
- `test/scoring.test.ts`
- `IMPLEMENTATION_SUMMARY.md`（本ファイル）

