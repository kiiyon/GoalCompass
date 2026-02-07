# 🧭 GoalCompass

> NotebookLMと連携して、あなただけのAIパーソナルコーチを召喚！2026年こそ目標を達成したい人のための、究極のパートナー。

![Version](https://img.shields.io/badge/version-1.0.1-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Chrome%20Extension-orange)

---

## 📖 概要

**GoalCompass**は、原田式メソッドの核心である「長期目的・目標設定」と「オープンウィンドウ64（マンダラチャート）」をデジタル化した、目標達成支援Chrome拡張機能です。

「達成を科学する」をコンセプトに、目標を明確にし、具体的な行動計画（ルーティン）に落とし込み、日々の実行を管理・可視化します。プレミアムで没入感のあるデザインで、毎日開きたくなる体験を提供します。

---

## ✨ 主な機能

### 1. 📊 データベース（ダッシュボード）
- **習慣マトリックス**: 直近14日間の習慣実行状況を視覚的に表示
- **継続ストリーク**: 習慣の連続実行日数を追跡
- **心技体バランス**: 週間平均をレーダーチャートで可視化
- データの継続的な可視化で、目標達成への進捗を実感

### 2. 🎯 目的・目標設定
原田式メソッドの「4観点」を用いた目標設定:
- **メイン目標**: 達成したい目標と期日を明確化
- **KPI管理**: SMART原則に基づく測定可能な指標を設定・追跡

**4観点の分類**:
1. **私・有形**: 給料UP、欲しい物など
2. **私・無形**: 自信、スキル、健康など
3. **社会/他者・有形**: 売上貢献、チーム成果など
4. **社会/他者・無形**: 笑顔、信頼、良い雰囲気など

### 3. 📝 日誌・習慣ログ
- **今日の一言**: モチベーションを高める宣言
- **スケジュール取得**: Google Calendarとの連携（GAS経由）
- **TODOリスト**: 必ずやることのチェックリスト
- **日記**: AIライター機能で整形・フィードバック
- **アクティビティ履歴**: ブラウザ履歴から1日の活動を自動取得
- **心技体スコア**: 5段階の星評価で日々のバランスを記録
- **習慣チェック**: カスタマイズ可能な習慣リストで継続を支援

### 4. 🔄 NotebookLM連携
- スプレッドシートに保存したデータをNotebookLMと同期
- AIパーソナルコーチによる深い対話と洞察

---

## 🛠 技術スタック

| カテゴリ | 技術 |
|---------|------|
| **プラットフォーム** | Chrome Extension (Manifest V3) |
| **フロントエンド** | HTML5, CSS3 (Glassmorphism), Vanilla JavaScript (ES6+) |
| **データ可視化** | Chart.js (Radar Chart) |
| **データ永続化** | LocalStorage, Google Sheets (GAS経由) |
| **AI統合** | Google Gemini API (2.5 Flash) |
| **フォント** | Inter, Noto Sans JP |
| **アイコン** | Font Awesome 6.4.0 |

**選定理由**:
- **Vanilla JS**: 迅速なプロトタイピング、フレームワーク不要で即座に動作確認可能
- **LocalStorage**: ブラウザを閉じてもデータが消えない
- **GAS連携**: Googleエコシステムとのシームレスな統合

---

## 📦 インストール方法

### 前提条件
- Google Chrome（最新版推奨）
- （オプション）Google Apps Scriptのセットアップ（データ同期用）

### 手順

1. **リポジトリのクローン**
```bash
git clone <repository-url>
cd GoalCompass
```

2. **Chrome拡張機能として読み込み**
   - Chromeを開き、`chrome://extensions/` にアクセス
   - 右上の「デベロッパーモード」を**オン**にする
   - 「パッケージ化されていない拡張機能を読み込む」をクリック
   - `GoalCompass`フォルダを選択

3. **拡張機能の起動**
   - ツールバーのGoalCompassアイコン（🧭）をクリック
   - 新しいタブでアプリが開きます

---

## 🚀 使い方

### 初期設定

1. **目標設定**
   - 「目的・目標」タブを開く
   - メイン目標と達成期日を入力
   - KPIを追加して測定可能な指標を設定

2. **習慣の登録**
   - 「日誌・習慣ログ」タブを開く
   - 「今日の習慣チェック」セクションで習慣を追加
   - 毎日実行したい行動をリスト化

3. **外部連携の設定（オプション）**
   - 設定アイコンをクリック
   - **GAS Web App URL**: データ保存・同期用
   - **スプレッドシート URL**: データ閲覧・管理用
   - **NotebookLM URL**: AI対話用
   - **Gemini API Key**: AI整形機能用

### 日常の使い方

1. **朝の計画**
   - 「今日の一言」を入力
   - スケジュールとTODOを確認
   - 1日の意図を明確にする

2. **夕方の振り返り**
   - 日記を記入（AIライターで整形可能）
   - 心技体スコアを5段階評価
   - 習慣チェックリストを完了

3. **データの確認**
   - ダッシュボードで進捗を可視化
   - 継続ストリークでモチベーション維持
   - レーダーチャートでバランスを確認

---

## 💻 開発環境セットアップ

### ローカル開発

```bash
# プロジェクトディレクトリに移動
cd GoalCompass

# ファイルを編集後、拡張機能をリロード
# chrome://extensions/ で「更新」ボタンをクリック
```

### 開発のヒント

- **リアルタイム編集**: HTML/CSS/JSを編集後、拡張機能をリロードするだけで反映
- **デバッグ**: Chrome DevToolsを使用（右クリック→検証）
- **ストレージ確認**: DevTools > Application > Local Storage

---

## 📂 ファイル構成

```
GoalCompass/
├── manifest.json          # 拡張機能のメタデータと設定
├── index.html             # メインUIのHTML構造
├── style.css              # Glassmorphismデザイン、レスポンシブレイアウト
├── app.js                 # メインロジック（目標管理、習慣トラッキング、UI制御）
├── background.js          # Service Worker（データ同期、API通信、履歴取得）
├── chart.js               # Chart.js ライブラリ（データ可視化）
├── syncInject.js          # NotebookLM同期用のインジェクションスクリプト
├── syncOverlay.css        # 同期時のオーバーレイスタイル
├── content.css            # コンテンツスクリプト用CSS
├── gas_script.js          # Google Apps Script（スプレッドシート連携）
├── archived.html          # アーカイブ機能（将来の拡張用）
├── Spec.md                # 仕様書（原田式メソッドの詳細）
└── README.md              # このファイル
```

### 主要ファイルの説明

| ファイル | 役割 |
|---------|------|
| `manifest.json` | 拡張機能の権限、バックグラウンドスクリプト、アクション定義 |
| `index.html` | サイドバーナビゲーション、ダッシュボード、目標設定、日誌のUI |
| `app.js` | 目標・KPI管理、習慣トラッキング、ローカルストレージ操作、Chart.js統合 |
| `background.js` | GASとの通信、Gemini API呼び出し、履歴取得、NotebookLM同期 |
| `gas_script.js` | スプレッドシートへのデータ書き込み、Google Calendar API連携 |

---

## 🔧 Google Apps Script セットアップ（オプション）

データをGoogle Sheetsに保存し、NotebookLMと連携する場合:

1. **GASプロジェクトの作成**
   - [Google Apps Script](https://script.google.com/) にアクセス
   - 新しいプロジェクトを作成
   - `gas_script.js` の内容をコピー＆ペースト

2. **デプロイ**
   - 「デプロイ」→「新しいデプロイ」
   - **種類**: ウェブアプリ
   - **アクセスできるユーザー**: 全員（Anyone）
   - デプロイURLをコピー

3. **GoalCompassに設定**
   - 設定モーダルを開く
   - GAS Web App URLにペースト
   - スプレッドシートURLも設定（データ閲覧用）

4. **NotebookLMとの連携**
   - NotebookLMでプロジェクトを作成
   - スプレッドシートをソースとして追加
   - NotebookLM URLを設定に保存

---

## 🎨 デザインコンセプト

- **Glassmorphism**: すりガラス効果で洗練された視覚体験
- **Apple風UI**: シンプルで直感的な操作性
- **マイクロインタラクション**: 滑らかなアニメーションとフィードバック
- **没入感**: 背景のグローブアニメーション、グラデーション
- **カラーパレット**: ダークモードベース、アクセントはゴールド

---

## 🔐 セキュリティとプライバシー

- **ローカルファースト**: データは基本的にブラウザのLocalStorageに保存
- **オプトイン連携**: Google Sheets/NotebookLM連携は任意
- **API Key管理**: Gemini APIキーは暗号化ストレージに保存（chrome.storage.local）
- **権限の透明性**: manifest.jsonで明示的に宣言

**必要な権限**:
- `storage`: ローカルデータ保存
- `tabs`: 拡張機能タブの管理
- `scripting`: NotebookLM同期のためのスクリプト注入
- `history`: アクティビティ履歴の取得
- `identity`: 将来のOAuth統合用（現在未使用）

---

## 🚧 今後の拡張性

原田式メソッドの完全実装に向けた拡張案:

- [ ] **オープンウィンドウ64（マンダラチャート）**: 9x9グリッドでの行動分解
- [ ] **自己分析シート**: 成功・失敗パターンの分析
- [ ] **支援者マップ**: 目標達成を支援してくれる人のネットワーク可視化
- [ ] **クラウド同期**: Vercelデプロイとデータベース統合
- [ ] **モバイル対応**: Progressive Web App (PWA) 化
- [ ] **チーム機能**: 複数ユーザーでの目標共有

---

## 📝 ライセンス

MIT License - 自由に使用、改変、配布できます。

---

## 🤝 コントリビューション

プルリクエストを歓迎します！以下の流れで貢献してください:

1. このリポジトリをフォーク
2. 新しいブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add some amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

---

## 📞 サポート

問題や質問がある場合:
- Issuesセクションで報告
- 仕様の詳細は `Spec.md` を参照

---

## 🙏 謝辞

- **原田隆史氏**: 原田式メソッドの考案者
- **Google**: Gemini API, NotebookLM, Apps Script
- **Chart.js**: データ可視化ライブラリ
- **Font Awesome**: アイコンセット

---

## 🌟 まとめ

GoalCompassは、**「2026年こそ目標を達成したい」**というあなたの想いを、科学的な手法とテクノロジーでサポートします。

原田式メソッドの本質である「目標の明確化」「具体的な行動計画」「日々の実行管理」を、美しいUIと強力な機能で実現。

**今日から、あなたの目標達成の旅を始めましょう！** 🚀

---

<div align="center">

Made with ❤️ by Goal Achievers

**To Achievement - 達成を科学する**

</div>
