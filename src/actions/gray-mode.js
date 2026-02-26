
import { store } from '../utils/store.js';

/**
 * 切换页面灰度模式 (默哀模式)
 * @param {boolean} enable - 是否开启
 */
export function setGrayMode(enable) {
    const html = document.documentElement;
    if (enable) {
        html.style.filter = 'grayscale(100%)';
        html.style.webkitFilter = 'grayscale(100%)';
    } else {
        html.style.filter = '';
        html.style.webkitFilter = '';
    }
}

/**
 * 初始化灰度模式
 * 在脚本启动时调用，检查存储状态并应用
 */
export function initGrayMode() {
    const enabled = store.get('gray_mode_enabled', 0) === 1;
    setGrayMode(enabled);
}
