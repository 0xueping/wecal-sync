/**
 * WeCal Sync - CalDAV Client
 * Responsibilities: Handle specific HTTP communication with iCloud server (PROPFIND, PUT) / 职责：负责与 iCloud 服务器进行具体的 HTTP 通讯（PROPFIND, PUT）
 * Origin: Original handleTestConnection, handleSyncEvent and their dependent logic from background.js / 来源：原 background.js 中 handleTestConnection, handleSyncEvent 及其依赖逻辑
 */

import { safeStorage } from '../common/storage.js';
import { buildFullUrl, extractHref } from '../common/xml-utils.js';

/**
 * Test iCloud connection and retrieve calendar list / 测试 iCloud 连接并获取日历列表
 * Origin: background.js -> handleTestConnection / 来源：原 background.js -> handleTestConnection
 */
export async function handleTestConnection(config) {
  const { serverUrl, appleId, appPassword, calendarName } = config;
  const target = (calendarName || 'Calendar').trim();
  // Build Basic Auth header / 构建 Basic Auth 头
  const auth = btoa(`${appleId}:${appPassword}`);
  const baseHeaders = { 'Authorization': `Basic ${auth}`, 'Content-Type': 'text/xml; charset=utf-8' };
  
  try {
    let domain = serverUrl || 'caldav.icloud.com.cn';
    
    // 1. Send PROPFIND request to get principal (user entity) / 发送 PROPFIND 请求获取 principal (用户主体)
    let res = await fetch(`https://${domain}/.well-known/caldav`, { 
        method: 'PROPFIND', 
        headers: { ...baseHeaders, 'Depth': '0' },
        body: '<?xml version="1.0" encoding="UTF-8"?><propfind xmlns="DAV:"><prop><current-user-principal/></prop></propfind>' 
    });
    const xml = await res.text();
    let principal = extractHref(xml, 'current-user-principal') || `/${encodeURIComponent(appleId)}/principal/`;
    
    // 2. Get calendar-home-set (calendar home directory) / 获取 calendar-home-set (日历主目录)
    let resHome = await fetch(buildFullUrl(domain, principal), { 
        method: 'PROPFIND', 
        headers: { ...baseHeaders, 'Depth': '0' },
        body: '<?xml version="1.0" encoding="UTF-8"?><propfind xmlns="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav"><prop><C:calendar-home-set/></prop></propfind>' 
    });
    let homeSet = extractHref(await resHome.text(), 'calendar-home-set');
    
    // 3. Iterate through calendar list and find matching calendar / 遍历日历列表，查找匹配名称的日历
    let resList = await fetch(buildFullUrl(domain, homeSet), { 
        method: 'PROPFIND', 
        headers: { ...baseHeaders, 'Depth': '1' },
        body: '<?xml version="1.0" encoding="UTF-8"?><propfind xmlns="DAV:"><prop><displayname/><resourcetype/></prop></propfind>' 
    });
    const listXml = await resList.text();
    
    // Parse XML response / 解析 XML 响应
    const responses = listXml.split(/<[^>]*?response/i);
    // let realUrl = ''; // Removed unused realUrl variable to avoid side effects / 移除不再需要的 realUrl 变量，避免副作用
    let calendars = []; // Modified: store objects {name, url} instead of just strings / 修改：存储对象 {name, url} 而非仅字符串
    
    for (const resp of responses) {
      if (resp.toLowerCase().includes('calendar')) {
        const dNameM = resp.match(/<[^>]*?displayname[^>]*?>([^<]+)<\//i);
        const hrefM = resp.match(/<[^>]*?href[^>]*?>([^<]+)<\//i);
        if (dNameM && hrefM) {
          const dName = dNameM[1].trim(); 
          const fullUrl = buildFullUrl(domain, hrefM[1].trim());
          
          // Collect calendar info (name + URL) / 收集日历信息 (名称 + URL)
          calendars.push({ name: dName, url: fullUrl });
          
          // Removed: Do not auto-match and save realUrl here, as it causes side effects / 移除：不要在这里自动匹配并保存 realUrl，这会导致副作用
          // if (dName.toLowerCase() === target.toLowerCase()) realUrl = fullUrl;
        }
      }
    }
    
    // 4. Save results / 保存结果
    // Fix: Removed auto safeStorage.set logic. / 修复：移除自动 safeStorage.set 逻辑。
    // Verification should be read-only; configuration saving should be fully controlled by the "Save Configuration" button in the UI layer. / 验证操作应该是只读的，配置保存应完全由 UI 层的"保存配置"按钮控制。
    
    if (calendars.length > 0) {
        return { success: true, calendars: calendars };
    }

    return { success: false, error: 'No valid calendar found / 未找到有效日历', calendars: [] };

  } catch (err) { 
      return { success: false, error: err.message }; 
  }
}

/**
 * Sync a single event to iCloud / 同步单个事件到 iCloud
 * Origin: background.js -> handleSyncEvent / 来源：原 background.js -> handleSyncEvent
 */
export async function handleSyncEvent(event, config) {
  try {
    const cache = await safeStorage.get(['iCloud_SyncFullUrl']);
    const auth = btoa(`${config.appleId}:${config.appPassword}`);
    
    // Generate unique ID / 生成唯一 ID
    const uid = crypto.randomUUID();
    const start = new Date(event.startTime);
    // Calculate end time / 计算结束时间
    const end = new Date(start.getTime() + (event.durationMinutes || 60) * 60000);
    
    // Format time to iCal format (UTC) / 格式化时间为 iCal 格式 (UTC)
    const formatDate = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    
    // Important: Explicitly declare PRODID to facilitate identifying the source device later / 重点：显式声明 PRODID，方便后续回显设备来源
    // Build ICS file content / 构建 ICS 文件内容
    const ics = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//WeCal Sync//ZH',
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatDate(new Date())}`,
        `SUMMARY:${event.title}`,
        `DTSTART:${formatDate(start)}`,
        `DTEND:${formatDate(end)}`,
        `LOCATION:${event.location || ''}`,
        'X-WECAL-SOURCE:CHROME_EXTENSION',
        'END:VEVENT',
        'END:VCALENDAR'
    ].join('\r\n');
    
    // Send PUT request / 发送 PUT 请求
    const res = await fetch(`${cache.iCloud_SyncFullUrl}${uid}.ics`, { 
        method: 'PUT',
        headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'text/calendar' },
        body: ics 
    });
    
    return res.ok ? { success: true, uid } : { success: false, error: 'Write failed / 写入失败' };
  } catch (err) { 
      return { success: false, error: err.message }; 
  }
}