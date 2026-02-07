# GoalCompass - プロジェクトガイド

## プロジェクト概要

**GoalCompass**は、原田式メソッドに基づく目標達成アプリケーションです。Chrome拡張機能として実装されており、NotebookLMやGoogle Apps Scriptと連携して、ユーザーの目標設定から日々の習慣管理、振り返りまでをサポートします。

### コンセプト
- **"To Achievement" - 達成を科学する**
- 長期目的・目標設定とオープンウィンドウ64（マンダラチャート）のデジタル化
- 目標達成を可視化し、習慣化するための没入感のある体験

### 主要機能
1. **目標設定（4観点シート）**: 私・有形/無形、社会/他者・有形/無形の4観点で目標を明確化
2. **オープンウィンドウ64（マンダラチャート）**: 9x9グリッドで目標を具体的な行動に分解
3. **日誌・習慣チェック**: デイリールーティンの記録と継続管理
4. **NotebookLM連携**: AIパーソナルコーチとしての活用
5. **Google Apps Script連携**: データのバックアップと外部連携

---

## 技術スタック

### Frontend
- **HTML5 + CSS3 + Vanilla JavaScript (ES6+)**
- **理由**:
  - 迅速なプロトタイピング
  - ビルドプロセス不要（即座に動作確認可能）
  - 将来的なフレームワーク移行の容易さ
- **UI**: Glassmorphism（すりガラス効果）、Apple風デザイン
- **外部ライブラリ**:
  - Chart.js（データ可視化）
  - Font Awesome（アイコン）

### Chrome拡張機能
- **Manifest Version**: v3（最新仕様）
- **Permissions**:
  - `storage`: LocalStorageでのデータ永続化
  - `tabs`, `scripting`: NotebookLMへの自動同期
  - `history`: ブラウザ履歴取得（日誌への自動入力）
  - `identity`: 将来的なGoogleログイン対応
- **Host Permissions**:
  - Google Apps Script（`script.google.com`）
  - NotebookLM（`notebooklm.google.com`）

### データ管理
- **現在**: LocalStorage（`chrome.storage.local`）
- **将来**: クラウド同期の可能性

---

## 重要な制約

### 1. データ永続化はLocalStorageのみ
- すべてのデータは`chrome.storage.local`に保存
- ストレージキー: `harada_method_app_data_v1`
- データ構造:
  ```javascript
  {
    goal: '目標テキスト',
    deadline: '期日',
    fourViews: { selfTangible, selfIntangible, societyTangible, societyIntangible },
    mandala: Array(9).fill(null).map(() => Array(9).fill('')),
    routines: [{ id, text }],
    logs: { 'YYYY-MM-DD': { routineId: boolean } },
    // ... その他の状態
  }
  ```

### 2. Manifest v3準拠
- Service Worker（`background.js`）の使用必須
- Content Scriptsのインジェクションは`chrome.scripting.executeScript`
- 永続的なバックグラウンドページは使用不可

### 3. NotebookLM API連携
- 公式APIは存在しないため、DOMスクリプトインジェクション方式
- `syncInject.js`でNotebookLMのUIを操作
- 認証エラーやUI変更に脆弱なため、定期的なメンテナンスが必要

### 4. セキュリティ制約
- Gemini API機能は現在無効化（`background.js:175-177`）
- GAS連携時のCORS回避（`Content-Type: text/plain`）
- APIキーは`chrome.storage.local`で管理（暗号化なし）

---

## コーディング規則

### 命名規則
- **変数・関数**: キャメルケース（`appState`, `loadState`, `handleSaveDiary`）
- **定数**: アッパースネークケース（`STORAGE_KEY`, `CONFIG_KEY`, `GEMINI_API_URL`）
- **CSS クラス**: ケバブケース（`app-container`, `nav-item`, `glass-card`）
- **ファイル名**: キャメルケース（`app.js`, `background.js`, `syncInject.js`）

### ファイル構成
```
GoalCompass/
├── manifest.json          # 拡張機能設定
├── index.html             # メインUI
├── archived.html          # アーカイブ画面
├── style.css              # スタイルシート（86KB）
├── content.css            # コンテンツスクリプト用CSS
├── app.js                 # メインロジック（142KB）
├── background.js          # Service Worker
├── chart.js               # Chart.js（データ可視化）
├── syncInject.js          # NotebookLM連携スクリプト
├── syncOverlay.css        # 同期時のオーバーレイ
├── gas_script.js          # Google Apps Script（参考実装）
├── Spec.md                # 仕様書
└── CLAUDE.md              # このファイル
```

### コメント規則
- **関数の前**: 処理の目的を簡潔に記述
- **複雑なロジック**: インラインコメントで意図を明示
- **TODO/FIXME**: 将来の改善点を明記
- **日本語OK**: 必要に応じて日本語コメントを使用

例:
```javascript
// --- SECURITY LOCK: AI FUNCTION DISABLED ---
console.log('AI Function called but disabled for security.');

// ページ読み込み完了を待つ
await waitForTabComplete(notebookTab.id);

// TODO: エラーハンドリングの強化
```

### 状態管理パターン
- グローバル変数`appState`で全体状態を管理
- 変更時は必ず`saveState()`を呼び出し
- DOM操作前に状態を更新してから描画

---

## 開発ワークフロー

### 1. ローカル開発
```bash
# 1. コード編集
# 2. Chrome拡張機能の管理画面を開く
chrome://extensions/

# 3. デベロッパーモードをON
# 4. 「更新」ボタンをクリック（または Cmd+R）
# 5. アプリを開いて動作確認
```

### 2. 変更後のテスト手順
1. **UI変更**: `index.html`, `style.css`を編集後、拡張機能をリロード
2. **ロジック変更**: `app.js`を編集後、拡張機能をリロード
3. **バックグラウンド変更**: `background.js`を編集後、**Service Workerを再起動**
   - `chrome://extensions/` → 「Service Worker」の「停止」→ 拡張機能を再度開く
4. **Manifest変更**: `manifest.json`を編集後、拡張機能をリロード

### 3. デバッグ方法
- **フロントエンド**: 拡張機能のページで右クリック → 検証
- **バックグラウンド**: `chrome://extensions/` → 「Service Worker」をクリック → DevToolsが開く
- **Console.log**: 各所に`console.log`を配置してデバッグ

### 4. ストレージ確認
```javascript
// DevTools Console で実行
chrome.storage.local.get('harada_method_app_data_v1', (result) => {
  console.log(result);
});

// データリセット
chrome.storage.local.clear();
```

---

## 今後の予定

### 短期（MVP改善）
- [ ] **モジュール分割**: `app.js`（142KB）を機能別に分割
  - `goalModule.js`: 目標設定
  - `mandalaModule.js`: オープンウィンドウ64
  - `routineModule.js`: 日誌・習慣
  - `chartModule.js`: データ可視化
  - `storageModule.js`: データ管理
- [ ] **エラーハンドリング強化**: try-catchの統一、ユーザーフレンドリーなエラーメッセージ
- [ ] **ローディング状態の追加**: GAS/NotebookLM連携時のフィードバック改善

### 中期（機能追加）
- [ ] **TypeScript移行検討**: 型安全性の向上
- [ ] **テスト導入**: Jest or Vitest でのユニットテスト
- [ ] **自己分析シート**: 成功・失敗パターンの分析機能
- [ ] **支援者マップ**: 原田式の「支援者シート」実装
- [ ] **週次/月次レビュー**: 振り返り機能の追加

### 長期（スケール対応）
- [ ] **クラウド同期**: Firebase or Supabaseでのデータ永続化
- [ ] **Web版の提供**: Vercelへのデプロイ
- [ ] **マルチデバイス対応**: PWA化
- [ ] **チーム機能**: 複数ユーザーでの目標共有

---

## プロジェクト固有の注意事項

### NotebookLM連携の脆弱性
- NotebookLMのUI変更により`syncInject.js`が動作しなくなる可能性
- 定期的な動作確認が必要
- 将来的には公式API提供を待つか、代替手段を検討

### Gemini API機能の無効化
- セキュリティ上の理由で現在無効（`background.js:175-177`）
- 再有効化する場合は、APIキーの暗号化を実装すること

### GAS連携のCORS問題
- GASデプロイ時は「アクセスできるユーザー: 全員」に設定
- `Content-Type: text/plain`を使用してプリフライトリクエストを回避
- セキュリティリスクがあるため、本番環境では認証機能の追加を検討

### データマイグレーション
- ストレージキーを変更する場合（例: `v1` → `v2`）は、マイグレーション関数を実装
- 既存ユーザーのデータ保護を最優先

---

## よくある問題と解決策

### 拡張機能が起動しない
- `manifest.json`の構文エラーをチェック
- Service Workerのエラーログを確認（`chrome://extensions/`）
- Permissions不足の場合は`manifest.json`に追加

### データが保存されない
- `saveState()`が呼ばれているか確認
- `chrome.storage.local`の容量制限（10MB）を超えていないかチェック
- ストレージの内容をDevToolsで確認

### NotebookLM同期が失敗する
- NotebookLMのURLが正しく設定されているか確認
- NotebookLMのUI変更により`syncInject.js`が動作しなくなった可能性
- タイムアウト値（3000ms）を調整

### GASへのPOSTが失敗する
- GASのデプロイURLが正しいか確認
- GASの「アクセスできるユーザー」設定が「全員」になっているか
- CORSエラーの場合は`Content-Type`を確認

---

## 開発時の心構え

### 1. シンプルさを保つ
- Vanilla JSのメリットを活かし、不要な依存を避ける
- 機能追加時は既存コードとの一貫性を重視

### 2. ユーザー体験を最優先
- 没入感のあるUI/UXを維持
- エラー時も分かりやすいフィードバックを提供

### 3. 段階的な改善
- 大規模リファクタリングよりも小さな改善を積み重ねる
- テストを追加してから変更を加える

### 4. ドキュメント更新
- 仕様変更時は`Spec.md`と`CLAUDE.md`を同時更新
- コメントをコードと同じくらい重要視する

---

## 参考リンク

- [Chrome Extensions Manifest V3](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/storage/)
- [原田式メソッド](https://harada-educate.jp/)
- [NotebookLM](https://notebooklm.google.com/)

---

**最終更新**: 2026-01-26

<claude-mem-context>
# Recent Activity

<!-- This section is auto-generated by claude-mem. Edit content outside the tags. -->

*No recent activity*
</claude-mem-context>
