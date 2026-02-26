import { store } from '../utils/store.js';
import { CONFIG } from '../config.js';

export const Theme = {
    index: store.get('theme.index', CONFIG.defaultThemeIndex),
    get current() {
        return CONFIG.themes[this.index % CONFIG.themes.length];
    },
    next() {
        this.setIndex((this.index + 1) % CONFIG.themes.length);
    },
    setIndex(i) {
        this.index = i;
        store.set('theme.index', i);
        this.apply();
    },
    apply() {
        document.documentElement.style.setProperty('--tmx-fg', this.current.fg);
        document.documentElement.style.setProperty('--tmx-bg', this.current.bg);
        document.documentElement.style.setProperty('--tmx-btn-h', CONFIG.buttonHeight + 'px');
    }
};
