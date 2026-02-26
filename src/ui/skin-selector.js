import { h } from '../utils/dom.js';
import { CONFIG } from '../config.js';
import { Theme } from '../core/theme.js';
import { Logger } from '../utils/logger.js';
import { Toast } from './toast.js';
import { Dialog } from './dialog.js';
import { buttonMap, groupMap } from '../core/state.js';

export class SkinSelector {
    constructor() {
        this.overlay = h('div', {
            'data-tmx-ui': 'true',
            style: {
                position: 'fixed',
                inset: '0',
                zIndex: 2147483646,
                display: 'none',
                background: 'rgba(0,0,0,0.3)'
            }
        });

        this.overlay.addEventListener('click', (e) => {
            if (e.target === this.overlay) this.hide();
        });

        this.panel = h('div', {
            style: {
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 'min(480px, calc(100vw - 20px))',
                maxHeight: '70vh',
                background: 'var(--tmx-bg)',
                color: 'var(--tmx-fg)',
                border: '2px solid #ccc',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                boxSizing: 'border-box'
            }
        });

        // 固定的标题栏容器
        const titleContainer = h('div', {
            style: {
                position: 'relative',
                padding: '15px 15px 0 15px',
                flexShrink: '0'
            }
        });

        const titleBar = h('div', {
            style: {
                marginBottom: '15px',
                fontWeight: 'bold',
                fontSize: '16px',
                textAlign: 'center',
                borderBottom: '1px solid #ccc',
                paddingBottom: '10px'
            }
        }, `选择皮肤主题 (共${CONFIG.themes.length}套)`);

        this.closeBtn = h('button', {
            style: {
                position: 'absolute',
                top: '10px',
                right: '15px',
                background: 'transparent',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: 'var(--tmx-fg)',
                fontWeight: 'bold'
            }
        }, '×');

        this.closeBtn.addEventListener('click', () => this.hide());

        titleContainer.append(titleBar, this.closeBtn);

        // 可滚动的皮肤网格容器
        const skinContainer = h('div', {
            style: {
                flex: '1',
                overflow: 'auto',
                padding: '0 15px 15px 15px'
            }
        });

        this.skinGrid = h('div', {
            style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px'
            }
        });

        skinContainer.appendChild(this.skinGrid);
        this.panel.append(titleContainer, skinContainer);
        this.overlay.append(this.panel);
        document.body.appendChild(this.overlay);

        this.createSkinButtons();
        this.visible = false;
    }

    createSkinButtons() {
        CONFIG.themes.forEach((theme, index) => {
            const skinBtn = h('div', {
                style: {
                    padding: '8px 4px',
                    border: '2px solid #ccc',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    textAlign: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    background: theme.bg,
                    color: theme.fg,
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    minHeight: '45px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    wordBreak: 'break-all',
                    lineHeight: '1.2'
                },
                title: theme.name
            }, theme.name);

            // 当前选中的皮肤添加特殊标识
            if (index === Theme.index) {
                skinBtn.style.borderColor = '#007bff';
                skinBtn.style.borderWidth = '3px';
                skinBtn.style.boxShadow = '0 0 10px rgba(0,123,255,0.5)';
            }

            skinBtn.addEventListener('mouseenter', () => {
                if (index !== Theme.index) {
                    skinBtn.style.transform = 'scale(1.05)';
                    skinBtn.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
                }
            });

            skinBtn.addEventListener('mouseleave', () => {
                if (index !== Theme.index) {
                    skinBtn.style.transform = 'scale(1)';
                    skinBtn.style.boxShadow = 'none';
                }
            });

            skinBtn.addEventListener('click', () => {
                // 移除之前选中的样式
                this.skinGrid.querySelectorAll('div').forEach(btn => {
                    btn.style.borderColor = '#ccc';
                    btn.style.borderWidth = '2px';
                    btn.style.boxShadow = 'none';
                });

                // 应用新皮肤
                Theme.index = index;
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

                // 更新弹窗样式
                this.panel.style.background = 'var(--tmx-bg)';
                this.panel.style.color = 'var(--tmx-fg)';
                this.closeBtn.style.color = 'var(--tmx-fg)';

                // 标记当前选中
                skinBtn.style.borderColor = '#007bff';
                skinBtn.style.borderWidth = '3px';
                skinBtn.style.boxShadow = '0 0 10px rgba(0,123,255,0.5)';

                console.log(`已切换到皮肤: ${theme.name}`);
            });

            this.skinGrid.appendChild(skinBtn);
        });
    }

    show() {
        this.overlay.style.display = '';
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
