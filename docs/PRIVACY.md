# WeCal Sync 隐私政策

**生效日期：2026年6月5日**
**版本：1.5.4**

---

## 我们收集什么

WeCal Sync **不会收集、传输或共享任何个人用户数据**。

您的以下信息**仅存储在本地浏览器**中，不会上传至任何第三方服务器：

| 数据类型 | 存储位置 | 说明 |
|----------|----------|------|
| Apple ID 邮箱 | 本地 chrome.storage.local | 用于 iCloud CalDAV 认证 |
| App 专用密码 | 本地 chrome.storage.local | 本地加密存储 |
| Deepseek API Key | 本地 chrome.storage.local | 仅在使用智能识别功能时调用 |
| 日历配置信息 | 本地 chrome.storage.local | 同步规则、提醒偏好等 |

## 我们如何处理数据

- 所有与 iCloud 的通信使用 **HTTPS 加密的 CalDAV 协议**
- 智能识别功能**仅将您输入的文本**发送给 Deepseek API 进行解析，不包含任何账户信息
- 我们**不会使用**任何追踪技术（cookies、web beacons、分析脚本等）
- **没有广告**、没有数据埋点、没有第三方 SDK

## 第三方服务

WeCal Sync 仅通过以下第三方服务运行：

1. **[Apple iCloud](https://www.icloud.com)** — 用于日历数据同步（CalDAV 协议）
2. **[Deepseek](https://deepseek.com)** — 用于自然语言识别，**仅当您主动使用**智能创建日程功能时

## 权限说明

| 权限 | 用途 |
|------|------|
| `storage` | 本地保存您的配置信息 |
| `notifications` | 显示日历提醒弹窗 |
| `alarms` | 定时检查日历事件 |
| `offscreen` | 播放闹铃提示音 |
| `sidePanel` | 侧边栏显示日程视图 |
| `contextMenus` | 右键菜单快速创建日程 |
| `host_permissions` (iCloud) | 连接您的 iCloud 日历 |

## 数据删除

卸载 WeCal Sync 后，所有本地存储的数据将自动清除。您也可以随时在扩展的选项页面中清除所有数据。

## 政策更新

本隐私政策可能会随版本更新而调整。重大变更时会在扩展内通知。

## 联系我们

如有任何隐私相关问题，请通过 Chrome 网上应用商店页面联系我们。

---

*WeCal Sync v1.5.4 | 更新日期：2026-06-05*
