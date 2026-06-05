
/**
 * WeCal Sync - Alert Window Script
 */

let autoCloseSeconds = 180; // 3 minutes / 3 分钟

async function renderAlert() {
    try {
        const urlParams = new URLSearchParams(window.location.search);
        
        const data = {
            title: urlParams.get('title') || chrome.i18n.getMessage('untitledEvent'),
            start: urlParams.get('start') || chrome.i18n.getMessage('timePlaceholder'),
            duration: urlParams.get('duration') || chrome.i18n.getMessage('durationPlaceholder'),
            location: urlParams.get('location') || chrome.i18n.getMessage('notMarked'),
            mins: urlParams.get('mins') || '0'
        };

        // Fill content / 填充内容
        document.getElementById('title').innerText = data.title;
        document.getElementById('start').innerText = data.start;
        document.getElementById('duration').innerText = data.duration + ' ' + chrome.i18n.getMessage('minutesUnit');
        document.getElementById('location').innerText = data.location;
        
        const countdownEl = document.getElementById('countdown');
        if (data.mins === "0") {
            countdownEl.innerText = chrome.i18n.getMessage('startingNow');
            countdownEl.classList.add('urgent');
        } else {
            countdownEl.innerText = data.mins + ' ' + chrome.i18n.getMessage('minutesBeforeStart');
            countdownEl.classList.remove('urgent');
        }

        document.title = chrome.i18n.getMessage('alertWindowTitleFormat', data.title);

        // Start auto-close countdown / 启动自动关闭倒计时
        startAutoCloseTimer();

    } catch (e) {
        console.error(chrome.i18n.getMessage('alertExecError'), e);
    }
}

function startAutoCloseTimer() {
    const timerEl = document.getElementById('close-timer');
    const interval = setInterval(() => {
        autoCloseSeconds--;
        if (timerEl) {
            timerEl.innerText = chrome.i18n.getMessage('autoCloseHintFormat', autoCloseSeconds.toString());
        }
        
        if (autoCloseSeconds <= 0) {
            clearInterval(interval);
            window.close();
        }
    }, 1000);

    // Manual close button / 手动关闭按钮
    document.getElementById('manual-close').onclick = () => {
        clearInterval(interval);
        window.close();
    };
}

// Execute on page load / 页面加载即执行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAlert);
} else {
    renderAlert();
}