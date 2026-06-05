# WeCal Sync - Chrome Web Store 上架指南

> 基于 v1.5.2 版本 | 编写日期：2026-05-26

---

## 一、上架流程概览（共 5 步）

```
注册开发者账号 → 扩展程序准备 → 填写商店资料 → 提交审核 → 发布上线
```

---

## 二、详细步骤

### 第 1 步：注册 Chrome 开发者账号

**网址：** https://chrome.google.com/webstore/devconsole

**要求：**
- 一个 Google 账号
- 一次性支付 **$5.00 USD**（约 35 元人民币）
- 支持 Visa / Mastercard 信用卡支付

**操作：**
1. 打开上述网址
2. 点击「注册成为 Chrome 扩展程序开发者」
3. 登录 Google 账号
4. 填写开发者信息（姓名、国家/地区）
5. 支付 $5 注册费
6. 完成注册（通常即时生效）

---

### 第 2 步：扩展程序准备

WeCal Sync v1.5.2 已满足以下要求：

#### ✅ Manifest V3
项目使用 `manifest_version: 3`，符合 2025 年 12 月后的新规要求。

#### ✅ 权限最小化
当前声明的权限（共 8 项）：

| 权限 | 用途 | 风险等级 |
|------|------|----------|
| `storage` | 保存配置信息 | 低 |
| `notifications` | 显示提醒弹窗 | 低 |
| `alarms` | 定时同步日历 | 低 |
| `offscreen` | 播放警报音 | 低 |
| `system.display` | 检测显示器状态 | 低 |
| `sidePanel` | 侧边栏 UI | 低 |
| `contextMenus` | 右键菜单 | 低 |
| `host_permissions` | iCloud CalDAV 通信 | **中** |

#### ✅ 主机权限说明

```json
"host_permissions": [
  "https://*.icloud.com/*",
  "https://*.icloud.com.cn/*"
]
```

这是连接 iCloud 日历所必需的，属于**高风险权限**，需要在隐私惯例中明确说明用途。

#### 打包为 .zip

**需要包含的文件：**
```
wecal-sync/
├── manifest.json
├── content.js
├── background/
│   ├── background.js
│   ├── caldav-client.js
│   ├── sync-engine.js
│   └── notification-monitor.js
├── common/
│   ├── constants.js
│   ├── storage.js
│   ├── date-utils.js
│   ├── text-utils.js
│   └── xml-utils.js
├── ui/
│   ├── index.html
│   ├── global.css
│   ├── main.js
│   └── view-router.js
└── features/
    ├── config/
    ├── today/
    ├── create/
    ├── confirm/
    ├── notification/
    └── context-menu/
```

**不要包含：**
- `docs/` 目录
- `package.json` / `node_modules/`
- `.git/` 目录
- `AI_INSTRUCTIONS.md` / `metadata.json` 等开发文档

**打包命令：**
```bash
cd D:\my_program\wecal-sync-1.5.2
# 在 Windows 资源管理器中选中所有文件 → 右键 → 发送到 → 压缩(zipped)文件夹
# 或者用 PowerShell:
Compress-Archive -Path * -DestinationPath wecal-sync-v1.5.2.zip -Force
```

---

### 第 3 步：填写商店资料

登录 Chrome 开发者控制台后，点击「新建项目」，上传 .zip 包，然后填写以下信息：

#### 3.1 基本信息

| 字段 | 内容 | 建议 |
|------|------|------|
| 应用名称 | WeCal Sync - Apple日历助手 | 唯一，不可与已有扩展重复 |
| 简短描述 | 监控 Apple iCloud 日历，准点弹窗+强力闹铃提醒。支持智能识别文字创建日程、右键快速创建、今日日程浏览。 | 132 字符内 |
| 详细描述 | 见 `docs/STORE_LISTING.md` | 500-2000 字符 |
| 类别 | 生产力 (Productivity) | 可选：工具 |
| 语言 | 简体中文 | — |

#### 3.2 视觉素材

| 资源 | 规格 | 状态 |
|------|------|------|
| 应用图标 | 128×128 px PNG | 需制作 |
| 截图 | 1280×800 px 或 640×400 px，至少 1 张，建议 4-6 张 | 需制作 |
| 宣传图（可选） | 440×280 px / 1400×560 px | 可选 |

**截图建议内容：**
1. 今日日程视图（侧边栏）
2. iCloud 配置页面
3. 智能创建日程流程
4. 提醒弹窗界面
5. 创建成功确认页

#### 3.3 隐私权

| 字段 | 内容 |
|------|------|
| 隐私权网址 | **必须有**（可使用 GitHub Pages 免费托管） |
| 数据收集声明 | 勾选「此扩展不会收集任何用户数据」或如实填写 |

**隐私政策模板：**

```markdown
# WeCal Sync 隐私政策

生效日期：2026年5月26日

## 我们收集什么

WeCal Sync 不会收集、传输或共享任何个人用户数据。

您的以下信息仅存储在本地浏览器中：
- Apple ID（用于 iCloud CalDAV 认证）
- App 专用密码（本地加密存储）
- Deepseek API Key（用于智能识别功能，仅在使用时调用 Deepseek API）

## 我们如何处理数据

- 所有与 iCloud 的通信使用 HTTPS 加密的 CalDAV 协议
- 智能识别功能仅将您输入的文本发送给 Deepseek API 进行解析，不包含任何账户信息
- 我们不会使用任何追踪技术（cookies、web beacons 等）

## 第三方服务

WeCal Sync 仅通过以下第三方服务运行：
- Apple iCloud（用于日历同步）
- Deepseek（用于自然语言识别，仅当您主动使用智能识别功能时）

## 联系我们

如有任何隐私相关问题，请通过 Chrome 应用商店页面联系我们。

```

将上述内容保存为 `privacy.html`，托管到 GitHub Pages（免费）或任何静态托管服务。

#### 3.4 单一用途声明

在「隐私惯例」中需要说明扩展的用途：

> WeCal Sync 是一款 Apple iCloud 日历同步助手，仅用于帮助用户在 Chrome 浏览器中查看 iCloud 日历、创建日程、接收提醒。不包含任何广告、追踪或无关功能。

---

### 第 4 步：提交审核

**操作：**
1. 上传 .zip 包
2. 填写完所有商店资料
3. 点击「提交审核」

**审核时间：**
- 通常 **1-3 个工作日**
- 2026 年采用机器审核 + 人工审核结合

**建议：**
- 首次提交可以先「保存为草稿」，审核通过后再手动发布
- 如果审核被拒，根据拒绝原因修改后重新提交

---

### 第 5 步：发布上线

审核通过后：
- 选择「手动发布」：在开发者控制台点击「发布」
- 扩展将在几分钟内出现在 Chrome 应用商店中

**后续更新：**
- 重新打包 .zip 上传
- 小更新可能免审，大更新需重新审核

---

## 三、常见被拒原因及规避

| 原因 | 规避方法 |
|------|----------|
| 权限过多 | WeCal Sync 已采用最小权限，仅保留 8 个必要权限 |
| 无隐私政策 | 准备 `privacy.html` 并在商店资料中填写 URL |
| 代码混淆过度 | 不要混淆代码，保持源码可读 |
| 远程加载代码 | 不要使用 `eval()` 或外部 JS 文件 |
| 单一用途违规 | 确保扩展只做日历相关功能，不做无关的事 |

---

## 四、WeCal Sync 需要补充的材料

| 材料 | 优先级 | 说明 |
|------|--------|------|
| 应用图标 | 🔴 高 | 128×128 PNG，需设计 |
| 截图 4-6 张 | 🔴 高 | 1280×800 PNG，需截图制作 |
| 隐私政策 URL | 🔴 高 | 需托管到可访问的网页 |
| 开发者账号 | 🟡 中 | 注册并支付 $5 |

---

## 五、上架检查清单

```
□ 已注册 Chrome 开发者账号（$5 已付）
□ manifest.json 使用 Manifest V3
□ 权限已精简到最小必要
□ 主机权限已在隐私惯例中说明
□ 已准备 128×128 应用图标
□ 已准备至少 1 张截图（建议 4-6 张）
□ 已准备隐私政策网页并可访问
□ 已打包为 .zip（不包含 docs/、node_modules/）
□ 商店资料（名称、描述、分类）已填写
□ 单一用途声明已填写
□ 已提交审核
```

---

## 六、相关链接

| 资源 | 网址 |
|------|------|
| Chrome 开发者控制台 | https://chrome.google.com/webstore/devconsole |
| Manifest V3 文档 | https://developer.chrome.com/docs/extensions/mv3/ |
| Chrome 扩展政策 | https://developer.chrome.com/docs/webstore/program-policies/ |
| 权限说明 | https://developer.chrome.com/docs/extensions/mv3/architecture-overview/ |

---

*祝 WeCal Sync 上架顺利！🚀*
