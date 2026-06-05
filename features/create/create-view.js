/**
 * WeCal Sync - Create Event Feature
 * 职责：处理表单输入，调用 AI 模块，提交日程
 * 
 * 变更说明（v1.5.2）：
 * - AI Provider 配置已移至 features/settings/ 中统一管理
 * - 支持任何兼容 OpenAI API 格式的服务商
 * - 本页面通过 chrome.storage.local 读取配置
 */

import { safeStorage } from '../../common/storage.js';
import { parseWithAI } from './ai-handler.js';

export async function init(params, router) {
    const rawTextarea = document.getElementById('raw-event-text');
    const recognizeBtn = document.getElementById('recognizeBtn');
    const submissionStatus = document.getElementById('submissionStatus');
    
    const eventInputs = {
        title: document.getElementById('event-title'),
        start: document.getElementById('event-start'),
        end: document.getElementById('event-end'),
        location: document.getElementById('event-location')
    };

    // 从存储中读取 AI Provider 配置
    let aiConfig = { baseUrl: '', model: '', key: '' };
    const saved = await safeStorage.get(['aiBaseUrl', 'aiModel', 'aiKey']);
    if (saved.aiBaseUrl) aiConfig.baseUrl = saved.aiBaseUrl;
    if (saved.aiModel) aiConfig.model = saved.aiModel;
    if (saved.aiKey) aiConfig.key = saved.aiKey;

    // 1. 设置表单默认时间
    function setFormDefaults() {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const start = new Date(Math.ceil(now.getTime() / 600000) * 600000);
        const end = new Date(start.getTime() + 3600000);
        const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        
        eventInputs.start.value = fmt(start);
        eventInputs.end.value = fmt(end);
        eventInputs.title.value = ""; 
        eventInputs.location.value = ""; 
        if (!params || !params.initialText) {
            rawTextarea.value = ""; 
        }
    }
    setFormDefaults();

    // --- AI 识别逻辑 ---
    async function executeAiAnalysis(textOverride = null) {
        let text = '';
        if (typeof textOverride === 'string' && textOverride.length > 0) {
            text = textOverride;
        } else {
            text = rawTextarea.value.trim();
        }

        console.log('[CreateView] 准备识别文本:', text);
        if (!text) return;
        
        // 检查是否已配置 AI 服务
        if (!aiConfig.key) {
            alert(chrome.i18n.getMessage('aiNotConfiguredAlert'));
            return;
        }
        
        recognizeBtn.disabled = true; 
        recognizeBtn.innerText = chrome.i18n.getMessage('recognizing');
        
        // 传入完整的 AI 配置
        const parsed = await parseWithAI(text, aiConfig.key, {
            baseUrl: aiConfig.baseUrl,
            model: aiConfig.model
        });
        
        if (parsed) {
            console.log('[CreateView] 识别成功:', parsed);
            if (parsed.title) eventInputs.title.value = parsed.title;
            if (parsed.start) eventInputs.start.value = parsed.start;
            if (parsed.end) eventInputs.end.value = parsed.end;
            if (parsed.location) eventInputs.location.value = parsed.location;
        } else {
            console.warn('[CreateView] 识别返回空或失败');
            if (!textOverride) {
                alert(chrome.i18n.getMessage('aiParseFailed'));
            }
        }
        
        recognizeBtn.innerText = chrome.i18n.getMessage('smartRecognize'); 
        recognizeBtn.disabled = false;
    }

    // 2. AI 识别按钮
    recognizeBtn.addEventListener('click', () => executeAiAnalysis());

    // 3. 处理右键菜单传入的初始文本
    if (params && params.initialText) {
        console.log('[CreateView] 接收到外部传入文本:', params.initialText);
        rawTextarea.value = params.initialText;

        if (aiConfig.key) {
            setTimeout(() => {
                executeAiAnalysis(params.initialText);
            }, 300);
        } else {
            setTimeout(() => {
                alert(chrome.i18n.getMessage('aiNotConfiguredAuto'));
            }, 300);
        }
    }

    // 4. "前往设置"链接
    const goSettingsHint = document.getElementById('gotoSettingsHint');
    if (goSettingsHint) {
        goSettingsHint.addEventListener('click', () => {
            router.load('settings', 'settings-view');
        });
    }

    // 5. 取消按钮
    document.getElementById('cancelCreateBtn').addEventListener('click', () => {
        router.load('today', 'today-view');
    });

    // 6. 提交按钮
    document.getElementById('submitEventBtn').addEventListener('click', async () => {
        const submitBtn = document.getElementById('submitEventBtn');
        submitBtn.disabled = true;
        submitBtn.innerText = chrome.i18n.getMessage('submitting');
        submissionStatus.classList.add('hidden');

        const newEvent = { 
            title: eventInputs.title.value || chrome.i18n.getMessage('noTitle'), 
            startTime: new Date(eventInputs.start.value).toISOString(), 
            durationMinutes: Math.round((new Date(eventInputs.end.value) - new Date(eventInputs.start.value))/60000), 
            location: eventInputs.location.value 
        };

        const cfg = await safeStorage.get(['serverUrl', 'appleId', 'appPassword', 'calendarName']);
        
        chrome.runtime.sendMessage({ type: 'SYNC_EVENT', event: newEvent, config: cfg }, (r) => {
            if (r && r.success) {
                router.load('confirm', 'confirm-view', {
                    event: newEvent,
                    startStr: eventInputs.start.value.replace('T', ' '),
                    endStr: eventInputs.end.value.replace('T', ' ')
                });
            } else {
                submitBtn.disabled = false;
                submitBtn.innerText = chrome.i18n.getMessage('add');
                submissionStatus.innerText = `❌ ${chrome.i18n.getMessage('syncFailed')}: ${r.error}`;
                submissionStatus.classList.remove('hidden');
            }
        });
    });
}
