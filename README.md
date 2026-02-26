# 通用网页脚本框架 (WebGameScript Refactor)

这是一个基于 Node.js 和 Rollup 重构的模块化网页脚本框架（原单文件油猴脚本）。通过模块化开发，提高了代码的可维护性和扩展性，最终打包成一个可以在 Tampermonkey (油猴) 等浏览器插件中运行的单一脚本文件。

## ✨ 特性

- **模块化架构**：将庞大的单文件脚本拆分为 UI、Core、Actions、Utils 等模块，结构清晰。
- **现代化开发**：使用 ES Modules (ESM) 进行开发。
- **自动打包**：使用 Rollup 自动将模块打包成单文件，并自动添加 Userscript 头部元数据。
- **功能保留**：完整保留了原脚本的所有核心功能（日志、UI皮肤、定时任务、远程指令同步、调试窗口等）。

## 🛠️ 环境要求

- [Node.js](https://nodejs.org/) (建议 v14 或更高版本)
- npm (通常随 Node.js 一起安装)

## 🚀 快速开始

### 1. 安装依赖

在项目根目录下运行以下命令安装所需的开发依赖：

```bash
npm install
```

### 2. 构建脚本

执行构建命令，将源码打包成最终的油猴脚本文件：

```bash
npm run build
```

构建成功后，生成的文件位于 `dist/clipboard-sender.user.js`。

### 3. 开发模式

如果你正在修改代码，可以使用监听模式。当源文件发生变化时，会自动重新打包：

```bash
npm run watch
```

## 📂 项目结构

```text
e:\gitwork\webGameScript\
├── src/                    # 源代码目录
│   ├── actions/            # 动作处理器 (具体功能的实现)
│   │   └── handlers.js     # 所有按钮点击事件的处理函数
│   ├── core/               # 核心逻辑
│   │   ├── store.js        # 存储管理 (localStorage / GM_setValue)
│   │   ├── scheduler.js    # 定时任务调度器
│   │   ├── state.js        # 全局状态管理 (Shared State)
│   │   ├── theme.js        # 主题管理
│   │   ├── remote-sync.js  # 远程指令同步
│   │   └── debug-window.js # 调试窗口逻辑
│   ├── ui/                 # UI 组件
│   │   ├── columns.js      # 侧边栏按钮列管理
│   │   ├── group-popup.js  # 分组弹窗组件
│   │   ├── dialog.js       # 通用对话框组件
│   │   ├── toast.js        # 消息提示组件
│   │   └── ...             # 其他特定功能的 UI 组件
│   ├── utils/              # 工具函数
│   │   ├── dom.js          # DOM 操作辅助函数 (h 函数)
│   │   ├── logger.js       # 日志工具
│   │   └── layout.js       # 布局计算
│   ├── config.js           # 全局配置和元数据
│   └── index.js            # 项目入口文件 (定义 Actions 和初始化)
├── dist/                   # 打包输出目录
│   └── clipboard-sender.user.js  # 最终生成的油猴脚本
├── rollup.config.js        # Rollup 打包配置
└── package.json            # 项目配置和依赖
```

## 📖 如何使用

1.  运行 `npm run build` 生成脚本。
2.  打开浏览器中的 Tampermonkey 扩展管理面板。
3.  点击 "添加新脚本" 或直接将 `dist/clipboard-sender.user.js` 文件拖入浏览器。
4.  保存脚本即可生效。

## 🧩 功能详解 & 使用指南

### 1. 界面布局
脚本界面默认显示在屏幕左上角，分为 5 列按钮：
- **第1列**：基础控制（日志开关、按钮显隐）
- **第2列**：皮肤管理（皮肤集、一键换肤）
- **第3列**：调试工具（弹窗提示、**调试执行**、**坐标拾取**、**元素拾取**）
- **第4列**：任务管理（定时任务、剪切板推送）
- **第5列**：高级功能（配置集、开关集、指令集）

### 2. H5 游戏自动化 (特色功能)
针对 Canvas/WebGL 等 H5 游戏，框架提供了强大的坐标点击功能：

- **坐标拾取**：点击第3列的“坐标拾取”按钮，在屏幕任意位置点击，即可获取坐标并自动复制 `await click(x, y)` 代码。
- **元素拾取**：点击第3列的“元素拾取”按钮，可高亮并拾取页面元素。如果是输入框，自动生成 `await inputText(...)` 代码；如果是普通元素，生成 `await clickgo(...)` 代码。
- **穿透点击**：脚本生成的 UI（调试窗口等）具有点击穿透特性。即使调试窗口遮挡了游戏画面，脚本的点击指令依然能准确作用于游戏元素。

### 3. 脚本调试与编写
点击“调试执行”打开调试窗口。支持现代 ES6+ 语法及 `async/await`。

**内置全局函数：**
- `await click(x, y)`: 模拟鼠标点击（同时触发 PointerEvent 和 MouseEvent，适配大多数 H5 游戏）。
- `await sleep(ms)`: 睡眠指定毫秒数。
- `await inputText(text, target)`: 输入文本。`target` 可选，支持选择器字符串或 DOM 元素；如果不传，则向当前聚焦元素输入。
- `await scroll(x, y)`: 滚动页面（相对当前位置）。使用 `absolute: true` 可滚动到绝对位置。
- `await scrollToBottom()`: 滚动到底部。
- `await scrollToTop()`: 滚动到顶部。
- `clickbtn(text)`: 点击包含指定文本的按钮/链接。
- `clickhref(text)`: 点击包含指定文本的 `<a>` 标签。
- `clickgo(selector)`: 点击匹配 CSS 选择器的元素。
- `Toast.show(msg)`: 显示轻提示。
- `DebugWindow`: 调试窗口管理器。

**示例脚本：**
```javascript
// 示例：自动执行一系列操作
console.log('开始执行任务...');
Toast.show('任务开始');

// 点击开始战斗 (坐标需根据实际游戏调整)
await click(100, 200);

// 等待 3 秒
await sleep(3000);

// 点击确认结算
await click(300, 400);

// 示例：点击输入框并输入文本
await click(500, 600); // 假设这是输入框坐标
await sleep(500); // 等待聚焦
await inputText('Hello World'); // 输入文本
await click(700, 800); // 点击提交按钮

// 滚动页面到底部查看结果
await scrollToBottom();
await sleep(1000);
// 向上滚动一点
await scroll(0, -200);

console.log('任务完成！');
Toast.show('任务完成！');
```

### 4. 指令集与远程同步
- **本地指令**：在调试窗口编写好代码后，可点击“添加到指令集”保存。方便日后重复调用。
- **远程指令**：在“配置集”中设置远程指令 URL (返回 JSON 格式)，可实现多设备间的指令同步与共享。

### 5. 定时任务
在“定时任务”面板中，可以将保存的指令设置为定时执行（支持每天特定时间或循环间隔）。

## 🔧 如何扩展

### 添加一个新的功能按钮

1.  在 `src/actions/handlers.js` 中添加一个新的导出函数，实现你的业务逻辑。
    ```javascript
    export function myNewFeature() {
        console.log("我的新功能被点击了！");
        alert("Hello World");
    }
    ```

2.  在 `src/index.js` 中导入该函数，并在 `ACTIONS` 数组中配置按钮。
    ```javascript
    import { myNewFeature } from './actions/handlers.js';

    const ACTIONS = [
        // ... 其他现有按钮
        { 
            id: 'my-feature', 
            label: '新功能', 
            column: 1,       // 显示在第几列 (1-5)
            handler: myNewFeature 
        },
    ];
    ```

3.  重新运行 `npm run build`。

## ⚠️ 注意事项

- **Rollup 配置**：`rollup.config.js` 中已配置忽略 `eval` 警告，因为脚本核心功能（如执行动态代码）依赖于 `eval`。
- **元数据**：Userscript 的头部元数据（如 `@name`, `@match`, `@grant`）定义在 `rollup.config.js` 的 `banner` 变量中，如需修改脚本匹配的网站或权限，请修改该文件。
