#!/usr/bin/env python
"""从原始 v1.0.0.zip 构建 clean 版，含测试按钮 + AI 解析异常处理"""

import zipfile, os

SRC = 'dist/wecal-sync-v1.0.0.zip'
OUT = 'dist/wecal-sync-v1.0.0-clean.zip'

with zipfile.ZipFile(SRC, 'r') as zf:
    files = {item.filename: zf.read(item.filename) for item in zf.infolist()}

# ===== 1. manifest: <all_urls> -> iCloud =====
m = files['manifest.json'].decode('utf-8')
m = m.replace('"matches": ["<all_urls>"]',
              '"matches": ["https://*.icloud.com/*", "https://*.icloud.com.cn/*"]')
files['manifest.json'] = m.encode('utf-8')

# ===== 2. ai-handler.js: extractJSON + 401 + model =====
ai = files['features/create/ai-handler.js'].decode('utf-8')

ai = ai.replace(
    'export async function parseWithAI(text, apiKey, options = {}) {',
    '''/**
 * 从 AI 输出中提取 JSON
 */
function extractJSON(text) {
    let cleaned = text.replace(/```json\\s*/gi, '').replace(/```/g, '').trim();
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
        cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }
    try { return JSON.parse(cleaned); }
    catch {
        const firstBracket = cleaned.indexOf('[');
        const lastBracket = cleaned.lastIndexOf(']');
        if (firstBracket !== -1 && lastBracket > firstBracket) {
            cleaned = cleaned.substring(firstBracket, lastBracket + 1);
        }
        try {
            const arr = JSON.parse(cleaned);
            if (Array.isArray(arr) && arr.length > 0) return arr[0];
        } catch {}
    }
    return null;
}

export async function parseWithAI(text, apiKey, options = {}) {'''
)

old_block = '''        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${apiKey}` 
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { 
                        role: 'system', 
                        content: systemPrompt
                    }, 
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.1
            })
        });

        const data = await response.json();
        // 清洗 Markdown 代码块标记，防止 JSON.parse 报错
        const content = data.choices[0].message.content.replace(/```json|```/g, '').trim();
        
        let parsed = JSON.parse(content);'''

new_block = '''        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${apiKey}` 
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { 
                        role: 'system', 
                        content: systemPrompt
                    }, 
                    { role: 'user', content: userPrompt }
                ],
                temperature: 0.1
            })
        });

        if (response.status === 401) {
            console.error('[AI] 401 Unauthorized');
            throw new Error(chrome.i18n.getMessage('aiKeyInvalid') || 'API Key 无效 (401)，请检查设置页面中的 API Key');
        }
        if (!response.ok) {
            console.error('[AI] HTTP', response.status, response.statusText);
            throw new Error('AI 服务请求失败: HTTP ' + response.status);
        }

        const data = await response.json();
        // 清洗 Markdown 代码块标记，防止 JSON.parse 报错
        const content = data.choices[0].message.content.replace(/```json|```/g, '').trim();
        
        let parsed = extractJSON(content);
        if (!parsed) {
            try { parsed = JSON.parse(content); } catch {}
        }'''

ai = ai.replace(old_block, new_block)
ai = ai.replace("const model = options.model || 'glm-4-flash';",
                "const model = options.model || 'glm-4.5-flash';")
ai = ai.replace('glm-4-flash，免费模型', 'glm-4.5-flash，免费模型')
files['features/create/ai-handler.js'] = ai.encode('utf-8')

# ===== 3. create-view.js: add try-catch in executeAiAnalysis =====
cv = files['features/create/create-view.js'].decode('utf-8')

old_cv_block = '''        // 传入完整的 AI 配置
        const parsed = await parseWithAI(text, aiConfig.key, {
            baseUrl: aiConfig.baseUrl,
            model: aiConfig.model
        });'''

new_cv_block = '''        // 传入完整的 AI 配置
        let parsed = null;
        try {
            parsed = await parseWithAI(text, aiConfig.key, {
                baseUrl: aiConfig.baseUrl,
                model: aiConfig.model
            });
        } catch (e) {
            console.error('[CreateView] AI 解析异常:', e);
            const errMsg = e.message || '';
            if (errMsg.includes('401') || errMsg.includes('API Key')) {
                eventInputs.title.value = '❌ ' + (chrome.i18n.getMessage('aiKeyInvalid') || 'API Key 无效，请检查设置');
            } else {
                eventInputs.title.value = '❌ ' + errMsg;
            }
            setSubmitEnabled(false);
            return;
        }'''

cv = cv.replace(old_cv_block, new_cv_block)
files['features/create/create-view.js'] = cv.encode('utf-8')

# ===== 4. settings-view.html: placeholder + test button =====
svh = files['features/settings/settings-view.html'].decode('utf-8')
svh = svh.replace('placeholder="glm-4-flash"', 'placeholder="glm-4.5-flash"')

svh = svh.replace(
    '''                    <input id="aiKey" type="password" class="input-field" placeholder="__MSG_pasteApiKey__">
                </div>''',
    '''                    <input id="aiKey" type="password" class="input-field" placeholder="__MSG_pasteApiKey__">
                </div>
                <div>
                    <button id="testAiBtn" class="btn-secondary" style="width:100%;padding:8px;font-size:12px;">__MSG_testConnection__</button>
                    <div id="testAiStatus" style="font-size:11px;min-height:18px;margin-top:4px;"></div>
                </div>'''
)
files['features/settings/settings-view.html'] = svh.encode('utf-8')

# ===== 5. settings-view.js: model + test button logic =====
svj = files['features/settings/settings-view.js'].decode('utf-8')
svj = svj.replace("value = 'glm-4-flash'", "value = 'glm-4.5-flash'")
svj = svj.replace('glm-4-flash（免费模型，无需付费）', 'glm-4.5-flash（免费模型，无需付费）')

test_btn_code = '''
    // 4.5. 测试 AI 连接
    const testAiBtn = document.getElementById('testAiBtn');
    const testAiStatus = document.getElementById('testAiStatus');
    if (testAiBtn && testAiStatus) {
        testAiBtn.addEventListener('click', async () => {
            const baseUrl = document.getElementById('aiBaseUrl').value.trim() || 'https://open.bigmodel.cn/api/paas/v4';
            const model = document.getElementById('aiModel').value.trim() || 'glm-4.5-flash';
            const apiKey = document.getElementById('aiKey').value.trim();
            if (!apiKey) {
                testAiStatus.textContent = chrome.i18n.getMessage('connectionError') || '请先填入 API Key';
                testAiStatus.style.color = '#e74c3c';
                return;
            }
            testAiStatus.textContent = chrome.i18n.getMessage('testing') || '测试中...';
            testAiStatus.style.color = '#95a5a6';
            testAiBtn.disabled = true;
            try {
                const apiUrl = baseUrl.endsWith('/chat/completions') ? baseUrl : baseUrl.replace(/\\/+$/, '') + '/chat/completions';
                const resp = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
                    body: JSON.stringify({ model: model, messages: [{ role: 'user', content: 'test' }], max_tokens: 1 })
                });
                if (resp.status === 401) {
                    testAiStatus.textContent = chrome.i18n.getMessage('connectionFailed') || '连接失败：API Key 无效 (401)';
                    testAiStatus.style.color = '#e74c3c';
                } else if (resp.ok) {
                    testAiStatus.textContent = chrome.i18n.getMessage('connectionOk') || '连接成功！API Key 有效';
                    testAiStatus.style.color = '#27ae60';
                } else {
                    testAiStatus.textContent = (chrome.i18n.getMessage('connectionFailed') || '连接失败: HTTP ') + resp.status;
                    testAiStatus.style.color = '#e74c3c';
                }
            } catch (e) {
                testAiStatus.textContent = (chrome.i18n.getMessage('connectionError') || '连接出错: ') + e.message;
                testAiStatus.style.color = '#e74c3c';
            } finally {
                testAiBtn.disabled = false;
            }
        });
    }'''

svj = svj.replace(
    "    // 4. 取消返回\n    document.getElementById('cancelSettingsBtn').addEventListener('click', () => {",
    test_btn_code + "\n" + "    // 4. 取消返回\n    document.getElementById('cancelSettingsBtn').addEventListener('click', () => {"
)
files['features/settings/settings-view.js'] = svj.encode('utf-8')

# ===== 6. messages.json: model name + test button keys =====
test_keys_zh = '''
  "testConnection": {
    "message": "测试连接"
  },
  "testing": {
    "message": "测试中..."
  },
  "connectionOk": {
    "message": "连接成功！API Key 有效"
  },
  "connectionFailed": {
    "message": "连接失败"
  },
  "connectionError": {
    "message": "连接出错"
  },
  "aiKeyInvalid": {
    "message": "API Key 无效 (401)，请检查设置页面中的 API Key"
  },'''

test_keys_en = '''
  "testConnection": {
    "message": "Test Connection"
  },
  "testing": {
    "message": "Testing..."
  },
  "connectionOk": {
    "message": "Connected! API Key is valid"
  },
  "connectionFailed": {
    "message": "Connection failed"
  },
  "connectionError": {
    "message": "Connection error"
  },
  "aiKeyInvalid": {
    "message": "Invalid API Key (401), please check your API Key in settings"
  },'''

for lang, keys in [('zh_CN', test_keys_zh), ('en', test_keys_en)]:
    key = f'_locales/{lang}/messages.json'
    msg = files[key].decode('utf-8')
    msg = msg.replace('glm-4-flash（免费）', 'glm-4.5-flash（免费）')
    msg = msg.replace('glm-4-flash (free)', 'glm-4.5-flash (free)')
    msg = msg.replace('"openaiCompatHint"', keys + '\n  "openaiCompatHint"')
    files[key] = msg.encode('utf-8')

# Write output
os.makedirs('dist', exist_ok=True)
with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as zout:
    for name, data in files.items():
        zout.writestr(name, data)

# Verify
with zipfile.ZipFile(OUT, 'r') as zf:
    print(f'Size: {os.path.getsize(OUT)} bytes, {len(zf.namelist())} files')
    
    m = zf.read('manifest.json').decode('utf-8')
    print('✅ <all_urls>' if '<all_urls>' not in m else '❌ <all_urls>')
    
    ai = zf.read('features/create/ai-handler.js').decode('utf-8')
    print('✅ extractJSON' if 'function extractJSON' in ai else '❌ extractJSON')
    print('✅ 401 check' if 'status === 401' in ai else '❌ 401 check')
    print('✅ glm-4.5-flash' if "glm-4.5-flash" in ai else '❌ model')
    
    cv = zf.read('features/create/create-view.js').decode('utf-8')
    print('✅ try-catch in executeAiAnalysis' if 'try {' in cv and 'catch (e)' in cv else '❌ try-catch')
    
    sv = zf.read('features/settings/settings-view.js').decode('utf-8')
    print('✅ test button' if 'testAiBtn' in sv else '❌ test button')
    print('✅ settings model' if "glm-4.5-flash" in sv else '❌ settings model')
    
    zh = zf.read('_locales/zh_CN/messages.json').decode('utf-8')
    print('✅ i18n testConnection' if '测试连接' in zh else '❌ i18n')
    
    for name in zf.namelist():
        if not name.endswith('.js'): continue
        c = zf.read(name).decode('utf-8', errors='replace')
        if '=&gt;' in c: print(f'❌ BROKEN {name}')
    print('✅ All JS clean')
