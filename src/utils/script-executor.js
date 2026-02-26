
/**
 * 统一脚本执行器
 * 支持 async/await 语法，并注入常用的全局函数
 */
export async function executeScript(code) {
    if (!code) return;

    try {
        // 使用 AsyncFunction 构造函数来支持顶层 await
        const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
        
        // 准备注入的变量名和值
        const context = {
            click: window.click,
            sleep: window.sleep,
            inputText: window.inputText,
            clickbtn: window.clickbtn,
            clickhref: window.clickhref,
            clickgo: window.clickgo,
            copyWithGreasemonkey: window.copyWithGreasemonkey,
            Toast: window.Toast,
            DebugWindow: window.DebugWindow,
            // 也可以注入 window 本身，方便访问其他全局变量
            window: window,
            document: document,
            console: console,
            alert: window.alert,
            confirm: window.confirm,
            prompt: window.prompt
        };

        const argNames = Object.keys(context);
        const argValues = Object.values(context);

        // 创建函数，参数名为注入的变量名
        const fn = new AsyncFunction(...argNames, code);
        
        // 执行函数，传入对应的值
        return await fn(...argValues);
    } catch (error) {
        console.error('[ScriptExecutor] 执行出错:', error);
        throw error;
    }
}
