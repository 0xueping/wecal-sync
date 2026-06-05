
/**
 * WeCal Sync - Background Service Worker Entry Point
 * Responsibilities: Initialize configuration, listen for Chrome events (Alarm, Message, SidePanel), route to specific business modules / 职责：初始化配置，监听 Chrome 事件 (Alarm, Message, SidePanel)，路由到具体的业务模块
 * Refactoring note: Logic code has been split into sub-modules in the same directory / 重构说明：逻辑代码已拆分至同目录下的子模块中
 */

import { safeStorage } from '../common/storage.js';
import { handleTestConnection, handleSyncEvent } from './caldav-client.js';
import { checkUpcomingEvents, getScheduleData } from './sync-engine.js';
// Import context menu module / 引入右键菜单模块
import { initContextMenu } from '../features/context-menu/context-menu.js';

// Initialize context menu listener / 初始化右键菜单监听
// Fix: Added try-catch block to prevent context-menu module errors from crashing Service Worker startup / 修复：增加 try-catch 块，防止 context-menu 模块内部报错导致 Service Worker 启动失败
try {
    initContextMenu();
} catch (e) {
    console.error('[Background] Context Menu Init Failed:', e);
}

// Set up SidePanel behavior / 设置 SidePanel 行为
if (typeof chrome !== 'undefined' && chrome.sidePanel) {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
}

// Create periodic sync task (every 1 minute) / 创建定时同步任务 (1分钟一次)
if (typeof chrome !== 'undefined' && chrome.alarms) {
  chrome.alarms.create('checkCalendar', { periodInMinutes: 1 });
}

// Listen for alarm events / 监听定时任务
if (typeof chrome !== 'undefined' && chrome.alarms) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    // Route to sync-engine / 路由到 sync-engine
    if (alarm.name === 'checkCalendar') checkUpcomingEvents();
  });
}

// Message listener (routing center) / 消息监听器 (路由中心)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  
  // 1. Test iCloud connection / 测试 iCloud 连接
  if (message.type === 'TEST_ICLOUD') { 
    handleTestConnection(message.config).then((res) => {
        // If connection succeeds, trigger an immediate check / 如果连接成功，立即触发一次检查
        if (res.success) checkUpcomingEvents();
        sendResponse(res);
    }); 
    return true; // Keep message channel open / 保持消息通道开启
  }
  
  // 2. Sync new event / 同步新建日程
  if (message.type === 'SYNC_EVENT') { 
    handleSyncEvent(message.event, message.config).then(async (res) => {
        // After successful write, refresh the list immediately / 写入成功后，立即刷新列表
        await checkUpcomingEvents();
        sendResponse(res);
    }); 
    return true; 
  }
  
  // 3. Get schedule list (for UI rendering) / 获取日程列表 (供 UI 渲染)
  if (message.type === 'GET_SCHEDULE') { 
    (async () => {
        // Call sync-engine to get data / 调用 sync-engine 获取数据
        const data = await getScheduleData(message.force);
        sendResponse(data);
    })();
    return true; 
  }
});
