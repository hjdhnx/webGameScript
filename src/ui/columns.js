import { h } from '../utils/dom.js';
import { CONFIG } from '../config.js';
import { getLayoutOffset } from '../utils/layout.js';

export function btnStyle() {
    return {
        display: 'block',
        width: '100%',
        height: 'var(--tmx-btn-h)',
        marginTop: '6px',
        color: 'var(--tmx-fg)',
        background: 'var(--tmx-bg)',
        border: '1px solid #999',
        cursor: 'pointer'
    };
}

export class Columns {
    constructor() {
        this.columns = new Map();
        for (let i = 1; i <= 5; i++) this.ensure(i);
    }

    ensure(index) {
        if (this.columns.has(index)) return this.columns.get(index);
        const offset = getLayoutOffset();
        const left = CONFIG.baseLeft + offset + (index - 1) * CONFIG.columnGap;
        const box = h('div', {
            'data-tmx-ui': 'true',
            style: {
                position: 'fixed',
                top: CONFIG.buttonTop + 'px',
                left: left + 'px',
                width: CONFIG.columnWidth + 'px',
                zIndex: 2147483646
            }
        });
        document.body.appendChild(box);
        this.columns.set(index, box);
        return box;
    }

    addButton(index, label, onClick) {
        const box = this.ensure(index);
        const btn = h('button', { style: btnStyle(), title: label }, label);
        btn.addEventListener('click', onClick);
        box.appendChild(btn);
        return btn;
    }
}
