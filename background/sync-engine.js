/**
 * WeCal Sync - Sync Engine
 * Responsibilities: Manage schedule data fetching, caching, formatting, and periodic checking process / 职责：管理日程数据的获取、缓存、格式化以及定时检查流程
 * Origin: Original getScheduleData, checkUpcomingEvents (REPORT part) and cachedEvents state management from background.js / 来源：原 background.js 中 getScheduleData, checkUpcomingEvents (REPORT部分) 及 cachedEvents 状态管理
 */

import { safeStorage } from '../common/storage.js';
import { parseIcsFromXml } from '../common/xml-utils.js';
import { parseIcalDate, formatFullDate } from '../common/date-utils.js';
import { stringToColor } from '../common/text-utils.js';
import { processNotifications } from './notification-monitor.js';

// In-memory cache to reduce storage read frequency / 内存缓存，减少读取 storage 的频率
let cachedEvents = [];

/**
 * Check upcoming events (core polling function) / 检查即将到来的日程 (核心轮询函数)
 * Origin: background.js -> checkUpcomingEvents / 来源：原 background.js -> checkUpcomingEvents
 */
export async function checkUpcomingEvents() {
  const config = await safeStorage.get(['appleId', 'appPassword', 'iCloud_SyncFullUrl']);
  if (!config.iCloud_SyncFullUrl) return;

  try {
    const auth = btoa(`${config.appleId}:${config.appPassword}`);
    // Calculate query time range: today at midnight ~ next 72 hours / 计算查询时间范围：今天凌晨 ~ 未来72小时
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const timeStart = todayStart.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const timeEnd = new Date(Date.now() + 2678400000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    // Build REPORT request body / 构建 REPORT 请求体
    const body = `<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop><C:calendar-data /></D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${timeStart}" end="${timeEnd}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;

    // Send request / 发送请求
    const res = await fetch(config.iCloud_SyncFullUrl, {
      method: 'REPORT',
      headers: { 'Authorization': `Basic ${auth}`, 'Content-Type': 'text/xml; charset=utf-8', 'Depth': '1' },
      body: body
    });

    if (res.ok) {
      const xmlText = await res.text();
      // Parse data / 解析数据
      const events = parseIcsFromXml(xmlText);
      // Update in-memory cache / 更新内存缓存
      cachedEvents = events;
      // Update disk cache / 更新磁盘缓存
      await safeStorage.set({ cachedEventsDisk: events });
      
      // Call notification monitoring module (pass data to it) / 调用通知监控模块 (将数据传过去)
      processNotifications(cachedEvents);
      return true;
    }
    return false;
  } catch (err) { return false; }
}

/**
 * Get formatted schedule data (for UI display) / 获取经过整理的日程数据 (供 UI 显示)
 * Origin: background.js -> getScheduleData / 来源：原 background.js -> getScheduleData
 */
export async function getScheduleData(forceRefresh = false) {
    // If forced refresh or memory is empty, try to check once (checkUpcomingEvents is triggered externally or by initialization) / 如果强制刷新或内存为空，尝试检查一次 (这里的 checkUpcomingEvents 由外部触发或初始化触发)
    // Fix: Original logic was to check if cachedEvents is empty first, if so read from disk / 修正：原逻辑是先检查 cachedEvents 是否为空，如果为空读磁盘
    if (cachedEvents.length === 0) {
        const diskData = await safeStorage.get(['cachedEventsDisk']);
        if (diskData.cachedEventsDisk) cachedEvents = diskData.cachedEventsDisk;
    }
    
    // If forced refresh, call checkUpcomingEvents / 如果强制刷新，则调用 checkUpcomingEvents
    if (forceRefresh || cachedEvents.length === 0) {
        await checkUpcomingEvents();
    }

    const now = new Date();
    const todayStr = now.toLocaleDateString();
    const tomorrowStr = new Date(now.getTime() + 86400000).toLocaleDateString();
    const dayAfterTomorrowStr = new Date(now.getTime() + 172800000).toLocaleDateString();

    // Data processing function / 数据处理函数
    const process = (evs) => evs.map(e => {
        const start = parseIcalDate(e.dtstart);
        const end = parseIcalDate(e.dtend);
        // Check if expired / 判断是否过期
        const isPast = end ? (now > end) : (start ? (now > start) : false);

        let timeStr = '--:--';
        if (start) {
            const pad = (n) => String(n).padStart(2, '0');
            timeStr = `${pad(start.getHours())}:${pad(start.getMinutes())}`;
            if (end) timeStr += ` - ${pad(end.getHours())}:${pad(end.getMinutes())}`;
        }
        return { 
            ...e, 
            start, 
            isPast, 
            timeStr, 
            color: stringToColor(e.summary || 'Default'), // Use tool from common / 使用 common 中的工具
            createdFormatted: formatFullDate(e.created)   // Use tool from common / 使用 common 中的工具
        };
    }).sort((a, b) => (a.start || 0) - (b.start || 0));

    return { 
        success: true, 
        all: process(cachedEvents),
        today: process(cachedEvents.filter(e => parseIcalDate(e.dtstart)?.toLocaleDateString() === todayStr)),
        tomorrow: process(cachedEvents.filter(e => parseIcalDate(e.dtstart)?.toLocaleDateString() === tomorrowStr)),
        dayAfterTomorrow: process(cachedEvents.filter(e => parseIcalDate(e.dtstart)?.toLocaleDateString() === dayAfterTomorrowStr))
    };
}