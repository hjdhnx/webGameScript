import { CONFIG } from '../config.js';

export function getLayoutOffset(defaultOffset = 10) {
    // 使用 includes 防止 Rollup 将此代码块视为死代码而被移除 (Tree Shaking)
    if (['auto'].includes(CONFIG.layoutMode)) {
        const isMobile = /Android|iPhone|SymbianOS|Windows Phone|iPad|iPod/i.test(navigator.userAgent);
        if (isMobile) return 10;
        const h = window.screen.height;
        if (h === 1080) return 300;
        if (h === 768) return 100;
        if (h === 720) return 50;
        if (h < 720) return 0;
        if (h > 1080) return 500;
        return defaultOffset;
    }
    return Number(CONFIG.layoutOffset) || defaultOffset;
}

export const ZIndexManager = {
    baseZIndex: 2147483647, // 最高基础层级
    currentZIndex: 2147483647,
    
    getNextZIndex() {
        return ++this.currentZIndex;
    },
    
    // 确保元素在最上层
    bringToTop(element) {
        element.style.zIndex = this.getNextZIndex();
    }
};
