/**
 * 日記AI要約システム
 *
 * 機能:
 * - 毎日の日記データをGemini APIで要約
 * - Google Drive上の日記_AI要約.mdに追記
 *
 * セットアップ:
 * 1. スクリプトプロパティに GEMINI_API_KEY を設定
 * 2. SUMMARY_FILE_ID に Google Docs/Drive ファイルIDを設定
 * 3. トリガー設定: dailySummarize を毎日23:00-24:00に実行
 */

// ===== 設定 =====
var CONFIG = {
  SPREADSHEET_ID: '1S7mzCdS7nYxyKq2bJ9GtHYnPpvb8Mh2oaeRdlOkT1Mw',
  SHEET_NAME: 'シート1',
  SUMMARY_FOLDER_NAME: 'Obsidian_AI要約',  // Google Drive上のフォルダ名
  SUMMARY_FILE_NAME: '日記_AI要約.md'
};

// HIROの5本柱
var FIVE_PILLARS = [
  '発信・英語学習',
  '健康',
  'かっこよくなる',
  'AI活用',
  '技術キャッチアップ'
];

/**
 * 毎日実行: 当日の日記を要約してmdファイルに追記
 */
function dailySummarize() {
  var today = new Date();
  var dateStr = formatDate(today);

  Logger.log('=== 日記要約開始: ' + dateStr + ' ===');

  // 1. スプレッドシートから当日のデータを取得
  var diaryData = getDiaryDataByDate(dateStr);

  if (!diaryData) {
    Logger.log('当日の日記データが見つかりません: ' + dateStr);
    return;
  }

  Logger.log('日記データ取得成功: ' + diaryData.title);

  // 2. Gemini APIで要約生成
  var summary = generateDiarySummary(diaryData);

  if (!summary) {
    Logger.log('要約生成に失敗しました');
    return;
  }

  Logger.log('要約生成成功');

  // 3. Google Drive上のmdファイルに追記
  appendToSummaryFile(dateStr, summary);

  // 4. スプレッドシートにも要約を保存（O列）
  saveSummaryToSheet(diaryData.row, summary);

  Logger.log('=== 日記要約完了 ===');
}

/**
 * 指定日付の日記データを取得
 */
function getDiaryDataByDate(dateStr) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return null;

  // B列（Date）で検索
  var dateColumn = sheet.getRange(2, 2, lastRow - 1, 1).getValues();

  for (var i = 0; i < dateColumn.length; i++) {
    var cellDate = normalizeDate(dateColumn[i][0]);
    if (cellDate === dateStr) {
      var rowNum = i + 2;
      var rowData = sheet.getRange(rowNum, 1, 1, 14).getValues()[0];

      return {
        row: rowNum,
        timestamp: rowData[0],
        date: rowData[1],
        title: rowData[2] || '無題',
        content: rowData[3] || '',
        calendar: rowData[4] || '',
        activity: rowData[5] || '',
        scores: rowData[6] || '',
        confidence: rowData[7] || '',
        routine: rowData[8] || ''
      };
    }
  }

  return null;
}

/**
 * Gemini APIで日記を要約
 */
function generateDiarySummary(diaryData) {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');

  if (!apiKey) {
    Logger.log('ERROR: GEMINI_API_KEY が設定されていません');
    return null;
  }

  var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + apiKey;

  // スコアをパース
  var scoreStr = '記録なし';
  try {
    if (diaryData.scores) {
      var s = JSON.parse(diaryData.scores);
      scoreStr = '心:' + s.heart + ', 技:' + s.skill + ', 体:' + s.body + ', 生活:' + s.life;
    }
  } catch(e) {}

  // アクティビティを簡略化（長すぎる場合は切り詰め）
  var activitySummary = diaryData.activity || '';
  if (activitySummary.length > 3000) {
    activitySummary = activitySummary.substring(0, 3000) + '...（省略）';
  }

  var prompt = `以下の日記データを分析して、JSON形式で要約を生成してください。

# 日記データ
- 日付: ${diaryData.date}
- タイトル: ${diaryData.title}
- 日記内容: ${diaryData.content || '(なし)'}
- カレンダー: ${diaryData.calendar || '(なし)'}
- スコア: ${scoreStr}
- 自信を育てたこと: ${diaryData.confidence || '(なし)'}
- ルーティン: ${diaryData.routine || '(なし)'}

# アクティビティ履歴（ブラウザ履歴）
${activitySummary}

# HIROの5本柱（月間目標）
1. 発信・英語学習
2. 健康
3. かっこよくなる
4. AI活用
5. 技術キャッチアップ

# 出力形式（JSON）
{
  "summary": "今日の活動を3行で要約（日本語）",
  "keyTopics": ["トピック1", "トピック2", "トピック3"],
  "pillarAlignment": {
    "発信・英語学習": 0-5,
    "健康": 0-5,
    "かっこよくなる": 0-5,
    "AI活用": 0-5,
    "技術キャッチアップ": 0-5
  },
  "insights": "気づきや改善点（1-2文）",
  "tomorrowFocus": "明日フォーカスすべきこと（1文）"
}

JSONのみ出力（説明やマークダウン不要）`;

  var payload = {
    contents: [{
      parts: [{
        text: prompt
      }]
    }],
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 1000
    }
  };

  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var json = JSON.parse(response.getContentText());

    if (json.candidates && json.candidates.length > 0) {
      var resultText = json.candidates[0].content.parts[0].text.trim();

      // マークダウンコードブロックを削除
      resultText = resultText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

      Logger.log('API Response: ' + resultText);

      return JSON.parse(resultText);
    }
  } catch (error) {
    Logger.log('Gemini API Error: ' + error.toString());
  }

  return null;
}

/**
 * Google Drive上のmdファイルに追記
 */
function appendToSummaryFile(dateStr, summary) {
  // フォルダを取得または作成
  var folders = DriveApp.getFoldersByName(CONFIG.SUMMARY_FOLDER_NAME);
  var folder;

  if (folders.hasNext()) {
    folder = folders.next();
  } else {
    folder = DriveApp.createFolder(CONFIG.SUMMARY_FOLDER_NAME);
    Logger.log('フォルダ作成: ' + CONFIG.SUMMARY_FOLDER_NAME);
  }

  // ファイルを取得または作成
  var files = folder.getFilesByName(CONFIG.SUMMARY_FILE_NAME);
  var file;
  var existingContent = '';

  if (files.hasNext()) {
    file = files.next();
    existingContent = file.getBlob().getDataAsString();
  }

  // 5本柱のスコアを星に変換
  var pillarStars = '';
  if (summary.pillarAlignment) {
    for (var pillar in summary.pillarAlignment) {
      var score = summary.pillarAlignment[pillar] || 0;
      var stars = '★'.repeat(score) + '☆'.repeat(5 - score);
      pillarStars += '- ' + pillar + ': ' + stars + '\n';
    }
  }

  // 新しいエントリを作成
  var newEntry = `
## ${dateStr}

### 要約
${summary.summary || '（要約なし）'}

### トピック
${(summary.keyTopics || []).map(function(t) { return '#' + t; }).join(' ')}

### 5本柱との関連
${pillarStars}
### 気づき
${summary.insights || ''}

### 明日のフォーカス
${summary.tomorrowFocus || ''}

---
`;

  // ファイル内容を更新（新しいエントリを先頭に追加）
  var header = '# AI日記要約\n\n> このファイルはGASによって自動生成されています。\n\n---\n';

  var newContent;
  if (existingContent.startsWith('# AI日記要約')) {
    // ヘッダー以降に新エントリを挿入
    var headerEnd = existingContent.indexOf('---\n') + 4;
    newContent = existingContent.substring(0, headerEnd) + newEntry + existingContent.substring(headerEnd);
  } else {
    newContent = header + newEntry + existingContent;
  }

  if (file) {
    file.setContent(newContent);
  } else {
    folder.createFile(CONFIG.SUMMARY_FILE_NAME, newContent, MimeType.PLAIN_TEXT);
  }

  Logger.log('mdファイル更新完了: ' + CONFIG.SUMMARY_FILE_NAME);
}

/**
 * スプレッドシートのO列に要約を保存
 */
function saveSummaryToSheet(rowNum, summary) {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  // O列（15列目）に要約JSON、P列にトピック、Q列に5本柱スコア
  var summaryJson = JSON.stringify(summary);
  var topics = (summary.keyTopics || []).join(', ');
  var pillarJson = JSON.stringify(summary.pillarAlignment || {});

  sheet.getRange(rowNum, 15, 1, 3).setValues([[summaryJson, topics, pillarJson]]);

  // ヘッダーがなければ追加
  var headers = sheet.getRange(1, 15, 1, 3).getValues()[0];
  if (!headers[0]) {
    sheet.getRange(1, 15, 1, 3).setValues([['AI_Summary', 'Key_Topics', 'Pillar_Alignment']]);
  }

  Logger.log('スプレッドシート更新完了: 行 ' + rowNum);
}

/**
 * 日付をYYYY-MM-DD形式に正規化
 */
function normalizeDate(value) {
  if (!value) return '';

  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    value = new Date(value);
  }

  if (value instanceof Date && !isNaN(value)) {
    var year = value.getFullYear();
    var month = ('0' + (value.getMonth() + 1)).slice(-2);
    var day = ('0' + value.getDate()).slice(-2);
    return year + '-' + month + '-' + day;
  }

  return '';
}

/**
 * 日付をYYYY-MM-DD形式でフォーマット
 */
function formatDate(date) {
  var year = date.getFullYear();
  var month = ('0' + (date.getMonth() + 1)).slice(-2);
  var day = ('0' + date.getDate()).slice(-2);
  return year + '-' + month + '-' + day;
}

// ===== テスト・セットアップ関数 =====

/**
 * 手動テスト: 特定の日付を要約
 */
function testSummarizeDate() {
  var testDate = '2026-01-25'; // テストしたい日付

  var diaryData = getDiaryDataByDate(testDate);

  if (!diaryData) {
    Logger.log('データなし: ' + testDate);
    return;
  }

  Logger.log('データ取得: ' + JSON.stringify(diaryData).substring(0, 500));

  var summary = generateDiarySummary(diaryData);
  Logger.log('要約結果: ' + JSON.stringify(summary));
}

/**
 * トリガー設定
 */
function setupDailyTrigger() {
  // 既存のトリガーを削除
  var triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'dailySummarize') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // 毎日23:00-24:00に実行
  ScriptApp.newTrigger('dailySummarize')
    .timeBased()
    .atHour(23)
    .everyDays(1)
    .create();

  Logger.log('トリガー設定完了: dailySummarize を毎日23時に実行');
}

/**
 * 過去の日記をまとめて要約（初回セットアップ用）
 */
function backfillSummaries() {
  var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    Logger.log('データなし');
    return;
  }

  // 全データを取得
  var data = sheet.getRange(2, 1, lastRow - 1, 15).getValues();

  var processed = 0;
  var maxProcess = 5; // API制限を考慮して1回あたり5件まで

  for (var i = 0; i < data.length && processed < maxProcess; i++) {
    var row = data[i];
    var rowNum = i + 2;

    // 既に要約がある場合はスキップ
    if (row[14]) {
      continue;
    }

    var dateStr = normalizeDate(row[1]);
    if (!dateStr) continue;

    Logger.log('処理中: ' + dateStr);

    var diaryData = {
      row: rowNum,
      date: row[1],
      title: row[2] || '無題',
      content: row[3] || '',
      calendar: row[4] || '',
      activity: row[5] || '',
      scores: row[6] || '',
      confidence: row[7] || '',
      routine: row[8] || ''
    };

    var summary = generateDiarySummary(diaryData);

    if (summary) {
      appendToSummaryFile(dateStr, summary);
      saveSummaryToSheet(rowNum, summary);
      processed++;

      // API制限対策: 1秒待機
      Utilities.sleep(1000);
    }
  }

  Logger.log('処理完了: ' + processed + '件');
}
