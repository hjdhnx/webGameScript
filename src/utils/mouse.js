
/**
 * 模拟鼠标点击指定坐标
 * 针对H5游戏优化，同时触发PointerEvent和MouseEvent
 * @param {number} x - 视口X坐标
 * @param {number} y - 视口Y坐标
 */
export async function simulateClick(x, y) {
    // 获取该位置的所有元素
    const elements = document.elementsFromPoint(x, y);
    
    // 找到第一个不是脚本UI的元素
    let el = null;
    for (const element of elements) {
        // 检查元素本身或其祖先是否有 data-tmx-ui 属性
        if (!element.closest('[data-tmx-ui="true"]')) {
            el = element;
            break;
        }
    }

    // 如果没找到（可能点击位置完全被UI覆盖且没有下层元素？），或者是脚本UI，则回退到 canvas 或 body
    if (!el) {
        el = document.querySelector('canvas') || document.body;
    }
    
    console.log(`[Mouse] Simulating click at (${x}, ${y}) on`, el);

    // 在油猴环境中，window对象可能被包装，导致PointerEvent构造函数报错
    // 优先使用 unsafeWindow，如果不存在则使用 window
    const win = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window;

    const commonOpts = {
        bubbles: true,
        cancelable: true,
        view: win,
        clientX: x,
        clientY: y,
        screenX: x + (win.screenX || 0),
        screenY: y + (win.screenY || 0),
        button: 0,
        buttons: 1,
        width: 1,
        height: 1,
        pressure: 0.5,
        isPrimary: true,
        pointerId: 1,
        pointerType: 'mouse'
    };

    // 许多H5游戏引擎(如Cocos, Laya, Egret)依赖PointerEvent
    // 顺序通常是: pointerdown -> mousedown -> pointerup -> mouseup -> click
    
    // 1. pointerdown
    el.dispatchEvent(new PointerEvent('pointerdown', commonOpts));
    
    // 2. mousedown
    el.dispatchEvent(new MouseEvent('mousedown', commonOpts));
    
    // 模拟按下和抬起之间的微小延迟
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 3. pointerup
    el.dispatchEvent(new PointerEvent('pointerup', commonOpts));
    
    // 4. mouseup
    el.dispatchEvent(new MouseEvent('mouseup', commonOpts));
    
    // 5. click
    el.dispatchEvent(new MouseEvent('click', commonOpts));
}
