import { store } from '../utils/store.js';
import { Toast } from '../ui/toast.js';
import { CommandStorage } from './command-storage.js';
import { executeScript } from '../utils/script-executor.js';

export const ScheduledTaskStorage = {
    STORAGE_KEY: 'scheduled_tasks',

    // 获取所有定时任务
    getAll() {
        try {
            return store.get(this.STORAGE_KEY, []);
        } catch (e) {
            console.error('获取定时任务失败:', e);
            return [];
        }
    },

    // 保存定时任务
    save(tasks) {
        try {
            store.set(this.STORAGE_KEY, tasks);
            return true;
        } catch (e) {
            console.error('保存定时任务失败:', e);
            return false;
        }
    },

    // 添加定时任务
    add(taskData) {
        const tasks = this.getAll();
        if (typeof taskData === 'string') {
            // 兼容旧的调用方式
            const [name, commandId, schedule] = arguments;
            taskData = {
                id: Date.now().toString(),
                name: name,
                commandId: commandId,
                schedule: schedule,
                enabled: true,
                createTime: Date.now(),
                lastRun: null,
                nextRun: this.calculateNextRun(schedule)
            };
        } else {
            // 新的调用方式，传入完整的任务对象
            if (!taskData.nextRun) {
                taskData.nextRun = this.calculateNextRun(taskData.schedule);
            }
        }
        tasks.push(taskData);
        return this.save(tasks) ? taskData : null;
    },

    // 删除定时任务
    remove(id) {
        const tasks = this.getAll();
        const filtered = tasks.filter(task => task.id !== id);
        return this.save(filtered);
    },

    // 更新定时任务
    update(id, updates) {
        const tasks = this.getAll();
        const taskIndex = tasks.findIndex(task => task.id === id);
        if (taskIndex !== -1) {
            tasks[taskIndex] = { ...tasks[taskIndex], ...updates };
            if (updates.schedule) {
                tasks[taskIndex].nextRun = this.calculateNextRun(updates.schedule);
            }
            return this.save(tasks);
        }
        return false;
    },

    // 计算下次执行时间
    calculateNextRun(schedule) {
        const now = new Date();
        const next = new Date(now);

        // 处理自定义格式 custom:分 时 日 月 周
        if (typeof schedule === 'string' && schedule.startsWith('custom:')) {
            // 这里简单返回每分钟，实际应该实现cron解析
            // 为了简化，这里暂时不支持复杂的cron解析，只做占位
            // 如果需要支持，需要引入cron-parser或自己实现
            next.setMinutes(next.getMinutes() + 1);
            return next.toISOString();
        }

        if (schedule === 'every-minute') {
             next.setMinutes(next.getMinutes() + 1);
        } else if (schedule === 'every-hour') {
             next.setHours(next.getHours() + 1);
             next.setMinutes(0, 0, 0);
        } else if (typeof schedule === 'object') {
            // 旧的schedule对象格式
            switch (schedule.type) {
                case 'interval':
                    next.setMinutes(next.getMinutes() + schedule.minutes);
                    break;
                case 'daily':
                    const [hours, minutes] = schedule.time.split(':').map(Number);
                    next.setHours(hours, minutes, 0, 0);
                    if (next <= now) {
                        next.setDate(next.getDate() + 1);
                    }
                    break;
                case 'weekly':
                    const [weekHours, weekMinutes] = schedule.time.split(':').map(Number);
                    next.setHours(weekHours, weekMinutes, 0, 0);
                    const targetDay = schedule.dayOfWeek; // 0=Sunday, 1=Monday, ...
                    const currentDay = next.getDay();
                    let daysToAdd = targetDay - currentDay;
                    if (daysToAdd < 0 || (daysToAdd === 0 && next <= now)) {
                        daysToAdd += 7;
                    }
                    next.setDate(next.getDate() + daysToAdd);
                    break;
                case 'monthly':
                    const [monthHours, monthMinutes] = schedule.time.split(':').map(Number);
                    next.setHours(monthHours, monthMinutes, 0, 0);
                    if (schedule.dayOfMonth === 'last') {
                        // 每月最后一天
                        next.setMonth(next.getMonth() + 1, 0);
                        if (next <= now) {
                            next.setMonth(next.getMonth() + 1, 0);
                        }
                    } else {
                        // 指定日期
                        next.setDate(schedule.dayOfMonth);
                        if (next <= now) {
                            next.setMonth(next.getMonth() + 1);
                        }
                    }
                    break;
                default:
                    next.setMinutes(next.getMinutes() + 1);
            }
        } else {
            // 默认每分钟
            next.setMinutes(next.getMinutes() + 1);
        }

        return next.toISOString();
    }
};

export const Scheduler = (() => {
    const dailyTasks = new Map();
    const scheduledTasks = new Map();
    let isRunning = false;

    function start() {
        if (isRunning) return;
        isRunning = true;

        // 加载已保存的定时任务
        loadScheduledTasks();

        setInterval(() => {
            const now = new Date();
            const hh = String(now.getHours()).padStart(2, '0');
            const mm = String(now.getMinutes()).padStart(2, '0');
            const timeKey = `${hh}:${mm}`;
            const tag = `tick.${timeKey}`;
            if (store.sget(tag)) return;
            store.sset(tag, 1);
            setTimeout(() => store.sremove(tag), 65 * 1000);

            // 执行原有的每日任务
            for (const [, t] of dailyTasks) {
                if (t.time === timeKey) {
                    try {
                        t.fn();
                    } catch (err) {
                        console.error('[Scheduler]', err);
                    }
                }
            }

            // 执行新的定时任务
            checkScheduledTasks(now);
        }, 10 * 1000);
    }

    function loadScheduledTasks() {
        const tasks = ScheduledTaskStorage.getAll();
        tasks.forEach(task => {
            if (task.enabled) {
                scheduledTasks.set(task.id, task);
            }
        });
        console.log(`[Scheduler] 加载了 ${tasks.length} 个定时任务`);
    }

    function checkScheduledTasks(now) {
        for (const [taskId, task] of scheduledTasks) {
            if (!task.enabled) continue;

            const nextRun = new Date(task.nextRun);
            if (now >= nextRun) {
                executeScheduledTask(task);
            }
        }
    }

    async function executeScheduledTask(task) {
        try {
            console.log(`[Scheduler] 执行定时任务: ${task.name}`);

            // 查找对应的指令
            const commands = CommandStorage.getAll();
            const command = commands.find(cmd => cmd.id === task.commandId);

            if (!command) {
                console.error(`[Scheduler] 找不到指令 ID: ${task.commandId}`);
                return;
            }

            // 执行指令代码
            const result = await executeScript(command.code);
            if (result !== undefined) {
                console.log(`[Scheduler] 任务执行结果:`, result);
            }

            // 更新任务状态
            const now = new Date();
            task.lastRun = now.toISOString();
            task.nextRun = ScheduledTaskStorage.calculateNextRun(task.schedule);

            // 保存到存储
            ScheduledTaskStorage.update(task.id, {
                lastRun: task.lastRun,
                nextRun: task.nextRun
            });

            // 更新内存中的任务
            scheduledTasks.set(task.id, task);

            Toast.show(`定时任务 "${task.name}" 执行完成`);

        } catch (error) {
            console.error(`[Scheduler] 任务执行失败: ${task.name}`, error);
            Toast.show(`定时任务执行失败: ${error.message}`, 'error');
        }
    }

    function registerDaily(hhmm, fn, key) {
        dailyTasks.set(key || hhmm, { time: hhmm, fn });
    }

    function unregister(key) {
        dailyTasks.delete(key);
    }

    function addScheduledTask(task) {
        if (task.enabled) {
            scheduledTasks.set(task.id, task);
        }
    }

    function removeScheduledTask(taskId) {
        scheduledTasks.delete(taskId);
    }

    function updateScheduledTask(taskId, updates) {
        const task = scheduledTasks.get(taskId);
        if (task) {
            Object.assign(task, updates);
            if (!task.enabled) {
                scheduledTasks.delete(taskId);
            }
        }
    }

    return {
        start,
        registerDaily,
        unregister,
        addScheduledTask,
        removeScheduledTask,
        updateScheduledTask,
        loadScheduledTasks,
        loadTasks: loadScheduledTasks  // 为管理界面提供重新加载任务的方法
    };
})();
