import { store } from '../utils/store.js';
import { Logger } from '../utils/logger.js';
import { buttonMap, groupMap, getColumns } from '../core/state.js';
import { CONFIG } from '../config.js';
import { ZIndexManager, getLayoutOffset } from '../utils/layout.js';
import { Theme } from '../core/theme.js';
import { Toast } from '../ui/toast.js';
import { Dialog } from '../ui/dialog.js';
import { SkinSelector } from '../ui/skin-selector.js';
import { CommandSelector } from '../ui/command-selector.js';
import { ScheduleManager } from '../ui/schedule-manager.js';
import { DebugWindowManager } from '../core/debug-window.js';
import { syncRemoteCommands } from '../core/remote-sync.js';
import { CoordinatePicker } from '../ui/coordinate-picker.js';
import { ElementPicker } from '../ui/element-picker.js';
import { setGrayMode } from './gray-mode.js';

export function toggleLog() {
    // 使用store中的状态作为主要判断依据，DOM状态作为备用
    const storedHidden = store.get('logger.hidden', 0) === 1;
    const domHidden = document.getElementById('tmx-logger')?.style.display === 'none';
    const isCurrentlyHidden = storedHidden || domHidden;

    if (isCurrentlyHidden) {
        Logger.show();
        store.set('logger.hidden', 0);
        const btn = buttonMap.get('toggle-log');
        if (btn) {
            btn.textContent = '隐藏日志';
            btn.style.borderStyle = 'inset';
        }
    } else {
        Logger.hide();
        store.set('logger.hidden', 1);
        const btn = buttonMap.get('toggle-log');
        if (btn) {
            btn.textContent = '显示日志';
            btn.style.borderStyle = 'outset';
        }
    }
}

export function toggleButtons() {
    const btn = buttonMap.get('toggle-buttons');
    const nowHidden = Array.from(buttonMap.values()).some(b => b.style.visibility === 'hidden');
    for (const [id, el] of buttonMap) {
        if (id === 'toggle-buttons') continue;
        el.style.visibility = nowHidden ? 'visible' : 'hidden';
    }
    store.set('buttons.hidden', nowHidden ? 0 : 1);
    const hidden = store.get('buttons.hidden', 0) === 1;
    
    const columnsInstance = getColumns();
    if (!columnsInstance) return;
    const boxes = columnsInstance.columns;
    
    const btnBox = btn ? btn.parentElement : null;
    if (hidden) {
        for (const [, box] of boxes) {
            if (box !== btnBox) {
                box.style.display = 'none';
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
        for (const [, box] of boxes) {
            box.style.display = '';
        }
        if (btnBox) {
            let colIndex = 1;
            for (const [idx, b] of boxes) {
                if (b === btnBox) {
                    colIndex = idx;
                    break;
                }
            }
            const offset = getLayoutOffset();
            const left = CONFIG.baseLeft + offset + (colIndex - 1) * CONFIG.columnGap;
            
            btnBox.style.position = 'fixed';
            btnBox.style.left = left + 'px';
            btnBox.style.top = CONFIG.buttonTop + 'px';
            btnBox.style.width = CONFIG.columnWidth + 'px';
            btnBox.style.zIndex = 2147483646;
        }
        if (btn) {
            btn.textContent = '隐按钮';
            btn.style.borderStyle = 'inset';
            btn.style.width = '100%';
            btn.style.minWidth = '';
            btn.style.padding = '';
        }
    }
}

export function switchTheme() {
    Theme.next();
    Theme.apply();
    Logger.applyTheme();
    Toast.applyTheme();
    Dialog.applyTheme();
    // 同步按钮颜色
    for (const [, el] of buttonMap) {
        el.style.color = 'var(--tmx-fg)';
        el.style.background = 'var(--tmx-bg)';
    }
    for (const [, gp] of groupMap) {
        Array.from(gp.btnWrap.children).forEach(b => {
            b.style.color = 'var(--tmx-fg)';
            b.style.background = 'var(--tmx-bg)';
        });
    }
    console.log(`当前皮肤为 -- ${Theme.current.name}`);
}

// 创建全局皮肤选择器实例
let skinSelector = null;

export function toggleSkinSelector(btnEl) {
    if (!skinSelector) {
        skinSelector = new SkinSelector();
    }
    skinSelector.toggle();
    if (btnEl) {
        btnEl.style.borderStyle = skinSelector.visible ? 'inset' : 'outset';
    }
}

// 创建全局指令选择器实例
let commandSelector = null;

export function toggleCommandSelector(btnEl) {
    if (!commandSelector) {
        commandSelector = new CommandSelector();
        window.commandSelector = commandSelector;
    }
    commandSelector.toggle();
    if (commandSelector.visible) {
        commandSelector.updateCommandButtons();
    }
    if (btnEl) {
        btnEl.style.borderStyle = commandSelector.visible ? 'inset' : 'outset';
    }
}

// 创建全局定时任务管理器实例
let scheduleManager = null;

export function toggleScheduleManager(btnEl) {
    if (!scheduleManager) {
        scheduleManager = new ScheduleManager();
    }
    scheduleManager.toggle();
    if (btnEl) {
        btnEl.style.borderStyle = scheduleManager.visible ? 'inset' : 'outset';
    }
}

export function toggleToast() {
    const flag = store.get('toast.enabled', 0) ? 0 : 1;
    store.set('toast.enabled', flag);
    const btn = buttonMap.get('toast');
    if (btn) {
        btn.style.borderStyle = flag ? 'inset' : 'outset';
        btn.textContent = flag ? '关闭弹窗' : '弹窗提示';
    }
    
    if (flag) {
        // 开启弹窗提示时显示弹窗
        Toast.show('提示', '你好');
    } else {
        // 关闭弹窗提示时，如果右下角有弹窗则自动关闭
        Toast.hide();
    }
    
    // 通知调试窗口更新最小化容器位置，避免与弹窗重叠
    if (window.DebugWindow && window.DebugWindow.updateMinimizedContainerPosition) {
        window.DebugWindow.updateMinimizedContainerPosition();
    }
}

export function toggleGroup(name) {
    return (btnEl) => {
        const gp = groupMap.get(name);
        if (!gp) return;
        gp.toggle();
        // 可选：当弹窗显示时，让主按钮有一个视觉效果
        if (btnEl) btnEl.style.borderStyle = gp.visible ? 'inset' : 'outset';
    };
}

/**
 * 创建通用切换开关处理器
 * @param {string} id - 按钮ID
 * @param {string} openLabel - 开启时的标签
 * @param {string} closeLabel - 关闭时的标签
 * @param {string} storeKey - 存储键名
 * @param {Function} [onChange] - 状态改变时的回调函数 (newValue) => void
 * @returns {Function} 处理器函数
 */
export function makeToggle(id, openLabel, closeLabel, storeKey, onChange) {
    return (activeOrBtn, maybeBtn) => {
        // 兼容两种调用方式：
        // 1) group popup calls handler(active, btn) -> active is boolean, maybeBtn is btn
        // 2) column button calls handler(btn) -> activeOrBtn is btn
        if (typeof activeOrBtn === 'boolean') {
            const active = activeOrBtn;
            const btn = maybeBtn;
            // save to store
            store.set(storeKey, active ? 1 : 0);
            // update text if btn provided
            if (btn) btn.innerText = active ? closeLabel : openLabel;
            
            if (onChange) {
                onChange(active);
            } else {
                console.log(`[${openLabel}] 状态：${active ? '已开启' : '已关闭'}`);
            }
        } else {
            // called as handler(btn) from column (rare for these toggles) - just toggle state
            const btn = activeOrBtn;
            const cur = store.get(storeKey, 0) === 1;
            const will = !cur;
            store.set(storeKey, will ? 1 : 0);
            if (btn) {
                btn.innerText = will ? closeLabel : openLabel;
                btn.style.borderStyle = will ? 'inset' : 'outset';
            }
            
            if (onChange) {
                onChange(will);
            } else {
                console.log(`[${openLabel}] 状态：${will ? '已开启' : '已关闭'}`);
            }
        }
    };
}

export function noop(name) {
    return () => console.log(`[${name}] 点击`);
}

export async function configClipboardApi() {
    try {
        const key = 'clipboard_api';
        const current = store.get(key, '');
        console.log('Dialog: 准备显示prompt对话框');
        const value = await Dialog.prompt('请输入剪切板API:', current || '', '配置剪切板API');
        console.log('Dialog: prompt对话框返回值:', value);
        if (value !== null) {
            store.set(key, value);
            console.log('[配置集] 已保存剪切板API:', value);
        }
    } catch (err) {
        console.error('Dialog错误:', err);
    }
}

export async function configRemoteCommandUrl() {
    try {
        const key = 'remote_command_url';
        const current = store.get(key, '');
        const value = await Dialog.prompt('请输入远程指令集URL:', current || '', '配置远程指令集');
        if (value !== null) {
            store.set(key, value);
            console.log('[配置集] 已保存远程指令集URL:', value);
            // 如果启用了远程指令，立即尝试同步
            if (store.get('remote_commands_enabled', 0) === 1) {
                await syncRemoteCommands(true);
            }
        }
    } catch (err) {
        console.error('配置远程指令URL错误:', err);
    }
}

export function executeDebugCode() {
    // 创建新的调试代码窗口
    const defaultCode = '// 示例代码\nconsole.log("Hello World!");\nalert("测试弹窗");\n\n// 获取页面元素\nconst elements = document.querySelectorAll("div");\nconsole.log("页面div元素数量:", elements.length);\n\n// 便捷点击函数示例\n// clickbtn("百度一下");  // 点击包含"百度一下"文本的按钮\n// clickhref("百度一下"); // 点击包含"百度一下"文本的链接\n// clickgo("#su");       // 点击id为su的元素\n// clickgo("input[type=\"submit\"]"); // 点击提交按钮\n// await click(100, 200); // 点击坐标(100, 200)';

    const windowId = DebugWindowManager.createWindow(defaultCode);
    console.log(`[调试执行器] 创建调试窗口: ${windowId}`);
    Logger.append(`[调试执行器] 创建新调试窗口: ${windowId}`);
}

export function pickCoordinate() {
    CoordinatePicker.start();
}

export function pickElement() {
    ElementPicker.start();
}

export function toggleGrayMode(enable) {
    setGrayMode(enable);
    const label = enable ? '开灰度' : '关灰度';
    Logger.append(`[开关集] ${label}`);
}

export async function configSafeCode() {
    const key = 'clipboard_safecode';
    const current = store.get(key, '');
    const value = await Dialog.prompt('请输入剪切板安全码:', current || '', '配置安全码');
    if (value !== null) {
        store.set(key, value);
        console.log('[配置集] 已保存剪切板安全码:', value);
    }
}

// 检查文本是否包含可疑模式
function containsSuspiciousPatterns(text) {
    const suspiciousPatterns = [
        /\x4D\x5A/, // MZ (可执行文件头)
        /\x7F\x45\x4C\x46/, // ELF (Linux可执行文件)
        /\x23\x21/, // Shebang (#!)
        /<\?php/i, // PHP代码
        /<script\b[^>]*>/i, // Script标签
        /eval\(/i, // eval函数
        /javascript:/i, // javascript协议
        /vbscript:/i, // vbscript协议
    ];
    return suspiciousPatterns.some(pattern => pattern.test(text));
}

export async function pushClipboardText() {
    const api = store.get('clipboard_api', '');
    const token = store.get('clipboard_safecode', '');
    if (!api || !token) {
        await Dialog.alert('请先配置剪切板API和安全码', '推送失败');
        return;
    }
    try {
        const text = await navigator.clipboard.readText();
        if (!text) {
            await Dialog.alert('剪切板为空，无法推送', '推送失败');
            return;
        }

        // 检查是否包含可疑内容
        if (containsSuspiciousPatterns(text)) {
            const confirmed = await Dialog.confirm(
                '检测到剪切板内容包含可疑模式（如脚本代码、可执行文件等），可能存在安全风险。\n\n是否仍要继续推送？',
                '安全警告'
            );
            if (!confirmed) {
                Logger.append('[推送文本] 用户取消：内容包含可疑模式');
                return;
            }
        }
        GM_xmlhttpRequest({
            method: 'POST',
            url: api,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + token
            },
            data: JSON.stringify({ text }),
            onload: function (res) {
                console.log("✅ 请求成功！");
                console.log("状态码:", res.status);
                console.log("响应文本:", res.responseText);
                console.log("响应头:", res.responseHeaders);
                if (res.status >= 200 && res.status < 300) {
                    console.log('[推送文本] 成功:', text);
                    Logger.append(`[推送文本] 成功：${text}`);
                } else {
                    console.error('[推送文本] 失败:', res.status, res.responseText);
                    Logger.append(`[推送文本] 失败: ${res.status} ${res.responseText}`);

                    // 特殊处理可疑内容错误
                    if (res.status === 400 && res.responseText.includes('suspicious patterns')) {
                        Dialog.alert('服务器检测到内容包含可疑模式，推送被拒绝。\n\n请检查剪切板内容是否包含脚本代码、可执行文件等敏感内容。', '推送失败');
                    }
                }
            },
            onerror: function (err) {
                console.error('[推送文本] 网络错误:', err);
                Logger.append('[推送文本] 网络错误');
            }
        });
    } catch (err) {
        console.error('[推送文本] 剪切板读取失败:', err);
        Logger.append('[推送文本] 剪切板读取失败: ' + err.message);
        await Dialog.alert(`剪切板读取失败: ${err.message}`, '推送失败');
    }
}
