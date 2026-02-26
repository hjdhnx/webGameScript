
/**
 * 滚动页面
 * @param {number} x - 水平滚动距离或坐标
 * @param {number} y - 垂直滚动距离或坐标
 * @param {Object} [options] - 选项
 * @param {boolean} [options.absolute=false] - 是否为绝对坐标，false 为相对滚动
 * @param {string} [options.behavior='smooth'] - 滚动行为: 'auto' | 'instant' | 'smooth'
 * @param {string|HTMLElement} [options.target=window] - 滚动目标，默认 window，可选元素选择器或对象
 */
export async function scroll(x, y, options = {}) {
    const { absolute = false, behavior = 'smooth', target = window } = options;
    
    let el = target;
    if (typeof target === 'string') {
        el = document.querySelector(target);
    }
    
    if (!el) {
        console.warn('[Scroll] 未找到滚动目标:', target);
        return;
    }

    const scrollOptions = {
        behavior: behavior
    };

    if (absolute) {
        scrollOptions.left = x;
        scrollOptions.top = y;
        el.scrollTo(scrollOptions);
    } else {
        scrollOptions.left = x;
        scrollOptions.top = y;
        el.scrollBy(scrollOptions);
    }
    
    // 如果是平滑滚动，等待一段时间
    if (behavior === 'smooth') {
        // 估算滚动时间，或者固定等待
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

/**
 * 滚动到底部
 * @param {Object} options - 选项，同 scroll
 */
export async function scrollToBottom(options = {}) {
    const { target = window, behavior = 'smooth' } = options;
    let el = target;
    if (typeof target === 'string') {
        el = document.querySelector(target);
    }

    if (!el) return;

    if (el === window) {
        const y = document.body.scrollHeight;
        await scroll(0, y, { ...options, absolute: true });
    } else {
        const y = el.scrollHeight;
        await scroll(0, y, { ...options, absolute: true });
    }
}

/**
 * 滚动到顶部
 * @param {Object} options - 选项，同 scroll
 */
export async function scrollToTop(options = {}) {
    await scroll(0, 0, { ...options, absolute: true });
}

/**
 * 滚动元素到可视区域
 * @param {string|HTMLElement} selector - 元素选择器或对象
 * @param {string} [behavior='smooth'] - 滚动行为
 * @param {string} [block='center'] - 垂直对齐方式: 'start', 'center', 'end', 'nearest'
 */
export async function scrollIntoView(selector, behavior = 'smooth', block = 'center') {
    let el = selector;
    if (typeof selector === 'string') {
        el = document.querySelector(selector);
    }
    
    if (el) {
        el.scrollIntoView({ behavior, block });
        if (behavior === 'smooth') {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    } else {
        console.warn('[Scroll] 未找到目标元素:', selector);
    }
}
