import { store } from '../utils/store.js';
import { Toast } from '../ui/toast.js';
import { RemoteCommandStorage } from './command-storage.js';

// 同步远程指令集
export async function syncRemoteCommands(showToast = true) {
    const url = store.get('remote_command_url', '');
    if (!url) {
        console.log('[远程指令] 未配置远程指令集URL');
        if (showToast) {
            Toast.show('未配置远程指令集URL', 'warning');
        }
        return false;
    }

    // 显示加载状态
    if (showToast) {
        Toast.show('正在同步远程指令集...', 'info');
    }

    try {
        console.log('[远程指令] 开始同步远程指令集:', url);
        
        // 使用GM_xmlhttpRequest避免跨域问题
        const data = await new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'GET',
                url: url,
                headers: {
                    'Accept': 'application/json',
                    'Cache-Control': 'no-cache',
                    'User-Agent': 'ClipboardSender/1.0'
                },
                timeout: 15000, // 15秒超时
                onload: function(response) {
                    try {
                        if (response.status < 200 || response.status >= 300) {
                            reject(new Error(`HTTP ${response.status}: ${response.statusText}`));
                            return;
                        }

                        const contentType = response.responseHeaders.toLowerCase();
                        if (!contentType.includes('application/json') && !contentType.includes('text/json')) {
                            // 尝试解析，可能服务器没有设置正确的Content-Type
                            console.warn('[远程指令] 响应头未包含JSON类型，尝试强制解析');
                        }

                        const jsonData = JSON.parse(response.responseText);
                        resolve(jsonData);
                    } catch (parseError) {
                        reject(new Error(`JSON解析失败: ${parseError.message}`));
                    }
                },
                onerror: function(error) {
                    reject(new Error('网络请求失败'));
                },
                ontimeout: function() {
                    reject(new Error('请求超时'));
                }
            });
        });
        
        // 验证数据格式
        if (!Array.isArray(data)) {
            throw new Error('远程指令集格式错误：应为数组格式');
        }

        if (data.length === 0) {
            console.log('[远程指令] 远程指令集为空');
            if (showToast) {
                Toast.show('远程指令集为空', 'warning');
            }
            RemoteCommandStorage.saveCache([]);
            return true;
        }

        // 处理远程指令数据
        const remoteCommands = data.map((cmd, index) => {
            // 验证必要字段
            if (!cmd.name && !cmd.code) {
                console.warn(`[远程指令] 跳过无效指令 (索引 ${index}):`, cmd);
                return null;
            }
            
            // 确保每个指令都有必要的字段
            const processedCmd = {
                id: cmd.id || `remote_${Date.now()}_${index}`,
                name: cmd.name || `远程指令_${index + 1}`,
                description: cmd.description || '',
                code: cmd.code || '',
                createTime: cmd.createTime || new Date().toISOString(),
                isRemote: true, // 标记为远程指令
                remoteUrl: url // 记录来源URL
            };
            return processedCmd;
        }).filter(Boolean); // 过滤掉无效指令

        // 保存到缓存
        const saveSuccess = RemoteCommandStorage.saveCache(remoteCommands);
        if (!saveSuccess) {
            throw new Error('保存远程指令到本地缓存失败');
        }
        
        console.log(`[远程指令] 同步成功，获取到 ${remoteCommands.length} 个远程指令`);
        
        if (showToast) {
            Toast.show(`远程指令同步成功，获取 ${remoteCommands.length} 个指令`, 'success');
        }
        
        return true;

    } catch (error) {
        console.error('[远程指令] 同步失败:', error);
        
        let errorMessage = '远程指令同步失败';
        if (error.message.includes('请求超时')) {
            errorMessage = '远程指令同步超时，请检查网络连接';
        } else if (error.message.includes('网络请求失败')) {
            errorMessage = '网络连接失败，请检查URL或网络状态';
        } else if (error.message.includes('JSON解析失败')) {
            errorMessage = '远程指令数据格式错误，请检查URL返回的内容';
        } else {
            errorMessage = `远程指令同步失败：${error.message}`;
        }
        
        if (showToast) {
            Toast.show(errorMessage, 'error');
        }
        
        return false;
    }
}
