
import { CONFIG, META } from './config.js';
import { store } from './utils/store.js';
import { Logger } from './utils/logger.js';
import { Theme } from './core/theme.js';
import { Columns } from './ui/columns.js';
import { GroupPopup } from './ui/group-popup.js';
import { Dialog } from './ui/dialog.js';
import { Toast } from './ui/toast.js';
import { Scheduler } from './core/scheduler.js';
import { setColumns, getColumns, buttonMap, groupMap } from './core/state.js';
import { ZIndexManager, getLayoutOffset } from './utils/layout.js';
import { DebugWindowManager } from './core/debug-window.js';
import { syncRemoteCommands } from './core/remote-sync.js';
import * as Handlers from './actions/handlers.js';
import { clickbtn, clickhref, clickgo, copyWithGreasemonkey } from './utils/debug-helpers.js';
import { simulateClick } from './utils/mouse.js';
import { sleep } from './utils/time.js';
import { inputText } from './utils/input.js';

// Define Actions
const ACTIONS = [
    // 第1列：隐藏日志、显按钮
    { id: 'toggle-log', label: '隐藏日志', column: 1, handler: Handlers.toggleLog },
    { id: 'toggle-buttons', label: '显按钮', column: 1, handler: Handlers.toggleButtons },
    
    // 第2列：皮肤集、换皮肤
    { id: 'skin-open', label: '皮肤集', column: 2, handler: Handlers.toggleSkinSelector },
    { id: 'theme', label: '换皮肤', column: 2, handler: Handlers.switchTheme },
    
    // 第3列：弹出提示、调试执行
    { id: 'toast', label: '弹出提示', column: 3, handler: Handlers.toggleToast },
    { id: 'debug', label: '调试执行', column: 3, handler: Handlers.executeDebugCode },
    { id: 'pick-coord', label: '坐标拾取', column: 3, handler: Handlers.pickCoordinate },
    { id: 'pick-elem', label: '元素拾取', column: 3, handler: Handlers.pickElement },
    
    // 第4列：定时任务、推送文本
    { id: 'schedule-open', label: '定时任务', column: 4, handler: Handlers.toggleScheduleManager },
    
    // 第5列：配置集、开关集、指令集
    { id: 'cfg-open', label: '配置集', column: 5, handler: Handlers.toggleGroup('配置集') },
    { id: 'kgj-open', label: '开关集', column: 5, handler: Handlers.toggleGroup('开关集') },
    { id: 'command-open', label: '指令集', column: 5, handler: Handlers.toggleCommandSelector },
    // 组内按钮，带 isToggle + storeKey 的会显示凹陷效果
    {
        id: 'tf',
        label: '开逃犯',
        group: '开关集',
        isToggle: true,
        storeKey: 'tf_killset',
        handler: Handlers.makeToggle('tf', '开逃犯', '关逃犯', 'tf_killset')
    },
    { id: 'tj', label: '开天剑', group: '开关集', handler: Handlers.noop('开天剑') },
    { id: 'bc', label: '开镖车', group: '开关集', handler: Handlers.noop('开镖车') },
    { id: 'bz', label: '开帮战', group: '开关集', handler: Handlers.noop('开帮战') },
    { id: 'hb', label: '开红包', group: '开关集', handler: Handlers.noop('开红包') },
    { id: 'qc', label: '开抢菜', group: '开关集', handler: Handlers.noop('开抢菜') },
    { id: 'dm', label: '开灯谜', group: '开关集', handler: Handlers.noop('开灯谜') },
    { id: 'js', label: '开救赎', group: '开关集', handler: Handlers.noop('开救赎') },
    { id: 'zx', label: '开智悬', group: '开关集', handler: Handlers.noop('开智悬') },
    { id: 'zxs', label: '设智悬', group: '开关集', handler: Handlers.noop('设智悬') },

    // 分组：配置集
    {
        id: 'cfg-api',
        label: '剪切板API',
        group: '配置集',
        handler: Handlers.configClipboardApi
    },
    {
        id: 'cfg-code',
        label: '安全码',
        group: '配置集',
        handler: Handlers.configSafeCode
    },
    {
        id: 'cfg-remote-url',
        label: '远程指令URL',
        group: '配置集',
        handler: Handlers.configRemoteCommandUrl
    },
    {
        id: 'cfg-remote-enable',
        label: '启用远程指令',
        group: '配置集',
        isToggle: true,
        storeKey: 'remote_commands_enabled',
        handler: Handlers.makeToggle('cfg-remote-enable', '启用远程指令', '禁用远程指令', 'remote_commands_enabled')
    },
    // 组内按钮：推送文本
    {
        id: 'cfg-push',
        label: '推送文本',
        column: 4,
        handler: Handlers.pushClipboardText
    },
];

// Initialize UI
function render() {
    // Create columns instance
    const columns = new Columns();
    setColumns(columns); // Save to global state

    // 按列渲染（独立按钮）
    for (const act of ACTIONS.filter(a => a.column)) {
        const btn = columns.addButton(act.column, act.label, () => act.handler());
        buttonMap.set(act.id, btn);
    }

    // 分组渲染：先采集组
    const groups = ACTIONS.filter(a => a.group).reduce((acc, a) => {
        (acc[a.group] = acc[a.group] || []).push(a);
        return acc;
    }, {});
    
    for (const [name, acts] of Object.entries(groups)) {
        const gp = new GroupPopup(name);
        groupMap.set(name, gp);
        for (const a of acts) {
            // 把 isToggle / storeKey 转交给 gp.addButton
            gp.addButton(a.label, a.handler, { isToggle: !!a.isToggle, storeKey: a.storeKey });
        }
    }
}

// Data migration function
function migrateLocalStorageToGM() {
    try {
        // 迁移标记，避免重复迁移
        const migrated = store.get('data_migrated', false);
        if (migrated) return;

        console.log('开始迁移localStorage数据到GM全局存储...');

        // 迁移本地指令集
        const localCommands = localStorage.getItem('custom_commands');
        if (localCommands && !store.get('custom_commands', null)) {
            try {
                const commands = JSON.parse(localCommands);
                store.set('custom_commands', commands);
                console.log('已迁移本地指令集:', commands.length, '条');
            } catch (e) {
                console.error('迁移本地指令集失败:', e);
            }
        }

        // 迁移定时任务
        const scheduledTasks = localStorage.getItem('scheduled_tasks');
        if (scheduledTasks && !store.get('scheduled_tasks', null)) {
            try {
                const tasks = JSON.parse(scheduledTasks);
                store.set('scheduled_tasks', tasks);
                console.log('已迁移定时任务:', tasks.length, '条');
            } catch (e) {
                console.error('迁移定时任务失败:', e);
            }
        }

        // 迁移远程指令缓存
        const remoteCommands = localStorage.getItem('remote_commands_cache');
        if (remoteCommands && !store.get('remote_commands_cache', null)) {
            try {
                const commands = JSON.parse(remoteCommands);
                store.set('remote_commands_cache', commands);
                console.log('已迁移远程指令缓存:', commands.length, '条');
            } catch (e) {
                console.error('迁移远程指令缓存失败:', e);
            }
        }

        // 迁移远程指令同步时间
        const lastSyncTime = localStorage.getItem('remote_commands_last_sync');
        if (lastSyncTime && !store.get('remote_commands_last_sync', null)) {
            try {
                const time = parseInt(lastSyncTime);
                store.set('remote_commands_last_sync', time);
                console.log('已迁移远程指令同步时间:', new Date(time).toLocaleString());
            } catch (e) {
                console.error('迁移远程指令同步时间失败:', e);
            }
        }

        // 标记迁移完成
        store.set('data_migrated', true);
        console.log('数据迁移完成！');

    } catch (error) {
        console.error('数据迁移过程中发生错误:', error);
    }
}

// Main initialization function
function init() {
    // 挂载便捷函数到全局
    window.clickbtn = clickbtn;
    window.clickhref = clickhref;
    window.clickgo = clickgo;
    window.click = simulateClick;
    window.sleep = sleep;
    window.inputText = inputText;
    window.copyWithGreasemonkey = copyWithGreasemonkey;
    console.log('[便捷函数] clickbtn、clickhref、clickgo、click、sleep、inputText、copyWithGreasemonkey 已挂载到全局，可在控制台直接使用');

    Theme.apply();
    Logger.hook();
    Logger.append(`${META.name}: v${META.version}`);
    Logger.append(`布局偏移：${getLayoutOffset()}`);
    
    // 显示存储模式信息
    const storageInfo = store.getStorageInfo();
    Logger.append(`存储模式：${storageInfo.mode}${storageInfo.crossDomain ? ' (支持跨域共享)' : ' (仅当前域名)'}`);
    console.log('脚本存储信息:', storageInfo);

    render();
    Dialog.initialize();
    Dialog.applyTheme();
    
    // 将DebugWindowManager和Toast暴露到全局，供相互调用
    window.DebugWindow = DebugWindowManager;
    window.Toast = Toast;

    // 初始：同步 toast 按钮状态（如果存在）
    const toastOn = store.get('toast.enabled', 0) === 1;
    const toastBtn = buttonMap.get('toast');
    if (toastBtn) {
        toastBtn.textContent = toastOn ? '关闭弹窗' : '弹窗提示';
        toastBtn.style.borderStyle = toastOn ? 'inset' : 'outset';
    }
    if (toastOn) {
        Toast.show('提示', '你好');
    } else {
        // 如果弹窗提示是关闭状态，确保关闭可能存在的弹窗
        Toast.hide();
    }

    // 初始：同步日志显示状态
    const loggerHidden = store.get('logger.hidden', 0) === 1;
    if (loggerHidden) {
        Logger.hide();
        const logBtn = buttonMap.get('toggle-log');
        if (logBtn) {
            logBtn.textContent = '显示日志';
            logBtn.style.borderStyle = 'outset';
        }
    } else {
        Logger.show();
        const logBtn = buttonMap.get('toggle-log');
        if (logBtn) {
            logBtn.textContent = '隐藏日志';
            logBtn.style.borderStyle = 'inset';
        }
    }

    // 初始：同步按钮显示状态
    const buttonsHidden = store.get('buttons.hidden', 0) === 1;
    if (buttonsHidden) {
        for (const [id, el] of buttonMap) {
            if (id === 'toggle-buttons') continue;
            el.style.visibility = 'hidden';
        }
        
        const btn = buttonMap.get('toggle-buttons');
        const btnBox = btn ? btn.parentElement : null;
        
        const columnsInstance = getColumns();
        if (columnsInstance) {
            for (const [, box] of columnsInstance.columns) {
                if (box !== btnBox) {
                    box.style.display = 'none';
                }
            }
        }
        
        if (btnBox) {
            btnBox.style.position = 'fixed';
            btnBox.style.top = CONFIG.buttonTop + 'px';
            btnBox.style.left = '0px';
            btnBox.style.width = '18px';
            btnBox.style.zIndex = ZIndexManager.getNextZIndex();
        }
        if (btn) {
            btn.textContent = '<<';
            btn.style.borderStyle = 'inset';
            btn.style.width = '18px';
            btn.style.minWidth = '18px';
            btn.style.padding = '0';
            btn.style.visibility = 'visible';
        }
    } else {
        const btnToggle = buttonMap.get('toggle-buttons');
        if (btnToggle) {
            btnToggle.textContent = '隐按钮';
            btnToggle.style.borderStyle = 'inset';
        }
    }
    
    // 给组内的 toggle 按钮同步初始样式
    const kgjBtn = buttonMap.get('kgj-open');
    const gp = groupMap.get('开关集');
    if (kgjBtn && gp) {
        kgjBtn.style.borderStyle = gp.visible ? 'inset' : 'outset';
    }

    // 启动调度器并加载定时任务
    Scheduler.start();

    // 创建全局调度器实例供管理界面使用
    window.scheduler = Scheduler;

    // 数据迁移
    migrateLocalStorageToGM();

    // 页面加载时自动同步远程指令集
    try {
        const remoteUrl = store.get('remote_command_url', '');
        const remoteEnabled = store.get('remote_commands_enabled', 0) === 1;
        if (remoteEnabled && remoteUrl) {
            console.log('页面加载时自动同步远程指令集:', remoteUrl);
            syncRemoteCommands(false).catch(error => {
                console.error('自动同步远程指令集失败:', error);
            });
        }
    } catch (error) {
        console.error('检查远程指令集配置失败:', error);
    }

    const now = new Date().toLocaleString();
    console.log(`上次网页刷新时间：${now}`);
}

// Start
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
