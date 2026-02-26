import { store } from '../utils/store.js';
import { Toast } from '../ui/toast.js';

export const RemoteCommandStorage = {
    STORAGE_KEY: 'remote_commands_cache',
    LAST_SYNC_KEY: 'remote_commands_last_sync',

    // 获取缓存的远程指令
    getCache() {
        try {
            return store.get(this.STORAGE_KEY, []);
        } catch (e) {
            console.error('获取远程指令缓存失败:', e);
            return [];
        }
    },

    // 保存远程指令到缓存
    saveCache(commands) {
        try {
            store.set(this.STORAGE_KEY, commands);
            store.set(this.LAST_SYNC_KEY, Date.now());
            return true;
        } catch (e) {
            console.error('保存远程指令缓存失败:', e);
            return false;
        }
    },

    // 获取上次同步时间
    getLastSyncTime() {
        try {
            return store.get(this.LAST_SYNC_KEY, 0);
        } catch (e) {
            return 0;
        }
    },

    // 清除缓存
    clearCache() {
        try {
            store.remove(this.STORAGE_KEY);
            store.remove(this.LAST_SYNC_KEY);
        } catch (e) {
            console.error('清除远程指令缓存失败:', e);
        }
    }
};

export const CommandStorage = {
    STORAGE_KEY: 'custom_commands',

    // 获取所有指令（包括本地和远程）
    getAll() {
        try {
            // 获取本地指令（使用全局存储）
            let localCommands = store.get(this.STORAGE_KEY, []);
            
            // 数据迁移：确保所有本地指令都有必要的字段
            let needsSave = false;
            localCommands = localCommands.map(cmd => {
                if (!cmd.id) {
                    cmd.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                    needsSave = true;
                    console.warn('为指令添加缺失的ID:', cmd.name, cmd.id);
                }
                if (cmd.code === undefined || cmd.code === null) {
                    cmd.code = '';
                    needsSave = true;
                    console.warn('为指令添加缺失的代码字段:', cmd.name);
                }
                if (!cmd.name) {
                    cmd.name = '未命名指令_' + cmd.id;
                    needsSave = true;
                    console.warn('为指令添加缺失的名称字段:', cmd.id);
                }
                // 标记为本地指令
                cmd.isRemote = false;
                return cmd;
            });
            
            // 如果有数据需要迁移，保存回存储
            if (needsSave) {
                this.save(localCommands);
                console.log('指令数据迁移完成');
            }
            
            // 获取远程指令（如果启用）
            let remoteCommands = [];
            if (store.get('remote_commands_enabled', 0) === 1) {
                remoteCommands = RemoteCommandStorage.getCache();
            }
            
            // 合并指令：远程指令在前，本地指令在后
            const allCommands = [...remoteCommands, ...localCommands];
            
            return allCommands;
        } catch (e) {
            console.error('获取指令失败:', e);
            return [];
        }
    },

    // 获取仅本地指令
    getLocalOnly() {
        try {
            let commands = store.get(this.STORAGE_KEY, []);
            
            // 确保本地指令都有必要的字段
            commands = commands.map(cmd => {
                if (!cmd.id) {
                    cmd.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                }
                if (cmd.code === undefined || cmd.code === null) {
                    cmd.code = '';
                }
                if (!cmd.name) {
                    cmd.name = '未命名指令_' + cmd.id;
                }
                cmd.isRemote = false;
                return cmd;
            });
            
            return commands;
        } catch (e) {
            console.error('获取本地指令失败:', e);
            return [];
        }
    },

    // 保存指令（仅保存本地指令）
    save(commands) {
        try {
            // 过滤出本地指令
            const localCommands = commands.filter(cmd => !cmd.isRemote);
            store.set(this.STORAGE_KEY, localCommands);
            return true;
        } catch (e) {
            console.error('保存指令失败:', e);
            return false;
        }
    },

    // 添加指令（仅添加到本地）
    add(name, code, description = '') {
        const localCommands = this.getLocalOnly();
        const newCommand = {
            id: Date.now().toString(),
            name: name,
            description: description,
            code: code,
            createTime: new Date().toISOString(),
            isRemote: false
        };
        localCommands.push(newCommand);
        return this.save(localCommands);
    },

    // 删除指令（仅删除本地指令）
    remove(id) {
        const localCommands = this.getLocalOnly();
        const filtered = localCommands.filter(cmd => cmd.id !== id);
        return this.save(filtered);
    },

    // 导入指令（仅导入到本地）
    import(commandsData) {
        try {
            if (Array.isArray(commandsData)) {
                const localCommands = this.getLocalOnly();
                commandsData.forEach(cmd => {
                    if (cmd.name && cmd.code) {
                        localCommands.push({
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            name: cmd.name,
                            description: cmd.description || '',
                            code: cmd.code,
                            createTime: new Date().toISOString(),
                            isRemote: false
                        });
                    }
                });
                return this.save(localCommands);
            }
            return false;
        } catch (e) {
            console.error('导入指令失败:', e);
            return false;
        }
    },

    // 导出指令（仅导出本地指令）
    export() {
        const localCommands = this.getLocalOnly();
        return localCommands.map(cmd => ({
            name: cmd.name,
            description: cmd.description || '',
            code: cmd.code
        }));
    }
};
