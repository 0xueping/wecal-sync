
/**
 * WeCal Sync - View Router / 视图路由
 * Core responsibility: Dynamically load feature view HTML/CSS/JS modules
 * 核心职责：动态加载 features 目录下的 HTML/CSS/JS 模块
 * Implementation: Fetch HTML → Inject DOM → Append CSS Link → Import JS Module
 * 实现原理：Fetch HTML -> Inject DOM -> Append CSS Link -> Import JS Module
 */

// Cache loaded JS modules to prevent duplicate execution / 缓存已加载的 JS 模块，防止重复执行初始化
const loadedModules = {};

// i18n helper: Replace __MSG_key__ placeholders with localized strings
// 国际化辅助函数
function replaceI18n(text) {
    if (!text) return text;
    return text.replace(/__MSG_(\w+)__/g, (_, key) => {
        return chrome.i18n.getMessage(key) || `__MSG_${key}__`;
    });
}

export const ViewRouter = {
    // Container element ID / 容器元素 ID
    containerId: 'app-container',

    /**
     * Load and render a feature view / 加载并渲染指定的功能视图
     * @param {string} featureName - Feature folder name (e.g. 'today', 'config') / 功能文件夹名称
     * @param {string} viewName - View file prefix (usually same as folder, e.g. 'today-view') / 视图文件前缀
     * @param {object} params - Parameters passed to the view's init function / 传递给视图 JS 的初始化参数
     */
    async load(featureName, viewName, params = {}) {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        try {
            // Build file paths / 构建文件路径
            // Note: paths are relative to index.html location (ui/ directory)
            //    所以向上跳一级 (../) 进入 features/
            const basePath = `../features/${featureName}/`;
            const htmlPath = `${basePath}${viewName}.html`;
            const cssPath = `${basePath}${viewName}.css`;
            const jsPath = `${basePath}${viewName}.js`;

            // Cache buster: append extension version to force reload when extension updates
            // 缓存破坏：附加扩展版本号，确保扩展更新后重新加载
            const ver = chrome.runtime.getManifest().version;
            const cacheBuster = `?v=${ver}`;

            // 3. Load HTML content / 加载 HTML 内容
            const response = await fetch(htmlPath + cacheBuster);
            if (!response.ok) throw new Error(`Failed to load view: ${htmlPath}`);
            const htmlContent = await response.text();

            // Replace i18n placeholders (__MSG_key__) with localized strings
            // 替换国际化占位符
            const localizedHtml = replaceI18n(htmlContent);

            // 4. Inject HTML (clear container) / 注入 HTML (清空容器)
            container.innerHTML = localizedHtml;

            // 5. Dynamically load CSS (if not already loaded) / 动态加载 CSS
            const cssUrl = cssPath + cacheBuster;
            if (!document.querySelector(`link[href="${cssUrl}"]`)) {
                const link = document.createElement('link');
                link.rel = 'stylesheet';
                link.href = cssUrl;
                document.head.appendChild(link);
            }

            // 5b. Also replace i18n in document.title / 同时替换页面标题
            if (document.title.includes('__MSG_')) {
                document.title = replaceI18n(document.title);
            }

            // 6. Dynamically import JS module / 动态导入 JS 模块
            // Use version cache buster to force reload after extension update
            const module = await import(jsPath + cacheBuster);
            
            // 7. Call module's init method (convention: every View JS must export init function)
            if (module && typeof module.init === 'function') {
                // Pass Router itself so views can navigate internally
                await module.init(params, ViewRouter);
            }

            // Mark module as loaded / 标记模块为已加载
            loadedModules[viewName] = module;

        } catch (error) {
            console.error('[ViewRouter] Load error:', error);
            container.innerHTML = `<div class="text-red-500 text-xs p-4">Failed to load view / 加载视图失败: ${error.message}</div>`;
        }
    }
};
