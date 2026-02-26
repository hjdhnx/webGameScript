import { h } from '../utils/dom.js';
import { CONFIG } from '../config.js';
import { Dialog } from '../ui/dialog.js';
import { Logger } from '../utils/logger.js';
import { CommandStorage } from './command-storage.js';
import { Toast } from '../ui/toast.js';
import { GroupPopup } from '../ui/group-popup.js';
import { executeScript } from '../utils/script-executor.js';

export const DebugWindowManager = (() => {
    let windowCounter = 0;
    const activeWindows = new Map();
    const minimizedWindows = new Map();
    let minimizedContainer = null;

    function createMinimizedContainer() {
        // 动态计算Toast弹窗的实际高度，为调试窗口留出空间
        const toastElement = document.getElementById('tmx-toast');
        let toastHeight = 0;
        if (toastElement && toastElement.style.display !== 'none') {
            // 弹窗显示时，获取其实际高度
            toastHeight = toastElement.offsetHeight;
        }
        // 如果没有弹窗或获取不到高度，使用默认值
        if (toastHeight === 0) {
            toastHeight = 50; // 默认高度
        }
        const bottomOffset = 10 + toastHeight + 15; // 基础间距 + Toast实际高度 + 额外间距，避免遮挡弹窗按钮

        if (minimizedContainer) {
            // 如果容器已存在，更新其位置
            minimizedContainer.style.bottom = bottomOffset + 'px';
            return;
        }

        minimizedContainer = h('div', {
            style: {
                position: 'fixed',
                bottom: bottomOffset + 'px',
                right: '10px',
                zIndex: 2147483646,
                display: 'flex',
                flexDirection: 'column',
                gap: '5px',
                maxWidth: '300px'
            }
        });

        document.body.appendChild(minimizedContainer);
    }

    function createDebugWindow(defaultCode = '') {
        windowCounter++;
        const windowId = `debug-window-${windowCounter}`;

        // 检测是否为移动端设备
        const isMobile = /Android|iPhone|SymbianOS|Windows Phone|iPad|iPod/i.test(navigator.userAgent);
        
        // 创建窗口遮罩
        const overlay = h('div', {
            'data-tmx-ui': 'true',
            style: {
                position: 'fixed',
                inset: '0',
                zIndex: 2147483640,
                display: 'flex',
                background: 'rgba(0,0,0,0.3)',
                alignItems: isMobile ? 'flex-start' : 'center',
                justifyContent: 'center',
                paddingTop: isMobile ? (CONFIG.buttonTop + CONFIG.buttonHeight * 3 + 20) + 'px' : '0'
            }
        });

        // 创建窗口面板
        const panel = h('div', {
            style: {
                width: '700px',
                maxWidth: '90vw',
                background: '#fff',
                borderRadius: '6px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                overflow: 'hidden',
                fontFamily: 'Arial, sans-serif',
                display: 'flex',
                flexDirection: 'column',
                maxHeight: isMobile && window.innerHeight <= 667 ? '70vh' : '80vh' // iPhone SE等小屏设备优化
            }
        });

        // 标题栏
        const header = h('div', {
            style: {
                padding: '10px 15px',
                borderBottom: '1px solid #eee',
                background: 'var(--tmx-bg)',
                color: 'var(--tmx-fg)',
                fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }
        });

        const titleEl = h('span', {}, `调试代码 #${windowCounter}`);

        // 窗口控制按钮容器
        const controlButtons = h('div', {
            style: {
                display: 'flex',
                gap: '5px'
            }
        });

        // 最小化按钮
        const minimizeButton = h('button', {
            style: {
                background: 'none',
                border: 'none',
                color: 'var(--tmx-fg)',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '2px',
                lineHeight: '1'
            },
            onclick: () => minimizeWindow(windowId)
        }, '−');

        // 关闭按钮
        const closeButton = h('button', {
            style: {
                background: 'none',
                border: 'none',
                color: 'var(--tmx-fg)',
                fontSize: '16px',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: '2px',
                lineHeight: '1'
            },
            onclick: () => closeWindow(windowId)
        }, '×');

        // 按钮悬停效果
        [minimizeButton, closeButton].forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.background = 'rgba(255,255,255,0.2)';
            });
            btn.addEventListener('mouseleave', () => {
                btn.style.background = 'none';
            });
        });

        controlButtons.appendChild(minimizeButton);
        controlButtons.appendChild(closeButton);
        header.appendChild(titleEl);
        header.appendChild(controlButtons);

        // 添加拖动功能
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        // 设置标题栏样式支持拖动
        header.style.cursor = 'move';
        header.style.userSelect = 'none';

        header.addEventListener('mousedown', (e) => {
            // 只有点击标题区域才能拖动，避免点击按钮时触发拖动
            if (e.target === header || e.target === titleEl) {
                isDragging = true;
                const rect = panel.getBoundingClientRect();
                dragOffset.x = e.clientX - rect.left;
                dragOffset.y = e.clientY - rect.top;

                // 防止文本选择
                e.preventDefault();

                // 添加全局鼠标事件
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
            }
        });

        function handleMouseMove(e) {
            if (!isDragging) return;

            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;

            // 限制窗口不超出视窗边界
            const maxX = window.innerWidth - panel.offsetWidth;
            const maxY = window.innerHeight - panel.offsetHeight;

            const constrainedX = Math.max(0, Math.min(newX, maxX));
            const constrainedY = Math.max(0, Math.min(newY, maxY));

            panel.style.position = 'fixed';
            panel.style.left = constrainedX + 'px';
            panel.style.top = constrainedY + 'px';
            panel.style.transform = 'none';
        }

        function handleMouseUp() {
            isDragging = false;
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        }

        // 内容区域
        const contentEl = h('div', {
            style: {
                padding: '15px',
                flex: '1',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }
        });

        // 多行文本输入框
        const textareaEl = h('textarea', {
            style: {
                width: '100%',
                height: isMobile && window.innerHeight <= 667 ? '200px' : '300px', // 小屏设备减少高度
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '4px',
                boxSizing: 'border-box',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                fontSize: '13px',
                lineHeight: '1.4',
                resize: 'vertical',
                minHeight: isMobile && window.innerHeight <= 667 ? '150px' : '200px', // 小屏设备减少最小高度
                maxHeight: isMobile && window.innerHeight <= 667 ? '300px' : '500px', // 小屏设备减少最大高度
                flex: '1'
            },
            placeholder: '请输入JavaScript代码...\n\n支持多行输入，例如:\nconsole.log("调试信息");\nalert("弹窗测试");\ndocument.querySelector("body").style.background = "red";'
        });
        textareaEl.value = defaultCode;

        // 按钮区域
        const buttonArea = h('div', {
            style: {
                padding: '15px',
                borderTop: '1px solid #eee',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px'
            }
        });

        // 执行按钮
        const executeButton = h('button', {
            style: {
                padding: '8px 16px',
                background: 'var(--tmx-bg)',
                color: 'var(--tmx-fg)',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
            },
            onclick: () => executeCode(textareaEl.value, windowId)
        }, '执行代码');

        // 添加到指令集按钮
        const addToCommandButton = h('button', {
            style: {
                padding: '8px 16px',
                background: '#FF9800',
                color: '#ffffff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginRight: '5px'
            },
            onclick: () => addToCommandSet(textareaEl.value)
        }, '添加到指令集');

        // 从指令集选择按钮
        const selectFromCommandButton = h('button', {
            style: {
                padding: '8px 16px',
                background: '#4CAF50',
                color: '#ffffff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginRight: '5px'
            },
            onclick: () => selectFromCommandSet(textareaEl)
        }, '从指令集选择');

        // 快捷指令按钮
        const snippetButton = h('button', {
            style: {
                padding: '8px 16px',
                background: '#17a2b8',
                color: '#ffffff',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                marginRight: '5px'
            },
            onclick: () => showSnippets(textareaEl)
        }, '快捷指令');

        // 清空按钮
        const clearButton = h('button', {
            style: {
                padding: '8px 16px',
                background: '#f8f9fa',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
            },
            onclick: () => {
                textareaEl.value = '';
                textareaEl.focus();
            }
        }, '清空');

        buttonArea.appendChild(clearButton);
        buttonArea.appendChild(addToCommandButton);
        buttonArea.appendChild(snippetButton);
        buttonArea.appendChild(selectFromCommandButton);
        buttonArea.appendChild(executeButton);

        contentEl.appendChild(textareaEl);
        panel.appendChild(header);
        panel.appendChild(contentEl);
        panel.appendChild(buttonArea);
        overlay.appendChild(panel);

        // 存储窗口信息
        const windowInfo = {
            id: windowId,
            overlay,
            panel,
            textareaEl,
            titleEl
        };

        activeWindows.set(windowId, windowInfo);
        document.body.appendChild(overlay);

        // 聚焦到文本框
        setTimeout(() => textareaEl.focus(), 100);

        return windowId;
    }

    function minimizeWindow(windowId) {
        const windowInfo = activeWindows.get(windowId);
        if (!windowInfo) return;

        // 隐藏窗口
        windowInfo.overlay.style.display = 'none';

        // 移动到最小化列表
        minimizedWindows.set(windowId, windowInfo);
        activeWindows.delete(windowId);

        // 创建最小化容器
        createMinimizedContainer();

        // 创建最小化项
        const minimizedItem = h('div', {
            style: {
                background: 'var(--tmx-bg)',
                color: 'var(--tmx-fg)',
                width: '120px',  // 设置固定宽度，与Toast弹窗一致
                height: '32px',  // 设置固定高度，与Toast弹窗一致
                padding: '8px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                boxSizing: 'border-box'  // 确保padding包含在尺寸内
            },
            onclick: () => restoreWindow(windowId)
        });

        const titleSpan = h('span', {}, windowInfo.titleEl.textContent);
        const closeBtn = h('span', {
            style: {
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
            },
            onclick: (e) => {
                e.stopPropagation();
                closeWindow(windowId);
            }
        }, '×');

        minimizedItem.appendChild(titleSpan);
        minimizedItem.appendChild(closeBtn);
        minimizedContainer.appendChild(minimizedItem);

        // 存储最小化项引用
        windowInfo.minimizedItem = minimizedItem;
    }

    function restoreWindow(windowId) {
        const windowInfo = minimizedWindows.get(windowId);
        if (!windowInfo) return;

        // 显示窗口
        windowInfo.overlay.style.display = 'flex';

        // 移回活动列表
        activeWindows.set(windowId, windowInfo);
        minimizedWindows.delete(windowId);

        // 移除最小化项
        if (windowInfo.minimizedItem) {
            windowInfo.minimizedItem.remove();
            delete windowInfo.minimizedItem;
        }

        // 如果没有最小化窗口了，移除容器
        if (minimizedWindows.size === 0 && minimizedContainer) {
            minimizedContainer.remove();
            minimizedContainer = null;
        }

        // 聚焦到文本框
        setTimeout(() => windowInfo.textareaEl.focus(), 100);
    }

    function closeWindow(windowId) {
        // 从活动窗口中移除
        const activeWindow = activeWindows.get(windowId);
        if (activeWindow) {
            activeWindow.overlay.remove();
            activeWindows.delete(windowId);
        }

        // 从最小化窗口中移除
        const minimizedWindow = minimizedWindows.get(windowId);
        if (minimizedWindow) {
            minimizedWindow.overlay.remove();
            if (minimizedWindow.minimizedItem) {
                minimizedWindow.minimizedItem.remove();
            }
            minimizedWindows.delete(windowId);
        }

        // 如果没有最小化窗口了，移除容器
        if (minimizedWindows.size === 0 && minimizedContainer) {
            minimizedContainer.remove();
            minimizedContainer = null;
        }
    }

    async function executeCode(code, windowId) {
        if (!code || code.trim() === '') {
            await Dialog.alert('请输入要执行的代码', '提示');
            return;
        }

        try {
            console.log(`[调试窗口 #${windowId}] 执行代码:`, code);
            const result = await executeScript(code);
            console.log(`[调试窗口 #${windowId}] 执行结果:`, result);

            // 显示执行结果
            if (result !== undefined) {
                const resultStr = typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
                await Dialog.alert(`执行结果:\n${resultStr}`, '调试结果');
            } else {
                await Dialog.alert('代码执行完成（无返回值）', '调试结果');
            }

            Logger.append(`[调试窗口] 执行成功: ${code.split('\n')[0]}${code.split('\n').length > 1 ? '...' : ''}`);
        } catch (error) {
            console.error(`[调试窗口 #${windowId}] 执行错误:`, error);
            await Dialog.alert(`执行错误:\n${error.message}\n\n堆栈信息:\n${error.stack}`, '调试错误');
            Logger.append(`[调试窗口] 执行错误: ${error.message}`);
        }
    }

    // 添加到指令集功能
    async function addToCommandSet(code) {
        if (!code || code.trim() === '') {
            await Dialog.alert('请先输入要保存的代码', '提示');
            return;
        }

        try {
            // 请求输入指令名称
            const commandName = await Dialog.prompt('请输入指令名称:', '', '添加到指令集');

            if (commandName === null) {
                // 用户取消了输入
                return;
            }

            if (!commandName || commandName.trim() === '') {
                await Dialog.alert('指令名称不能为空', '错误');
                return;
            }

            // 请求输入指令描述（可选）
            const commandDescription = await Dialog.prompt('请输入指令描述（可选）:', '', '添加到指令集');
            
            if (commandDescription === null) {
                // 用户取消了输入
                return;
            }

            // 检查指令名称是否已存在
            const existingCommands = CommandStorage.getAll();
            const nameExists = existingCommands.some(cmd => cmd.name === commandName.trim());

            if (nameExists) {
                const confirmed = await Dialog.confirm(`指令名称 "${commandName.trim()}" 已存在，是否覆盖？`, '确认覆盖');
                if (!confirmed) {
                    return;
                }
                // 删除同名指令
                const existingCommand = existingCommands.find(cmd => cmd.name === commandName.trim());
                if (existingCommand) {
                    CommandStorage.remove(existingCommand.id);
                }
            }

            // 添加指令到存储
            const success = CommandStorage.add(commandName.trim(), code.trim(), commandDescription ? commandDescription.trim() : '');

            if (success) {
                Toast.show(`指令 "${commandName.trim()}" 已添加到指令集`);
                console.log(`[指令集] 添加指令成功: ${commandName.trim()}`);
                Logger.append(`[指令集] 添加指令: ${commandName.trim()}`);

                // 如果指令选择器已打开，更新按钮显示
                if (window.commandSelector && window.commandSelector.visible) {
                    window.commandSelector.updateCommandButtons();
                }
            } else {
                await Dialog.alert('添加指令失败，请重试', '错误');
            }

        } catch (error) {
            console.error('[指令集] 添加指令失败:', error);
            await Dialog.alert(`添加指令失败: ${error.message}`, '错误');
        }
    }

    // 从指令集选择功能
    function selectFromCommandSet(textareaEl) {
        const commands = CommandStorage.getAll();
        if (commands.length === 0) {
            Toast.show('没有可选择的指令', 'warning');
            return;
        }

        // 创建临时的指令选择弹窗
        const commandSelectPopup = new GroupPopup('选择指令');
        
        // 为每个指令添加按钮
        commands.forEach(command => {
            commandSelectPopup.addButton(command.name, () => {
                // 将指令代码加载到调试代码区域
                textareaEl.value = command.code;
                textareaEl.focus();
                Toast.show(`已加载指令: ${command.name}`);
                console.log(`[调试执行器] 加载指令: ${command.name}`);
                Logger.append(`[调试执行器] 加载指令: ${command.name}`);
                
                // 关闭弹窗
                commandSelectPopup.hide();
            });
        });

        // 显示弹窗
        commandSelectPopup.show();
    }

    // 快捷指令列表
    const SNIPPETS = [
        { name: '点击(click)', code: 'await click(100, 100);' },
        { name: '睡眠(sleep)', code: 'await sleep(1000);' },
        { name: '输入(inputText)', code: "await inputText('内容', '#target');" },
        { name: '点击按钮(clickbtn)', code: "clickbtn('按钮文本');" },
        { name: '点击链接(clickhref)', code: "clickhref('链接文本');" },
        { name: '点击选择器(clickgo)', code: "clickgo('.css-selector');" },
        { name: '轻提示(Toast)', code: "Toast.show('提示内容');" },
        { name: '日志(log)', code: "console.log('日志信息');" },
        { name: '循环示例', code: "for (let i = 0; i < 5; i++) {\n    console.log(i);\n    await sleep(500);\n}" }
    ];

    // 显示快捷指令弹窗
    function showSnippets(textareaEl) {
        const popup = new GroupPopup('快捷指令');
        
        SNIPPETS.forEach(snippet => {
            // 提取函数名作为按钮文本，去掉参数部分，更简洁
            const btnText = snippet.name;
            popup.addButton(btnText, () => {
                insertTextAtCursor(textareaEl, snippet.code);
                popup.hide();
                // 自动将光标移动到参数位置 (如果可能)
                // 这里暂不实现复杂的光标定位，只是插入
            });
        });
        
        popup.show();
    }

    // 在光标处插入文本
    function insertTextAtCursor(textarea, text) {
        const startPos = textarea.selectionStart;
        const endPos = textarea.selectionEnd;
        textarea.value = textarea.value.substring(0, startPos) +
            text +
            textarea.value.substring(endPos, textarea.value.length);
        textarea.focus();
        textarea.selectionStart = startPos + text.length;
        textarea.selectionEnd = startPos + text.length;
    }

    function applyTheme() {
        // 为所有活动窗口应用主题
        activeWindows.forEach(windowInfo => {
            const header = windowInfo.panel.querySelector('div');
            if (header) {
                header.style.background = 'var(--tmx-bg)';
                header.style.color = 'var(--tmx-fg)';
            }

            const executeButton = windowInfo.panel.querySelector('button[onclick*="executeCode"]');
            if (executeButton) {
                executeButton.style.background = 'var(--tmx-bg)';
                executeButton.style.color = 'var(--tmx-fg)';
            }
        });

        // 为最小化项应用主题
        if (minimizedContainer) {
            const items = minimizedContainer.querySelectorAll('div');
            items.forEach(item => {
                item.style.background = 'var(--tmx-bg)';
                item.style.color = 'var(--tmx-fg)';
            });
        }
    }

    // 更新最小化容器位置的方法
    function updateMinimizedContainerPosition() {
        if (minimizedContainer && minimizedWindows.size > 0) {
            // 重新计算位置
            createMinimizedContainer();
        }
    }

    // 获取最小化容器信息的方法
    return {
        createWindow: createDebugWindow,
        closeWindow,
        minimizeWindow,
        restoreWindow,
        applyTheme,
        updateMinimizedContainerPosition
    };
})();
