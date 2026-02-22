# AGENT.md — 「武士は食わねど高楊枝」セルフチェック Webアプリ（Nuxt + Supabase）

## 0. 目的（Why）
このアプリは、ユーザーが自分の姿勢（世界観）を日々セルフチェックし、感情を否定せずに扱いながら「信頼される一貫性」を選べているかを確認するためのツールである。

主目的：
- 感情と行動を分け、判断を理性で選ぶ癖をつける
- 役割基準で動けているかを短時間で点検する
- 我慢の溜め込みを検知し「回収（ケア）」を促す
- 夜に出した結論を仮置きにし、事実ベースで自己評価する

副目的：
- 重心を価値観へ戻す
- 「孤独を美徳にしない」支え（信頼相手/回収手段）を可視化する


## 1. 世界観（アプリの核）
- 感情は否定しない。判断は理性で選ぶ。
- 役割を基準に動き、他人の反応で自分の価値を測らない。
- 我慢は溜め込まず回収する。孤独を美徳にしない。
- 夜に出した結論は仮置き。評価は事実ベース。他人の沈黙は証拠にならない。
- 自分の価値観を軸に判断する。安心は分散させる。
- 最終ルール：感情は持っていい。姿勢を整え、信頼される一貫性を選ぶ。

トーン要件：
- 説教しない、叱らない
- 短く、静か、実務的
- スコアは参考。主役は「次の一手」


## 2. 形（確定事項）
- アプリ形態：Webアプリ（PC/スマホ）
- 配置：サーバーに置く（SaaS想定でも社内公開でも可）
- 認証：GitHubログイン（Google不要）
- バックエンド：Supabase（Auth + Postgres + RLS）
- 画面言語：日本語
- 夜判定：20:00〜06:00（ローカルタイム）
- 初回：ログインしたら即開始（Settings/回収メニューを自動生成）


## 3. MVP機能
1) 今日のチェック（質問 + 自由記述）
2) 結果（スコア + フラグ + 次の一手 1〜3）
3) 履歴参照（Homeの直近ログ + /result/:date）
4) 振り返り（週次の傾向）
5) 回収（予定/実施/メモ）

非ゴール（MVPではやらない）：
- AI分析、外部送信、SNS共有
- 複雑なスコア重み最適化
- 多要素認証、管理画面（必要になったら追加）


## 4. 質問スケール設計（混在OK、集計は正規化）
質問ごとに入力形式を混在させる。ただし集計は 0.0〜1.0 の正規化スコアに統一する。

入力形式：
- boolean: Yes/No
- likert5: 1〜5
- select: 選択式
- text: 自由記述（事実/感情/選ぶ行動）

正規化：
- boolean: No=0.0, Yes=1.0
- likert5: 1→0.0, 2→0.25, 3→0.5, 4→0.75, 5→1.0
- select: 選択肢ごとに 0.0〜1.0 を割り当て
- text: 集計に入れない（現状は提案生成やフラグ判定にも未使用）


## 5. 初期チェック項目（ID/section/inputType）
A. 感情と行動を分ける
- A1 boolean: 感情を静かに言葉にした
- A2 likert5: 落ち着いた所作で動いた
- A3 boolean: 自分で選んで動いた

B. 役割基準で動く
- B1 likert5: 役割にふさわしく動いた
- B2 likert5: 信頼を優先して動いた
- B3 boolean: 事実を確かめて動いた
- B4 boolean: 言葉の品位を保った

C. 我慢の定義
- C1 boolean: 型を崩さなかった
- C2 select: 回復の間を置いた（none / short / scheduled）
- C3 boolean: 抱え込まなかった

D. 自己評価のルール
- D1 boolean: 事実だけ記した
- D2 boolean: 推測と分けた
- D3 select: 結論を急がなかった（fixed / held / asked）

E. 重心の置き方
- E1 likert5: 軸を自分に戻した
- E2 likert5: 重心を分散した
- E3 boolean: 足場を整えた

F. 最終ルール
- F1 boolean: 感情を静かに扱った
- F2 likert5: 一貫した姿勢でいた
- F3 boolean: 今宵はここまで

自由記述（任意・推奨）：
- facts（観測できる事実）
- feelings（感情）
- actions（選ぶ行動）


## 6. 危険フラグ（別枠）
- emotionUnlabeled: A1=false（感情の未言語化）
- trustToneRisk: B4=false（言葉の品位リスク）
- hoarding: C3=false（抱え込み）
- rushedConclusion: D3='fixed'（結論急ぎ）
- unstableAxis: E2 が 4/5 以外（重心不安定）


## 7. 提案（次の一手）生成ルール
保存時に 1〜3 件生成し、ログに保存する。短く、選べる形で。

例：
- emotionUnlabeled=true → 「感情に名前を置くだけで、距離ができる。」
- trustToneRisk=true → 「言葉の品位は、静かな信頼をつくる。」
- hoarding=true → 「余白を少し先に置くと、動きが整う。」
- rushedConclusion=true → 「結論を急がないと、視野が広がる。」
- unstableAxis=true → 「重心を分けると、判断は軽くなる。」


## 8. 回収メニュー（初期セット）
- サウナ
- プログラミング
- 文章
- 睡眠
- 運動
- 誰かに話す
- その他（自由入力）

回収は「planned / done / note」を記録できること。


## 9. 技術方針（Nuxt + Supabase）
- Frontend: Nuxt 4 + TypeScript
- Styling: Tailwind CSS
- Auth/DB: Supabase（GitHub Provider + Postgres + RLS）
- Data access: @supabase/supabase-js
- Hosting: 初期リリースは Netlify（必要時に Vercel へ切替可能な構成）。Supabase は managed。

要件：
- HTTPS
- 個人データを外部分析に送らない
- RLSで user_id = auth.uid() を強制（最重要）


## 10. DBスキーマ（SQL）とRLSポリシー（必須）
Supabase SQL editor で実行する想定。
※ extensions/uuid生成は Supabaseの既定に合わせる（gen_random_uuid など）。

### 10.1 tables
- settings
  - id uuid pk
  - user_id uuid not null unique
  - night_start time not null default '20:00'
  - night_end time not null default '06:00'
  - recovery_menu jsonb not null
  - questions_enabled jsonb not null
  - questions_skip_holiday jsonb not null
  - created_at timestamptz not null default now()
  - updated_at timestamptz not null default now()

- daily_entries
  - id uuid pk
  - user_id uuid not null
  - date date not null
  - is_night boolean not null
  - answers jsonb not null
  - normalized jsonb not null
  - facts text null
  - feelings text null
  - actions text null
  - flags jsonb not null
  - suggestions jsonb not null
  - created_at timestamptz not null default now()
  - updated_at timestamptz not null default now()
  - unique(user_id, date)

- recovery_logs
  - id uuid pk
  - user_id uuid not null
  - date date not null
  - items jsonb not null
  - created_at timestamptz not null default now()
  - updated_at timestamptz not null default now()
  - unique(user_id, date)

### 10.2 RLS policies
必ず RLS を有効化し、全テーブルで以下を実施：
- SELECT: user_id = auth.uid()
- INSERT: user_id = auth.uid()
- UPDATE: user_id = auth.uid()
- DELETE: user_id = auth.uid()

補足：
- daily_entries/recovery_logs/settings の user_id はアプリ側で必ず auth.uid() を入れる
- クライアントから user_id を偽装できないよう RLS で強制する
- date はユーザーのローカル日付で保存する（UTC変換しない）

## 11. 初回自動セットアップ（確定）
要件：
- 初回ログイン後、settings が存在しなければ自動作成する
- 回収メニューは初期セット（サウナ/プログラミング/文章/睡眠/運動/誰かに話す/その他）
- questions_enabled は全て true で初期化
- questions_skip_holiday は全て false で初期化
- ユーザーはセットアップ画面なしで即チェック開始できる

実装案：
- route middleware で session を確認
- ログイン済みで settings が無ければ upsert する
- upsert はサーバー側（Nitro server route）でも、RLS前提でクライアントでも可（MVPはクライアントでもOK）
- 以降の画面は settings を前提に動く


## 12. 画面（MVP）
- /login（GitHubログイン）
- /（Home：今日の状態、直近ログ、回収メーター）
- /check（入力）
- /result/:date（まとめ：次の一手優先）
- /history（履歴一覧）
- /history/:id（ログ詳細）
- /insights（週次）
- /settings（回収メニュー編集、質問ON/OFF、export/import）

実装メモ：
- Nuxtのページディレクトリは `app/pages/history` を使用する（`logs` は `.gitignore` の `logs` ルールと衝突しやすいため非推奨）


## 13. 実装タスク（Codex向け）
1) Nuxt 4 + Tailwind 初期化、ルーティング作成
2) Supabase プロジェクト作成、GitHub Provider 設定、env 設定
3) DBテーブル作成 + RLS + policy 作成（最重要）
4) Supabase client composable 作成
5) Auth導線（login/logout、セッション保持）
6) settings 自動セットアップ（upsert）
7) Questions 定義（ID/section/inputType/label/normalize）
8) /check フォーム（混在入力対応）
9) 正規化スコア計算 + フラグ判定 + 提案生成
10) daily_entries 保存（user_id/date unique）
11) Home 直近ログ表示（/result/:date への導線）
12) recovery_logs（予定/実施）
13) insights（過去7日集計：セクション平均、フラグ回数、回収率）
14) settings（回収メニュー編集、質問ON/OFF）
15) JSON export/import
16) 基本テスト（正規化、夜判定、祝日判定、フラグ判定）

Definition of Done:
- 今日の入力→保存→結果→Homeでの履歴参照が一連で動く
- user_id によるデータ隔離がRLSで保証される
- 夜判定 20:00-06:00 が適用される
- 回収が記録でき、週次集計に出る
- JSON export/import で復元できる
