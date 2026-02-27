/**
 * CSS 选择器生成工具
 * 提供简易模式和全路径模式
 */

/**
 * 检查选择器在文档中是否唯一
 * @param {string} selector 
 * @returns {boolean}
 */
function isUnique(selector) {
    try {
        return document.querySelectorAll(selector).length === 1;
    } catch (e) {
        return false;
    }
}

/**
 * 转义 CSS 特殊字符
 * @param {string} str 
 * @returns {string}
 */
function escape(str) {
    if (typeof CSS !== 'undefined' && CSS.escape) {
        return CSS.escape(str);
    }
    return str.replace(/([!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~])/g, '\\$1');
}

/**
 * 生成全路径选择器 (原有逻辑优化)
 * 倾向于使用层级结构: div > div:nth-of-type(2) > span
 * @param {HTMLElement} el 
 * @returns {string}
 */
export function generateFullPathSelector(el) {
    if (el.id) return `#${escape(el.id)}`;
    
    const path = [];
    let current = el;
    
    while (current && current.nodeType === Node.ELEMENT_NODE) {
        let selector = current.nodeName.toLowerCase();
        
        if (current.id) {
            selector = '#' + escape(current.id);
            path.unshift(selector);
            break;
        } else {
            let sib = current, nth = 1;
            while (sib = sib.previousElementSibling) {
                if (sib.nodeName.toLowerCase() == selector)
                   nth++;
            }
            if (nth != 1)
                selector += ":nth-of-type("+nth+")";
        }
        path.unshift(selector);
        current = current.parentNode;
    }
    return path.join(" > ");
}

/**
 * 生成简易选择器
 * 优先使用 ID > 唯一Class > 唯一Tag > Tag+Class > 组合Class > 属性 > 短路径
 * @param {HTMLElement} el 
 * @returns {string}
 */
export function generateSimpleSelector(el) {
    const tagName = el.tagName.toLowerCase();

    // 1. ID
    if (el.id) {
        const selector = `#${escape(el.id)}`;
        if (isUnique(selector)) return selector;
    }

    // 2. Class handling (improved for SVG support and combinations)
    const classAttr = el.getAttribute('class');
    if (classAttr) {
        const classes = classAttr.split(/\s+/).filter(c => c.trim());
        
        // 2.1 Single Class
        for (const cls of classes) {
            const selector = `.${escape(cls)}`;
            if (isUnique(selector)) return selector;
            
            // Tag + Single Class
            const tagSelector = `${tagName}${selector}`;
            if (isUnique(tagSelector)) return tagSelector;
        }

        // 2.2 Two Classes Combination
        if (classes.length >= 2) {
             for (let i = 0; i < classes.length; i++) {
                for (let j = i + 1; j < classes.length; j++) {
                    const selector = `.${escape(classes[i])}.${escape(classes[j])}`;
                    if (isUnique(selector)) return selector;
                    
                    const tagSelector = `${tagName}${selector}`;
                    if (isUnique(tagSelector)) return tagSelector;
                }
             }
        }
        
        // 2.3 All Classes (if more than 2)
        if (classes.length > 2) {
            const comboSelector = `.${classes.map(escape).join('.')}`;
            if (isUnique(comboSelector)) return comboSelector;
            const tagComboSelector = `${tagName}${comboSelector}`;
            if (isUnique(tagComboSelector)) return tagComboSelector;
        }
    }

    // 3. 唯一 Tag
    if (isUnique(tagName)) return tagName;

    // 4. 常见属性 (name, type, alt, title, aria-label)
    const attrs = ['name', 'type', 'alt', 'title', 'aria-label', 'placeholder', 'data-id', 'data-test-id'];
    for (const attr of attrs) {
        const val = el.getAttribute(attr);
        if (val) {
            const selector = `${tagName}[${attr}="${escape(val)}"]`;
            if (isUnique(selector)) return selector;
        }
    }
    
    // 5. 如果是链接，尝试 href
    if (tagName === 'a' && el.href) {
        const href = el.getAttribute('href');
        if (href) {
             const selector = `a[href="${escape(href)}"]`;
             if (isUnique(selector)) return selector;
        }
    }

    // 6. 降级到全路径
    return generateFullPathSelector(el);
}
