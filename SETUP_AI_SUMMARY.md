# 日記AI要約システム セットアップガイド

## 概要

毎日23時に日記データをGemini APIで要約し、Google Drive上のmdファイルに自動保存するシステム。

## アーキテクチャ

```
スプレッドシート（日記データ）
        ↓
   GAS トリガー（毎日23時）
        ↓
   Gemini API（要約生成）
        ↓
   ┌─────────────────────┐
   │  Google Drive       │
   │  Obsidian_AI要約/   │
   │  └ 日記_AI要約.md   │
   └─────────────────────┘
        ↓
   Clawdbot cron（定期同期）
        ↓
   Obsidian（02_個人/01_成長/記録/日記_AI要約.md）
```

## セットアップ手順

### 1. GASプロジェクトに追加

1. [Apps Script](https://script.google.com) を開く
2. GoalCompassのプロジェクトを開く
3. 新しいファイル `diary_summarizer.gs` を作成
4. `diary_summarizer.gs` の内容をコピー&ペースト

### 2. Gemini APIキーを設定

1. [Google AI Studio](https://aistudio.google.com/apikey) でAPIキーを取得
2. GASエディタ → 歯車アイコン → プロジェクトの設定
3. スクリプトプロパティを追加:
   - プロパティ名: `GEMINI_API_KEY`
   - 値: 取得したAPIキー

### 3. テスト実行

1. GASエディタで `testSummarizeDate` を選択
2. ▶ 実行ボタンをクリック
3. ログを確認（表示 → ログ）

### 4. トリガー設定

1. GASエディタで `setupDailyTrigger` を選択
2. ▶ 実行ボタンをクリック
3. 毎日23時に自動実行されるようになる

### 5. 過去データのバックフィル（任意）

1. GASエディタで `backfillSummaries` を選択
2. ▶ 実行ボタンをクリック
3. 1回につき5件処理（API制限対策）
4. 全件処理するまで繰り返し実行

## Obsidian連携

### オプションA: 手動同期（シンプル）

定期的にGoogle Driveから `日記_AI要約.md` をダウンロードしてObsidianに配置。

### オプションB: Clawdbot cron（自動）

`.agent/workflows/sync_ai_summary.md` を作成してClawdbot cronで自動同期。

```bash
# cron設定例（毎日23:30）
30 23 * * * /path/to/sync_script.sh
```

### オプションC: Google Drive デスクトップアプリ

1. Google Drive デスクトップアプリをインストール
2. `Obsidian_AI要約` フォルダを同期対象に設定
3. Obsidianからシンボリックリンクで参照

## 出力フォーマット

```markdown
## 2026-02-01

### 要約
- フォルダ構造整理完了、AI活用プロジェクト設計開始
- 最強HIROプロジェクトのビジョン策定
- 夜型→朝型への移行意識

### トピック
#AI活用 #整理整頓 #プロジェクト設計

### 5本柱との関連
- 発信・英語学習: ★☆☆☆☆
- 健康: ★★☆☆☆
- かっこよくなる: ★☆☆☆☆
- AI活用: ★★★★★
- 技術キャッチアップ: ★★★☆☆

### 気づき
フォルダ整理に時間を使いすぎ。本質的な作業に集中すべき。

### 明日のフォーカス
AI自動化システムの実装を優先

---
```

## トラブルシューティング

### APIキーエラー
- スクリプトプロパティの設定を確認
- APIキーの有効性を確認

### データが見つからない
- スプレッドシートIDが正しいか確認
- シート名が「シート1」か確認

### 権限エラー
- GASの実行権限を確認
- Google Driveへのアクセス権限を確認
