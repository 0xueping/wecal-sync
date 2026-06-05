
/**
 * WeCal Sync - Config Feature
 * 职责：分步引导用户完成 Apple 日历配置
 */

import { safeStorage } from '../../common/storage.js';

export async function init(params, router) {
    const serverUrl = document.getElementById('serverUrl');
    const appleId = document.getElementById('appleId');
    const appPassword = document.getElementById('appPassword');
    
    // 新增/重命名的元素
    const calendarSection = document.getElementById('calendar-selection-section');
    const calendarSelect = document.getElementById('calendarSelect');
    const actionBtn = document.getElementById('actionBtn'); // 原 saveBtn
    const configStatusMsg = document.getElementById('configStatusMsg');

    // 状态标记
    let isVerified = false;
    // 数据缓存：存储后台返回的日历对象列表 [{name, url}, ...]
    let fetchedCalendars = [];

    // 1. 回显已有配置 (只回显账号密码，日历需要重新验证获取)
    const config = await safeStorage.get(['serverUrl', 'appleId', 'appPassword']);
    if (config.serverUrl) serverUrl.value = config.serverUrl;
    if (config.appleId) appleId.value = config.appleId;
    if (config.appPassword) appPassword.value = config.appPassword;

    // 辅助函数：设置底部提示
    function setStatus(msg, isError = false) {
        configStatusMsg.innerText = msg;
        // 如果是绿色成功提示，使用 text-green-600 (需依赖 Tailwind 默认色板或 global.css)
        if (msg.includes(chrome.i18n.getMessage('calendarSyncSuccess')) || msg.includes(chrome.i18n.getMessage('saveConfig'))) {
            configStatusMsg.className = 'text-center text-xs font-medium py-1 text-green-600';
        } else {
            configStatusMsg.className = `text-center text-xs font-medium py-1 ${isError ? 'text-red-500' : 'text-gray-400'}`;
        }
    }

    // 2. 核心按钮逻辑
    actionBtn.addEventListener('click', async () => {
        // 阶段一：验证账号 & 获取列表
        if (!isVerified) {
            const currentConfig = { 
                serverUrl: serverUrl.value, 
                appleId: appleId.value, 
                appPassword: appPassword.value 
            };
            
            if (!currentConfig.appleId || !currentConfig.appPassword) {
                setStatus(chrome.i18n.getMessage('pleaseFillCredentials'), true);
                return;
            }

            // UI Loading
            actionBtn.disabled = true;
            actionBtn.innerText = chrome.i18n.getMessage('verifying');
            setStatus(chrome.i18n.getMessage('fetchingCalendars'));

            // 调用 Background 测试连接
            // 修复：增加 chrome.runtime.lastError 检查，防止后台未响应时静默失败
            chrome.runtime.sendMessage({ type: 'TEST_ICLOUD', config: currentConfig }, (r) => {
                // 检查通信错误
                if (chrome.runtime.lastError) {
                    actionBtn.disabled = false;
                    actionBtn.innerText = chrome.i18n.getMessage('verifyAccount');
                    console.error('[Config] 通信错误:', chrome.runtime.lastError);
                    setStatus(chrome.i18n.getMessage('backgroundNotResponding'), true);
                    return;
                }

                actionBtn.disabled = false;
                
                // 修复：增加对 r 的空值防御，防止 crash
                if (r && r.success) {
                    // --- 验证成功 ---
                    isVerified = true;
                    // 缓存完整的日历对象列表
                    fetchedCalendars = r.calendars || [];
                    
                    // 1. 填充下拉框
                    calendarSelect.innerHTML = `<option value="" disabled selected>${chrome.i18n.getMessage('selectCalendarHint')}</option>`;
                    fetchedCalendars.forEach(cal => { 
                        const o = document.createElement('option'); 
                        // 这里 value 使用日历名称，后续保存时再查 URL
                        o.value = cal.name; 
                        o.innerText = cal.name;
                        calendarSelect.appendChild(o); 
                    });

                    // 2. 显示日历选区
                    calendarSection.classList.remove('hidden');
                    
                    // 3. 按钮变更为"保存配置"但置灰
                    actionBtn.innerText = chrome.i18n.getMessage('saveConfig');
                    // 关键修改：保留 btn-primary 类，确保样式不塌陷，只叠加灰色样式
                    actionBtn.classList.add('btn-disabled'); 
                    
                    // 4. 更新提示
                    setStatus(chrome.i18n.getMessage('calendarFetchSuccess'));
                } else {
                    // --- 验证失败 ---
                    actionBtn.innerText = chrome.i18n.getMessage('verifyAccount');
                    // 安全读取错误信息
                    const errMsg = (r && r.error) ? r.error : chrome.i18n.getMessage('unknownError');
                    setStatus(`❌ ${chrome.i18n.getMessage('verifyAccount')}: ${errMsg}`, true);
                }
            });
            return;
        }

        // 阶段三：保存配置
        if (isVerified) {
            const selectedCalendarName = calendarSelect.value;
            // 理论上 btn-disabled 会阻止点击，这里再做一层保险
            if (!selectedCalendarName) return; 

            // 查找选中日历对应的完整 URL
            const targetCal = fetchedCalendars.find(c => c.name === selectedCalendarName);
            
            const newConfig = { 
                serverUrl: serverUrl.value, 
                appleId: appleId.value, 
                appPassword: appPassword.value, 
                calendarName: selectedCalendarName, 
                isConfigured: true 
            };

            // 核心修复：如果找到了对应的 URL，显式保存到 iCloud_SyncFullUrl
            if (targetCal && targetCal.url) {
                newConfig.iCloud_SyncFullUrl = targetCal.url;
            }

            // UI 锁定：不改变文字，只变灰禁止点击
            actionBtn.classList.add('btn-disabled'); 
            
            // 写入存储
            await safeStorage.set(newConfig);

            // 核心修复：保存配置后，立即通知后台强制刷新日历数据
            // 这会清除内存中可能残留的旧日历缓存，并使用新的 URL 拉取数据
            chrome.runtime.sendMessage({ type: 'GET_SCHEDULE', force: true });
            
            // 提示成功
            setStatus(chrome.i18n.getMessage('calendarSyncSuccess'));
            
            // 倒计时 6 秒后跳转
            setTimeout(() => {
                router.load('today', 'today-view');
            }, 6000);
        }
    });

    // 阶段二：监听下拉框选择 (激活保存按钮)
    calendarSelect.addEventListener('change', () => {
        if (calendarSelect.value) {
            // 用户已选择，激活按钮
            actionBtn.classList.remove('btn-disabled');
            // 关键修改：一旦选择，清除下方的提示文字
            setStatus('');
        }
    });
}
