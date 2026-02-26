
import { Logger } from '../utils/logger.js';

/**
 * UI Protector
 * 监控脚本UI元素，防止被网页本身的操作（如 document.body.innerHTML 重写）清除。
 * 如果发现 UI 被清除，尝试重新初始化。
 */
export const UIProtector = (() => {
    let checkInterval = null;
    let initFunction = null;

    /**
     * 启动保护
     * @param {Function} initFn - 初始化函数，当检测到 UI 丢失时调用此函数重建 UI
     */
    function start(initFn) {
        if (checkInterval) clearInterval(checkInterval);
        initFunction = initFn;

        // 每 2 秒检查一次核心 UI 元素是否存在
        checkInterval = setInterval(check, 2000);
        console.log('[UIProtector] UI 保护已启动');
    }

    function check() {
        // 检查第1列容器是否存在
        // 我们的 UI 列是通过 Columns 类创建的，通常直接挂载在 body 下
        // 我们可以检查是否存在包含 data-tmx-ui 属性的元素，或者特定的列容器
        
        // 简单策略：检查是否还有我们的列容器
        // Columns 类创建的 div 通常没有特定的 ID，但我们可以检查是否有任何脚本创建的 UI
        // 注意：某些情况下，可能所有 UI 都被移除了，但也可能只是部分被移除
        // 这里我们检查最基础的列容器（Columns创建的div也有 data-tmx-ui 属性）
        const uiExists = document.querySelector('[data-tmx-ui="true"]');

        if (!uiExists) {
            console.warn('[UIProtector] 检测到 UI 丢失，正在尝试重新加载...');
            
            // 尝试重新执行初始化
            if (typeof initFunction === 'function') {
                try {
                    initFunction();
                    // 重新挂载 Logger，因为 Logger 的 DOM 也可能丢失了
                    Logger.hook(); 
                    Logger.append('[UIProtector] UI 丢失，已尝试恢复');
                } catch (e) {
                    console.error('[UIProtector] 重新加载失败:', e);
                }
            }
        }
    }

    function stop() {
        if (checkInterval) {
            clearInterval(checkInterval);
            checkInterval = null;
        }
    }

    return { start, stop };
})();
