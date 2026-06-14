/**
 * WeCal Sync - 核心算法混码脚本
 * 
 * 用法：node scripts/obfuscate-core.js
 * 
 * 混码后：
 *   原始文件 → src/caldav-client.js → 混码 → background/caldav-client.js（覆盖原文件）
 *   原始文件 → src/sync-engine.js   → 混码 → background/sync-engine.js（覆盖原文件）
 *   原始文件 → src/xml-utils.js     → 混码 → common/xml-utils.js（覆盖原文件）
 * 
 * 留痕记录写入：scripts/obfuscate-record.json（追加模式）
 */

import JavaScriptObfuscator from 'javascript-obfuscator';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const ROOT = path.resolve(import.meta.dirname, '..');

// 要混码的文件列表 [源路径(相对root), 输出路径(相对root)]
const TARGETS = [
  { src: 'backup-core/caldav-client.original.js', out: 'background/caldav-client.js' },
  { src: 'backup-core/sync-engine.original.js',   out: 'background/sync-engine.js' },
  { src: 'backup-core/xml-utils.original.js',      out: 'common/xml-utils.js' },
];

const RECORD_FILE = path.join(ROOT, 'scripts', 'obfuscate-record.json');

/**
 * 计算文件 MD5
 */
function md5(filePath) {
  const buf = fs.readFileSync(filePath);
  return createHash('md5').update(buf).digest('hex');
}

/**
 * 生成签名块
 */
function makeSignatureBlock(fileName, originalMd5, obfuscatedMd5) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp =
    `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  // 签名注释块 — 插入混码后文件头部
  return [
    `// ===== WeCal Sync Obfuscated =====`,
    `// File:    ${fileName}`,
    `// Date:    ${timestamp}`,
    `// MD5(original):   ${originalMd5}`,
    `// MD5(obfuscated): ${obfuscatedMd5}`,
    `// =================================`,
  ].join('\n');
}

// ---------- 开始混码 ----------
const record = {
  obfuscatedAt: new Date().toISOString(),
  version: '1.0.0',
  files: [],
};

console.log('=== WeCal Sync 核心算法混码 ===\n');

for (const t of TARGETS) {
  const srcPath = path.join(ROOT, t.src);
  const outPath = path.join(ROOT, t.out);

  if (!fs.existsSync(srcPath)) {
    console.error(`[跳过] 源文件不存在: ${t.src}`);
    continue;
  }

  // 1. 读源码
  const sourceCode = fs.readFileSync(srcPath, 'utf-8');
  const originalMd5 = md5(srcPath);
  const fileName = path.basename(t.out);

  // 2. 备份已存在的输出文件（混码前再备份一次）
  if (fs.existsSync(outPath)) {
    const bakPath = outPath + '.pre-obfuscate.bak';
    fs.copyFileSync(outPath, bakPath);
    console.log(`  [备份] ${t.out} → ${path.basename(bakPath)}`);
  }

  // 3. 混码
  const obfuscationResult = JavaScriptObfuscator.obfuscate(sourceCode, {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    stringArray: true,
    stringArrayEncoding: ['rc4'],
    stringArrayThreshold: 0.75,
    selfDefending: true,
    // 不要重命名全局变量（避免导入/导出名被改坏）
    renameGlobals: false,
    // 保留 import/export 关键字
    target: 'service-worker',
  });

  let obfuscatedCode = obfuscationResult.getObfuscatedCode();
  const obfuscatedMd5 = createHash('md5').update(obfuscatedCode).digest('hex');

  // 4. 头部插入签名块
  const header = makeSignatureBlock(fileName, originalMd5, obfuscatedMd5);
  obfuscatedCode = header + '\n' + obfuscatedCode;

  // 5. 写入混码文件
  fs.writeFileSync(outPath, obfuscatedCode, 'utf-8');
  // 再算一次写入后的 MD5（验证）
  const writtenMd5 = md5(outPath);

  // 6. 记录
  const fileRecord = {
    file: fileName,
    originalPath: t.src,
    outputPath: t.out,
    originalSize: sourceCode.length,
    obfuscatedSize: obfuscatedCode.length,
    originalMd5,
    obfuscatedMd5: writtenMd5,
    backupPath: t.src,  // 原始文件=备份
    preObfuscateBackup: t.out + '.pre-obfuscate.bak',
  };
  record.files.push(fileRecord);

  console.log(`  ✅ ${fileName}`);
  console.log(`     原始: ${originalMd5}  (${sourceCode.length} bytes)`);
  console.log(`     混码: ${writtenMd5}  (${obfuscatedCode.length} bytes)`);
  console.log(`     膨胀率: ${((obfuscatedCode.length / sourceCode.length) - 1) * 100 > 0 ? '+' : ''}${((obfuscatedCode.length / sourceCode.length) - 1) * 100 < 1 ? '<1' : ((obfuscatedCode.length / sourceCode.length) - 1).toFixed(1)}%\n`);
}

// 7. 追加写入记录文件（保留历史）
const existingRecords = fs.existsSync(RECORD_FILE)
  ? JSON.parse(fs.readFileSync(RECORD_FILE, 'utf-8'))
  : [];
existingRecords.push(record);
fs.writeFileSync(RECORD_FILE, JSON.stringify(existingRecords, null, 2), 'utf-8');

console.log('=== 完成 ===');
console.log(`留痕文件: scripts/obfuscate-record.json`);
console.log(`原始备份: backup-core/`);
