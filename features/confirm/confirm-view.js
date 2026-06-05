
/**
 * WeCal Sync - Confirm Feature
 * 职责：展示同步成功信息，并自动跳回首页
 */

export async function init(params, router) {
    // 1. 填充数据
    if (params) {
        document.getElementById('res-title').innerText = params.event.title;
        document.getElementById('res-start').innerText = params.startStr || '--';
        document.getElementById('res-end').innerText = params.endStr || '--';
        document.getElementById('res-loc').innerText = params.event.location || chrome.i18n.getMessage('notMarked');
    }

    // 2. 自动跳转倒计时 (6 秒)
    let seconds = 6;
    
    // 定时器逻辑
    const interval = setInterval(() => {
        seconds--;
        
        if (seconds <= 0) {
            clearInterval(interval);
            router.load('today', 'today-view');
        }
    }, 1000);
}
