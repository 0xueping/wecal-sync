/**
 * WeCal Sync - Settings Feature
 * 职责：管理应用参数配置（AI 服务、提醒偏好等）
 * 
 * 变更说明（v1.5.2）：
 * - 默认使用智谱 AI glm-4-flash（免费模型，无需付费）
 * - 支持任何兼容 OpenAI API 格式的服务商
 * - 添加了帮助悬浮窗引导用户获取 API Key
 */

import { safeStorage } from '../../common/storage.js';

export async function init(params, router) {
    const aiBaseUrlInput = document.getElementById('aiBaseUrl');
    const aiModelInput = document.getElementById('aiModel');
    const aiKeyInput = document.getElementById('aiKey');
    const saveBtn = document.getElementById('saveSettingsBtn');
    const statusMsg = document.getElementById('settingsStatus');

    let fullAiKey = '';

    // 遮罩显示 Key（只显示后4位）
    const maskKey = (key) => (!key || key.length < 4) ? key : `****-****-${key.slice(-4)}`;

    // 1. 回显已有配置（无配置时填入默认值）
    const saved = await safeStorage.get(['aiBaseUrl', 'aiModel', 'aiKey', 'alertTimes']);
    
    if (saved.aiBaseUrl) {
        aiBaseUrlInput.value = saved.aiBaseUrl;
    } else {
        aiBaseUrlInput.value = 'https://open.bigmodel.cn/api/paas/v4';
    }
    
    if (saved.aiModel) {
        aiModelInput.value = saved.aiModel;
    } else {
        aiModelInput.value = 'glm-4-flash';
    }

    if (saved.aiKey) {
        fullAiKey = saved.aiKey;
        aiKeyInput.value = maskKey(fullAiKey);
    }

    // 2. 焦点事件：显示明文 / 离开遮罩
    aiKeyInput.addEventListener('focus', () => {
        aiKeyInput.value = fullAiKey;
    });
    aiKeyInput.addEventListener('blur', () => {
        const val = aiKeyInput.value.trim();
        if (val && !val.startsWith('****')) {
            fullAiKey = val;
        }
        aiKeyInput.value = maskKey(fullAiKey);
    });

    // 3. 回显提醒时间配置
    if (saved.alertTimes) {
        const times = saved.alertTimes;
        ['30', '15', '5', '0'].forEach(t => {
            const cb = document.getElementById(`alert-${t}`);
            if (cb) cb.checked = times.includes(parseInt(t));
        });
    }

    // 4. 取消返回
    document.getElementById('cancelSettingsBtn').addEventListener('click', () => {
        router.load('today', 'today-view');
    });

    // 5. 保存
    saveBtn.addEventListener('click', async () => {
        // 如果输入框当前是遮罩状态且内容是掩码，说明用户没改
        if (aiKeyInput.value.startsWith('****')) {
            // 保持原值不变
        } else {
            const val = aiKeyInput.value.trim();
            if (val) fullAiKey = val;
        }

        // 收集提醒时间
        const alertTimes = [];
        ['30', '15', '5', '0'].forEach(t => {
            const cb = document.getElementById(`alert-${t}`);
            if (cb && cb.checked) alertTimes.push(parseInt(t));
        });

        // 写入存储
        await safeStorage.set({
            aiBaseUrl: aiBaseUrlInput.value.trim(),
            aiModel: aiModelInput.value.trim(),
            aiKey: fullAiKey,
            alertTimes: alertTimes
        });

        // Show success / 显示成功
        statusMsg.innerText = '✅ ' + chrome.i18n.getMessage('settingsSaved') || 'Settings saved';
        statusMsg.className = 'text-center text-xs font-medium py-1 text-green-600';

        // 3 秒后返回今日视图
        setTimeout(() => {
            router.load('today', 'today-view');
        }, 3000);
    });
}
