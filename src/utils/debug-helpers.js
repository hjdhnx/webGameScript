// 便捷点击函数 - 通过按钮名称点击
export function clickbtn(buttonText) {
    const buttons = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"], [role="button"]'));
    const targetButton = buttons.find(btn => {
        const text = btn.textContent || btn.value || btn.getAttribute('aria-label') || '';
        return text.trim().includes(buttonText);
    });

    if (targetButton) {
        targetButton.click();
        console.log(`点击按钮: ${buttonText}`);
        return targetButton;
    } else {
        console.warn(`未找到包含文本 "${buttonText}" 的按钮`);
        return null;
    }
}

// 便捷点击函数 - 通过链接名称点击
export function clickhref(linkText) {
    const links = Array.from(document.querySelectorAll('a'));
    const targetLink = links.find(link => {
        const text = link.textContent || link.getAttribute('title') || link.getAttribute('aria-label') || '';
        return text.trim().includes(linkText);
    });

    if (targetLink) {
        targetLink.click();
        console.log(`点击链接: ${linkText}`);
        return targetLink;
    } else {
        console.warn(`未找到包含文本 "${linkText}" 的链接`);
        return null;
    }
}

// 便捷点击函数 - 通过CSS选择器点击
export function clickgo(selector) {
    try {
        const element = document.querySelector(selector);
        if (element) {
            element.click();
            console.log(`点击元素: ${selector}`);
            return element;
        } else {
            console.warn(`未找到选择器 "${selector}" 对应的元素`);
            return null;
        }
    } catch (error) {
        console.error(`选择器 "${selector}" 无效: ${error.message}`);
        return null;
    }
}

export function copyWithGreasemonkey(text) {
    if (typeof GM_setClipboard !== 'undefined') {
        GM_setClipboard(text);
        console.log('内容已通过油猴脚本复制到剪贴板');
        return true;
    }
    return false;
}
