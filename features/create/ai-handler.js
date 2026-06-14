/**
 * WeCal Sync - AI Handler
 * 职责：负责与 AI API 通讯，解析自然语言为日程对象
 * 
 * 变更说明（v1.5.2）：
 * - 不再硬编码 Deepseek 的 URL 和模型
 * - 改为从参数读取 Base URL、模型名、API Key
 * - 兼容任何 OpenAI API 格式的服务商
 */

import { normalizeDateString } from '../../common/date-utils.js';

/**
 * 调用 AI 解析文本
 * @param {string} text - 用户输入的自然语言文本
 * @param {string} apiKey - API Key
 * @param {object} options - 可选参数 { baseUrl, model }
 * @returns {Promise<object|null>} - 解析后的对象 {title, start, end, location} 或 null
 */
/**
 * 从 AI 乱写的文本中强行提取 JSON 对象
 * 兼容：```json {...} ```、内嵌自然语言、Python dict 等
 */
function extractJSON(text) {
    // 去掉 ```json 或 ``` 代码块标记
    let cleaned = text.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
    
    // 尝试从文本中提取 {...} 对象
    const objMatch = cleaned.match(/\{[^{}]*\}/);
    if (objMatch) {
        try { return JSON.parse(objMatch[0]); } catch(e) {}
        // 尝试修复常见问题：单引号 → 双引号，True/False → true/false
        try {
            let fixed = objMatch[0]
                .replace(/'/g, '"')
                .replace(/\bTrue\b/g, 'true')
                .replace(/\bFalse\b/g, 'false');
            return JSON.parse(fixed);
        } catch(e) {}
    }
    
    return null;
}

export async function parseWithAI(text, apiKey, options = {}) {
    if (!apiKey) return null;
    
    // 从参数读取，或使用默认值（智谱 glm-4.5-flash，免费模型）
    const baseUrl = options.baseUrl || 'https://open.bigmodel.cn/api/paas/v4';
    const model = options.model || 'glm-4.5-flash';
    
    try {
        // 获取当前详细时间，作为上下文传给 AI，以便计算相对时间
        const now = new Date();
        const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const timeContext = `当前时间是：${now.getFullYear()}年${now.getMonth()+1}月${now.getDate()}日 ${days[now.getDay()]} ${now.getHours()}:${now.getMinutes()}`;

        const prompt = `${timeContext}。请从以下文本中提取日程：${text}`;
        
        // 拼接 API URL（兼容有无 /v1/chat/completions 后缀）
        const apiUrl = baseUrl.endsWith('/chat/completions') 
            ? baseUrl 
            : `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
        
        const response = await fetch(apiUrl, {
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
                        content: '你是一个精密的日程提取助手。只提取JSON，不要解释、不要代码、不要多余文字。JSON字段: title, start, end, location。规则: 1.时间必须是 "YYYY-MM-DDTHH:mm" 格式；2."明天""后天"等必须按当前时间算出绝对日期；3.无结束时间则默认开始后1小时。' 
                    }, 
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1
            })
        });

        // 检查 HTTP 状态码，401 时抛出明确错误
        if (!response.ok) {
            const errBody = await response.text().catch(() => '');
            throw new Error(`AI API 返回错误 ${response.status}: ${response.statusText}${errBody ? ' - ' + errBody : ''}`);
        }

        const data = await response.json();
        // 清洗 Markdown 代码块标记，防止 JSON.parse 报错
        const content = data.choices[0].message.content.replace(/```json|```/g, '').trim();
        
        let parsed = extractJSON(content);
        if (!parsed) {
            console.error('[AI Handler] extractJSON 未能提取到有效 JSON，原始内容:', content);
            return null;
        }
        
        // 兼容 AI 有时返回数组的情况
        if (Array.isArray(parsed)) {
            console.warn('[AI Handler] 检测到 AI 返回了数组格式，正在提取第一项...');
            if (parsed.length > 0) {
                parsed = parsed[0];
            } else {
                console.error('[AI Handler] AI 返回了空数组');
                return null;
            }
        }

        // 对 AI 返回的数据进行二次格式清洗
        if (parsed.start) parsed.start = normalizeDateString(parsed.start);
        if (parsed.end) parsed.end = normalizeDateString(parsed.end);
        
        return parsed;

    } catch (e) { 
        console.error('[AI Handler] 解析失败:', e);
        return null; 
    }
}
