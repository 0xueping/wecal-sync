/**
 * WeCal Sync - Today Feature
 * 职责：展示今日/明日日程，处理导航跳转
 */

import { truncateUrl } from '../../common/text-utils.js';

export async function init(params, router) {
    const dateHeader = document.getElementById('current-date-header');
    const todayList = document.getElementById('today-list');
    const tomorrowList = document.getElementById('tomorrow-list');
    const dayAfterTomorrowList = document.getElementById('dayAfterTomorrow-list');
    const viewSyncStatus = document.getElementById('viewSyncStatus');

    // 1. 渲染日期头
    const now = new Date();
    const days = [chrome.i18n.getMessage('dayFullSun'), chrome.i18n.getMessage('dayFullMon'), chrome.i18n.getMessage('dayFullTue'), chrome.i18n.getMessage('dayFullWed'), chrome.i18n.getMessage('dayFullThu'), chrome.i18n.getMessage('dayFullFri'), chrome.i18n.getMessage('dayFullSat')];
    dateHeader.innerText = `${now.getMonth() + 1}月${now.getDate()}日 ${days[now.getDay()]}`;

    // 2. 渲染列表函数
    function renderList(container, events) {
        if (!events || !Array.isArray(events) || events.length === 0) { 
            container.innerHTML = `<div class="text-center py-6 text-gray-400 text-xs italic">${chrome.i18n.getMessage('noEvents')}</div>`; 
            return; 
        }
        container.innerHTML = '';
        events.forEach(ev => {
            const item = document.createElement('div');
            item.className = `event-item ${ev.isPast ? 'is-past' : ''}`;
            
            let sourceIcon = '🌐';
            let sourceDevice = chrome.i18n.getMessage('icloudWeb');
            const prodid = (ev.prodid || '').toLowerCase();
            if (prodid.includes('iphone')) { sourceIcon = '📱'; sourceDevice = 'iPhone'; }
            else if (prodid.includes('mac os x')) { sourceIcon = '💻'; sourceDevice = 'Mac'; }
            else if (prodid.includes('wecal')) { sourceIcon = '🌐'; sourceDevice = chrome.i18n.getMessage('wecalSync'); }
            
            // 修改说明：
            // 1. 始终渲染 .location-col-positioned，不再判断 ev.location 是否存在
            // 2. 如果没有 ev.location，truncateUrl 返回空字符，界面上只显示一个 📍 图标
            item.innerHTML = `
                <div class="event-dot" style="background-color: ${ev.color || '#3b82f6'}"></div>
                
                <div class="source-icon-container">
                    <span class="source-icon">${sourceIcon}</span>
                    <div class="event-tooltip">
                        <div class="tooltip-row">
                            <span class="tooltip-label">${chrome.i18n.getMessage('deviceLabel')}</span>
                            <span class="tooltip-value">${sourceDevice}</span>
                        </div>
                        <div class="tooltip-row">
                            <span class="tooltip-label">${chrome.i18n.getMessage('eventCreated')}</span>
                            <span class="tooltip-value">${ev.createdFormatted || chrome.i18n.getMessage('unknown')}</span>
                        </div>
                        <div class="tooltip-row">
                            <span class="tooltip-label">${chrome.i18n.getMessage('icloudEventId')}</span>
                            <span class="tooltip-value">${ev.uid || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                <div class="flex flex-col flex-grow min-w-0 pr-8 justify-center h-full">
                    <!-- 第一行：标题 -->
                    <div class="text-[14px] font-bold text-gray-800 truncate event-title mb-1">${ev.summary || chrome.i18n.getMessage('noTitle')}</div>
                    
                    <!-- 第二行：时间和地点 (使用 relative 定位) -->
                    <div class="relative flex items-center text-[11px] text-gray-400 h-5">
                        <!-- 时间部分：左侧固定 -->
                        <div class="time-col-fixed text-gray-500">
                            <span class="mr-1 opacity-70">⏰</span>
                            <span>${ev.timeStr || '--:--'}</span>
                        </div>
                        
                        <!-- 地点部分：绝对定位到右侧，始终显示图标，实现纵向对齐 -->
                        <div class="location-col-positioned">
                            <span class="mr-1 opacity-70 flex-shrink-0">📍</span>
                            <span class="truncate text-gray-500" title="${ev.location || ''}">${truncateUrl(ev.location)}</span>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(item);
        });
    }

    // 3. 拉取数据逻辑
    async function fetchAndRenderEvents(force = false) {
        viewSyncStatus.innerText = chrome.i18n.getMessage('syncing');
        chrome.runtime.sendMessage({ type: 'GET_SCHEDULE', force }, (r) => {
            if (r && r.success) { 
                renderList(todayList, r.today); 
                renderList(tomorrowList, r.tomorrow); 
                renderList(dayAfterTomorrowList, r.dayAfterTomorrow); 
                viewSyncStatus.innerText = `${chrome.i18n.getMessage('lastSync')}: ${new Date().toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'})}`; 
            } else {
                viewSyncStatus.innerText = chrome.i18n.getMessage('syncFailed');
            }
        });
    }

    // 4. 绑定折叠逻辑
    ['today', 'tomorrow', 'dayAfterTomorrow'].forEach(id => {
        const h = document.getElementById(`${id}-collapsible`);
        if (h) h.addEventListener('click', () => {
            const l = document.getElementById(`${id}-list`); 
            if (l) l.classList.toggle('hidden');
            const s = h.querySelector('svg'); 
            if (s) s.classList.toggle('rotate-180');
        });
    });

    // 5. 绑定导航按钮
    document.getElementById('toConfigBtn').addEventListener('click', () => {
        router.load('config', 'config-view');
    });

    document.getElementById('toSettingsBtn').addEventListener('click', () => {
        router.load('settings', 'settings-view');
    });

    document.getElementById('toCreateEventBtn').addEventListener('click', () => {
        router.load('create', 'create-view');
    });

    document.getElementById('syncNowBtn').addEventListener('click', () => {
        fetchAndRenderEvents(true);
    });

    // 打开月视图（新标签页）
    document.getElementById('openMonthView').addEventListener('click', () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('features/month/month-view.html') });
    });

    // 初始化时加载一次数据
    fetchAndRenderEvents();
}