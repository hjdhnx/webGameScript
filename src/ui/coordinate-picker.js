
import { h } from '../utils/dom.js';
import { Toast } from './toast.js';
import { copyWithGreasemonkey } from '../utils/debug-helpers.js';

export const CoordinatePicker = (() => {
    let active = false;
    let overlay = null;
    let handler = null;

    function start() {
        if (active) return;
        active = true;
        
        // 创建透明覆盖层
        overlay = h('div', {
            'data-tmx-ui': 'true',
            style: {
                position: 'fixed',
                top: '0',
                left: '0',
                width: '100vw',
                height: '100vh',
                zIndex: '2147483647',
                cursor: 'crosshair',
                background: 'rgba(0, 0, 0, 0.1)'
            }
        });
        
        // 阻止右键菜单，用作取消
        overlay.addEventListener('contextmenu', cancel);
        
        // 监听点击
        overlay.addEventListener('mousedown', handleClick);
        
        document.body.appendChild(overlay);
        Toast.show('请点击屏幕任意位置获取坐标\n右键取消', 'info');
    }

    function stop() {
        if (!active) return;
        active = false;
        if (overlay) {
            overlay.remove();
            overlay = null;
        }
    }
    
    function cancel(e) {
        e.preventDefault();
        stop();
        Toast.show('已取消坐标拾取');
    }

    function handleClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        const x = e.clientX;
        const y = e.clientY;
        
        const code = `await click(${x}, ${y});`;
        
        // 尝试复制到剪切板
        const copied = copyWithGreasemonkey(code);
        if (!copied) {
            // 如果GM_setClipboard不可用，尝试使用navigator.clipboard
            navigator.clipboard.writeText(code).catch(err => {
                console.warn('复制失败:', err);
            });
        }
        
        Toast.show(`坐标: ${x}, ${y}\n已复制代码: ${code}`, 'success');
        console.log(`[CoordinatePicker] Picked: ${x}, ${y}`);
        
        stop();
    }

    return { start, stop };
})();
