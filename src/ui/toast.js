import { h } from '../utils/dom.js';

export const Toast = (() => {
    let root, content, titleEl, minBtn;

    function ensure() {
        if (root) return;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        root = h('div', {
            id: 'tmx-toast',
            'data-tmx-ui': 'true',
            style: {
                position: 'fixed',
                right: '10px',
                bottom: '10px',
                minWidth: isMobile ? '200px' : '250px',
                maxWidth: isMobile ? '90vw' : '400px',
                width: 'auto',
                border: '1px solid #aaa',
                background: '#fff',
                zIndex: 2147483645,
                display: 'none'
            }
        });
        const header = h('div', {
            style: {
                height: '36px',
                lineHeight: '36px',
                padding: '0 8px',
                color: 'var(--tmx-fg)',
                background: 'var(--tmx-bg)',
                borderBottom: '1px solid #aaa',
                fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }
        });
        titleEl = h('span', {}, '通知');
        const btns = h('div', {
            style: {
                display: 'flex',
                gap: '5px'
            }
        });
        minBtn = h('button', {
            style: {
                background: 'none',
                border: 'none',
                color: 'var(--tmx-fg)',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '2px',
                lineHeight: '1'
            }
        }, '−');
        const closeBtn = h('button', {
            style: {
                background: 'none',
                border: 'none',
                color: 'var(--tmx-fg)',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '2px',
                lineHeight: '1'
            }
        }, '×');
        btns.append(minBtn, closeBtn);
        header.append(titleEl, btns);
        content = h('div', {
            style: {
                minHeight: '60px',
                maxHeight: isMobile ? '40vh' : '300px',
                width: '100%',
                overflow: 'auto',
                fontSize: '13px',
                fontWeight: 'normal',  // 确保文字不加粗
                padding: '8px',
                textAlign: 'left',
                background: '#fff',  // 设置内容区域背景色
                borderTop: '1px solid #eee',  // 添加顶部边框分隔线
                borderRight: '1px solid #eee'  // 添加右边框线条
            }
        });
        root.append(header, content);
        document.body.appendChild(root);
        let expanded = true;
        minBtn.addEventListener('click', () => {
            expanded = !expanded;
            if (expanded) {
                // 展开状态：恢复到右下角
                content.style.display = '';
                header.style.display = '';
                // 重置header的flex布局样式
                header.style.display = 'flex';
                header.style.justifyContent = 'space-between';
                header.style.alignItems = 'center';
                root.style.right = '10px';
                root.style.bottom = '10px';
                root.style.minWidth = isMobile ? '200px' : '250px';
                root.style.maxWidth = isMobile ? '90vw' : '400px';
                root.style.width = 'auto';
                root.style.height = '';
                root.style.padding = '';
                root.style.borderRadius = '';
                root.style.boxShadow = '';
                root.style.fontSize = '';
                root.style.display = '';       // 恢复默认display
                root.style.justifyContent = ''; // 清除flex属性
                root.style.alignItems = '';    // 清除flex属性
                root.style.boxSizing = '';
                root.style.background = '';    // 清除背景色
                root.style.color = '';         // 清除文字颜色
                root.style.cursor = '';        // 清除鼠标样式
                content.style.background = '#fff'; // 重置内容区域背景色
                content.style.borderTop = '1px solid #eee'; // 重置顶部边框
                content.style.borderRight = '1px solid #eee'; // 重置右边框
                content.style.fontWeight = 'normal'; // 重置字体粗细
                // 清空最小化内容 - 移除所有直接添加到root的子元素（除了header和content）
                const childrenToRemove = [];
                for (let child of root.children) {
                    if (child !== header && child !== content) {
                        childrenToRemove.push(child);
                    }
                }
                childrenToRemove.forEach(child => child.remove());
                // 弹窗还原后重新计算调试代码容器位置
                if (window.DebugWindow && window.DebugWindow.updateMinimizedContainerPosition) {
                    window.DebugWindow.updateMinimizedContainerPosition();
                }
            } else {
                // 最小化状态：固定在最右下角，样式与调试窗口一致
                content.style.display = 'none';
                header.style.display = 'none';
                // 弹窗提示固定在底部
                root.style.right = '10px';
                root.style.bottom = '10px';
                root.style.width = '120px';  // 设置固定宽度
                root.style.minWidth = '';     // 清除最小宽度限制
                root.style.maxWidth = '';     // 清除最大宽度限制
                root.style.height = '32px';  // 设置固定高度
                root.style.padding = '8px 12px';  // 与调试窗口最小化项一致
                root.style.borderRadius = '4px';  // 与调试窗口最小化项一致
                root.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)'; // 与调试窗口最小化项一致
                root.style.fontSize = '12px';     // 与调试窗口最小化项一致
                root.style.background = 'var(--tmx-bg)';  // 添加背景颜色，与全局皮肤色保持一致
                root.style.color = 'var(--tmx-fg)';      // 添加文字颜色
                root.style.display = 'flex';      // 使用flex布局，与调试窗口一致
                root.style.justifyContent = 'space-between'; // 与调试窗口布局一致
                root.style.alignItems = 'center'; // 垂直居中
                root.style.boxSizing = 'border-box'; // 确保padding包含在尺寸内
                root.style.cursor = 'pointer';

                // 创建最小化内容
                const minimizedTitle = h('span', {
                    style: {
                        fontWeight: 'normal'  // 确保最小化标题文字不加粗
                    }
                }, titleEl.textContent);
                const minimizedCloseBtn = h('span', {
                    style: {
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold'
                    },
                    onclick: (e) => {
                        e.stopPropagation();
                        root.remove();
                    }
                }, '×');

                // 先清理可能存在的旧的最小化元素
                const childrenToRemove = [];
                for (let child of root.children) {
                    if (child !== header && child !== content) {
                        childrenToRemove.push(child);
                    }
                }
                childrenToRemove.forEach(child => child.remove());
                
                root.appendChild(minimizedTitle);
                root.appendChild(minimizedCloseBtn);
                
                // 弹窗最小化后重新计算调试代码容器位置
                if (window.DebugWindow && window.DebugWindow.updateMinimizedContainerPosition) {
                    window.DebugWindow.updateMinimizedContainerPosition();
                }
            }
        });

        // 点击最小化状态时展开
        root.addEventListener('click', (e) => {
            if (!expanded && (e.target === root || e.target === root.minimizedContent || e.target.tagName === 'SPAN' && e.target.textContent !== '×')) {
                minBtn.click();
            }
        });
        closeBtn.addEventListener('click', () => root.remove());
    }

    function show(title, html) {
        ensure();
        // 如果只传了一个参数，且是字符串，那么它应该是内容，标题默认为"通知"
        if (html === undefined && typeof title === 'string') {
            html = title;
            title = '通知';
        }
        
        titleEl.textContent = title || '通知';
        
        if (html === undefined || html === null) {
            content.innerHTML = '';
        } else if (typeof html === 'string') {
            // 处理换行符，将其转换为 <br>
            content.innerHTML = html.replace(/\n/g, '<br>');
        } else {
            content.innerHTML = '';
            content.append(html);
        }
        root.style.display = '';
    }

    function resize(hh, ww) {
        ensure();
        content.style.height = Math.max(60, hh) + 'px';
        root.style.width = Math.max(220, ww) + 'px';
    }

    function hide() {
        if (root) {
            root.remove();
            root = null;
            content = null;
            titleEl = null;
            minBtn = null;
        }
    }

    function applyTheme() {
        ensure();
    }

    return { show, resize, hide, applyTheme };
})();
