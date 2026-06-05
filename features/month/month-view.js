/**
 * WeCal Sync - Month View
 * 职责：在独立标签页中渲染月历，显示整月日程概览
 * 数据来源：通过 chrome.runtime.sendMessage 从 background 获取
 */

// 当前显示的年份和月份
let currentYear, currentMonth;
// 缓存当月日程数据
let cachedEvents = [];

// 星期名（中文，周一开头）
const WEEKDAYS = [
    chrome.i18n.getMessage('weekdayMon'),
    chrome.i18n.getMessage('weekdayTue'),
    chrome.i18n.getMessage('weekdayWed'),
    chrome.i18n.getMessage('weekdayThu'),
    chrome.i18n.getMessage('weekdayFri'),
    chrome.i18n.getMessage('weekdaySat'),
    chrome.i18n.getMessage('weekdaySun')
];

// 月份名
const MONTH_NAMES = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

// 解析 iCal 日期
function parseIcalDate(icalStr) {
    if (!icalStr) return null;
    const match = icalStr.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
    if (!match) return null;
    const [_, y, m, d, h, min, s] = match;
    return icalStr.includes('Z')
        ? new Date(Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min), parseInt(s)))
        : new Date(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min), parseInt(s));
}

// 获取日程数据（从 background）
async function fetchEvents() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ type: 'GET_SCHEDULE', force: false }, (r) => {
            if (r && r.success) {
                // 合并今天+明天+后天的日程
                const all = [...(r.today || []), ...(r.tomorrow || []), ...(r.dayAfterTomorrow || [])];
                resolve(all);
            } else {
                resolve([]);
            }
        });
    });
}

// 获取整月所有日程（从磁盘缓存拉取更广范围）
async function fetchMonthEvents(year, month) {
    // 先尝试从 background 获取已缓存的日程
    const events = await fetchEvents();
    
    // 如果缓存数据不够覆盖整月，尝试强制刷新
    // 但月视图只显示已有数据，不主动触发网络请求
    cachedEvents = events;
    return events;
}

// 判断某天是否有日程，返回日程列表
function getEventsForDay(events, year, month, day) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(ev => {
        const start = parseIcalDate(ev.dtstart);
        if (!start) return false;
        const evKey = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
        return evKey === dateKey;
    });
}

// 渲染月历
function renderCalendar(year, month) {
    const grid = document.getElementById('calendarGrid');
    const title = document.getElementById('monthTitle');
    
    title.innerText = `${year}年${MONTH_NAMES[month]}`;
    
    // 计算当月天数、第一天是星期几
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // 周一为一周第一天：getDay() 返回 0=周日, 1=周一...
    // 转成 0=周一, 6=周日
    let startWeekday = firstDay.getDay() - 1;
    if (startWeekday < 0) startWeekday = 6; // 周日
    
    // 上个月补齐的天数
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    // 总行数
    const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;
    
    // 今天
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    
    let html = '';
    let rowHtml = '';
    
    for (let i = 0; i < totalCells; i++) {
        let day, isOtherMonth = false, isToday = false;
        
        if (i < startWeekday) {
            // 上个月
            day = prevMonthLastDay - startWeekday + 1 + i;
            isOtherMonth = true;
        } else if (i >= startWeekday + daysInMonth) {
            // 下个月
            day = i - startWeekday - daysInMonth + 1;
            isOtherMonth = true;
        } else {
            day = i - startWeekday + 1;
        }
        
        // 判断是否是今天
        if (!isOtherMonth && `${year}-${month}-${day}` === todayStr) {
            isToday = true;
        }
        
        // 获取当天日程
        let displayMonth = month;
        let displayYear = year;
        if (isOtherMonth) {
            if (i < startWeekday) {
                displayMonth = month - 1;
                displayYear = month === 0 ? year - 1 : year;
            } else {
                displayMonth = month + 1;
                displayYear = month === 11 ? year + 1 : year;
            }
        }
        const dayEvents = getEventsForDay(cachedEvents, displayYear, displayMonth, day);
        
        // 构建日程点
        let dotsHtml = '';
        const maxDots = 3;
        const visibleEvents = dayEvents.slice(0, maxDots);
        const moreCount = dayEvents.length - maxDots;
        
        visibleEvents.forEach(ev => {
            const dotColor = ev.color || '#6366f1';
            const summary = ev.summary || '';
            const shortLabel = summary.length > 6 ? summary.substring(0, 6) + '…' : summary;
            const timeStr = ev.timeStr || '--:--';
            const location = ev.location || '';
            const tooltipData = JSON.stringify({
                summary: summary,
                time: timeStr,
                location: location,
                color: dotColor
            }).replace(/\"/g, '&quot;');
            dotsHtml += `
                <div class="event-dot-item" data-tooltip=\'${tooltipData}\'>
                    <span class="event-dot-bullet" style="background:${dotColor}"></span>
                    <span class="event-dot-label">${shortLabel}</span>
                </div>`;
        });
        if (moreCount > 0) {
            dotsHtml += `<div class="more-events">+${moreCount} ${chrome.i18n.getMessage('more')}</div>`;
        }
        
        const cellClasses = ['day-cell'];
        if (isOtherMonth) cellClasses.push('other-month');
        if (isToday) cellClasses.push('today');
        
        const cellHtml = `
            <div class="${cellClasses.join(' ')}" data-year="${displayYear}" data-month="${displayMonth}" data-day="${day}">
                <div class="day-number">${day}</div>
                ${dayEvents.length > 0 ? `<div class="event-dot-list">${dotsHtml}</div>` : ''}
            </div>`;
        
        rowHtml += cellHtml;
        
        // 每7个单元格换行
        if ((i + 1) % 7 === 0) {
            html += `<div class="calendar-row">${rowHtml}</div>`;
            rowHtml = '';
        }
    }
    
    grid.innerHTML = html;

    // 绑定日程浮窗事件
    bindTooltips();
}

// 日程浮窗
let tooltipEl = null;

function bindTooltips() {
    const items = document.querySelectorAll('.event-dot-item');
    items.forEach(el => {
        el.addEventListener('mouseenter', showTooltip);
        el.addEventListener('mouseleave', hideTooltip);
    });
}

function showTooltip(e) {
    const el = e.currentTarget;
    let data;
    try {
        data = JSON.parse(el.getAttribute('data-tooltip'));
    } catch { return; }
    if (!data) return;

    if (!tooltipEl) {
        tooltipEl = document.createElement('div');
        tooltipEl.className = 'event-hover-tooltip';
        document.body.appendChild(tooltipEl);
    }

    const locationHtml = data.location
        ? `<div class="tooltip-row"><span class="tooltip-label">${chrome.i18n.getMessage('location')}</span><span class="tooltip-value">${data.location}</span></div>`
        : '';

    tooltipEl.innerHTML = `
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${data.color};flex-shrink:0;"></span>
            <span class="tooltip-value title">${data.summary || chrome.i18n.getMessage('noTitle')}</span>
        </div>
        <div class="tooltip-row"><span class="tooltip-label">${chrome.i18n.getMessage('time')}</span><span class="tooltip-value">${data.time}</span></div>
        ${locationHtml}`;

    // 定位：在鼠标右下方，但不出屏幕
    const rect = el.getBoundingClientRect();
    const tw = 280;
    const th = tooltipEl.offsetHeight || 120;
    let left = rect.right + 8;
    let top = rect.top;
    if (left + tw > window.innerWidth - 8) left = rect.left - tw - 8;
    if (top + th > window.innerHeight - 8) top = window.innerHeight - th - 8;
    if (top < 8) top = 8;
    tooltipEl.style.left = left + 'px';
    tooltipEl.style.top = top + 'px';
    tooltipEl.style.display = 'block';
}

function hideTooltip() {
    if (tooltipEl) tooltipEl.style.display = 'none';
}

// 切换月份
function goToMonth(year, month) {
    currentYear = year;
    currentMonth = month;
    renderCalendar(year, month);
}

// 初始化
async function init() {
    const now = new Date();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth();
    
    // 加载日程数据
    await fetchMonthEvents(currentYear, currentMonth);
    
    // 渲染
    renderCalendar(currentYear, currentMonth);
    
    // 绑定事件
    document.getElementById('prevMonth').addEventListener('click', () => {
        let y = currentYear, m = currentMonth - 1;
        if (m < 0) { m = 11; y--; }
        goToMonth(y, m);
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
        let y = currentYear, m = currentMonth + 1;
        if (m > 11) { m = 0; y++; }
        goToMonth(y, m);
    });
    
    document.getElementById('todayBtn').addEventListener('click', () => {
        const now = new Date();
        goToMonth(now.getFullYear(), now.getMonth());
    });
}

// 页面加载后初始化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}