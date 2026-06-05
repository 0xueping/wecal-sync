/**
 * WeCal Sync - Context Menu Feature
 * Responsibilities: Create browser right-click menu, handle "Add Event" click events, and open side panel UI / 职责：负责创建浏览器右键菜单，处理"添加日程"的点击事件，并唤醒侧边栏 UI
 * 
 * Refactoring notes (优化说明):
 * 1. Restored standard MENU_ID. / 恢复了标准的 MENU_ID。
 * 2. Removed redundant logic that forced menu creation on every Service Worker startup. / 移除了每次 Service Worker 启动都强制创建菜单的冗余逻辑。
 * 3. Strictly follows Chrome lifecycle, only creates menu on onInstalled (install/update). / 严格遵守 Chrome 生命周期，只在 onInstalled (安装/更新) 时创建菜单。
 * 4. [Fix] sidePanel.open must be called first in the click event to avoid losing "user gesture" due to await on other async operations. / [修复] sidePanel.open 必须在点击事件中优先执行，避免因 await 其他异步操作导致"用户手势"失效。
 */

import { safeStorage } from '../../common/storage.js';

// Define the unique menu identifier / 定义菜单的唯一标识符
const MENU_ID = 'wecal-sync-add-event';

/**
 * Menu click event handler / 菜单点击事件处理函数
 * Triggered when user clicks "Add event to WeCal" in the right-click menu / 当用户在右键菜单中点击"添加日程到 WeCal"时触发
 */
async function onMenuClicked(info, tab) {
    // 1. Confirm it's our menu item and text is selected / 确认点击的是我们的菜单项，且确实选中了文本
    if (info.menuItemId === MENU_ID && info.selectionText) {
        // Get selected text and trim whitespace / 获取选中的文本，并去除首尾空格
        const text = info.selectionText.trim();
        console.log('[ContextMenu] ' + chrome.i18n.getMessage('contextMenuTextSelected') + ':', text);

        // --- Critical fix start / 关键修复开始 ---
        // Chrome limitation: sidePanel.open() must be called directly within a user gesture.
        // Chrome 限制：sidePanel.open() 必须在用户手势（User Gesture）中直接调用。
        // If we await safeStorage.set(...) first, the browser considers the click event finished,
        // 如果先 await safeStorage.set(...)，浏览器会认为"点击事件"已经结束了，
        // and blocks open(), throwing an error.
        // 从而拦截 open() 调用并报错。
        // So we must open the side panel first, then save data.
        // 所以，我们必须先把侧边栏打开，再慢慢存数据。
        
        if (tab && tab.windowId) {
            try {
                // Check if browser version supports sidePanel API / 检查浏览器版本是否支持 sidePanel API
                if (chrome.sidePanel && chrome.sidePanel.open) {
                    // Don't await here, or let it run in parallel to keep the call stack close to the click event
                    // 这里不加 await，或者让它并行执行，确保调用栈紧跟点击事件
                    // But for code clarity, we trigger open first and catch errors
                    // 但为了代码逻辑清晰，我们这里先触发打开，如果有错 catch 住
                    chrome.sidePanel.open({ windowId: tab.windowId }).catch(e => {
                        console.error(chrome.i18n.getMessage('contextMenuSidePanelError') + ':', e);
                    });
                }
            } catch (e) {
                console.error(chrome.i18n.getMessage('contextMenuSidePanelApiError') + ':', e);
            }
        }
        // --- Critical fix end / 关键修复结束 ---

        // 2. Save text to Storage / 将文本存入 Storage
        // When the side panel opens (or refreshes), it can read pendingCreateText and auto-fill
        // 这样当侧边栏打开时（或者刷新时），可以读取这个 pendingCreateText 并自动填充
        await safeStorage.set({ pendingCreateText: text });

        // 3. Send message to notify UI layer / 发送消息通知 UI 层
        // If the side panel is already open, it won't reload, so send a message to tell it "new data arrived"
        // 如果侧边栏已经是打开状态，它不会重新加载，所以需要发消息告诉它"有新数据来了"
        // 500ms delay gives the side panel time to start/render (if it was just opened)
        // 延时 500ms 是为了给侧边栏一点启动/渲染的时间 (如果它刚被打开)
        setTimeout(() => {
            chrome.runtime.sendMessage({ 
                type: 'NAVIGATE_TO_CREATE', 
                text: text 
            }).catch(() => { 
                // If the side panel hasn't fully started, the message may fail — this is normal, just ignore
                // 如果侧边栏还没完全启动，消息发送可能会失败，这是正常的，直接忽略即可
                // Because Step 2 already saved to Storage, the side panel will read it on startup
                // 因为上面的 Step 2 已经存入了 Storage，侧边栏启动后会自己去读
            });
        }, 500);
    }
}

/**
 * Initialize context menu module / 初始化右键菜单模块
 * Called by background.js / 被 background.js 调用
 */
export function initContextMenu() {
    // 1. Safety check: ensure chrome.contextMenus API is available / 安全检查：确保 chrome.contextMenus API 可用
    if (typeof chrome === 'undefined' || !chrome.contextMenus) {
        return;
    }

    // 2. Register click listener / 注册点击监听器
    // Note: The listener must be registered on every Service Worker startup to respond to clicks
    // 注意：监听器必须在每次 Service Worker 启动时都注册，否则无法响应点击
    if (chrome.contextMenus.onClicked.hasListener(onMenuClicked)) {
        chrome.contextMenus.onClicked.removeListener(onMenuClicked);
    }
    chrome.contextMenus.onClicked.addListener(onMenuClicked);

    // 3. Create menu item (only executes once on install/update) / 创建菜单项 (仅在安装或更新插件时执行一次)
    chrome.runtime.onInstalled.addListener(() => {
        chrome.contextMenus.create({
            id: MENU_ID,
            title: chrome.i18n.getMessage('contextMenuCreate'), // Menu display text / 菜单显示的文字
            contexts: ['selection']    // Only show this menu when user selects text / 只有当用户"选中文字"时才显示此菜单
        }, () => {
            if (chrome.runtime.lastError) {
                console.log(chrome.i18n.getMessage('contextMenuExists'));
            } else {
                console.log(chrome.i18n.getMessage('contextMenuCreated'));
            }
        });
    });
}