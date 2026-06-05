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
export async function parseWithAI(text, apiKey, options = {}) {
    if (!apiKey) return null;
    
    // 从参数读取，或使用默认值（智谱 glm-4-flash，免费模型）
    const baseUrl = options.baseUrl || 'https://open.bigmodel.cn/api/paas/v4';
    const model = options.model || 'glm-4-flash';
    
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
                        content: '你是一个精密的日程提取助手。提取JSON包含: title, start, end, location。注意：1.时间必须严格遵循 "YYYY-MM-DDTHH:mm" 格式；2.如果文本中有"明天"、"后天"等相对时间，必须根据提供的"当前时间"计算出绝对日期；3.如果未指定结束时间，默认设为开始时间后1小时。' 
                    }, 
                    { role: 'user', content: prompt }
                ],
                temperature: 0.1
            })
        });

        const data = await response.json();
        // 清洗 Markdown 代码块标记，防止 JSON.parse 报错
        const content = data.choices[0].message.content.replace(/```json|```/g, '').trim();
        
        let parsed = JSON.parse(content);
        
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
