/**
 * WeCal Sync - Date Utilities / WeCal Sync - 日期工具
 * Source: Date handling functions from original background.js and index.js / 来源：原 background.js 和 index.js 中的日期处理函数
 */

/**
 * Format full date string / 格式化完整日期字符串
 * Source: background.js -> formatFullDate
 * Converts iCal format time (20230101T120000Z) to readable format (2023-01-01 12:00:00) / 将 iCal 格式的时间 (20230101T120000Z) 转换为可读格式 (2023-01-01 12:00:00)
 */
export function formatFullDate(icalStr) {
    // Return 'Unknown' if input is empty / 如果输入为空，直接返回 'Unknown'
    if (!icalStr) return 'Unknown';

    // Use regex to match iCal time format / 使用正则表达式匹配 iCal 时间格式
    // Capture groups: 1:year, 2:month, 3:day, 4:hour, 5:min, 6:sec, 7:Z(UTC flag) / 匹配组：1:年, 2:月, 3:日, 4:时, 5:分, 6:秒, 7:Z(是否UTC)
    const match = icalStr.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?/);
    // Return original string if match fails / 如果匹配失败，直接返回原字符串
    if (!match) return icalStr;

    // Destructure match result / 解构匹配结果
    const [_, y, m, d, h, min, s, isUtc] = match;

    let date;
    // Check if UTC time (with Z) / 判断是否是 UTC 时间（带 Z）
    if (isUtc) {
        // If with Z, parse as UTC explicitly, then JS Date converts to local timezone / 如果带 Z，显式按 UTC 时间解析，然后 JS Date 对象会自动转为本地时区
        date = new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min), parseInt(s)));
    } else {
        // If without Z, parse as local time / 如果不带 Z，直接按本地时间解析
        // Note: month needs -1 because Date object months are 0-11 / 注意：月份需要减 1，因为 Date 对象月份是 0-11
        date = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min), parseInt(s));
    }

    // Padding function to ensure two digits / 补零函数，确保数字是两位数
    const pad = (n) => String(n).padStart(2, '0');

    // Build final string: YYYY-MM-DD HH:mm:ss / 拼接最终字符串：YYYY-MM-DD HH:mm:ss
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/**
 * Parse iCal date string to Date object / 解析 iCal 日期字符串为 Date 对象
 * Source: background.js -> parseIcalDate
 * Converts 20230101T120000Z to JavaScript Date object / 将 20230101T120000Z 转为 JavaScript Date 对象
 */
export function parseIcalDate(icalStr) {
  // Return null if string is empty / 如果字符串为空，返回 null
  if (!icalStr) return null;

  // Regex to match time portion / 正则匹配时间部分
  const match = icalStr.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  // Return null if match fails / 匹配失败返回 null
  if (!match) return null;

  // Destructure time components / 解构时间分量
  const [_, y, m, d, h, min, s] = match;

  // Use UTC constructor if contains 'Z', otherwise local time / 根据是否包含 'Z' 决定是用 UTC 构造还是本地时间构造
  return icalStr.includes('Z')
    ? new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min), parseInt(s)))
    : new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min), parseInt(s));
}

/**
 * Normalize date string / 规范化日期字符串
 * Source: index.js -> normalizeDateString
 * Ensures date string matches datetime-local input requirements (YYYY-MM-DDTHH:mm) / 确保日期字符串符合 datetime-local 输入框的要求 (YYYY-MM-DDTHH:mm)
 */
export function normalizeDateString(dateStr) {
    // Return null if empty / 如果为空直接返回 null
    if (!dateStr) return null;

    // Replace space with T (e.g., "2023-01-01 12:00" -> "2023-01-01T12:00") / 替换空格为 T (例如 "2023-01-01 12:00" -> "2023-01-01T12:00")
    // Replace slash with hyphen (e.g., "2023/01/01" -> "2023-01-01") / 替换斜杠为短横线 (例如 "2023/01/01" -> "2023-01-01")
    let normalized = dateStr.replace(/\//g, '-').replace(' ', 'T');

    // Ensure format length (take first 16 chars to remove seconds/timezone) / 确保格式长度符合要求 (截取前16位，去掉可能的秒数或时区信息)
    if (normalized.length > 16) normalized = normalized.substring(0, 16);

    // Return normalized string / 返回规范化后的字符串
    return normalized;
}