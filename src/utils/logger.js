import { h } from './dom.js';
import { CONFIG } from '../config.js';
import { getLayoutOffset } from './layout.js';
import { buttonMap } from '../core/state.js';

export const Logger = (() => {
    let el, hooked = false, orig = { log: console.log, clear: console.clear };

    function ensure() {
        if (el) return;
        
        // 检测是否为移动端设备
        const isMobile = /Android|iPhone|SymbianOS|Windows Phone|iPad|iPod/i.test(navigator.userAgent);
        
        // 计算日志窗口的最大宽度：按钮宽度 * 总列数(5)
        const loggerMaxWidth = CONFIG.columnWidth * 5; // 70 * 5 = 350px
        
        let loggerStyle;
        if (isMobile) {
            // 移动端：日志窗体在隐藏日志按钮上方
            const hideLogBtn = buttonMap.get('toggle-log');
            let left = CONFIG.baseLeft + getLayoutOffset();
            
            // 计算合适的日志窗口高度，确保不超出屏幕顶部
            const viewportHeight = window.innerHeight;
            let maxLoggerHeight = Math.min(285, viewportHeight * 0.4); // 最大不超过视窗高度的40%
            let top = CONFIG.buttonTop - maxLoggerHeight - 10; // 日志窗体高度 + 10px间距
            
            // 如果隐藏日志按钮已存在，根据其位置动态调整
            if (hideLogBtn) {
                const btnRect = hideLogBtn.getBoundingClientRect();
                left = btnRect.left;
                top = btnRect.top - maxLoggerHeight - 10;
            }
            
            // 确保不超出视窗顶部，留出至少10px边距
            if (top < 10) {
                top = 10;
                // 如果顶部空间不足，重新计算高度
                const availableHeight = (hideLogBtn ? hideLogBtn.getBoundingClientRect().top : CONFIG.buttonTop) - 20;
                if (availableHeight > 100) {
                    maxLoggerHeight = Math.min(maxLoggerHeight, availableHeight);
                }
            }
            
            loggerStyle = {
                position: 'fixed', 
                left: left + 'px',
                top: top + 'px', 
                minWidth: '220px', 
                maxWidth: Math.min(loggerMaxWidth, window.innerWidth - 10) + 'px', // 移动端：5个按钮宽度或屏幕宽度-10px
                maxHeight: maxLoggerHeight + 'px',
                overflow: 'auto', 
                fontFamily: 'Helvetica,Arial,sans-serif', 
                fontSize: '12px',
                fontWeight: 'bold', 
                padding: '6px', 
                background: 'var(--tmx-bg)', 
                color: 'var(--tmx-fg)',
                border: '1px solid #aaa', 
                zIndex: 2147483640, // 降低层级，确保GroupPopup在上方 
                opacity: 0.9,
                wordWrap: 'break-word', 
                whiteSpace: 'pre-wrap'
            };
        } else {
            // PC端：保持原有位置（最后一列按钮右边）
            loggerStyle = {
                position: 'fixed', 
                left: (CONFIG.baseLeft + getLayoutOffset() + loggerMaxWidth) + 'px',
                top: (CONFIG.buttonTop + 3) + 'px', 
                minWidth: '220px', 
                maxWidth: loggerMaxWidth + 'px', // PC端使用计算出的最大宽度
                maxHeight: '285px',
                overflow: 'auto', 
                fontFamily: 'Helvetica,Arial,sans-serif', 
                fontSize: '12px',
                fontWeight: 'bold', 
                padding: '6px', 
                background: 'var(--tmx-bg)', 
                color: 'var(--tmx-fg)',
                border: '1px solid #aaa', 
                zIndex: 2147483646, 
                opacity: 0.9,
                wordWrap: 'break-word', 
                whiteSpace: 'pre-wrap'
            };
        }
        
        el = h('div', {
            id: 'tmx-logger',
            style: loggerStyle
        });
          document.body.appendChild(el);
    }

    function hook() {
        if (hooked) return;
        ensure();
        console.log = (...args) => {
            append(args.join(' '));
            orig.log.apply(console, args);
        };
        console.clear = () => {
            clear();
            orig.clear.apply(console);
        };
        hooked = true;
    }

    function append(text) {
        ensure();
        const row = h('div', {
            style: {
                lineHeight: '18px',
                background: el.children.length % 2 ? 'rgba(255,255,255,0.2)' : ''
            }
        }, text);
        el.appendChild(row);
        el.scrollTop = el.scrollHeight - el.clientHeight;
    }

    function clear() {
        if (el) el.innerHTML = '';
    }

    function hide() {
        if (el) el.style.display = 'none';
    }

    function show() {
        ensure();
        el.style.display = '';
    }

    function applyTheme() {
        if (el) {
            el.style.background = 'var(--tmx-bg)';
            el.style.color = 'var(--tmx-fg)';
        }
    }

    return { hook, append, clear, hide, show, applyTheme };
})();
