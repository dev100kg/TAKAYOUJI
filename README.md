# 🥢 武士は食わねど高楊枝

僕が織田家の重臣だったら、「桶狭間に攻め込みましょう！」と提案するタイプの人間ではあると思います。

でも、最近は、「桶狭間に攻め込むべきだけど、足軽の納得感を得よう」と軍議を開き、話を聞いてみるけれど、顔色ばかり窺って、ビッグマウスなのに何も決断できないタイプのリーダーになっていることに気づきました。

時代背景こそ異なりますが、今の僕に必要なマインドは「武士は食わねど高楊枝」。

余裕と自信と一貫性をもつリーダーシップを身につけたいと思い、セルフチェックする自分用ツールをCodexに作ってもらいました。

いちおう、ユーザー登録（Github認証）できるので、他の人も使えるようにはなっています。

## AIの役割

AIへの人生相談にも限界を感じたので仕組化することに協力してもらいました。

### ChatGPT

- 日々の悩み相談
  - だんだんマンネリ化してきた
  - 悩んでいるだけで立派ってフォローもしんどくなってきた
- 相談内容の整理とドキュメント化 ➤ [TAKAYOUJI.md](docs/TAKAYOUJI.md)
- TAKAYOUJI.mdを元にAGENT.md生成 ➤ [AGENT.md](AGENT.md)

### Codex

- AGENT.mdの内容を確認し、未検討事項の洗い出し
- 最終的な仕様を決定し、実装

## 概要

- 1日1回のセルフチェック（質問 + 自由記述）
- スコアより「次の一手」を優先提示
- 夜帯判定（20:00〜06:00、設定で変更可）を記録
- 質問は表示ON/OFFと土日祝の自動除外を設定可能
- 回収（planned/done/note）記録
- 週次インサイト（セクション平均・フラグ回数・回収率）
- Supabase RLS によるユーザー単位のデータ分離

## 技術スタック

- Nuxt 4 + TypeScript
- Tailwind CSS
- Supabase（Auth + Postgres + RLS）
- GitHub OAuth
- Netlify（初期デプロイ先）

## 画面

- `/login` GitHubログイン
- `/` ホーム（今日の状態 / 回収メーター / 直近ログ）
- `/check` 今日の入力
- `/result/:date` 結果
- `/logs` ログ一覧
- `/logs/:id` ログ詳細
- `/insights` 週次インサイト
- `/settings` 設定（夜判定/質問ON-OFF/土日祝除外）+ JSON export/import

## 判定ロジック（現行実装）

- 危険フラグは以下の5種
  - `emotionUnlabeled`（A1=false）
  - `trustToneRisk`（B4=false）
  - `hoarding`（C3=false）
  - `rushedConclusion`（D3='fixed'）
  - `unstableAxis`（E2が4/5以外）
- 提案はフラグに応じて1〜3件を生成して保存

## セットアップ

### 1. 依存インストール

```bash
pnpm install
```

### 2. 環境変数

`.env`に以下を設定します。

```bash
NUXT_PUBLIC_SUPABASE_URL=...
NUXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### 3. Supabaseスキーマ適用

`supabase/schema.sql`をSupabase SQL Editorで実行し、RLSポリシーまで反映します。

### 4. GitHub OAuth

- Supabase `Authentication > Providers > GitHub` で有効化
- GitHub OAuth App の callback URL は Supabase の callback URL を設定
- Supabase `Authentication > URL Configuration` で以下を許可
  - `http://localhost:3000/**`
  - `https://<your-site>.netlify.app/**`
  - `https://**--<your-site>.netlify.app/**`

### 5. 開発起動

```bash
pnpm dev
```

## Netlify デプロイ時の注意

`500 Internal Server Error: supabaseUrl is required.` が出る場合は、Netlify の環境変数不足です。

- `Site configuration > Environment variables` で以下を設定
  - `NUXT_PUBLIC_SUPABASE_URL`
  - `NUXT_PUBLIC_SUPABASE_ANON_KEY`
- 変数追加/更新後は必ず再デプロイ
- 値は Supabase `Project Settings > API` の `URL` と `anon public` を使用

## テスト

```bash
pnpm test
```

## セキュリティ方針

- 全テーブルでRLS有効化
- `user_id = auth.uid()` をSELECT/INSERT/UPDATE/DELETEで強制
- 個人ログを外部分析サービスへ送信しない

## 非ゴール（MVP）

- SNS共有
- AIによる人格評価
- 他者比較ランキング
