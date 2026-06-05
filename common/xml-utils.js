/**
 * WeCal Sync - XML & ICS Utilities / WeCal Sync - XML 和 ICS 工具
 * Source: XML/CalDAV parsing functions from original background.js / 来源：原 background.js 中的 XML/CalDAV 解析函数
 */

/**
 * Build complete URL / 构建完整的 URL
 * Source: background.js -> buildFullUrl
 * Concatenates domain and path, handles relative paths and http protocol / 拼接域名和路径，处理相对路径和 http 协议
 */
export function buildFullUrl(domain, path) {
    // If path is empty, return https:// + domain / 如果路径为空，只返回 https:// + 域名
    if (!path) return `https://${domain}`;
    // If path already starts with http (absolute path), return as-is / 如果路径已经是以 http 开头（绝对路径），直接返回
    // Otherwise concatenate https:// + domain + (ensure /) + path / 否则拼接 https:// + 域名 + (确保有/) + 路径
    return path.startsWith('http') ? path : `https://${domain}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Extract href attribute or tag content from XML / 从 XML 中提取 href 属性或标签内容
 * Source: background.js -> extractHref
 * Uses regex to extract href link from specified tag in XML text / 使用正则从 XML 文本中提取指定标签下的 href 链接
 */
export function extractHref(xml, tag) {
    // Build regex: match <tag> ... <href>content</href> ... </tag> / 构造正则表达式：匹配 <tag> ... <href>内容</href> ... </tag>
    const regex = new RegExp('<[^>]*?' + tag + '[^>]*?>[\\s\\S]*?<[^>]*?href[^>]*?>([^<]+)<\\/', 'i');
    // Execute match / 执行匹配
    const m = xml.match(regex);
    // If match succeeds, return first capture group (content) trimmed; otherwise null / 如果匹配成功，返回第一个捕获组（内容），并去空格；否则返回 null
    return m ? m[1].trim() : null;
}

/**
 * Parse ICS event data from XML response / 从 XML 响应中解析 ICS 事件数据
 * Source: background.js -> parseIcsFromXml
 * Converts CalDAV XML response to JavaScript object array / 将 CalDAV 返回的 XML 转换为 JavaScript 对象数组
 */
export function parseIcsFromXml(xml) {
  const results = [];

  // Extract global PRODID (product identifier) / 提取全局 PRODID（产品标识符）
  const prodidMatch = xml.match(/PRODID:(.*)\r?\n/);
  const globalProdid = prodidMatch ? prodidMatch[1].trim() : '';

  // Extract all VCALENDAR blocks / 提取所有 VCALENDAR 块
  const vcalendarBlocks = xml.match(/BEGIN:VCALENDAR[\s\S]*?END:VCALENDAR/g) || [];

  // Iterate through each calendar block / 遍历每个日历块
  for (const vcal of vcalendarBlocks) {
    // Try to get current block's PRODID, fallback to global if none / 尝试获取当前块的 PRODID，如果没有则使用全局的
    const blockProdidMatch = vcal.match(/PRODID:(.*)\r?\n/);
    const prodid = blockProdidMatch ? blockProdidMatch[1].trim() : globalProdid;

    // Extract all VEVENT (events) under current calendar block / 提取当前日历块下的所有 VEVENT（事件）
    const events = vcal.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/g) || [];

    // Iterate through each event / 遍历每个事件
    for (const block of events) {
        // Define inner helper function: get value of specified field / 定义内部辅助函数：获取指定字段的值
        const getField = (f) => {
            // Regex match: field name at line start, optional semicolon params, colon, then value / 正则匹配：行首是字段名，可选的分号参数，冒号，然后是值
            const m = block.match(new RegExp('^' + f + '(?:;[^:]*)?:(.*)$', 'm'));
            return m ? m[1].trim() : null;
        };

        // Build event object and push to results array / 构建事件对象并推入结果数组
        results.push({
          summary: getField('SUMMARY') || 'No Title', // No Title / 无标题
          dtstart: getField('DTSTART') || '',
          dtend: getField('DTEND') || '',
          location: getField('LOCATION') || '',
          uid: getField('UID') || '',
          prodid: prodid, // Record source device / 记录来源设备
          created: getField('CREATED') || getField('DTSTAMP') || '' // Record creation time / 记录创建时间
        });
    }
  }
  return results;
}