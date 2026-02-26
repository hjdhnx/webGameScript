
/**
 * 模拟输入文本
 * 尝试向当前聚焦的元素或指定元素输入文本
 * @param {string} text - 要输入的文本
 * @param {HTMLElement|string} [target] - 目标元素或选择器，如果不传则默认为当前聚焦元素
 */
export async function inputText(text, target = null) {
    let el = null;
    
    if (target) {
        if (typeof target === 'string') {
            el = document.querySelector(target);
        } else if (target instanceof HTMLElement) {
            el = target;
        }
    }
    
    // 如果没有指定目标，尝试获取当前聚焦元素
    if (!el) {
        el = document.activeElement;
    }

    if (!el || el === document.body) {
        console.warn('[Input] 未找到输入目标，请先点击输入框或指定目标');
        return false;
    }

    console.log(`[Input] 输入文本 "${text}" 到`, el);

    // 聚焦元素
    el.focus();

    // 尝试修改值
    // 1. 对于 input/textarea
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        
        // React/Vue 等框架可能重写了 value 属性的 setter，需要特殊处理
        // 获取原始的 setter
        let nativeSetter;
        if (el.tagName === 'INPUT') {
            nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
        } else {
            nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        }

        if (nativeSetter) {
            nativeSetter.call(el, text);
        } else {
            el.value = text;
        }

        // 触发 input 事件 (模拟用户输入)
        el.dispatchEvent(new Event('input', { bubbles: true }));
        // 触发 change 事件
        el.dispatchEvent(new Event('change', { bubbles: true }));
    } 
    // 2. 对于 contenteditable 元素
    else if (el.isContentEditable) {
        el.textContent = text;
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    // 3. 其他情况，尝试发送键盘事件（兼容性较差，仅作尝试）
    else {
        // 这里只是简单模拟，对于复杂的 canvas 游戏可能无效
        // 真正的键盘模拟需要更底层的 API，浏览器 JS 受限
        console.warn('[Input] 目标元素不是标准输入框，尝试发送键盘事件可能无效');
        
        // 模拟逐字输入
        for (const char of text) {
            const opts = {
                key: char,
                code: `Key${char.toUpperCase()}`,
                bubbles: true,
                cancelable: true
            };
            el.dispatchEvent(new KeyboardEvent('keydown', opts));
            el.dispatchEvent(new KeyboardEvent('keypress', opts));
            el.dispatchEvent(new KeyboardEvent('keyup', opts));
            await new Promise(r => setTimeout(r, 10));
        }
    }

    return true;
}
