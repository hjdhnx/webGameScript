import { h } from '../utils/dom.js';

export const Dialog = (() => {
    let overlay, panel, titleEl, contentEl, inputEl, buttonArea;
    let resolvePromise = null;

    function ensure() {
        return new Promise((resolve) => {
            // 检查所有必要的DOM元素是否都已创建
            if (overlay && titleEl && contentEl && buttonArea) {
                resolve();
                return;
            }

            // 确保document.body已经存在
            if (!document.body) {
                console.error('Dialog: document.body not ready');
                setTimeout(() => ensure().then(resolve), 100);
                return;
            }

            initializeDialog();
            resolve();
        });
    }

    function initializeDialog() {

        // 创建遮罩层
        overlay = h('div', {
            'data-tmx-ui': 'true',
            style: {
                position: 'fixed',
                inset: '0',
                zIndex: 2147483647, // 最高层级，确保在指令管理界面之上
                display: 'none',
                background: 'rgba(0,0,0,0.5)',
                alignItems: 'center',
                justifyContent: 'center'
            }
        });

        // 创建对话框面板
        panel = h('div', {
            style: {
                width: '320px',
                maxWidth: '90vw',
                background: '#fff',
                borderRadius: '4px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
                overflow: 'hidden',
                fontFamily: 'Arial, sans-serif'
            }
        });

        // 标题栏
        const header = h('div', {
            style: {
                padding: '12px 15px',
                borderBottom: '1px solid #eee',
                background: 'var(--tmx-bg)',
                color: 'var(--tmx-fg)',
                fontWeight: 'bold',
                fontSize: '14px',
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                gap: '8px',
                lineHeight: '1.4',
                whiteSpace: 'normal',
                wordWrap: 'break-word',
                minHeight: '40px'
            }
        });

        titleEl = h('div', {
            style: {
                flex: '1 1 auto',
                minWidth: '0',
                marginRight: '10px',
                lineHeight: '1.4',
                fontSize: '14px',
                whiteSpace: 'normal',
                wordWrap: 'break-word',
                wordBreak: 'break-word',
                overflowWrap: 'anywhere',
                overflow: 'visible'
            }
        }, '对话框');

        // 右上角关闭按钮
        const closeButton = h('button', {
            style: {
                background: 'none',
                border: 'none',
                color: 'var(--tmx-fg)',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '0',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '2px',
                marginLeft: 'auto',
                flex: '0 0 auto'
            },
            onclick: () => hide(null)
        }, '×');

        // 鼠标悬停效果
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.background = 'rgba(255,255,255,0.2)';
        });
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.background = 'none';
        });

        header.appendChild(titleEl);
        header.appendChild(closeButton);

        // 内容区域
        contentEl = h('div', {
            style: {
                padding: '15px',
                minHeight: '50px',
                maxHeight: '300px',
                overflow: 'auto',
                whiteSpace: 'normal',
                wordWrap: 'break-word',
                lineHeight: '1.5'
            }
        });

        // 输入框区域（用于prompt）
        inputEl = h('input', {
            type: 'text',
            style: {
                display: 'none',
                width: '100%',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginTop: '10px',
                boxSizing: 'border-box'
            }
        });
        contentEl.appendChild(inputEl);

        // 按钮区域
        buttonArea = h('div', {
            style: {
                padding: '10px 15px',
                borderTop: '1px solid #eee',
                textAlign: 'right'
            }
        });

        panel.append(header, contentEl, buttonArea);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        // 添加调试日志
        console.log('Dialog: DOM elements created and appended to body');
    }

    function createButton(text, isPrimary = false, onClick) {
        return h('button', {
            style: {
                padding: '6px 12px',
                marginLeft: '8px',
                background: isPrimary ? 'var(--tmx-bg)' : '#f8f9fa',
                color: isPrimary ? 'var(--tmx-fg)' : '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
            },
            onclick: onClick
        }, text);
    }

    async function show(title, content, options = {}) {
        await ensure();
        if (!titleEl) {
            console.error('Dialog show: titleEl is still undefined after ensure()');
            return;
        }
        titleEl.textContent = title || '提示';

        // 清理旧内容
        const oldContent = contentEl.querySelectorAll(':not(input)');
        oldContent.forEach(el => el.remove());

        // 设置内容
        if (typeof content === 'string') {
            const contentNode = document.createElement('div');
            contentNode.innerHTML = content;
            // 设置内容区域的文本换行样式
            contentNode.style.whiteSpace = 'normal';
            contentNode.style.wordWrap = 'break-word';
            contentNode.style.wordBreak = 'break-word';
            contentNode.style.overflowWrap = 'anywhere';
            contentNode.style.lineHeight = '1.5';
            contentEl.insertBefore(contentNode, inputEl);
        } else {
            contentEl.insertBefore(content, inputEl);
        }

        // 处理输入框
        inputEl.style.display = options.showInput ? 'block' : 'none';
        inputEl.value = options.defaultValue || '';
        if (options.showInput) {
            setTimeout(() => inputEl.focus(), 100);
        }

        // 清空并添加按钮
        buttonArea.innerHTML = '';
        if (options.buttons) {
            options.buttons.forEach(btn => {
                buttonArea.appendChild(btn);
            });
        }

        // 显示对话框
        overlay.style.display = 'flex';

        // 返回Promise
        return new Promise(resolve => {
            resolvePromise = resolve;
        });
    }

    function hide(result) {
        if (overlay) {
            overlay.style.display = 'none';
            // 清理内容
            const oldContent = contentEl.querySelectorAll(':not(input)');
            oldContent.forEach(el => el.remove());
            inputEl.style.display = 'none';
            inputEl.value = '';
            buttonArea.innerHTML = '';
        }
        if (resolvePromise) {
            resolvePromise(result);
            resolvePromise = null;
        }
    }

    function alert(message, title = '提示') {
        const okButton = createButton('确定', true, () => hide(true));
        return show(title, message, {
            buttons: [okButton]
        });
    }

    function confirm(message, title = '确认') {
        const cancelButton = createButton('取消', false, () => hide(false));
        const okButton = createButton('确定', true, () => hide(true));
        return show(title, message, {
            buttons: [cancelButton, okButton]
        });
    }

    function prompt(message, defaultValue = '', title = '输入') {
        const cancelButton = createButton('取消', false, () => hide(null));
        const okButton = createButton('确定', true, () => hide(inputEl.value));
        return show(title, message, {
            showInput: true,
            defaultValue: defaultValue,
            buttons: [cancelButton, okButton]
        });
    }

    async function multilinePrompt(message, defaultValue = '', title = '多行输入', options = {}) {
        await ensure();
        titleEl.textContent = title || '多行输入';

        // 清理旧内容
        const oldContent = contentEl.querySelectorAll(':not(input)');
        oldContent.forEach(el => el.remove());

        // 设置内容
        if (typeof message === 'string') {
            const contentNode = document.createElement('div');
            contentNode.innerHTML = message;
            contentEl.insertBefore(contentNode, inputEl);
        } else {
            contentEl.insertBefore(message, inputEl);
        }

        // 创建多行文本输入框
        const textareaEl = h('textarea', {
            style: {
                width: options.width || '100%',
                height: options.height || '200px',
                padding: '8px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                marginTop: '10px',
                boxSizing: 'border-box',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '12px',
                lineHeight: '1.4',
                resize: 'both',
                minHeight: '100px',
                maxHeight: '400px'
            },
            placeholder: options.placeholder || '请输入代码...'
        });
        textareaEl.value = defaultValue || '';
        contentEl.insertBefore(textareaEl, inputEl);

        // 隐藏原输入框
        inputEl.style.display = 'none';

        // 调整对话框大小
        panel.style.width = options.dialogWidth || '600px';
        panel.style.maxWidth = '90vw';

        // 创建按钮
        const cancelButton = createButton('取消', false, () => {
            panel.style.width = '320px'; // 恢复默认宽度
            hide(null);
        });
        const okButton = createButton('确定', true, () => {
            const value = textareaEl.value;
            panel.style.width = '320px'; // 恢复默认宽度
            hide(value);
        });

        // 清空并添加按钮
        buttonArea.innerHTML = '';
        buttonArea.appendChild(cancelButton);
        buttonArea.appendChild(okButton);

        // 显示对话框
        overlay.style.display = 'flex';

        // 聚焦到文本框
        setTimeout(() => textareaEl.focus(), 100);

        // 返回Promise
        return new Promise(resolve => {
            resolvePromise = resolve;
        });
    }

    function applyTheme() {
        if (!panel || !buttonArea) return;
        const header = panel.querySelector('div');
        if (header) {
            header.style.background = 'var(--tmx-bg)';
            header.style.color = 'var(--tmx-fg)';
        }

        const primaryButtons = buttonArea.querySelectorAll('button');
        primaryButtons.forEach((btn, index) => {
            if (index === primaryButtons.length - 1) { // 主按钮通常是最后一个
                btn.style.background = 'var(--tmx-bg)';
                btn.style.color = 'var(--tmx-fg)';
            }
        });
    }

    // 初始化函数，确保DOM元素已创建
    function initialize() {
        // 确保DOM元素已创建
        ensure();
        console.log('Dialog: 初始化完成');
    }

    return { alert, confirm, prompt, multilinePrompt, applyTheme, initialize };
})();
