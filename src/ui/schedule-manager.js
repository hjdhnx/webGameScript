import { h } from '../utils/dom.js';
import { ScheduledTaskStorage } from '../core/scheduler.js';
import { CommandStorage } from '../core/command-storage.js';
import { Toast } from './toast.js';

export class ScheduleManager {
    constructor() {
        this.title = '定时任务管理';
        this.tasks = ScheduledTaskStorage.getAll();
        this.commands = CommandStorage.getAll();
        this.editingTask = null;
        this.visible = false;
        this.createDialog();
        this.setupContent();
    }

    createDialog() {
        // 创建遮罩层
        this.overlay = h('div', {
            style: {
                position: 'fixed',
                inset: '0',
                zIndex: 2147483645,
                display: 'none',
                background: 'rgba(0,0,0,0.5)'
            }
        });

        // 点击遮罩层关闭
        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.hide();
        });

        // 创建对话框面板
        this.panel = h('div', {
            style: {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(550px, 92vw)',
                height: 'min(500px, 85vh)',
                maxWidth: '92vw',
                maxHeight: '85vh',
                background: 'var(--tmx-bg)',
                color: 'var(--tmx-fg)',
                border: '1px solid #ccc',
                borderRadius: '6px',
                boxShadow: '0 2px 15px rgba(0,0,0,0.2)',
                display: 'flex',
                flexDirection: 'column',
                fontFamily: 'Arial, sans-serif',
                overflow: 'hidden'
            }
        });

        // 创建标题栏
        const titleBar = h('div', {
            style: {
                padding: '10px 15px',
                background: 'var(--tmx-bg)',
                color: 'var(--tmx-fg)',
                borderBottom: '1px solid #ddd',
                borderRadius: '6px 6px 0 0',
                fontWeight: 'bold',
                fontSize: '14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }
        }, this.title);

        // 创建关闭按钮
        const closeBtn = h('button', {
            style: {
                background: 'var(--tmx-bg)',
                color: 'var(--tmx-fg)',
                border: '1px solid #ddd',
                borderRadius: '3px',
                fontSize: '14px',
                cursor: 'pointer',
                padding: '2px 6px',
                width: '20px',
                height: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }
        }, '×');
        closeBtn.addEventListener('click', () => this.hide());
        titleBar.appendChild(closeBtn);

        // 创建内容区域
        this.contentEl = h('div', {
            style: {
                flex: '1',
                padding: '12px',
                overflow: 'hidden',
                background: 'var(--tmx-bg)',
                color: 'var(--tmx-fg)'
            }
        });

        this.panel.append(titleBar, this.contentEl);
        this.overlay.appendChild(this.panel);
        document.body.appendChild(this.overlay);
    }

    setupContent() {
        this.contentEl.innerHTML = `
            <div style="display: flex; height: 100%; gap: 12px; flex-direction: row;">
                <div style="flex: 0 0 40%; border-right: 1px solid #ddd; padding-right: 10px; min-width: 180px;">
                    <div style="display: flex; justify-content: flex-end; align-items: center; margin-bottom: 10px;">
                        <div style="display: flex; gap: 6px;">
                            <button id="import-tasks-btn" style="padding: 4px 8px; background: var(--tmx-bg); color: var(--tmx-fg); border: 1px solid #ddd; border-radius: 3px; cursor: pointer; font-size: 11px;">导入</button>
                            <button id="export-tasks-btn" style="padding: 4px 8px; background: var(--tmx-bg); color: var(--tmx-fg); border: 1px solid #ddd; border-radius: 3px; cursor: pointer; font-size: 11px;">导出</button>
                            <button id="add-task-btn" style="padding: 5px 10px; background: var(--tmx-bg); color: var(--tmx-fg); border: 1px solid #ddd; border-radius: 3px; cursor: pointer; font-size: 12px;">新增任务</button>
                        </div>
                    </div>
                    <div id="task-list" style="height: calc(100% - 45px); overflow-y: auto; border: 1px solid #ddd; padding: 8px; background: var(--tmx-bg);"></div>
                </div>
                <div style="flex: 1; padding-left: 10px; display: flex; flex-direction: column;">
                    <h3 style="margin: 0 0 10px 0; color: var(--tmx-fg); font-size: 14px; flex-shrink: 0;">任务配置</h3>
                    <div id="task-form" style="height: calc(100% - 35px); overflow-y: auto; padding: 8px; border: 1px solid #ddd; border-radius: 3px; background: var(--tmx-bg); flex: 1;">
                        <div style="text-align: center; color: var(--tmx-fg); margin-top: 30px; opacity: 0.7; font-size: 13px;">请选择或新增一个任务进行配置</div>
                    </div>
                </div>
            </div>
            
            <style>
                @media (max-width: 768px) {
                    .schedule-content {
                        flex-direction: column !important;
                    }
                    .schedule-content > div:first-child {
                        flex: none !important;
                        border-right: none !important;
                        border-bottom: 1px solid #ddd !important;
                        padding-right: 0 !important;
                        padding-bottom: 10px !important;
                        margin-bottom: 10px !important;
                    }
                    .schedule-content > div:last-child {
                        padding-left: 0 !important;
                        flex: 1 !important;
                        display: flex !important;
                        flex-direction: column !important;
                    }
                    .schedule-content #task-form {
                        height: auto !important;
                        min-height: 300px !important;
                        max-height: 60vh !important;
                        flex: 1 !important;
                        overflow-y: auto !important;
                    }
                }
            </style>
        `;

        // 添加响应式类名
        this.contentEl.querySelector('div').classList.add('schedule-content');

        this.setupEventListeners();
        this.updateTaskList();
    }

    setupEventListeners() {
        const addBtn = this.contentEl.querySelector('#add-task-btn');
        addBtn.addEventListener('click', () => this.addNewTask());

        const importBtn = this.contentEl.querySelector('#import-tasks-btn');
        importBtn.addEventListener('click', () => this.importTasks());

        const exportBtn = this.contentEl.querySelector('#export-tasks-btn');
        exportBtn.addEventListener('click', () => this.exportTasks());
    }

    updateTaskList() {
        const listEl = this.contentEl.querySelector('#task-list');
        this.tasks = ScheduledTaskStorage.getAll();

        if (this.tasks.length === 0) {
            listEl.innerHTML = '<div style="text-align: center; color: var(--tmx-fg); margin-top: 15px; opacity: 0.7; font-size: 12px;">暂无定时任务</div>';
            return;
        }

        listEl.innerHTML = this.tasks.map(task => {
            const command = this.commands.find(cmd => cmd.id === task.commandId);
            const commandName = command ? command.name : '未知指令';
            const nextRun = task.nextRun ? new Date(task.nextRun).toLocaleString() : '未设置';

            const isSelected = this.editingTask && this.editingTask.id === task.id;

            return `
                <div class="task-item" data-id="${task.id}" style="
                    border: 1px solid #ddd; 
                    margin-bottom: 6px; 
                    padding: 8px; 
                    border-radius: 3px; 
                    cursor: pointer;
                    background: ${isSelected ? 'rgba(0,123,255,0.1)' : 'var(--tmx-bg)'};
                    color: var(--tmx-fg);
                    transition: all 0.2s ease;
                    position: relative;
                ">
                    <div style="font-weight: bold; margin-bottom: 4px; font-size: 12px; line-height: 1.3; padding-right: 60px;">${task.name}</div>
                    <div style="font-size: 10px; color: var(--tmx-fg); opacity: 0.8; margin-bottom: 2px; line-height: 1.2;">指令: ${commandName}</div>
                    <div style="font-size: 10px; color: var(--tmx-fg); opacity: 0.8; margin-bottom: 2px; line-height: 1.2;">时间: ${task.schedule}</div>
                    <div style="font-size: 10px; color: var(--tmx-fg); opacity: 0.8; margin-bottom: 2px; line-height: 1.2;">下次执行: ${nextRun}</div>
                    <div style="font-size: 10px; color: ${task.enabled ? '#28a745' : '#dc3545'}; font-weight: bold; line-height: 1.2;">状态: ${task.enabled ? '启用' : '禁用'}</div>
                    <button class="toggle-status-btn" data-task-id="${task.id}" style="
                        position: absolute;
                        top: 6px;
                        right: 6px;
                        padding: 2px 6px;
                        font-size: 9px;
                        border: 1px solid ${task.enabled ? '#dc3545' : '#28a745'};
                        background: ${task.enabled ? '#dc3545' : '#28a745'};
                        color: white;
                        border-radius: 2px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                        font-weight: bold;
                    ">${task.enabled ? '禁用' : '启用'}</button>
                </div>
            `;
        }).join('');

        // 添加点击事件
        listEl.querySelectorAll('.task-item').forEach(item => {
            item.addEventListener('click', () => {
                const taskId = item.dataset.id;
                const task = this.tasks.find(t => t.id === taskId);
                this.editTask(task);
            });

            // 添加悬停效果
            item.addEventListener('mouseenter', () => {
                if (!item.dataset.id || (this.editingTask && this.editingTask.id !== item.dataset.id)) {
                    item.style.background = 'rgba(0,123,255,0.05)';
                }
            });
            item.addEventListener('mouseleave', () => {
                if (!item.dataset.id || (this.editingTask && this.editingTask.id !== item.dataset.id)) {
                    item.style.background = 'var(--tmx-bg)';
                }
            });
        });

        // 添加状态切换按钮事件
        listEl.querySelectorAll('.toggle-status-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const taskId = btn.dataset.taskId;
                this.toggleTaskStatus(taskId);
            });
        });
    }

    addNewTask() {
        const newTask = {
            id: Date.now().toString(),
            name: '新任务',
            commandId: '',
            schedule: 'every-minute',
            enabled: true,
            createTime: Date.now(),
            nextRun: null
        };
        this.editTask(newTask, true);
    }

    editTask(task, isNew = false) {
        this.editingTask = task;
        this.isNewTask = isNew;
        this.updateTaskList();

        const formEl = this.contentEl.querySelector('#task-form');
        formEl.innerHTML = `
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: var(--tmx-fg); font-size: 12px;">任务名称:</label>
                <input type="text" id="task-name" value="${task.name}" style="width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 3px; background: var(--tmx-bg); color: var(--tmx-fg); font-size: 12px; box-sizing: border-box;">
            </div>
            
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: var(--tmx-fg); font-size: 12px;">执行指令:</label>
                <select id="task-command" style="width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 3px; background: var(--tmx-bg); color: var(--tmx-fg); font-size: 12px; box-sizing: border-box;">
                    <option value="">请选择指令</option>
                    ${this.commands.map(cmd =>
            `<option value="${cmd.id}" ${cmd.id === task.commandId ? 'selected' : ''}>${cmd.name}</option>`
        ).join('')}
                </select>
            </div>
            
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: var(--tmx-fg); font-size: 12px;">执行时间:</label>
                <select id="task-schedule" style="width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 3px; background: var(--tmx-bg); color: var(--tmx-fg); font-size: 12px; box-sizing: border-box;">
                    <option value="every-minute" ${task.schedule === 'every-minute' ? 'selected' : ''}>每分钟</option>
                    <option value="every-hour" ${task.schedule === 'every-hour' ? 'selected' : ''}>每小时</option>
                    <option value="daily" ${task.schedule === 'daily' ? 'selected' : ''}>每天</option>
                    <option value="weekly" ${task.schedule === 'weekly' ? 'selected' : ''}>每周</option>
                    <option value="monthly" ${task.schedule === 'monthly' ? 'selected' : ''}>每月</option>
                    <option value="custom" ${task.schedule.startsWith('custom:') ? 'selected' : ''}>自定义</option>
                </select>
            </div>
            
            <div id="custom-schedule" style="margin-bottom: 12px; ${task.schedule.startsWith('custom:') ? '' : 'display: none;'}">
                <label style="display: block; margin-bottom: 5px; font-weight: bold; color: var(--tmx-fg); font-size: 12px;">自定义时间配置:</label>
                <input type="text" id="custom-schedule-input" value="${task.schedule.startsWith('custom:') ? task.schedule.substring(7) : ''}" 
                       placeholder="例如: 0 8 * * * (每天8点), 0 8 * * 3 (每周三8点)" 
                       style="width: 100%; padding: 6px 8px; border: 1px solid #ddd; border-radius: 3px; background: var(--tmx-bg); color: var(--tmx-fg); font-size: 12px; box-sizing: border-box;">
                <div style="font-size: 10px; color: var(--tmx-fg); opacity: 0.7; margin-top: 4px; line-height: 1.3;">
                    格式: 分 时 日 月 周<br>
                    例如: 0 8 * * * (每天8点), 0 8 * * 3 (每周三8点), 0 8 1,L * * (每月1号和最后一天8点)
                </div>
            </div>
            
            <div style="margin-bottom: 15px;">
                <label style="display: flex; align-items: center;">
                    <input type="checkbox" id="task-enabled" ${task.enabled ? 'checked' : ''} style="margin-right: 8px; transform: scale(1.1);">
                    <span style="font-weight: bold; color: var(--tmx-fg); font-size: 12px;">启用任务</span>
                </label>
            </div>
            
            <div style="display: flex; gap: 8px; margin-top: 15px;">
                <button id="save-task-btn" style="flex: 1; padding: 8px; background: #28a745; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px; font-weight: bold;">保存</button>
                ${!isNew ? '<button id="delete-task-btn" style="flex: 1; padding: 8px; background: #dc3545; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px; font-weight: bold;">删除</button>' : ''}
                <button id="cancel-task-btn" style="flex: 1; padding: 8px; background: #6c757d; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px; font-weight: bold;">取消</button>
            </div>
        `;

        this.setupFormEventListeners();
    }

    setupFormEventListeners() {
        const formEl = this.contentEl.querySelector('#task-form');

        // 移除之前的事件监听器（通过克隆节点）
        const newFormEl = formEl.cloneNode(true);
        formEl.parentNode.replaceChild(newFormEl, formEl);

        // 重新获取表单元素
        const scheduleSelect = newFormEl.querySelector('#task-schedule');
        const customDiv = newFormEl.querySelector('#custom-schedule');
        const saveBtn = newFormEl.querySelector('#save-task-btn');
        const deleteBtn = newFormEl.querySelector('#delete-task-btn');
        const cancelBtn = newFormEl.querySelector('#cancel-task-btn');

        // 自定义时间配置显示/隐藏
        scheduleSelect.addEventListener('change', () => {
            customDiv.style.display = scheduleSelect.value === 'custom' ? 'block' : 'none';
        });

        // 保存按钮（添加防重复提交机制）
        saveBtn.addEventListener('click', () => {
            if (saveBtn.disabled) return;
            this.saveTask();
        });

        // 删除按钮
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => this.deleteTask());
        }

        // 取消按钮
        cancelBtn.addEventListener('click', () => this.cancelEdit());
    }

    saveTask() {
        const formEl = this.contentEl.querySelector('#task-form');
        const saveBtn = formEl.querySelector('#save-task-btn');

        // 防重复提交
        if (saveBtn.disabled) {
            return;
        }

        // 禁用保存按钮
        saveBtn.disabled = true;
        saveBtn.textContent = '保存中...';
        saveBtn.style.opacity = '0.6';

        try {
            const name = formEl.querySelector('#task-name').value.trim();
            const commandId = formEl.querySelector('#task-command').value;
            const schedule = formEl.querySelector('#task-schedule').value;
            const customSchedule = formEl.querySelector('#custom-schedule-input').value.trim();
            const enabled = formEl.querySelector('#task-enabled').checked;

            if (!name) {
                Toast.show('请输入任务名称', 'error');
                saveBtn.disabled = false;
                saveBtn.textContent = '保存';
                saveBtn.style.opacity = '1';
                return;
            }

            if (!commandId) {
                Toast.show('请选择执行指令', 'error');
                saveBtn.disabled = false;
                saveBtn.textContent = '保存';
                saveBtn.style.opacity = '1';
                return;
            }

            let finalSchedule = schedule;
            if (schedule === 'custom') {
                if (!customSchedule) {
                    Toast.show('请输入自定义时间配置', 'error');
                    saveBtn.disabled = false;
                    saveBtn.textContent = '保存';
                    saveBtn.style.opacity = '1';
                    return;
                }
                finalSchedule = 'custom:' + customSchedule;
            }

            this.editingTask.name = name;
            this.editingTask.commandId = commandId;
            this.editingTask.schedule = finalSchedule;
            this.editingTask.enabled = enabled;

            if (this.isNewTask) {
                ScheduledTaskStorage.add(this.editingTask);
                Toast.show('任务创建成功', 'success');
            } else {
                ScheduledTaskStorage.update(this.editingTask.id, {
                    name: this.editingTask.name,
                    commandId: this.editingTask.commandId,
                    schedule: this.editingTask.schedule,
                    enabled: this.editingTask.enabled
                });
                Toast.show('任务更新成功', 'success');
            }

            // 重新启动调度器以应用更改
            if (window.scheduler) {
                window.scheduler.loadTasks();
            }

            // 先更新任务列表再取消编辑
            this.updateTaskList();
            this.cancelEdit();

            // 标记保存成功，避免在finally中重复恢复按钮状态
            return true;
        } catch (error) {
            // 保存失败时恢复按钮状态
            saveBtn.disabled = false;
            saveBtn.textContent = '保存';
            saveBtn.style.opacity = '1';
            console.error('保存任务失败:', error);
        }
    }

    deleteTask() {
        if (confirm('确定要删除这个定时任务吗？')) {
            const taskId = this.editingTask.id;
            ScheduledTaskStorage.remove(taskId);
            Toast.show('任务删除成功', 'success');

            // 重新启动调度器以应用更改
            if (window.scheduler) {
                window.scheduler.loadTasks();
            }

            // 清除编辑状态
            this.editingTask = null;
            this.isNewTask = false;

            // 立即更新任务列表
            this.updateTaskList();

            // 重置表单区域
            const formEl = this.contentEl.querySelector('#task-form');
            formEl.innerHTML = '<div style="text-align: center; color: var(--tmx-fg); opacity: 0.7; margin-top: 50px;">请选择或新增一个任务进行配置</div>';
        }
    }

    toggleTaskStatus(taskId) {
        const task = this.tasks.find(t => t.id === taskId);
        if (!task) return;

        const newEnabled = !task.enabled;

        // 更新存储
        ScheduledTaskStorage.update(taskId, { enabled: newEnabled });

        // 更新本地任务数据
        task.enabled = newEnabled;

        // 更新调度器
        if (window.scheduler) {
            if (newEnabled) {
                window.scheduler.addScheduledTask(task);
            } else {
                window.scheduler.removeScheduledTask(taskId);
            }
        }

        // 重新获取任务数据并更新界面
        this.tasks = ScheduledTaskStorage.getAll();
        this.updateTaskList();

        // 如果当前正在编辑这个任务，也要更新编辑表单
        if (this.editingTask && this.editingTask.id === taskId) {
            this.editingTask.enabled = newEnabled;
            const enabledCheckbox = this.contentEl.querySelector('#task-enabled');
            if (enabledCheckbox) {
                enabledCheckbox.checked = newEnabled;
            }
        }

        Toast.show(`任务已${newEnabled ? '启用' : '禁用'}`, 'success');
    }

    cancelEdit() {
        this.editingTask = null;
        this.isNewTask = false;
        this.updateTaskList();

        const formEl = this.contentEl.querySelector('#task-form');
        formEl.innerHTML = '<div style="text-align: center; color: var(--tmx-fg); opacity: 0.7; margin-top: 30px; font-size: 12px;">请选择或新增一个任务进行配置</div>';
    }

    show() {
        this.commands = CommandStorage.getAll();
        this.updateTaskList();
        this.overlay.style.display = 'block';
        this.visible = true;
    }

    hide() {
        this.overlay.style.display = 'none';
        this.visible = false;
    }

    toggle() {
        if (this.visible) {
            this.hide();
        } else {
            this.show();
        }
    }

    exportTasks() {
        try {
            const tasks = ScheduledTaskStorage.getAll();
            if (tasks.length === 0) {
                Toast.show('暂无任务可导出', 'warning');
                return;
            }

            // 创建导出数据，包含任务和相关指令信息
            const exportData = {
                version: '1.0',
                exportTime: new Date().toISOString(),
                tasks: tasks,
                commands: this.commands.filter(cmd =>
                    tasks.some(task => task.commandId === cmd.id)
                )
            };

            const jsonStr = JSON.stringify(exportData, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `scheduled_tasks_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            Toast.show(`成功导出 ${tasks.length} 个任务`, 'success');
        } catch (error) {
            console.error('导出任务失败:', error);
            Toast.show('导出失败: ' + error.message, 'error');
        }
    }

    importTasks() {
        try {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json';
            input.style.display = 'none';

            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const importData = JSON.parse(event.target.result);
                        this.processImportData(importData);
                    } catch (error) {
                        console.error('解析JSON文件失败:', error);
                        Toast.show('文件格式错误: ' + error.message, 'error');
                    }
                };
                reader.readAsText(file);
            };

            document.body.appendChild(input);
            input.click();
            document.body.removeChild(input);
        } catch (error) {
            console.error('导入任务失败:', error);
            Toast.show('导入失败: ' + error.message, 'error');
        }
    }

    processImportData(importData) {
        try {
            // 验证导入数据格式
            if (!importData.tasks || !Array.isArray(importData.tasks)) {
                throw new Error('无效的任务数据格式');
            }

            const existingTasks = ScheduledTaskStorage.getAll();
            const existingCommands = CommandStorage.getAll();
            let importedTaskCount = 0;
            let importedCommandCount = 0;
            let skippedCount = 0;

            // 导入指令（如果有）
            if (importData.commands && Array.isArray(importData.commands)) {
                for (const command of importData.commands) {
                    const existingCommand = existingCommands.find(cmd => cmd.id === command.id);
                    if (!existingCommand) {
                        // 生成新的ID避免冲突
                        const newCommand = {
                            ...command,
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
                        };
                        CommandStorage.add(newCommand.name, newCommand.code, newCommand.description || '');
                        importedCommandCount++;

                        // 更新任务中的指令ID引用
                        importData.tasks.forEach(task => {
                            if (task.commandId === command.id) {
                                task.commandId = newCommand.id;
                            }
                        });
                    }
                }
            }

            // 导入任务
            for (const task of importData.tasks) {
                // 检查是否已存在相同名称的任务
                const existingTask = existingTasks.find(t => t.name === task.name);
                if (existingTask) {
                    skippedCount++;
                    continue;
                }

                // 生成新的任务ID
                const newTask = {
                    ...task,
                    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                    createTime: Date.now(),
                    lastRun: null,
                    nextRun: ScheduledTaskStorage.calculateNextRun(task.schedule)
                };

                ScheduledTaskStorage.add(newTask);
                importedTaskCount++;
            }

            // 刷新界面
            this.tasks = ScheduledTaskStorage.getAll();
            this.commands = CommandStorage.getAll();
            this.updateTaskList();

            // 重新启动调度器
            if (window.scheduler) {
                window.scheduler.loadTasks();
            }

            // 显示导入结果
            let message = `导入完成: ${importedTaskCount} 个任务`;
            if (importedCommandCount > 0) {
                message += `, ${importedCommandCount} 个指令`;
            }
            if (skippedCount > 0) {
                message += ` (跳过 ${skippedCount} 个重复任务)`;
            }
            Toast.show(message, 'success');

        } catch (error) {
            console.error('处理导入数据失败:', error);
            Toast.show('导入失败: ' + error.message, 'error');
        }
    }
}
