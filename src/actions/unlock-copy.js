
import { h } from '../utils/dom.js';
import { Toast } from '../ui/toast.js';
import { store } from '../utils/store.js';

let styleEl = null;

const CSS = `
    * {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
    }
`;

const events = [
    'copy',
    'cut',
    'paste',
    'selectstart',
    'contextmenu',
    'dragstart',
    'mousedown',
    'mouseup',
    'keydown',
    'keyup'
];

function stopEvent(e) {
    e.stopPropagation();
    // 不要阻止所有的 mousedown/mouseup，这会影响正常交互
    // 只有当明确检测到是在阻止复制时才阻止
    // 这里采取激进策略：如果是copy/cut/paste/contextmenu，直接放行（因为我们想让它们工作）
    // 或者阻止网页对它们的拦截？
    
    // 逻辑反转：网页通常监听这些事件并 preventDefault() 来阻止复制
    // 我们需要在网页的监听器之前拦截，并阻止网页的监听器执行？
    // 在捕获阶段拦截，阻止后续传播？
    
    // 正确的做法：
    // 1. 捕获阶段监听
    // 2. 阻止事件继续传播到网页的监听器 (stopImmediatePropagation)
    // 3. 允许默认行为 (不要 preventDefault)
    
    // 但是对于 mousedown/mouseup，如果阻止传播，可能导致页面功能失效
    // 所以只针对核心事件处理
}

const handler = (e) => {
    e.stopPropagation();
    // e.stopImmediatePropagation(); // 这一步可能会导致页面其他功能失效，需谨慎
    return true;
};

// 针对特定事件的处理器，确保允许默认行为
const allowHandler = (e) => {
    e.stopImmediatePropagation(); // 阻止其他监听器执行
    return true;
};

export function setUnlockCopy(enable) {
    // 定义需要拦截的事件列表
    const events = ['copy', 'cut', 'paste', 'selectstart', 'contextmenu', 'dragstart', 'mousedown', 'mouseup', 'keydown', 'keyup'];

    if (enable) {
        // 1. 注入 CSS
        if (!styleEl) {
            styleEl = document.createElement('style');
            styleEl.innerHTML = `
                * {
                    -webkit-user-select: text !important;
                    -moz-user-select: text !important;
                    -ms-user-select: text !important;
                    user-select: text !important;
                }
            `;
            document.head.appendChild(styleEl);
        }

        // 2. 拦截事件
        // 使用捕获阶段，阻止事件向下一级传播，防止网页JS拦截
        events.forEach(evt => {
            window.addEventListener(evt, allowHandler, true);
            document.addEventListener(evt, allowHandler, true);
        });

        // 3. 定时清理内联属性 (暴力清除)
        window._unlockTimer = setInterval(() => {
            try {
                const targets = [document, document.body];
                const props = ['oncopy', 'oncut', 'onpaste', 'onselectstart', 'oncontextmenu'];
                targets.forEach(t => {
                    if(!t) return;
                    props.forEach(p => {
                        t[p] = null;
                    });
                });
            } catch(e) {}
        }, 1000);
        
        Toast.show('提示', '已开启解除复制限制\n现在可以尝试选择文本并复制');
    } else {
        // 1. 移除 CSS
        if (styleEl) {
            styleEl.remove();
            styleEl = null;
        }

        // 2. 移除事件监听
        events.forEach(evt => {
            window.removeEventListener(evt, allowHandler, true);
            document.removeEventListener(evt, allowHandler, true);
        });
        
        // 3. 清除定时器
        if (window._unlockTimer) {
            clearInterval(window._unlockTimer);
            window._unlockTimer = null;
        }

        Toast.show('提示', '已关闭解除复制限制');
    }
}



// 强制复制选中文本
export async function forceCopySelection() {
    const selection = window.getSelection();
    const text = selection.toString();
    
    if (!text) {
        Toast.show('提示', '请先选择要复制的文本');
        return;
    }

    // 优先使用 GM_setClipboard (它不依赖页面事件，也不受拦截器影响)
    if (typeof GM_setClipboard !== 'undefined') {
        try {
            GM_setClipboard(text, 'text');
            Toast.show('成功', '已强制复制选中内容到剪切板');
            return;
        } catch (e) {
            console.error('GM_setClipboard 失败，降级尝试:', e);
        }
    }

    // 如果必须使用 navigator.clipboard.writeText
    // 临时禁用拦截器，确保复制操作能通过
    const wasEnabled = styleEl !== null; // 通过 styleEl 判断是否开启
    const events = ['copy', 'cut', 'paste', 'selectstart', 'contextmenu', 'dragstart', 'mousedown', 'mouseup', 'keydown', 'keyup'];

    try {
        if (wasEnabled) {
            events.forEach(evt => {
                window.removeEventListener(evt, allowHandler, true);
                document.removeEventListener(evt, allowHandler, true);
            });
        }

        await navigator.clipboard.writeText(text);
        Toast.show('成功', '已复制选中内容');

    } catch (err) {
        console.error('复制失败:', err);
        Toast.show('错误', '复制失败: ' + err.message);
    } finally {
        // 恢复拦截器 (放在 finally 块中确保总是执行)
        // 重新检查 styleEl 状态，因为在此期间可能被关闭
        if (styleEl !== null) {
            events.forEach(evt => {
                window.addEventListener(evt, allowHandler, true);
                document.addEventListener(evt, allowHandler, true);
            });
        }
    }
}
