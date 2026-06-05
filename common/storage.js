/**
 * WeCal Sync - Storage Utility / WeCal Sync - 存储工具
 * Source: safeStorage object from original background.js / 来源：原 background.js 中的 safeStorage 对象
 * Wraps Chrome Storage API with Promise interface, prevents errors / 作用：封装 Chrome Storage API，提供 Promise 化的读写接口，防止报错
 */

export const safeStorage = {
  // Get stored data / 获取存储数据
  // keys: string or string array / keys: 字符串或字符串数组
  get: (keys) => new Promise((resolve) => {
    // Check if chrome.storage.local exists (prevents errors in non-extension env) / 判断 chrome.storage.local 是否存在（防止在非插件环境下报错）
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      // Call native API to get data / 调用原生 API 获取数据
      chrome.storage.local.get(keys, resolve);
    } else {
      // Return empty object if environment doesn't support, prevents crashes / 如果环境不支持，返回空对象，保证代码不崩溃
      resolve({});
    }
  }),

  // Write data to storage / 写入存储数据
  // obj: object to save { key: value } / obj: 要保存的对象 { key: value }
  set: (obj) => new Promise((resolve) => {
    // Check if chrome.storage.local exists / 判断 chrome.storage.local 是否存在
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      // Call native API to set data / 调用原生 API 设置数据
      chrome.storage.local.set(obj, resolve);
    } else {
      // If environment doesn't support, just resolve / 如果环境不支持，直接返回 resolve
      resolve();
    }
  })
};