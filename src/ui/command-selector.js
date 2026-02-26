import { GroupPopup } from './group-popup.js';
import { CommandStorage } from '../core/command-storage.js';
import { h } from '../utils/dom.js';
import { Toast } from './toast.js';
import { Dialog } from './dialog.js';
import { executeScript } from '../utils/script-executor.js';

export class CommandSelector extends GroupPopup {
    constructor() {
        super('指令集');
        this.updateCommandButtons();
    }

    updateCommandButtons() {
        // 清空现有按钮
        this.btnWrap.innerHTML = '';

        const commands = CommandStorage.getAll();

        // 创建导入按钮
        this.addButton('导入指令', () => this.importCommands());

        // 创建导出按钮
        this.addButton('导出指令', () => this.exportCommands());

        // 创建指令管理按钮
        this.addButton('指令管理', () => this.manageCommands());

        // 创建自定义指令按钮
        commands.forEach(command => {
            const btn = this.addButton(command.name, () => this.executeCommand(command));
            // 为自定义指令按钮添加右键删除功能
            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                if (confirm(`确定要删除指令 "${command.name}" 吗？`)) {
                    CommandStorage.remove(command.id);
                    this.updateCommandButtons();
                    console.log(`已删除指令: ${command.name}`);
                }
            });
            btn.title = `${command.name}\n\n右键删除指令`;
        });
    }

    async executeCommand(command) {
        try {
            console.log(`执行指令: ${command.name}`);
            const result = await executeScript(command.code);
            if (result !== undefined) {
                console.log('执行结果:', result);
            }
            Toast.show(`指令 "${command.name}" 执行完成`);
        } catch (error) {
            console.error('指令执行失败:', error);
            Toast.show(`指令执行失败: ${error.message}`, 'error');
        }
    }

    importCommands() {
        const input = h('input', {
            type: 'file',
            accept: '.json',
            style: { display: 'none' }
        });

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        if (CommandStorage.import(data)) {
                            this.updateCommandButtons();
                            Toast.show(`成功导入 ${data.length} 个指令`);
                        } else {
                            Toast.show('导入失败，请检查文件格式', 'error');
                        }
                    } catch (error) {
                        console.error('导入失败:', error);
                        Toast.show('导入失败，文件格式错误', 'error');
                    }
                };
                reader.readAsText(file);
            }
        });

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    }

    exportCommands() {
        const commands = CommandStorage.export();
        if (commands.length === 0) {
            Toast.show('没有可导出的指令', 'warning');
            return;
        }

        const dataStr = JSON.stringify(commands, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = h('a', {
            href: url,
            download: `custom_commands_${new Date().toISOString().slice(0, 10)}.json`,
            style: { display: 'none' }
        });

        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        Toast.show(`成功导出 ${commands.length} 个指令`);
    }

    manageCommands() {
        const commands = CommandStorage.getAll();
        if (commands.length === 0) {
            Toast.show('没有可管理的指令', 'warning');
            return;
        }

        // 创建指令管理弹窗
        this.createManageDialog(commands);
    }

    createManageDialog(commands) {
        // 创建指令管理弹窗遮罩
        const sortOverlay = h('div', {
            className: 'tmx-command-manage-dialog',
            style: {
                position: 'fixed',
                inset: '0',
                zIndex: 2147483646,
                display: 'flex',
                background: 'rgba(0,0,0,0.5)',
                alignItems: 'center',
                justifyContent: 'center'
            }
        });

        // 创建排序弹窗面板
        const sortPanel = h('div', {
            style: {
                width: '500px',
                maxWidth: '90vw',
                maxHeight: '80vh',
                background: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                overflow: 'hidden',
                fontFamily: 'Arial, sans-serif',
                display: 'flex',
                flexDirection: 'column'
            }
        });

        // 标题栏
        const header = h('div', {
            style: {
                padding: '15px 20px',
                borderBottom: '1px solid #eee',
                background: 'var(--tmx-bg)',
                color: 'var(--tmx-fg)',
                fontWeight: 'bold',
                fontSize: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }
        });

        const title = h('span', {}, '指令管理');
        const closeBtn = h('button', {
            style: {
                background: 'none',
                border: 'none',
                color: 'var(--tmx-fg)',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '0',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            },
            onclick: () => {
                document.body.removeChild(sortOverlay);
            }
        }, '×');

        header.appendChild(title);
        header.appendChild(closeBtn);

        // 说明文字
        const instruction = h('div', {
            style: {
                padding: '15px 20px 10px',
                color: '#666',
                fontSize: '14px',
                borderBottom: '1px solid #f0f0f0',
                lineHeight: '1.5',
                whiteSpace: 'normal',
                wordWrap: 'break-word'
            }
        }, '拖拽下方指令项目可调整执行顺序，点击红色删除按钮可删除指令，操作后点击"保存排序"生效');

        // 可排序列表容器
        const listContainer = h('div', {
            className: 'tmx-command-list-container',
            style: {
                flex: '1',
                overflow: 'auto',
                padding: '10px'
            }
        });

        // 创建可拖拽的指令列表
        const sortableList = this.createSortableList(commands.slice());
        listContainer.appendChild(sortableList);

        // 按钮区域
        const buttonArea = h('div', {
            style: {
                padding: '15px 20px',
                borderTop: '1px solid #eee',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px'
            }
        });

        const cancelBtn = h('button', {
            style: {
                padding: '8px 16px',
                background: '#f8f9fa',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
            },
            onclick: () => {
                document.body.removeChild(sortOverlay);
            }
        }, '取消');

        const saveBtn = h('button', {
            style: {
                padding: '8px 16px',
                background: 'var(--tmx-bg)',
                color: 'var(--tmx-fg)',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
            },
            onclick: () => {
                this.saveSortedCommands(sortableList);
                document.body.removeChild(sortOverlay);
            }
        }, '保存排序');

        buttonArea.appendChild(cancelBtn);
        buttonArea.appendChild(saveBtn);

        // 组装弹窗
        sortPanel.appendChild(header);
        sortPanel.appendChild(instruction);
        sortPanel.appendChild(listContainer);
        sortPanel.appendChild(buttonArea);
        sortOverlay.appendChild(sortPanel);

        // 点击遮罩关闭
        sortOverlay.addEventListener('click', (e) => {
            if (e.target === sortOverlay) {
                document.body.removeChild(sortOverlay);
            }
        });

        document.body.appendChild(sortOverlay);
    }

    refreshManageDialog() {
        // FIXME: 编辑指令保存后仍会创建重复的指令管理弹窗，需要进一步调试弹窗查找逻辑
        // 查找现有的指令管理弹窗
        const existingOverlay = document.querySelector('.tmx-command-manage-dialog');
        if (!existingOverlay) {
            // 如果没有现有弹窗，创建新的
            this.createManageDialog(CommandStorage.getAll());
            return;
        }

        // 找到列表容器并更新内容
        const listContainer = existingOverlay.querySelector('.tmx-command-list-container');
        if (listContainer) {
            // 清空现有内容
            listContainer.innerHTML = '';
            // 重新创建指令列表
            const newList = this.createSortableList(CommandStorage.getAll());
            listContainer.appendChild(newList);
        }
    }

    createSortableList(commands) {
        const list = h('div', {
            className: 'sortable-list',
            style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }
        });

        commands.forEach((command, index) => {
            const item = this.createSortableItem(command, index);
            list.appendChild(item);
        });

        // 添加拖拽功能
        this.makeSortable(list);

        return list;
    }

    createSortableItem(command, index) {
        const isRemote = command.isRemote;
        
        const item = h('div', {
            draggable: !isRemote, // 远程指令不可拖拽
            'data-command-id': command.id,
            'data-index': index,
            'data-is-remote': isRemote,
            style: {
                padding: '12px 15px',
                background: isRemote ? '#e8f4fd' : '#f8f9fa', // 远程指令使用不同背景色
                border: isRemote ? '1px solid #bee5eb' : '1px solid #e9ecef',
                borderRadius: '6px',
                cursor: isRemote ? 'default' : 'move', // 远程指令不显示移动光标
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                userSelect: 'none',
                opacity: isRemote ? '0.8' : '1' // 远程指令稍微透明
            }
        });

        // 远程标识或拖拽图标
        const iconElement = h('span', {
            style: {
                color: isRemote ? '#0066cc' : '#6c757d',
                fontSize: '14px',
                fontFamily: 'monospace',
                fontWeight: isRemote ? 'bold' : 'normal'
            }
        }, isRemote ? '🌐' : '⋮⋮');

        // 序号
        const orderNumber = h('span', {
            style: {
                minWidth: '24px',
                height: '24px',
                background: isRemote ? '#0066cc' : 'var(--tmx-bg)',
                color: isRemote ? '#fff' : 'var(--tmx-fg)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
            }
        }, (index + 1).toString());

        // 指令名称
        const commandName = h('span', {
            style: {
                flex: '1',
                fontWeight: '500',
                color: isRemote ? '#0066cc' : '#333'
            }
        }, isRemote ? `${command.name} (远程)` : command.name);

        // 指令描述（如果有）
        const commandDesc = h('span', {
            style: {
                color: '#6c757d',
                fontSize: '12px',
                maxWidth: '200px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
            }
        }, command.description || '无描述');

        // 编辑按钮（远程指令禁用）
        const editBtn = h('button', {
            title: isRemote ? '远程指令不可编辑' : '编辑指令',
            style: {
                background: isRemote ? '#6c757d' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                width: '24px',
                height: '24px',
                cursor: isRemote ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                marginRight: '5px',
                opacity: isRemote ? '0.5' : '1'
            },
            onclick: async (e) => {
                console.log('编辑按钮被点击', command.name, 'isRemote:', isRemote);
                e.stopPropagation();
                if (isRemote) {
                    Toast.show('远程指令不可编辑', 'warning');
                    return;
                }
                const commandSelector = window.commandSelector || this;
                console.log('commandSelector:', commandSelector);
                try {
                    await commandSelector.editCommand(command);
                } catch (error) {
                    console.error('编辑指令失败:', error);
                    Toast.show('编辑指令失败: ' + error.message, 'error');
                }
            }
        }, '✎');

        // 删除按钮（远程指令禁用）
        const deleteBtn = h('button', {
            title: isRemote ? '远程指令不可删除' : '删除指令',
            style: {
                background: isRemote ? '#6c757d' : '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                width: '24px',
                height: '24px',
                cursor: isRemote ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease',
                opacity: isRemote ? '0.5' : '1'
            },
            onclick: async (e) => {
                console.log('删除按钮被点击', command.name, 'isRemote:', isRemote);
                e.stopPropagation();
                if (isRemote) {
                    Toast.show('远程指令不可删除', 'warning');
                    return;
                }
                const commandSelector = window.commandSelector || this;
                console.log('commandSelector:', commandSelector);
                try {
                    await commandSelector.deleteCommand(command, item);
                } catch (error) {
                    console.error('删除指令失败:', error);
                    Toast.show('删除指令失败: ' + error.message, 'error');
                }
            }
        }, '×');

        // 编辑按钮悬停效果（仅本地指令）
        if (!isRemote) {
            editBtn.addEventListener('mouseenter', () => {
                editBtn.style.background = '#0056b3';
                editBtn.style.transform = 'scale(1.1)';
            });
            editBtn.addEventListener('mouseleave', () => {
                editBtn.style.background = '#007bff';
                editBtn.style.transform = 'scale(1)';
            });

            // 删除按钮悬停效果（仅本地指令）
            deleteBtn.addEventListener('mouseenter', () => {
                deleteBtn.style.background = '#c82333';
                deleteBtn.style.transform = 'scale(1.1)';
            });
            deleteBtn.addEventListener('mouseleave', () => {
                deleteBtn.style.background = '#dc3545';
                deleteBtn.style.transform = 'scale(1)';
            });
        }

        item.appendChild(iconElement);
        item.appendChild(orderNumber);
        item.appendChild(commandName);
        item.appendChild(commandDesc);
        item.appendChild(editBtn);
        item.appendChild(deleteBtn);

        // 添加悬停效果（远程指令使用不同样式）
        item.addEventListener('mouseenter', () => {
            const hoverBg = isRemote ? '#d1ecf1' : '#e9ecef';
            item.style.background = hoverBg;
            if (!isRemote) {
                item.style.transform = 'translateY(-1px)';
                item.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            }
        });

        item.addEventListener('mouseleave', () => {
            if (!item.classList.contains('dragging')) {
                const normalBg = isRemote ? '#e8f4fd' : '#f8f9fa';
                item.style.background = normalBg;
                if (!isRemote) {
                    item.style.transform = 'translateY(0)';
                    item.style.boxShadow = 'none';
                }
            }
        });

        return item;
    }

    async editCommand(command) {
        this.createEditDialog(command);
    }

    createEditDialog(command) {
        // 确保指令对象有必要的字段
        if (!command.id) {
            command.id = Date.now().toString();
            console.warn('指令缺少ID，已自动生成:', command.id);
        }
        if (!command.code) {
            command.code = '';
            console.warn('指令缺少代码字段，已初始化为空字符串');
        }
        if (!command.name) {
            command.name = '未命名指令';
            console.warn('指令缺少名称字段，已设置默认名称');
        }
        
        // 创建编辑弹窗遮罩
        const editOverlay = h('div', {
            className: 'tmx-command-edit-dialog',
            style: {
                position: 'fixed',
                inset: '0',
                zIndex: 2147483647, // 最高层级，确保在指令管理界面之上
                display: 'flex',
                background: 'rgba(0,0,0,0.5)',
                alignItems: 'center',
                justifyContent: 'center'
            }
        });

        // 创建编辑弹窗面板
        const editPanel = h('div', {
            style: {
                width: '600px',
                maxWidth: '90vw',
                maxHeight: '80vh',
                background: '#fff',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                overflow: 'hidden',
                fontFamily: 'Arial, sans-serif',
                display: 'flex',
                flexDirection: 'column'
            }
        });

        // 标题栏
        const header = h('div', {
            style: {
                padding: '15px 20px',
                borderBottom: '1px solid #eee',
                background: 'var(--tmx-bg)',
                color: 'var(--tmx-fg)',
                fontWeight: 'bold',
                fontSize: '16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }
        });

        const title = h('span', {}, '编辑指令');
        const closeBtn = h('button', {
            style: {
                background: 'none',
                border: 'none',
                color: 'var(--tmx-fg)',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '0',
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            },
            onclick: () => {
                document.body.removeChild(editOverlay);
            }
        }, '×');

        header.appendChild(title);
        header.appendChild(closeBtn);

        // 内容区域
        const content = h('div', {
            style: {
                flex: '1',
                padding: '20px',
                overflow: 'auto'
            }
        });

        // 创建表单容器
        const formContainer = h('div', {
            style: {
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }
        });

        // 指令名称字段
        const nameField = h('div', {
            style: {
                display: 'flex',
                flexDirection: 'column'
            }
        });

        const nameLabel = h('label', {
            style: {
                fontSize: '14px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '8px'
            }
        }, '指令名称');

        const nameInput = h('input', {
            type: 'text',
            value: command.name || '',
            style: {
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
                outline: 'none'
            },
            placeholder: '输入指令名称',
            onfocus: function() {
                this.style.borderColor = '#007bff';
            },
            onblur: function() {
                this.style.borderColor = '#e1e5e9';
            }
        });

        nameField.appendChild(nameLabel);
        nameField.appendChild(nameInput);

        // 指令描述字段
        const descField = h('div', {
            style: {
                display: 'flex',
                flexDirection: 'column'
            }
        });

        const descLabel = h('label', {
            style: {
                fontSize: '14px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '8px'
            }
        }, '指令描述');

        const descInput = h('input', {
            type: 'text',
            value: command.description || '',
            style: {
                width: '100%',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '6px',
                fontSize: '14px',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
                outline: 'none'
            },
            placeholder: '输入指令描述（可选）',
            onfocus: function() {
                this.style.borderColor = '#007bff';
            },
            onblur: function() {
                this.style.borderColor = '#e1e5e9';
            }
        });

        descField.appendChild(descLabel);
        descField.appendChild(descInput);

        // 指令代码字段
        const codeField = h('div', {
            style: {
                display: 'flex',
                flexDirection: 'column',
                flex: '1'
            }
        });

        const codeLabel = h('label', {
            style: {
                fontSize: '14px',
                fontWeight: '600',
                color: '#333',
                marginBottom: '8px'
            }
        }, '指令代码');

        const codeTextarea = h('textarea', {
            style: {
                width: '100%',
                minHeight: '200px',
                padding: '12px',
                border: '2px solid #e1e5e9',
                borderRadius: '6px',
                fontSize: '13px',
                fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                resize: 'vertical',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
                outline: 'none',
                lineHeight: '1.5'
            },
            placeholder: '输入指令代码',
            onfocus: function() {
                this.style.borderColor = '#007bff';
            },
            onblur: function() {
                this.style.borderColor = '#e1e5e9';
            }
        });
        
        // 设置textarea的值
        codeTextarea.value = command.code || '';
        codeTextarea.textContent = command.code || '';

        codeField.appendChild(codeLabel);
        codeField.appendChild(codeTextarea);

        formContainer.appendChild(nameField);
        formContainer.appendChild(descField);
        formContainer.appendChild(codeField);
        content.appendChild(formContainer);

        // 按钮区域
        const buttonArea = h('div', {
            style: {
                padding: '15px 20px',
                borderTop: '1px solid #eee',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '10px'
            }
        });

        const cancelBtn = h('button', {
            style: {
                padding: '8px 16px',
                background: '#f8f9fa',
                color: '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
            },
            onclick: () => {
                document.body.removeChild(editOverlay);
            }
        }, '取消');

        const saveBtn = h('button', {
            style: {
                padding: '8px 16px',
                background: 'var(--tmx-bg)',
                color: 'var(--tmx-fg)',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold'
            },
            onclick: async () => {
                await this.saveEditedCommand(command, nameInput.value.trim(), descInput.value.trim(), codeTextarea.value.trim(), editOverlay);
            }
        }, '保存');

        buttonArea.appendChild(cancelBtn);
        buttonArea.appendChild(saveBtn);

        editPanel.appendChild(header);
        editPanel.appendChild(content);
        editPanel.appendChild(buttonArea);
        editOverlay.appendChild(editPanel);

        document.body.appendChild(editOverlay);

        // 聚焦到名称输入框
        setTimeout(() => {
            nameInput.focus();
            nameInput.select();
        }, 100);
    }

    async saveEditedCommand(originalCommand, newName, newDescription, newCode, overlay) {
        // 验证输入
        if (!newName) {
            Toast.show('指令名称不能为空', 'error');
            return;
        }

        if (!newCode) {
            Toast.show('指令代码不能为空', 'error');
            return;
        }

        try {
            // 检查名称是否与其他指令冲突
            const commands = CommandStorage.getAll();
            const nameConflict = commands.find(cmd => cmd.id !== originalCommand.id && cmd.name === newName);
            
            if (nameConflict) {
                const confirmed = await Dialog.confirm(
                    `指令名称 "${newName}" 已存在，是否覆盖现有指令？`,
                    '名称冲突'
                );
                if (!confirmed) {
                    return;
                }
                // 删除冲突的指令
                CommandStorage.remove(nameConflict.id);
            }

            // 更新指令
            let updatedCommands = commands.map(cmd => {
                if (cmd.id === originalCommand.id) {
                    return {
                        ...cmd,
                        name: newName,
                        description: newDescription || '',
                        code: newCode,
                        updateTime: new Date().toISOString()
                    };
                }
                return cmd;
            });

            // 如果有名称冲突，过滤掉冲突的指令
            if (nameConflict) {
                updatedCommands = updatedCommands.filter(cmd => cmd.id !== nameConflict.id);
            }

            // 保存到存储
            CommandStorage.save(updatedCommands);

            // 关闭编辑弹窗
            document.body.removeChild(overlay);

            // 刷新界面
            this.updateCommandButtons();
            
            // 刷新现有的指令管理弹窗内容，而不是重新创建
            this.refreshManageDialog();

            Toast.show(`指令 "${newName}" 已更新`, 'success');
        } catch (error) {
            console.error('保存指令失败:', error);
            Toast.show('保存指令失败', 'error');
        }
    }

    async deleteCommand(command, itemElement) {
        // 显示确认对话框
        const confirmed = await Dialog.confirm(
            `确定要删除指令"${command.name}"吗？\n\n此操作不可撤销。`,
            '确认删除'
        );
        if (confirmed) {
            try {
                // 从全局存储中删除指令
                const commands = CommandStorage.getAll();
                const updatedCommands = commands.filter(cmd => cmd.id !== command.id);
                CommandStorage.save(updatedCommands);

                // 从界面中移除元素
                itemElement.style.transition = 'all 0.3s ease';
                itemElement.style.opacity = '0';
                itemElement.style.transform = 'translateX(-100%)';

                setTimeout(() => {
                    itemElement.remove();
                    // 更新序号
                    this.updateItemNumbers(itemElement.parentElement);
                    // 刷新指令按钮显示
                    this.updateCommandButtons();
                }, 300);

                Toast.show(`指令"${command.name}"已删除`, 'success');
            } catch (error) {
                console.error('删除指令失败:', error);
                Toast.show('删除指令失败', 'error');
            }
        }
    }

    makeSortable(list) {
        let draggedElement = null;
        let placeholder = null;

        list.addEventListener('dragstart', (e) => {
            // 检查是否为远程指令，如果是则阻止拖拽
            if (e.target.getAttribute('data-is-remote') === 'true') {
                e.preventDefault();
                Toast.show('远程指令不可排序', 'warning');
                return;
            }

            draggedElement = e.target;
            draggedElement.classList.add('dragging');
            draggedElement.style.opacity = '0.5';

            // 创建占位符
            placeholder = h('div', {
                style: {
                    height: draggedElement.offsetHeight + 'px',
                    background: 'linear-gradient(90deg, #007bff, #0056b3)',
                    borderRadius: '6px',
                    margin: '4px 0',
                    opacity: '0.3',
                    border: '2px dashed #007bff'
                }
            });
        });

        list.addEventListener('dragend', (e) => {
            if (draggedElement) {
                draggedElement.classList.remove('dragging');
                draggedElement.style.opacity = '1';
                draggedElement.style.background = '#f8f9fa';
                draggedElement.style.transform = 'translateY(0)';
                draggedElement.style.boxShadow = 'none';
            }

            if (placeholder && placeholder.parentNode) {
                placeholder.parentNode.removeChild(placeholder);
            }

            draggedElement = null;
            placeholder = null;

            // 更新序号
            this.updateItemNumbers(list);
        });

        list.addEventListener('dragover', (e) => {
            e.preventDefault();

            if (!draggedElement || !placeholder) return;

            const afterElement = this.getDragAfterElement(list, e.clientY);

            if (afterElement == null) {
                list.appendChild(placeholder);
            } else {
                list.insertBefore(placeholder, afterElement);
            }
        });

        list.addEventListener('drop', (e) => {
            e.preventDefault();

            if (!draggedElement || !placeholder) return;

            // 将拖拽元素插入到占位符位置
            list.insertBefore(draggedElement, placeholder);
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('[draggable="true"]:not(.dragging)')];

        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;

            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    updateItemNumbers(list) {
        if (!list) return;
        const items = list.querySelectorAll('[data-command-id]');
        items.forEach((item, index) => {
            const numberSpan = item.children[1]; // 序号元素是第二个子元素
            if (numberSpan) {
                numberSpan.textContent = (index + 1).toString();
            }
            item.setAttribute('data-index', index);
        });
    }

    saveSortedCommands(sortableList) {
        // 只获取本地指令的ID（排除远程指令）
        const items = sortableList.querySelectorAll('[data-command-id]:not([data-is-remote="true"])');
        const sortedIds = Array.from(items).map(item => item.getAttribute('data-command-id'));

        // 获取本地指令
        const localCommands = CommandStorage.getLocalOnly();

        // 创建ID到指令的映射
        const commandMap = new Map();
        localCommands.forEach(command => {
            commandMap.set(command.id, command);
        });

        // 按新顺序重新排列本地指令
        const sortedLocalCommands = sortedIds.map(id => commandMap.get(id)).filter(Boolean);

        // 保存到localStorage（只保存本地指令）
        try {
            CommandStorage.save(sortedLocalCommands);
            Toast.show('指令排序已保存', 'success');

            // 刷新指令按钮显示
            this.updateCommandButtons();
        } catch (error) {
            console.error('保存指令管理失败:', error);
            Toast.show('保存失败，请重试', 'error');
        }
    }

    show() {
        this.updateCommandButtons();
        super.show();
    }
}
