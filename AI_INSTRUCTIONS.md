# WeCal Sync 项目宪法

当前版本：v1.5.2
代码锁定时间：2025-12-28 21:35

🏛️ WeCal Sync - 项目架构技术文档
架构模式: 原生模块化 (Vanilla ES Modules) + 无构建架构 (No-Build Architecture)
设计理念: 特性切片设计 (Feature-Sliced Design Lite)
运行环境: Google Chrome Extension (Manifest V3)


📂 完整目录结构树 (Directory Tree)
WeCal-Sync/
│
├── manifest.json                  # [核心配置] 插件的身份证。定义权限(ContextMenus, SidePanel)、后台入口等。
├── content.js                     # [内容脚本] 注入到网页中，虽然目前代码很少，但为未来网页交互预留了位置。
├── AI_INSTRUCTIONS.md             # [项目宪法] 记录项目架构、技术栈和已实现功能的文档。
│
├── background/                    # 🟢 [后台服务层] Service Worker (无界面后台进程)
│   ├── background.js              #    [入口] 程序的总指挥。初始化右键菜单、定时器，分发消息。
│   ├── caldav-client.js           #    [网络] 负责和 iCloud 服务器“打电话” (PROPFIND, PUT)。
│   ├── sync-engine.js             #    [引擎] 负责调度数据同步、管理缓存。
│   └── notification-monitor.js    #    [监控] 盯着时间看，时间到了就弹窗、响铃。
│
├── common/                        # 🟡 [公共工具库] 全局通用的“螺丝刀”和“扳手”
│   ├── constants.js               #    [常量] 存颜色代码等固定值。
│   ├── storage.js                 #    [存储] 封装 storage.local，防止报错。
│   ├── date-utils.js              #    [日期] 处理各种奇形怪状的时间格式 (iCal, ISO)。
│   ├── text-utils.js              #    [文本] 生成颜色、截断长链接。
│   └── xml-utils.js               #    [解析] 解析 iCloud 返回的 XML 数据。
│
├── ui/                            # 🔵 [UI 框架层] 侧边栏的“骨架”
│   ├── index.html                 #    [根节点] 侧边栏的入口 HTML。
│   ├── global.css                 #    [全局样式] 定义了卡片、按钮、字体等通用设计风格。
│   ├── main.js                    #    [主控] UI 的启动脚本，决定显示“配置页”还是“今日页”。
│   └── view-router.js             #    [路由器] 负责把 features 里的页面“搬运”到 index.html 里显示。
│
└── features/                      # 🟣 [特性模块层] 按业务功能切分的“房间”
    ├── config/                    #    [配置模块] 登录、选日历
    │   ├── config-view.html
    │   ├── config-view.css
    │   └── config-view.js
    │
    ├── today/                     #    [今日模块] 查看日程列表
    │   ├── today-view.html
    │   ├── today-view.css
    │   └── today-view.js
    │
    ├── create/                    #    [创建模块] ✍️ (本次核心修改区域)
    │   ├── create-view.html       #      - 界面：输入框、智能识别按钮
    │   ├── create-view.css        #      - 样式
    │   ├── create-view.js         #      - 逻辑：处理表单、调用 AI
    │   └── ai-handler.js          #      ✨ [新增] AI 独立处理层，负责和 Deepseek 对话并清洗数据
    │
    ├── confirm/                   #    [确认模块] 提交成功后的反馈页
    │   ├── confirm-view.html
    │   ├── confirm-view.css
    │   └── confirm-view.js
    │
    ├── notification/              #    [提醒模块] 独立的弹窗和声音
    │   ├── alert.html             #      - 强力弹窗界面
    │   ├── alert.js
    │   ├── offscreen.html         #      - 隐藏的播放器页面
    │   └── offscreen.js           #      - 播放“嘀-嘟”警报音的代码
    │
    └── context-menu/              #    ✨ [右键菜单模块] (本次新增区域)
        └── context-menu.js        #      - 监听右键点击，唤醒侧边栏，传递选中的文字



📝 核心技术栈说明 (Technical Stack Summary)
项目描述:
一个基于 Chrome Extension Manifest V3 标准开发的 Apple iCloud 日历同步插件。
核心技术点:
无构建架构 (No-Build Architecture): 放弃 Webpack/Vite，完全使用浏览器原生的 ES Modules (import/export) 进行模块化开发，便于调试和维护。
Service Worker: 利用后台服务进程处理定时任务 (Chrome Alarms) 和跨域请求 (CORS Fetch)，实现了 CalDAV 协议的核心方法 (PROPFIND, REPORT, PUT)。
自定义路由引擎 (Custom SPA Router): 在 ui/view-router.js 中实现了一个轻量级路由器，能够在 Side Panel 中动态加载 HTML 片段和 JS 模块，实现了类似 Vue/React 的单页应用体验。
离屏文档 (Offscreen API): 利用 chrome.offscreen API 创建不可见的文档上下文，解决了 MV3 Service Worker 无法直接访问 AudioContext 播放音频的问题。
特性切片 (Feature-Sliced): 代码结构严格按照“通用工具”与“业务特性”分离，降低了模块间的耦合度 (Coupling)。





## ✅ 已实现功能（不能动！）
- 弹窗提醒（Chrome原生弹窗，日程临近前30分钟、15分钟、5分钟、0分钟会自动弹出）
- 配置视图（侧边栏布局，包含"云服务入口"下拉选择框、"Apple ID"输入框、"App专用密码"输入框、"帮助?"及其悬浮信息显示窗、"日历名称"输入框、"查询日历列表"按钮、"保存配置"按钮
- 今日日程视图（侧边栏布局，包含"今日"下拉框及其下的日程条目显示、"明日"下拉框及其下的日程条目显示、"设备创建日程"的悬浮信息窗+"新建日程"按钮、"配置"按钮、"立即更新"按钮、"发现"按钮）
- 新建日程视图（侧边栏布局，包含可调节高度的"粘贴文本框"、"语音输入"文本框、"会议邀请"文本框、"智能识别"按钮、"Deepseek API Key"输入框、"日程名称"输入框、"开始时间"日期时间输入框、"结束时间"日期时间输入框、"地点"输入框、"取消"按钮、"添加"按钮）
- 信息确认视图（"创建日程成功"卡片布局，下方同步状态显示）
- 同步状态（今日日程视图底部显示"最后同步: XX:YY"，信息确认视图下方同步状态显示"✅已同步至云端"）


## ✨ 重要提醒
- 请每次修改前先阅读本文件
- 不能修改"已实现功能"的任何代码