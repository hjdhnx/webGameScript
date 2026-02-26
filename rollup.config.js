
import resolve from '@rollup/plugin-node-resolve';
import replace from '@rollup/plugin-replace';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

const banner = `// ==UserScript==
// @name         通用网页脚本框架（重构版）
// @namespace    https://github.com/hjdhnx/drpy-node
// @description  日志、右下角弹窗、按钮皮肤、可配置布局、按钮集合弹窗、按钮开关、定时任务等；结构化、可扩展。
// @version      ${pkg.version}
// @author       taoist (refactor by chatgpt)
// @match        https://*.baidu.com/*
// @match        https://www.baidu.com/*
// @match        https://connect.huaweicloud.com/*
// @match        https://*.huaweicloud.com/*
// @match        https://*.iconfont.cn/*
// @match        https://*.ziwierp.cn/*
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @grant        GM_listValues
// ==/UserScript==
`;

export default {
    input: 'src/index.js',
    output: {
        file: 'dist/clipboard-sender.user.js',
        format: 'iife',
        banner: banner,
    },
    onwarn(warning, warn) {
        if (warning.code === 'EVAL') return;
        warn(warning);
    },
    plugins: [
        replace({
            '__VERSION__': pkg.version,
            preventAssignment: true
        }),
        resolve()
    ]
};
