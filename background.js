const CONFIG_KEY = 'nld_config';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

chrome.action.onClicked.addListener(async (tab) => {
    // 拡張機能アイコンがクリックされたら、アプリのメイン画面を開く
    const indexUrl = chrome.runtime.getURL('index.html');

    // 既に開いているタブがあればアクティブにする、なければ新規タブで開く
    const tabs = await chrome.tabs.query({ url: indexUrl });
    if (tabs.length > 0) {
        chrome.tabs.update(tabs[0].id, { active: true });
    } else {
        chrome.tabs.create({ url: indexUrl });
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'save-diary') {
        handleSaveDiary(message)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (message.type === 'format-text') {
        handleFormatText(message.text, message.userPrompt, message.dictionary)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (message.type === 'sync-notebooklm') {
        handleSyncNotebookLM(sender.tab)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (message.type === 'get-history') {
        handleGetHistory(message.date)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (message.type === 'get-schedule') {
        handleGetSchedule(message.date)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }

    if (message.type === 'generate-ai-response') {
        handleGenerateAIResponse(message.prompt)
            .then(result => sendResponse(result))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true;
    }
});

async function handleSaveDiary(message) {
    const result = await chrome.storage.local.get(CONFIG_KEY);
    const config = result[CONFIG_KEY] || {};

    if (!config.gasUrl) {
        return { success: false, error: '設定画面でGASのURLを入力してください。' };
    }

    // Prepare Payload
    const now = new Date();
    const diaryDate = message.diaryDate || now.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
    const timestamp = `${diaryDate} ${now.toLocaleTimeString('ja-JP')}`;

    const payload = {
        timestamp: timestamp,
        diaryDate: diaryDate,
        title: message.title || '無題',
        tags: message.tags || '',
        content: message.content || '',
        calendar: message.calendar || '',
        tasks: message.tasks || '',
        activity: message.activity || '',
        declaration: message.declaration || '',
        redo: message.redo || '',
        confidence: message.confidence || '',
        scores: message.scores || '',
        routine: message.routine || ''
    };

    try {
        console.log('Sending to GAS:', payload);
        const response = await fetch(config.gasUrl, {
            method: 'POST',
            body: JSON.stringify(payload),
            headers: {
                "Content-Type": "text/plain;charset=utf-8" // Avoid CORS preflight options if possible
            },
            redirect: 'follow'
        });

        // GAS redirection handling (302 -> 200 with HTML login page sometimes)
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }

        const text = await response.text();
        console.log('GAS Response:', text);

        // Check for HTML response (Login page)
        if (text.trim().startsWith('<')) {
            return {
                success: false,
                error: 'GAS認証エラー: デプロイ設定を確認してください。「アクセスできるユーザー: 全員」になっていますか？'
            };
        }

        try {
            const data = JSON.parse(text);
            return { ...data, sentPayload: payload };
        } catch (e) {
            return { success: true, message: '送信成功(レスポンス解析不能ですが処理は完了しました)', sentPayload: payload };
        }

    } catch (err) {
        console.error('GAS POST failed:', err);
        return { success: false, error: '通信エラー: ' + err.message };
    }
}

async function handleGetSchedule(date) {
    const result = await chrome.storage.local.get(CONFIG_KEY);
    const config = result[CONFIG_KEY] || {};

    if (!config.gasUrl) {
        return { success: false, error: '設定画面でGASのURLを入力してください。' };
    }

    try {
        const url = `${config.gasUrl}?action=getSchedule&date=${date}`;
        console.log('Fetching schedule from:', url);

        const response = await fetch(url, {
            method: 'GET',
            redirect: 'follow'
        });

        const text = await response.text();
        console.log('Schedule Response:', text);

        if (text.trim().startsWith('<')) {
            return {
                success: false,
                error: 'GAS認証エラー: Googleログイン画面が返されました。GASのデプロイ設定を「全員(Anyone)」にしてください。'
            };
        }

        const data = JSON.parse(text);
        if (data.success) {
            return {
                success: true,
                calendar: data.calendar || [],
                tasks: data.tasks || []
            };
        } else {
            return { success: false, error: data.error || 'GASエラー' };
        }

    } catch (err) {
        console.error('Schedule fetch failed:', err);
        return { success: false, error: '通信エラー: ' + err.message };
    }
}

async function handleFormatText(text, userPrompt, dictionary) {
    // --- SECURITY LOCK: AI FUNCTION DISABLED ---
    console.log('AI Function called but disabled for security.');
    return { success: false, error: '安全のため、AI機能は現在無効化されています。' };

    // Original code (unreachable):
    const result = await chrome.storage.local.get(CONFIG_KEY);
    const config = result[CONFIG_KEY] || {};

    if (!config.geminiApiKey) {
        return { success: false, error: 'Gemini APIキーが設定されていません' };
    }

    let dictionaryInstruction = '';
    if (dictionary && Object.keys(dictionary).length > 0) {
        const entries = Object.entries(dictionary)
            .map(([from, to]) => `「${from}」→「${to}」`)
            .join('、');
        dictionaryInstruction = `\n\n【重要】以下の用語は必ず指定された表記に置換してください:\n${entries}`;
    }

    const basePrompt = userPrompt || '以下の日記テキストを読みやすく整形し、適切なタイトルとタグを抽出してください。';

    const prompt = `${basePrompt}${dictionaryInstruction}

必ず以下のJSON形式のみを出力してください:
{"title": "タイトル（30文字以内）", "tags": "タグ1,タグ2,タグ3", "content": "整形されたテキスト"}

元のテキスト:
${text}`;

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${config.geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 65536 },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ]
            })
        });

        const data = await response.json();

        // コンテンツブロックチェック
        if (data.promptFeedback?.blockReason) {
            console.error('Content blocked:', data.promptFeedback);
            return { success: false, error: 'コンテンツポリシーによりブロックされました。内容を確認してください。' };
        }

        // APIエラーチェック
        if (data.error) {
            console.error('Gemini API returned error:', data.error);
            return { success: false, error: `API Error: ${data.error.message || JSON.stringify(data.error)}` };
        }

        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            const responseText = data.candidates[0].content.parts[0].text.trim();

            // マークダウンのコードブロックを除去
            let cleanText = responseText
                .replace(/```json\s*/gi, '')
                .replace(/```\s*/g, '')
                .trim();

            // title と tags を抽出
            const titleMatch = cleanText.match(/"title"\s*:\s*"([^"]*)"/);
            const tagsMatch = cleanText.match(/"tags"\s*:\s*"([^"]*)"/);

            // content を抽出（"content": " の後から最後の "} までを取得）
            const contentStartMatch = cleanText.match(/"content"\s*:\s*"/);

            if (contentStartMatch) {
                const contentStartIndex = cleanText.indexOf(contentStartMatch[0]) + contentStartMatch[0].length;
                // 最後から "} を探す
                let contentEndIndex = cleanText.length;

                // 末尾から閉じカッコを探す
                for (let i = cleanText.length - 1; i >= contentStartIndex; i--) {
                    if (cleanText[i] === '}') {
                        // その手前の " を探す
                        let j = i - 1;
                        while (j >= contentStartIndex && /\s/.test(cleanText[j])) j--;
                        if (cleanText[j] === '"') {
                            contentEndIndex = j;
                            break;
                        }
                    }
                }

                let extractedContent = cleanText.substring(contentStartIndex, contentEndIndex);

                // エスケープを復元
                extractedContent = extractedContent
                    .replace(/\\n/g, '\n')
                    .replace(/\\"/g, '"')
                    .replace(/\\\\/g, '\\');

                return {
                    success: true,
                    title: titleMatch ? titleMatch[1] : '',
                    tags: tagsMatch ? tagsMatch[1] : '',
                    content: extractedContent
                };
            }

            // フォールバック: JSONパースを試みる
            const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    return {
                        success: true,
                        title: parsed.title || '',
                        tags: parsed.tags || '',
                        content: parsed.content || text
                    };
                } catch (e) {
                    // JSON parse failed, continue to fallback
                }
            }

            // それでも失敗した場合: 整形されたテキストがあればそのまま返す
            if (cleanText.length > 100) {
                return {
                    success: true,
                    title: '',
                    tags: '',
                    content: cleanText
                };
            }

            return { success: false, error: 'レスポンスの解析に失敗しました' };
        }

        return { success: false, error: 'AIからの応答がありませんでした' };
    } catch (err) {
        console.error('Gemini API error:', err);
        return { success: false, error: 'API呼び出しに失敗しました: ' + err.message };
    }
}

async function handleSyncNotebookLM(senderTab) {
    const result = await chrome.storage.local.get(CONFIG_KEY);
    const config = result[CONFIG_KEY] || {};

    if (!config.notebookUrl) {
        return { success: false, error: 'NotebookLM URLが設定されていません' };
    }

    // 新規タブでNotebookLMを開く（既存タブは閉じない）
    const notebookTab = await chrome.tabs.create({ url: config.notebookUrl, active: true });

    // ページ読み込み完了を待つ
    await waitForTabComplete(notebookTab.id);

    // 即座にオーバーレイCSSをインジェクト
    try {
        await chrome.scripting.insertCSS({
            target: { tabId: notebookTab.id },
            files: ['syncOverlay.css']
        });
        // オーバーレイ要素を即座に追加
        await chrome.scripting.executeScript({
            target: { tabId: notebookTab.id },
            func: () => {
                const overlay = document.createElement('div');
                overlay.id = 'nld-sync-overlay-preload';
                document.documentElement.appendChild(overlay);
            }
        });
    } catch (e) {
        // Overlay preload can fail on some pages, non-critical
    }

    // NotebookLMのUIがレンダリングされるまで待つ
    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
        await chrome.scripting.executeScript({
            target: { tabId: notebookTab.id },
            files: ['syncInject.js']
        });
        return { success: true };
    } catch (err) {
        console.error('Sync injection failed:', err);
        return { success: false, error: '同期に失敗しました' };
    }
}

async function waitForTabComplete(tabId) {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === 'complete') return;

    await new Promise(resolve => {
        const listener = (updatedTabId, info) => {
            if (updatedTabId === tabId && info.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                resolve();
            }
        };
        chrome.tabs.onUpdated.addListener(listener);
    });
}

async function handleGetHistory(dateStr) {
    let startTime, endTime;

    // 日付範囲の設定 (0:00:00 - 23:59:59)
    try {
        let targetDate = new Date();
        if (dateStr) {
            // YYYY-MM-DD -> Parse explicitly to avoid UTC conversion
            const parts = dateStr.split('-');
            if (parts.length === 3) {
                targetDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
            }
        }

        // 日付の開始と終了を設定
        startTime = new Date(targetDate);
        startTime.setHours(0, 0, 0, 0);

        endTime = new Date(targetDate);
        endTime.setHours(23, 59, 59, 999);

    } catch (e) {
        // Fallback to today
        const now = new Date();
        startTime = new Date(now.setHours(0, 0, 0, 0));
        endTime = new Date(now.setHours(23, 59, 59, 999));
    }

    try {
        console.log(`Fetching history from ${startTime} to ${endTime}`);
        const historyItems = await chrome.history.search({
            text: '',
            startTime: startTime.getTime(),
            endTime: endTime.getTime(),
            maxResults: 1000 // Limit to avoid overload
        });

        if (!historyItems || historyItems.length === 0) {
            return { success: true, history: '(履歴なし)' };
        }

        // 時刻順にソート (古い順)
        historyItems.sort((a, b) => (a.lastVisitTime || 0) - (b.lastVisitTime || 0));

        // 整形
        const uniqueEntries = new Set();
        const formatted = historyItems
            .map(item => {
                const visitTime = new Date(item.lastVisitTime);
                const timeStr = visitTime.toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit'
                });
                const title = item.title || item.url || 'No Title';
                // 重複排除のためのキー
                const key = `${timeStr} ${title}`;
                if (uniqueEntries.has(key)) return null;
                uniqueEntries.add(key);

                return key;
            })
            .filter(Boolean) // Remove nulls
            .join('\n');

        return { success: true, history: formatted || '(履歴なし)' };
    } catch (err) {
        console.error('History fetch failed:', err);
        return { success: false, error: '履歴の取得に失敗しました: ' + err.message };
    }
}



async function handleGenerateAIResponse(userPrompt) {
    const result = await chrome.storage.local.get(CONFIG_KEY);
    const config = result[CONFIG_KEY] || {};

    if (!config.geminiApiKey) {
        return { success: false, error: 'Gemini APIキーが設定されていません' };
    }

    try {
        const response = await fetch(`${GEMINI_API_URL}?key=${config.geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: userPrompt }] }],
                generationConfig: { temperature: 0.4, maxOutputTokens: 65536 },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' }
                ]
            })
        });

        const data = await response.json();

        if (data.promptFeedback?.blockReason) {
            return { success: false, error: 'コンテンツポリシーによりブロックされました。' };
        }

        if (data.error) {
            return { success: false, error: `API Error: ${data.error.message}` };
        }

        if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            const text = data.candidates[0].content.parts[0].text;

            // Robust JSON Extraction
            const extracted = extractJSON(text);
            if (extracted) {
                return { success: true, data: extracted, raw: text };
            }

            // Fallback: Return raw text for client-side parsing attempts
            return { success: true, data: null, raw: text };
        }

        return { success: false, error: 'No response content' };

    } catch (err) {
        return { success: false, error: err.message };
    }
}

function extractJSON(text) {
    const firstOpen = text.indexOf('{');
    if (firstOpen === -1) return null;

    let balance = 0;
    let endIndex = -1;

    for (let i = firstOpen; i < text.length; i++) {
        if (text[i] === '{') balance++;
        else if (text[i] === '}') balance--;

        if (balance === 0) {
            endIndex = i;
            break;
        }
    }

    if (endIndex !== -1) {
        const jsonStr = text.substring(firstOpen, endIndex + 1);
        try {
            return JSON.parse(jsonStr);
        } catch (e) {
            // Remove potential markdown code blocks inside the substring and try again?
            // Usually substring is clean enough if braces matched, unless markdown is inside strings (unlikely for structure)
            // Let's try a simple cleanup just in case
            const cleanStr = jsonStr.replace(/\\n/g, '\n');
            try { return JSON.parse(cleanStr); } catch (e2) { return null; }
        }
    }
    return null;
}
