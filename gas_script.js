function doPost(e) {
    // CORS Preflight handles (OPTIONS request is handled by doGet usually, or implicit)
    try {
        var params = JSON.parse(e.postData.contents);
        var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

        // 1. ヘッダーの確認と自動作成
        ensureHeaders(sheet);

        // 2. ヘッダー取得 & 追加列の確保
        var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
        headers = ensureExtraHeaders(sheet, headers, ["Meal_Raw", "Meal_JSON", "Meal_Summary", "Meal_Nutrition"]);
        var headerMap = buildHeaderMap(headers);

        // 3. 同じ日付の行を検索 (Upsert: Update or Insert)
        var existingRow = findRowByDate(sheet, params.diaryDate);
        var lastCol = headers.length;
        var rowData;
        if (existingRow > 0) {
            rowData = sheet.getRange(existingRow, 1, 1, lastCol).getValues()[0];
            if (rowData.length < lastCol) {
                rowData = rowData.concat(new Array(lastCol - rowData.length).fill(""));
            }
        } else {
            rowData = new Array(lastCol).fill("");
        }

        setByHeader(rowData, headerMap, "Timestamp", new Date());
        setByHeader(rowData, headerMap, "Date", params.diaryDate);
        setByHeader(rowData, headerMap, "Title", params.title);
        setByHeader(rowData, headerMap, "Diary Content", params.content);
        setByHeader(rowData, headerMap, "Calendar", params.calendar);
        setByHeader(rowData, headerMap, "Activity", params.activity);
        setByHeader(rowData, headerMap, "Scores", params.scores);
        setByHeader(rowData, headerMap, "Confidence/Good", params.confidence);
        setByHeader(rowData, headerMap, "Routine", params.routine);

        setByHeader(rowData, headerMap, "Meal_Raw", params.mealRaw);
        setByHeader(rowData, headerMap, "Meal_JSON", params.mealJson);
        setByHeader(rowData, headerMap, "Meal_Summary", params.mealSummary);
        setByHeader(rowData, headerMap, "Meal_Nutrition", params.mealNutrition);

        var action = 'created';

        if (existingRow > 0) {
            // 既存行を上書き更新
            sheet.getRange(existingRow, 1, 1, lastCol).setValues([rowData]);
            action = 'updated';
        } else {
            // 新規行を追加
            sheet.appendRow(rowData);
            action = 'created';
        }

        return ContentService.createTextOutput(JSON.stringify({
            'success': true,
            'action': action,
            'date': params.diaryDate
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (error) {
        return ContentService.createTextOutput(JSON.stringify({ 'success': false, 'error': error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}

/**
 * 日付でスプレッドシートの行を検索
 * @param {Sheet} sheet - 対象シート
 * @param {string} targetDate - 検索する日付 (YYYY-MM-DD形式)
 * @return {number} 見つかった行番号（1始まり）、見つからなければ -1
 */
function findRowByDate(sheet, targetDate) {
    if (!targetDate) return -1;

    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) return -1; // ヘッダーのみ

    // B列（Date列）のデータを取得
    var dateColumn = sheet.getRange(2, 2, lastRow - 1, 1).getValues();

    for (var i = 0; i < dateColumn.length; i++) {
        var cellValue = dateColumn[i][0];

        // 日付形式を正規化して比較
        var cellDate = normalizeDate(cellValue);

        if (cellDate === targetDate) {
            return i + 2; // 行番号（1始まり + ヘッダー分）
        }
    }

    return -1; // 見つからない
}

/**
 * 日付を YYYY-MM-DD 形式に正規化
 * @param {*} value - セルの値（Date型 or 文字列）
 * @return {string} YYYY-MM-DD形式の文字列
 */
function normalizeDate(value) {
    if (!value) return '';

    // すでに文字列の場合
    if (typeof value === 'string') {
        // YYYY-MM-DD形式ならそのまま返す
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value;
        }
        // その他の形式はDateとしてパース
        value = new Date(value);
    }

    // Date型の場合
    if (value instanceof Date && !isNaN(value)) {
        var year = value.getFullYear();
        var month = ('0' + (value.getMonth() + 1)).slice(-2);
        var day = ('0' + value.getDate()).slice(-2);
        return year + '-' + month + '-' + day;
    }

    return '';
}

function setup() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    ensureHeaders(sheet);
}

/**
 * 旧14列構成から新9列構成にマイグレーションする
 * GASエディタから手動実行: migrateToNewSchema()
 *
 * 旧: Timestamp | Date | Title | Tags | Diary Content | Calendar | ToDo | Activity | Declaration | Scores | Redo/Improve | Confidence/Good | Routine | KPI Data
 * 新: Timestamp | Date | Title | Diary Content | Calendar | Activity | Scores | Confidence/Good | Routine
 */
function migrateToNewSchema() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    // ヘッダー確認
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    Logger.log('現在のヘッダー: ' + headers.join(' | '));

    // 14列かチェック
    if (lastCol < 14) {
        Logger.log('14列未満です。既にマイグレーション済みか想定外の形式です。');
        return;
    }

    // 削除する列（右から順に削除が重要！）
    // 旧: A:Timestamp | B:Date | C:Title | D:Tags | E:Diary Content | F:Calendar | G:ToDo | H:Activity | I:Declaration | J:Scores | K:Redo/Improve | L:Confidence/Good | M:Routine | N:KPI Data
    // 削除: N(KPI Data), K(Redo/Improve), I(Declaration), G(ToDo), D(Tags)
    var columnsToDelete = [14, 11, 9, 7, 4]; // 右から順に

    for (var i = 0; i < columnsToDelete.length; i++) {
        var col = columnsToDelete[i];
        if (col <= sheet.getLastColumn()) {
            sheet.deleteColumn(col);
            Logger.log('列 ' + col + ' を削除しました');
        }
    }

    // 新しいヘッダーを設定
    var newHeaders = [
        "Timestamp",        // A
        "Date",             // B
        "Title",            // C
        "Diary Content",    // D
        "Calendar",         // E
        "Activity",         // F
        "Scores",           // G
        "Confidence/Good",  // H
        "Routine"           // I
    ];

    sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);
    sheet.getRange(1, 1, 1, newHeaders.length)
        .setFontWeight("bold")
        .setBackground("#e0e0e0")
        .setBorder(true, true, true, true, true, true);

    sheet.setFrozenRows(1);

    Logger.log('マイグレーション完了！新しいヘッダー: ' + newHeaders.join(' | '));
}

function doGet(e) {
    if (!e || !e.parameter) {
        return ContentService.createTextOutput(JSON.stringify({
            'success': true,
            'message': 'GAS is running. Deploy as Web App to use.'
        })).setMimeType(ContentService.MimeType.JSON);
    }

    var action = e.parameter.action;

    if (action == 'getSchedule') {
        return handleGetSchedule(e.parameter.date);
    }

    if (action == 'getAllHabitData') {
        return handleGetAllHabitData();
    }

    return ContentService.createTextOutput(JSON.stringify({ 'success': true, 'message': 'GAS is running' }))
        .setMimeType(ContentService.MimeType.JSON);
}

function handleGetAllHabitData() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow <= 1) {
        return ContentService.createTextOutput(JSON.stringify({ 'success': true, 'data': [] }))
            .setMimeType(ContentService.MimeType.JSON);
    }

    // Read headers to support multiple schemas (9/13/17 columns)
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];

    var dateIdx = findFirstHeaderIndex(headers, 'Date');
    var scoreIdxs = findHeaderIndexes(headers, 'Scores');
    var routineIdxs = findHeaderIndexes(headers, 'Routine');

    // Get all data (skip header)
    var range = sheet.getRange(2, 1, lastRow - 1, lastCol);
    var values = range.getValues();

    var logs = values.map(function (row) {
        var dateVal = (dateIdx >= 0 && dateIdx < row.length) ? row[dateIdx] : row[1];
        var dateStr = normalizeDate(dateVal) || dateVal;

        var scoresVal = pickFirstNonEmpty(row, scoreIdxs);
        var routineVal = pickFirstNonEmpty(row, routineIdxs);

        return {
            date: dateStr,
            scores: scoresVal,
            routine: routineVal
        };
    });

    // Filter out empty dates
    logs = logs.filter(function (log) { return log.date && log.date !== ""; });

    return ContentService.createTextOutput(JSON.stringify({ 'success': true, 'data': logs }))
        .setMimeType(ContentService.MimeType.JSON);
}

function findHeaderIndexes(headers, label) {
    var lower = String(label).toLowerCase();
    var indexes = [];
    for (var i = 0; i < headers.length; i++) {
        if (String(headers[i]).toLowerCase() === lower) {
            indexes.push(i);
        }
    }
    return indexes;
}

function findFirstHeaderIndex(headers, label) {
    var idxs = findHeaderIndexes(headers, label);
    return idxs.length > 0 ? idxs[0] : -1;
}

function pickFirstNonEmpty(row, indexes) {
    for (var i = 0; i < indexes.length; i++) {
        var idx = indexes[i];
        if (idx < row.length) {
            var val = row[idx];
            if (val !== '' && val !== null && val !== undefined) {
                if (typeof val === 'string') {
                    if (val.trim() !== '') return val;
                } else {
                    return val;
                }
            }
        }
    }
    return '';
}

/**
 * 非表示の列を再表示する（手動実行用）
 */
function showAllColumns() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.showColumns(1, 9); // A〜I列をすべて表示
    Logger.log('全列を表示しました');
}

/**
 * スプレッドシートのデータを確認する（デバッグ用）
 */
function debugShowData() {
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    Logger.log('行数: ' + lastRow + ', 列数: ' + lastCol);

    // ヘッダー
    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    Logger.log('ヘッダー: ' + headers.join(' | '));

    // 全データ (9列構成: Date=1, Title=2, Scores=6, Routine=8)
    if (lastRow > 1) {
        var data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
        data.forEach(function(row, i) {
            Logger.log('行' + (i+2) + ': Date=' + row[1] + ', Title=' + row[2] + ', Scores=' + row[6] + ', Routine=' + (row[8] ? String(row[8]).substring(0, 50) + '...' : 'なし'));
        });
    }
}

function ensureHeaders(sheet) {
    var lastCol = sheet.getLastColumn();
    // Safety check up to 9 columns (9列構成)
    var headerRange = sheet.getRange(1, 1, 1, Math.max(lastCol, 9));
    var headers = headerRange.getValues()[0];

    // Check if correct headers exist (9列構成)
    // I列(Index 8)がRoutineかチェック
    if (!headers[0] || headers[8] !== "Routine") {
        var newHeaders = [
            "Timestamp",        // A
            "Date",             // B
            "Title",            // C
            "Diary Content",    // D
            "Calendar",         // E
            "Activity",         // F
            "Scores",           // G
            "Confidence/Good",  // H
            "Routine"           // I
        ];

        sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders]);

        sheet.getRange(1, 1, 1, newHeaders.length)
            .setFontWeight("bold")
            .setBackground("#e0e0e0")
            .setBorder(true, true, true, true, true, true);

        sheet.setFrozenRows(1);
    }

    // 追加列（食事ログ用）を末尾に確保
    var currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    ensureExtraHeaders(sheet, currentHeaders, ["Meal_Raw", "Meal_JSON", "Meal_Summary", "Meal_Nutrition"]);
}

function buildHeaderMap(headers) {
    var map = {};
    for (var i = 0; i < headers.length; i++) {
        var key = headers[i];
        if (key && map[key] === undefined) {
            map[key] = i;
        }
    }
    return map;
}

function ensureExtraHeaders(sheet, headers, extras) {
    var updated = headers.slice();
    var changed = false;
    extras.forEach(function (name) {
        if (updated.indexOf(name) === -1) {
            updated.push(name);
            changed = true;
        }
    });

    if (changed) {
        sheet.getRange(1, 1, 1, updated.length).setValues([updated]);
        sheet.setFrozenRows(1);
    }
    return updated;
}

function setByHeader(rowData, headerMap, name, value) {
    if (headerMap[name] === undefined) return;
    rowData[headerMap[name]] = value !== undefined && value !== null ? value : "";
}

function formatForNotebookLM(p) {
    let scoreStr = '(記載なし)';
    try {
        if (p.scores) {
            const s = JSON.parse(p.scores);
            scoreStr = `心:${s.heart}, 技:${s.skill}, 体:${s.body}, 生活:${s.life}`;
        }
    } catch (e) { }

    return [
        `# 日記: ${p.title || '無題'} (${p.diaryDate})`,
        ``,
        `## 朝の宣言 (Goal)`,
        p.declaration || '(なし)',
        ``,
        `## 振り返りスコア`,
        scoreStr,
        ``,
        `## 自信を育てたこと (Good/Confidence)`,
        p.confidence || '(なし)',
        ``,
        `## 達成したルーティン`,
        p.routine || '(なし)',
        ``,
        `## 自由記述・感想`,
        p.content || '(なし)',
        ``,
        `## カレンダー・予定`,
        p.calendar || '(なし)',
        ``,
        `## 今日のアクティビティ履歴`,
        p.activity || '(なし)'
    ].join('\n');
}

// google Calendar APIを使う場合の例 (拡張サービスでGoogle Calendar APIをONにする必要あり)
function handleGetSchedule(dateStr) {
    try {
        var date = dateStr ? new Date(dateStr) : new Date();
        var calendarId = 'primary'; // メインカレンダー

        // 1日の範囲を設定
        var start = new Date(date);
        start.setHours(0, 0, 0, 0);
        var end = new Date(date);
        end.setHours(23, 59, 59, 999);

        var events = CalendarApp.getCalendarById(calendarId).getEvents(start, end);
        var eventList = events.map(function (evt) {
            return (evt.isAllDayEvent() ? '[終日] ' : evt.getStartTime().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) + ' ') + evt.getTitle();
        });

        // Google Tasks APIを使う場合は別途設定が必要ですが、
        // ここでは簡易的に空配列またはカレンダーの説明から抽出するなどの実装になります。
        // 今回はカレンダーイベントのみ返します。

        return ContentService.createTextOutput(JSON.stringify({
            'success': true,
            'calendar': eventList,
            'tasks': [] // Tasks API連携が必要ならここに追加
        })).setMimeType(ContentService.MimeType.JSON);

    } catch (e) {
        return ContentService.createTextOutput(JSON.stringify({ 'success': false, 'error': e.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    }
}
