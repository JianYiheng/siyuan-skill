#!/usr/bin/env node
/**
 * 检查思源笔记连接状态
 */

const http = require('http');

const SIYUAN_API_URL = process.env.SIYUAN_API_URL || 'http://127.0.0.1:6806';

async function checkConnection() {
  return new Promise((resolve, reject) => {
    const url = new URL('/api/system/getVersion', SIYUAN_API_URL);

    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          if (body.trim() === '') {
            resolve(null);
          } else {
            const result = JSON.parse(body);
            resolve(result);
          }
        } catch (e) {
          resolve({ error: e.message, rawBody: body });
        }
      });
    });

    req.on('error', (e) => {
      resolve({ error: e.message });
    });

    req.write('{}');
    req.end();
  });
}

async function main() {
  console.log(`正在检查思源笔记连接...`);
  console.log(`API地址: ${SIYUAN_API_URL}\n`);

  const result = await checkConnection();

  if (result === null) {
    console.log('❌ 连接失败: 思源笔记未响应\n');
    console.log('请确保:');
    console.log('1. 思源笔记正在运行');
    console.log('2. 思源笔记的API服务已启用');
    console.log('3. 端口号6806正确（可在思源笔记设置中查看）');
  } else if (result.error) {
    console.log(`❌ 连接失败: ${result.error}\n`);
    if (result.rawBody) {
      console.log('原始响应:', result.rawBody);
    }
  } else if (result.code === 0) {
    console.log('✓ 连接成功!\n');
    console.log(`思源笔记版本: ${result.data}`);
  } else {
    console.log('响应:', result);
  }

  // 提供手动操作指南
  console.log('\n' + '='.repeat(60));
  console.log('手动插入内容指南:');
  console.log('='.repeat(60));
  console.log('\n1. 打开思源笔记');
  console.log('2. 找到Cache Hash章节');
  console.log('3. 打开文件: docs/SIYUAN_PRACTICE_CONTENT.md');
  console.log('4. 复制内容并粘贴到思源笔记中\n');

  const path = require('path');
  const contentPath = path.join(__dirname, '../../docs/SIYUAN_PRACTICE_CONTENT.md');
  console.log(`内容文件路径: ${contentPath}\n`);
}

main().catch(console.error);
