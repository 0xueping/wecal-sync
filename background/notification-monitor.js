/**
 * WeCal Sync - Notification Monitor
 * Responsibilities: Check cached schedule data, determine if reminder conditions are met, and trigger popups / 职责：检查缓存的日程，判断是否满足提醒条件，并触发弹窗
 * Origin: Original processNotifications, triggerStrongAlert, ensureOffscreenDocument from background.js / 来源：原 background.js 中 processNotifications, triggerStrongAlert, ensureOffscreenDocument
 */

import { safeStorage } from '../common/storage.js';
import { parseIcalDate } from '../common/date-utils.js';

/**
 * Process notification logic / 处理通知逻辑
 * Origin: background.js -> processNotifications / 来源：原 background.js -> processNotifications
 * Change: Added eventsList parameter because after modularization, cachedEvents in sync-engine is not directly accessible / 变动：增加了 eventsList 参数，因为模块化后无法直接访问 sync-engine 中的 cachedEvents 变量
 */
export async function processNotifications(eventsList) {
    if (!eventsList || eventsList.length === 0) return;

    const now = new Date();
    // Get notified records to prevent duplicate popups / 获取已通知记录，防止重复弹窗
    const { notified = {} } = await safeStorage.get(['notified']);
    
    for (const event of eventsList) {
        const startTime = parseIcalDate(event.dtstart);
        if (!startTime) continue;
        
        // Calculate minutes until start / 计算距离开始还有多少分钟
        const diffMins = Math.floor((startTime - now) / 60000);
        
        // Define reminder time points: at start (0), 5min before, 15min before, 30min before / 定义提醒时间点：开始时(0)，前5分钟，前15分钟，前30分钟
        const checkPoints = [0, 5, 15, 30];
        
        if (checkPoints.includes(diffMins)) {
            // Generate unique notification key: UID + time point / 生成唯一通知 Key: UID + 时间点
            const notifyKey = `${event.uid}_${diffMins}`;
            if (notified[notifyKey]) continue; // Skip if already notified / 如果已通知过，跳过
            
            // Trigger strong alert / 触发强提醒
            triggerStrongAlert(event, diffMins);
            
            // Mark as notified / 标记为已通知
            notified[notifyKey] = true;
            await safeStorage.set({ notified });
        }
    }
}

/**
 * Trigger strong popup alert and sound / 触发强力弹窗和声音
 * Origin: background.js -> triggerStrongAlert / 来源：原 background.js -> triggerStrongAlert
 */
async function triggerStrongAlert(event, mins) {
    const startTime = parseIcalDate(event.dtstart);
    const endTime = parseIcalDate(event.dtend);
    
    // Format display time / 格式化显示时间
    const timeStr = startTime ? startTime.toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'}) : '--:--';
    let duration = startTime && endTime ? Math.round((endTime - startTime) / 60000) : '--';
    
    // Ensure audio playback environment is ready / 确保声音播放环境就绪
    await ensureOffscreenDocument();
    
    // Send message to Offscreen document to play sound / 发送消息给 Offscreen 文档播放声音
    chrome.runtime.sendMessage({ target: 'offscreen', type: 'PLAY_BEEP' });
    
    // Build popup URL parameters / 构建弹窗 URL 参数
    const query = new URLSearchParams({ 
        title: event.summary || 'No title / 无标题日程', 
        start: timeStr, 
        duration: duration.toString(), 
        location: event.location || 'Not specified / 未标注', 
        mins: mins.toString() 
    }).toString();
    
    // Get primary display info and calculate centered position / 获取主显示器信息，计算居中位置
    chrome.system.display.getInfo((displays) => {
        const primary = displays.find(d => d.isPrimary) || displays[0];
        // Create standalone Popup window / 创建独立的 Popup 窗口
        // Updated: Pointing to new notification directory / 更新：指向新的 notification 目录
        chrome.windows.create({ 
            url: `features/notification/alert.html?${query}`,
            type: 'popup',
            width: 420,
            height: 540,
            left: Math.round(primary.workArea.left + (primary.workArea.width - 420) / 2),
            top: Math.round(primary.workArea.top + (primary.workArea.height - 540) / 2),
            focused: true
        });
    });
}

/**
 * Ensure Offscreen document exists (for playing audio) / 确保 Offscreen 文档存在（用于播放音频）
 * Origin: background.js -> ensureOffscreenDocument / 来源：原 background.js -> ensureOffscreenDocument
 */
async function ensureOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) return;
  // Updated: Path points to features/notification/offscreen.html / 更新：路径指向 features/notification/offscreen.html
  await chrome.offscreen.createDocument({ 
      url: 'features/notification/offscreen.html', 
      reasons: ['AUDIO_PLAYBACK'],
      justification: 'Play schedule reminder alert sound / 播放日程提醒告警音' 
  });
}