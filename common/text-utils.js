/**
 * WeCal Sync - Text Utilities / WeCal Sync - 文本工具
 * Source: Text/color handling functions from original background.js and index.js / 来源：原 background.js 和 index.js 中的文本/颜色处理函数
 */

import { EVENT_COLORS } from './constants.js';

/**
 * Generate color from string / 根据字符串生成颜色
 * Source: background.js -> stringToColor
 * Generates consistent color for different event titles for visual distinction / 为不同的日程标题生成固定的颜色，便于视觉区分
 */
export function stringToColor(str) {
    // Use imported color constants / 使用导入的颜色常量
    const colors = EVENT_COLORS;

    let hash = 0;
    // Simple hash algorithm / 简单的哈希算法
    for (let i = 0; i < str.length; i++) {
        // charCodeAt gets character code / charCodeAt 获取字符编码
        // Bitwise obfuscation / 位运算混淆
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Get absolute value, mod by colors array length to get index / 取绝对值后对颜色数组长度取模，得到索引
    return colors[Math.abs(hash) % colors.length];
}

/**
 * Truncate overly long URLs / 截断超长 URL
 * Source: index.js -> truncateUrl
 * Displays long URLs in short format for better UI / 将很长的 URL 显示为简短格式，优化 UI 显示
 */
export function truncateUrl(text) {
    // Return empty string if text is empty / 如果文本为空，返回空字符串
    if (!text) return '';

    // Check if starts with http or https / 判断是否以 http 或 https 开头
    if (text.startsWith('http://') || text.startsWith('https://')) {
        try {
            // Try to construct URL object / 尝试构建 URL 对象
            const url = new URL(text);
            // Keep only domain, add /... / 只保留域名部分，后面加 /...
            return url.origin + '/...';
        } catch (e) {
            // Fallback to simple string truncation if URL parsing fails / 如果 URL 解析失败，回退到简单的字符串截断
            return text.substring(0, 20) + '...';
        }
    }

    // Return as-is if not a URL / 如果不是 URL，原样返回
    return text;
}