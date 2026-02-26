import { h } from '../utils/dom.js';
import { CONFIG } from '../config.js';
import { getLayoutOffset, ZIndexManager } from '../utils/layout.js';
import { store } from '../utils/store.js';
import { btnStyle } from './columns.js';

export class GroupPopup {
    constructor(title) {
        this.title = title;
        // overlay covers full screen to allow click-outside-to-close
        this.overlay = h('div', {
            'data-tmx-ui': 'true',
            style: {
                position: 'fixed',
                inset: '0',
                zIndex: 2147483645,
                display: 'none',
                background: 'rgba(0,0,0,0)',
                pointerEvents: 'none' // 允许点击穿透到下层
            }
        });
        // 添加关闭按钮到panel
        const closeBtn = h('button', {
            style: {
                position: 'absolute',
                top: '5px',
                right: '5px',
                width: '20px',
                height: '20px',
                border: 'none',
                background: '#ff6b6b',
                color: 'white',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '12px',
                lineHeight: '1'
            }
        }, '×');
        closeBtn.addEventListener('click', () => this.hide());
        
        // 为panel单独设置pointer-events
        this.panelClickHandler = (e) => {
            e.stopPropagation();
        };

        // 创建固定定位的wrapper
        this.panelWrapper = h('div', {
            style: {
                position: 'fixed',
                top: CONFIG.popTop + 'px',
                left: getLayoutOffset() + 'px',
                pointerEvents: 'auto'
            }
        });
        
        this.panel = h('div', {
            style: {
                position: 'relative',
                width: 'min(480px, calc(100vw - 20px))', // 5列按钮宽度，移动端不超出
                padding: '10px 8px',
                background: '#B2DFEE',
                color: 'green',
                textAlign: 'center',
                border: '2px solid #ccc',
                boxSizing: 'border-box'
            }
        });
        this.panel.addEventListener('click', this.panelClickHandler);
        
        // 添加关闭按钮到panel
        this.panel.appendChild(closeBtn);
        
        const titleBar = h('div', { style: { marginBottom: '6px', fontWeight: 'bold' } }, title);
        this.btnWrap = h('div', {
            style: {
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                justifyContent: 'flex-start',
                alignItems: 'flex-start',
                minHeight: '40px'
            }
        });
        this.panel.append(titleBar, this.btnWrap);
        this.panelWrapper.appendChild(this.panel);
        this.overlay.append(this.panelWrapper);
        document.body.appendChild(this.overlay);
        this.visible = false;
    }

    /**
     * 添加按钮
     * @param {string} label
     * @param {Function} handler  // will be called either as handler(btn) for toggles or handler() for normal
     * @param {Object} options { isToggle:boolean, storeKey:string }
     */
    addButton(label, handler, options = {}) {
        const btn = h('button', {
            style: Object.assign({}, btnStyle(), {
                width: 'calc(20% - 3.2px)', // 每行5列，减去gap间距
                minWidth: '60px',
                maxWidth: '80px',
                flex: '0 0 auto',
                padding: '3px 4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontSize: '12px'
            }),
            title: label
        }, label);
        // apply current theme colors
        btn.style.color = getComputedStyle(document.documentElement).getPropertyValue('--tmx-fg') || CONFIG.themes[0].fg;
        btn.style.background = getComputedStyle(document.documentElement).getPropertyValue('--tmx-bg') || CONFIG.themes[0].bg;

        if (options.isToggle && options.storeKey) {
            // read initial state from store
            let active = store.get(options.storeKey, 0) === 1;
            btn.style.borderStyle = active ? 'inset' : 'outset';
            
            // 如果是开关，且初始为开启状态，尝试更新按钮文本
            // 注意：这里我们假设 label 格式为 "开XX"，开启后变为 "关XX"
            // 或者更通用的做法是，handler 内部会根据 store 状态更新文本，
            // 但这里是初始化，handler 还没执行。
            // 实际上，makeToggle 生成的 handler 已经处理了点击后的文本更新。
            // 问题的关键在于：页面刷新加载时，按钮文本是初始传入的 label（通常是"开XX"），
            // 但如果 store 里状态是 1（已开启），按钮应该是"关XX"。
            
            if (active && label.startsWith('开')) {
                btn.textContent = label.replace('开', '关');
            }

            // click toggles state, calls handler with (active, btn)
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                // 注意：这里的 active 变量是闭包内的局部变量，
                // 但 makeToggle 内部也会读取 store。
                // 为了避免状态不一致，最好重新从 store 读取，或者让 handler 负责更新状态。
                // 现在的逻辑是：点击 -> active取反 -> 更新样式 -> 调用handler -> handler更新store
                
                // 修正：点击时，active 应该是取反后的值
                // 但 makeToggle 的逻辑是：读取 store -> 取反 -> 保存 store -> 更新 UI
                // 所以这里我们只需要调用 handler 即可，handler 会处理一切
                // 不过 handler 需要知道当前按钮元素，以便更新文本
                
                try {
                    // 传递 btn 给 handler，handler (makeToggle返回的函数) 会处理状态切换和UI更新
                    handler(btn);
                    
                    // 更新闭包内的 active 状态，以便下次点击逻辑正确（虽然 makeToggle 内部主要依赖 store）
                    // 重新读取 store 以确保同步
                    active = store.get(options.storeKey, 0) === 1;
                    btn.style.borderStyle = active ? 'inset' : 'outset';
                } catch (err) {
                    console.error(err);
                }
                this.hide(); // collapse after click (保持原版体验)
            });
        } else {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                try {
                    handler(btn);
                } catch (err) {
                    console.error(err);
                }
                this.hide();
            });
        }
        this.btnWrap.appendChild(btn);
        return btn;
    }

    show() {
        this.overlay.style.display = '';
        // 确保当前弹窗在最上层
        ZIndexManager.bringToTop(this.overlay);
        this.visible = true;
    }

    hide() {
        this.overlay.style.display = 'none';
        this.visible = false;
    }

    toggle() {
        this.visible ? this.hide() : this.show();
    }
}
