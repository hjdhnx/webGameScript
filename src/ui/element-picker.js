
import { h } from '../utils/dom.js';
import { Toast } from './toast.js';
import { copyWithGreasemonkey } from '../utils/debug-helpers.js';

export const ElementPicker = (() => {
    let active = false;
    let overlay = null;
    let highlightedElement = null;

    function start() {
        if (active) return;
        active = true;
        
        // 创建透明覆盖层，用于捕获鼠标事件
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
                background: 'rgba(0, 0, 0, 0.05)' // 极淡的背景，表明正在操作
            }
        });
        
        // 阻止右键菜单，用作取消
        overlay.addEventListener('contextmenu', cancel);
        
        // 监听点击
        overlay.addEventListener('click', handleClick);
        
        // 监听鼠标移动，高亮显示元素
        overlay.addEventListener('mousemove', handleMouseMove);
        
        document.body.appendChild(overlay);
        Toast.show('提示', '请点击选择输入框或其他元素\n移动鼠标预览，右键取消');
    }

    function stop() {
        if (!active) return;
        active = false;
        
        if (highlightedElement) {
            highlightedElement.style.outline = '';
            highlightedElement = null;
        }

        if (overlay) {
            overlay.remove();
            overlay = null;
        }
    }
    
    function cancel(e) {
        e.preventDefault();
        stop();
        Toast.show('提示', '已取消元素拾取');
    }

    function handleMouseMove(e) {
        if (!active) return;
        
        // 暂时隐藏 overlay 以便获取下方的元素
        overlay.style.pointerEvents = 'none';
        const el = document.elementFromPoint(e.clientX, e.clientY);
        overlay.style.pointerEvents = 'auto';

        if (el && el !== highlightedElement) {
            // 清除旧的高亮
            if (highlightedElement) {
                highlightedElement.style.outline = '';
            }
            
            // 忽略脚本自身的UI
            if (el.closest('[data-tmx-ui="true"]')) {
                highlightedElement = null;
                return;
            }

            highlightedElement = el;
            highlightedElement.style.outline = '2px solid red';
        }
    }

    function handleClick(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if (!highlightedElement) {
            // 尝试再次获取
             handleMouseMove(e);
        }

        if (highlightedElement) {
            const selector = generateSelector(highlightedElement);
            let code;
            
            // 智能生成代码
            if (highlightedElement.tagName === 'INPUT' || highlightedElement.tagName === 'TEXTAREA') {
                code = `await inputText('内容', '${selector}');`;
            } else {
                code = `await clickgo('${selector}');`;
            }
            
            const success = copyWithGreasemonkey(code);
            
            if (success) {
                Toast.show('拾取成功', `已拾取元素: ${selector}\n代码已复制: ${code}`);
            } else {
                Toast.show('拾取成功', `拾取成功: ${selector}\n复制失败，请手动复制控制台输出`);
            }
            
            console.log(`[ElementPicker] Picked:`, highlightedElement);
            console.log(`[ElementPicker] Selector: ${selector}`);
            console.log(`[ElementPicker] Code: ${code}`);
        } else {
             Toast.show('提示', '未选中任何元素');
        }
        
        stop();
    }

    // 生成唯一的 CSS 选择器
    function generateSelector(el) {
        if (el.id) return `#${el.id}`;
        
        const path = [];
        let current = el;
        
        while (current && current.nodeType === Node.ELEMENT_NODE) {
            let selector = current.nodeName.toLowerCase();
            
            if (current.id) {
                selector = '#' + current.id;
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
            
            // 限制长度，避免生成的选择器过长
            if (path.length >= 4) break; 
        }
        return path.join(" > ");
    }

    return { start, stop };
})();
