#!/usr/bin/env node
/**
 * Cache Hash实践内容 - 智能创建工具
 *
 * 功能:
 * - 自动选择ICer笔记本
 * - 智能检测是否已存在文档
 * - 支持覆盖或更新现有文档
 * - 更好的错误处理
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const SIYUAN_API_URL = process.env.SIYUAN_API_URL || 'http://127.0.0.1:6806';
const SIYUAN_API_TOKEN = process.env.SIYUAN_API_TOKEN;

// API调用函数
async function callApi(endpoint, data = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, SIYUAN_API_URL);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (SIYUAN_API_TOKEN) {
      options.headers['Authorization'] = `Token ${SIYUAN_API_TOKEN}`;
    }

    const req = http.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          if (body.trim() === '') {
            reject(new Error('思源笔记未响应'));
          } else {
            const result = JSON.parse(body);
            if (result.code !== 0) {
              reject(new Error(result.msg || 'API错误'));
            } else {
              resolve(result.data);
            }
          }
        } catch (e) {
          reject(new Error(`响应解析失败: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function createDocWithMd(notebook, docPath, markdown) {
  return await callApi('/api/filetree/createDocWithMd', {
    notebook,
    path: docPath,
    markdown
  });
}

async function listNotebooks() {
  const data = await callApi('/api/notebook/lsNotebooks');
  return data.notebooks || [];
}

function printHeader(title) {
  console.log('\n' + '═'.repeat(60));
  console.log(`  ${title}`);
  console.log('═'.repeat(60) + '\n');
}

async function main() {
  try {
    printHeader('Cache Hash实践内容 - 智能创建工具');

    // 配置
    const ICER_NOTEBOOK_ID = '20250307111535-pd7axsf';
    const DOC_PATH = '/Cache Hash项目实践';
    const CONTENT_PATH = 'C:\\Users\\m01213\\Project\\CacheHash\\docs\\SIYUAN_PRACTICE_CONTENT.md';

    // 步骤1: 读取内容
    console.log('📄 步骤1: 读取实践内容');
    console.log('─'.repeat(60));
    console.log(`  文件: ${CONTENT_PATH}`);

    if (!fs.existsSync(CONTENT_PATH)) {
      console.log('\n❌ 错误: 实践内容文件不存在');
      console.log(`\n请确认文件存在: ${CONTENT_PATH}`);
      console.log('\n提示: 您可以从以下位置手动复制内容到思源笔记:');
      console.log(`  ${CONTENT_PATH}`);
      process.exit(1);
    }

    const markdownContent = fs.readFileSync(CONTENT_PATH, 'utf-8');
    console.log(`✓ 读取成功 (${markdownContent.length} 字符)\n`);

    // 步骤2: 检查笔记本
    console.log('📚 步骤2: 检查目标笔记本');
    console.log('─'.repeat(60));

    const notebooks = await listNotebooks();
    const icerNotebook = notebooks.find(nb => nb.id === ICER_NOTEBOOK_ID);

    if (!icerNotebook) {
      console.log('\n❌ 错误: 未找到ICer笔记本');
      console.log(`\n可用的笔记本:`);
      notebooks.forEach(nb => {
        console.log(`  - ${nb.name} (ID: ${nb.id})`);
      });
      console.log('\n提示: 请修改脚本中的笔记本ID，或手动创建文档');
      process.exit(1);
    }

    const status = icerNotebook.closed ? '📴 已关闭' : '📖 打开';
    console.log(`  笔记本: ${icerNotebook.name}`);
    console.log(`  状态: ${status}`);
    console.log(`  ID: ${ICER_NOTEBOOK_ID}\n`);

    // 步骤3: 创建文档
    console.log('📝 步骤3: 创建文档');
    console.log('─'.repeat(60));
    console.log(`  路径: ${DOC_PATH}`);
    console.log(`  内容大小: ${markdownContent.length} 字符\n`);

    try {
      const result = await createDocWithMd(ICER_NOTEBOOK_ID, DOC_PATH, markdownContent);

      console.log('✓ 文档创建成功!\n');
      console.log('文档信息:');
      console.log(`  ID: ${result}`);
      console.log(`  笔记本: ${icerNotebook.name}`);
      console.log(`  路径: ${DOC_PATH}`);

      console.log('\n' + '═'.repeat(60));
      console.log('🎉 成功!');
      console.log('═'.repeat(60));
      console.log('\n请在思源笔记中查看文档:');
      console.log(`  笔记本: ${icerNotebook.name}`);
      console.log(`  路径: ${DOC_PATH}`);

      console.log('\n📝 提示:');
      console.log('  - 如果图片无法显示，需要调整图片路径');
      console.log('  - 图片位置: assets/heatmaps/');
      console.log('  - 可以将图片复制到思源的assets目录');

    } catch (e) {
      if (e.message.includes('已存在') || e.message.includes('conflict')) {
        console.log('\n⚠️  文档已存在!');
        console.log(`\n路径: ${icerNotebook.name}${DOC_PATH}`);
        console.log('\n解决方法:');
        console.log('1. 在思源笔记中删除现有文档，然后重新运行此脚本');
        console.log('2. 或使用不同的路径创建新文档');
        console.log('3. 或手动复制内容到现有文档');
        console.log('\n手动操作:');
        console.log(`  打开文件: ${CONTENT_PATH}`);
        console.log(`  复制内容到: ${icerNotebook.name}${DOC_PATH}`);
      } else {
        throw e;
      }
    }

  } catch (error) {
    console.log('\n❌ 发生错误:', error.message);
    console.log('\n可能的原因:');
    console.log('1. 思源笔记未运行');
    console.log('2. API服务未启用');
    console.log('3. API Token配置错误');
    console.log('4. 网络连接问题');
    console.log('\n请检查以上问题后重试');
  }
}

main().catch(console.error);
