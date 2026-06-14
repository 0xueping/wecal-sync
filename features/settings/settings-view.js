/**
 * WeCal Sync - Settings Feature
 * 职责：管理应用参数配置（AI 服务、提醒偏好等）
 * 
 * 变更说明（v1.5.2）：
 * - 默认使用智谱 AI glm-4.5-flash（免费模型，无需付费）
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
        aiModelInput.value = 'glm-4.5-flash';
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

    // 3. 反馈弹窗交互
    const modal = document.getElementById('feedbackModal');
    const openBtn = document.getElementById('feedbackOpenBtn');
    const closeBtn = document.getElementById('feedbackModalClose');
    const typeBug = document.getElementById('feedbackTypeBug');
    const typeSuggestion = document.getElementById('feedbackTypeSuggestion');
    const descInput = document.getElementById('feedbackFormDesc');
    const emailInput = document.getElementById('feedbackFormEmail');
    const attachLogs = document.getElementById('feedbackAttachLogs');
    const submitBtn = document.getElementById('feedbackFormSubmit');
    const formStatus = document.getElementById('feedbackFormStatus');
    const willingToPayCheckbox = document.getElementById('feedbackWillingToPay');
    const willingToPaySection = document.getElementById('feedbackWillingToPaySection');

    let feedbackType = 'bug';

    // 显式设置弹窗内所有多语言文本（不依赖 HTML 的 __MSG_*__ 替换）
    const setModalI18n = () => {
        const i18n = (key, fallback) => chrome.i18n.getMessage(key) || fallback;
        // 标题 & 描述
        const titleEl = modal.querySelector('div[style*="font-size:15px;font-weight:600"]');
        if (titleEl) titleEl.innerText = i18n('feedbackFormTitle', 'Report a Problem / Suggest a Feature');
        // 反馈类型标签
        const labels = modal.querySelectorAll('label');
        labels.forEach(el => {
            const text = el.textContent.replace(/ \*$/, '');
            if (text.startsWith('__MSG_feedbackFormType__')) {
                el.innerHTML = i18n('feedbackFormType', 'Feedback Type') + '';
            }
            if (text.startsWith('__MSG_feedbackFormProblem__')) {
                el.innerHTML = i18n('feedbackFormProblem', 'Description') + ' <span style="color:var(--error);">*</span>';
            }
            if (text.startsWith('__MSG_feedbackFormEmail__')) {
                el.innerHTML = i18n('feedbackFormEmail', 'Contact Email') + ' <span style="color:var(--error);">*</span>';
            }
        });
        // 类型按钮
        const typeBugEl = document.getElementById('feedbackTypeBug');
        const typeSuggEl = document.getElementById('feedbackTypeSuggestion');
        if (typeBugEl) typeBugEl.textContent = i18n('feedbackFormTypeBug', '🐛 Bug Report');
        if (typeSuggEl) typeSuggEl.textContent = i18n('feedbackFormTypeSuggestion', '💡 Feature Request');
        // 输入框 placeholder
        const descField = document.getElementById('feedbackFormDesc');
        const emailField = document.getElementById('feedbackFormEmail');
        if (descField) descField.placeholder = i18n('feedbackFormProblemPlaceholder', 'Describe the issue or suggestion in detail...');
        if (emailField) emailField.placeholder = i18n('feedbackFormEmailPlaceholder', 'So we can follow up with you');
        // 日志相关
        const attachLabel = modal.querySelector('#feedbackAttachLogs + div div:first-child');
        if (attachLabel) attachLabel.textContent = i18n('feedbackFormAttachLogs', 'Attach diagnostic info');
        const attachDesc = modal.querySelector('#feedbackAttachLogs + div div:last-child');
        if (attachDesc) attachDesc.textContent = i18n('feedbackFormAttachLogsDesc', 'Includes extension version and browser info');
        // 提交按钮
        const submitBtnEl = document.getElementById('feedbackFormSubmit');
        if (submitBtnEl && !submitBtnEl.getAttribute('data-i18n-set')) {
            submitBtnEl.textContent = i18n('feedbackFormSubmit', 'Submit Feedback');
            submitBtnEl.setAttribute('data-i18n-set', 'true');
        }
        // 付费意愿
        const willingLabel = document.querySelector('#feedbackWillingToPaySection label div div:first-child');
        const willingHint = document.querySelector('#feedbackWillingToPaySection label div div:last-child');
        if (willingLabel) willingLabel.textContent = i18n('feedbackWillingToPay', 'I am willing to pay for this feature');
        if (willingHint) willingHint.textContent = i18n('feedbackWillingToPayHint', 'I would support this feature with a contribution');
    };

    // 打开弹窗
    openBtn.addEventListener('click', () => {
        modal.style.display = 'flex';
        formStatus.innerText = '';
        submitBtn.disabled = false;
        setModalI18n();
    });

    // 关闭弹窗
    const closeModal = () => { modal.style.display = 'none'; };
    closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // 类型切换
    const setType = (type) => {
        feedbackType = type;
        [typeBug, typeSuggestion].forEach(btn => {
            const isActive = btn.dataset.type === type;
            btn.style.borderColor = isActive ? 'var(--primary)' : 'transparent';
            btn.style.background = isActive ? 'var(--primary-soft)' : 'rgba(255,255,255,0.3)';
            btn.style.color = isActive ? 'var(--primary)' : 'var(--text-secondary)';
            btn.style.fontWeight = isActive ? '600' : '500';
        });
        // 功能建议才显示付费意愿复选框
        if (willingToPaySection) {
            willingToPaySection.style.display = type === 'suggestion' ? 'block' : 'none';
        }
        // 切换类型时重置复选框
        if (willingToPayCheckbox) willingToPayCheckbox.checked = false;
    };
    typeBug.addEventListener('click', () => setType('bug'));
    typeSuggestion.addEventListener('click', () => setType('suggestion'));

    // 提交反馈
    submitBtn.addEventListener('click', async () => {
        const desc = descInput.value.trim();
        const email = emailInput.value.trim();

        if (!desc || !email) {
            formStatus.innerText = '⚠️ ' + (chrome.i18n.getMessage('feedbackFormRequired') || 'Please fill in both description and email');
            formStatus.style.color = 'var(--error)';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.innerText = chrome.i18n.getMessage('submitting') || 'Submitting...';
        formStatus.innerText = '';

        // 收集诊断信息
        let diagInfo = '';
        if (attachLogs.checked) {
            diagInfo = `\n\n--- Diagnostic Info ---\nExtension: WeCal Sync v1.0.0\nBrowser: ${navigator.userAgent}\nPlatform: ${navigator.platform}\nLanguage: ${navigator.language}`;
        }

        const subject = feedbackType === 'bug' ? '[WeCal Bug] ' : '[WeCal Suggestion] ';
        let willingToPayStr = '';
        if (feedbackType === 'suggestion' && willingToPayCheckbox && willingToPayCheckbox.checked) {
            willingToPayStr = '\nWilling to pay: Yes';
        }
        const message = `Type: ${feedbackType}\nEmail: ${email}\n\n${desc}${willingToPayStr}${diagInfo}`;

        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    access_key: '7e7d7bb2-db82-4fde-968e-811e8ce85ba8',
                    subject: subject,
                    message: message,
                    from_name: email
                })
            });

            const result = await response.json();
            if (result.success) {
                formStatus.innerText = chrome.i18n.getMessage('feedbackFormSuccess') || '✅ Feedback submitted. Thank you!';
                formStatus.style.color = 'var(--success)';
                descInput.value = '';
                emailInput.value = '';
                setTimeout(closeModal, 2000);
            } else {
                throw new Error(result.message || 'API error');
            }
        } catch (err) {
            formStatus.innerText = chrome.i18n.getMessage('feedbackFormError') || '❌ Submission failed. Please try again later.';
            formStatus.style.color = 'var(--error)';
            submitBtn.disabled = false;
            submitBtn.innerText = chrome.i18n.getMessage('feedbackFormSubmit') || 'Submit Feedback';
        }
    });

    // 4. 回显提醒时间配置
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

    // 4.5. 测试 AI 连接
    const testAiBtn = document.getElementById('testAiBtn');
    const testAiStatus = document.getElementById('testAiStatus');
    if (testAiBtn) {
        testAiBtn.addEventListener('click', async () => {
            testAiBtn.disabled = true;
            testAiBtn.innerText = chrome.i18n.getMessage('testing') || '测试中...';
            if (testAiStatus) {
                testAiStatus.innerText = '';
                testAiStatus.className = 'text-xs mt-1';
            }

            const baseUrl = aiBaseUrlInput.value.trim();
            const model = aiModelInput.value.trim();
            const key = aiKeyInput.value.startsWith('****') ? fullAiKey : aiKeyInput.value.trim();

            if (!key) {
                if (testAiStatus) {
                    testAiStatus.innerText = '⚠️ ' + (chrome.i18n.getMessage('aiNotConfiguredAlert') || '请先输入 API Key');
                    testAiStatus.style.color = 'var(--error)';
                }
                testAiBtn.disabled = false;
                testAiBtn.innerText = chrome.i18n.getMessage('testConnection') || '测试连接';
                return;
            }

            try {
                const apiUrl = baseUrl.endsWith('/chat/completions')
                    ? baseUrl
                    : `${baseUrl.replace(/\/+$/, '')}/chat/completions`;

                const resp = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${key}`
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: [
                            { role: 'system', content: 'Say "ok"' },
                            { role: 'user', content: 'test' }
                        ],
                        max_tokens: 10
                    }),
                    signal: AbortSignal.timeout ? AbortSignal.timeout(10000) : undefined
                });

                if (resp.ok) {
                    if (testAiStatus) {
                        testAiStatus.innerText = '✅ ' + (chrome.i18n.getMessage('connectionOk') || '连接成功');
                        testAiStatus.style.color = 'var(--success)';
                    }
                } else if (resp.status === 401) {
                    const errBody = await resp.text().catch(() => '');
                    if (testAiStatus) {
                        testAiStatus.innerText = '❌ ' + (chrome.i18n.getMessage('aiKeyInvalid') || 'API Key 无效 (401)') + (errBody ? ': ' + errBody.slice(0, 100) : '');
                        testAiStatus.style.color = 'var(--error)';
                    }
                } else {
                    if (testAiStatus) {
                        testAiStatus.innerText = `❌ HTTP ${resp.status}: ${resp.statusText}`;
                        testAiStatus.style.color = 'var(--error)';
                    }
                }
            } catch (err) {
                if (testAiStatus) {
                    testAiStatus.innerText = '❌ ' + (err.name === 'TimeoutError' ? '连接超时' : err.message);
                    testAiStatus.style.color = 'var(--error)';
                }
            } finally {
                testAiBtn.disabled = false;
                testAiBtn.innerText = chrome.i18n.getMessage('testConnection') || '测试连接';
            }
        });
    }

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
