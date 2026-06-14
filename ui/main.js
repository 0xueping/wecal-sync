
/**
 * WeCal Sync - Main UI Entry / 主界面入口
 * Responsibility: Entry logic replacing original index.js, determines which page to display based on config state
 * 职责：根据配置状态决定显示哪个页面
 */

import { safeStorage } from '../common/storage.js';
import { ViewRouter } from './view-router.js';

// Initialize application / 初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    // 1. First check if there's pending "right-click create event" data (cold start logic)
    //    优先检查是否有"右键创建日程"的待处理数据 (冷启动逻辑)
    const pendingData = await safeStorage.get(['pendingCreateText']);
    
    if (pendingData.pendingCreateText) {
        // Immediately clear stored text to prevent duplicate triggers on next open
        //    立即清除 Storage 中的暂存文本，防止下次打开重复触发
        await safeStorage.set({ pendingCreateText: '' });
        
        // Jump directly to create page with initial text
        //    直接跳转到创建页，并带上初始文本
        await ViewRouter.load('create', 'create-view', { initialText: pendingData.pendingCreateText });
        return; // End logic, skip config check / 结束后续逻辑，不再检查配置
    }

    // 2. Normal flow: read config state
    //    常规流程：读取配置状态
    const config = await safeStorage.get(['serverUrl', 'appleId', 'appPassword', 'calendarName', 'isConfigured']);

    // 3. Route decision / 路由判断
    if (config.isConfigured) {
        // If configured, go to today view / 如果已配置，跳转到今日视图
        await ViewRouter.load('today', 'today-view');
    } else {
        // If not configured, go to config page / 如果未配置，跳转到配置页
        await ViewRouter.load('config', 'config-view');
    }

    // 4. Fix chat input placeholder (__MSG_* in index.html is not processed by replaceI18n)
    const chatInput = document.getElementById('chat-input-field');
    if (chatInput) {
        chatInput.placeholder = chrome.i18n.getMessage('chatHint') || '用自然语言描述日程...';
    }
});

// Listen for global messages (handle hot navigation)
//    监听全局消息 (处理热跳转逻辑)
// When side panel is already open, Background sends this message
chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'NAVIGATE_TO_CREATE') {
        // Received message, force navigate to create page
        //    收到消息，强制跳转到创建页
        ViewRouter.load('create', 'create-view', { initialText: message.text });
    }
});
