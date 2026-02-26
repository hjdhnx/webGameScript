import { CONFIG } from '../config.js';

class Store {
    constructor(prefix) {
        this.prefix = prefix;
        this.ls = window.localStorage;
        this.ss = window.sessionStorage;
        // 检测是否支持GM存储API
        this.hasGMStorage = typeof GM_setValue !== 'undefined' && typeof GM_getValue !== 'undefined';
    }

    key(k) {
        return `${this.prefix}${k}`;
    }

    get(k, d = null) {
        try {
            if (this.hasGMStorage) {
                // 使用GM全局存储
                const v = GM_getValue(this.key(k), null);
                return v == null ? d : JSON.parse(v);
            } else {
                // 降级到localStorage
                const v = this.ls.getItem(this.key(k));
                return v == null ? d : JSON.parse(v);
            }
        } catch (e) {
            console.warn('存储读取失败:', e);
            return d;
        }
    }

    set(k, v) {
        try {
            if (this.hasGMStorage) {
                // 使用GM全局存储
                GM_setValue(this.key(k), JSON.stringify(v));
            } else {
                // 降级到localStorage
                this.ls.setItem(this.key(k), JSON.stringify(v));
            }
        } catch (e) {
            console.warn('存储写入失败:', e);
        }
    }

    remove(k) {
        try {
            if (this.hasGMStorage) {
                // 使用GM全局存储
                if (typeof GM_deleteValue !== 'undefined') {
                    GM_deleteValue(this.key(k));
                } else {
                    GM_setValue(this.key(k), null);
                }
            } else {
                // 降级到localStorage
                this.ls.removeItem(this.key(k));
            }
        } catch (e) {
            console.warn('存储删除失败:', e);
        }
    }

    // Session存储仍使用sessionStorage（因为GM不支持session级别存储）
    sget(k, d = null) {
        try {
            const v = this.ss.getItem(this.key(k));
            return v == null ? d : JSON.parse(v);
        } catch (e) {
            console.warn('Session存储读取失败:', e);
            return d;
        }
    }

    sset(k, v) {
        try {
            this.ss.setItem(this.key(k), JSON.stringify(v));
        } catch (e) {
            console.warn('Session存储写入失败:', e);
        }
    }

    sremove(k) {
        try {
            this.ss.removeItem(this.key(k));
        } catch (e) {
            console.warn('Session存储删除失败:', e);
        }
    }

    // 获取所有存储的键（仅GM模式支持）
    getAllKeys() {
        if (this.hasGMStorage && typeof GM_listValues !== 'undefined') {
            try {
                return GM_listValues().filter(key => key.startsWith(this.prefix));
            } catch (e) {
                console.warn('获取存储键列表失败:', e);
                return [];
            }
        }
        return [];
    }

    // 获取存储模式信息
    getStorageInfo() {
        return {
            mode: this.hasGMStorage ? 'GM全局存储' : 'localStorage',
            crossDomain: this.hasGMStorage,
            prefix: this.prefix
        };
    }
}

export const store = new Store(CONFIG.storagePrefix);
export default store;
