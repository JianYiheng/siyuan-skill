#!/usr/bin/env node
/**
 * 搜索并插入Cache Hash实践内容
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const SIYUAN_API_URL = process.env.SIYUAN_API_URL || 'http://127.0.0.1:6806';
const SIYUAN_API_TOKEN = process.env.SIYUAN_API_TOKEN;

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
            resolve(null);
          } else {
            const result = JSON.parse(body);
            if (result.code !== 0) {
              reject(new Error(result.msg || 'API error'));
            } else {
              resolve(result.data);
            }
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function searchFullText(keyword) {
  try {
    const data = await callApi('/api/search/fullTextSearch', {
      query: keyword,
      method: 0,
    });
    return data || [];
  } catch (e) {
    console.log(`搜索 "${keyword}" 失败: ${e.message}`);
    return [];
  }
}

async function listNotebooks() {
  const data = await callApi('/api/notebook/lsNotebooks');
  return data.notebooks || [];
}

async function getDocHPathByID(id) {
  const data = await callApi('/api/filetree/getHPathByID', {
    id
  });
  return data;
}

async function main() {
  try {
    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║        Cache Hash实践内容 - 插入工具                      ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log();

    // 搜索包含"cache hash"的文档
    console.log('🔍 步骤1: 搜索包含"Cache Hash"的文档...');
    console.log('─'.repeat(60));

    let searchResults = [];
    const keywords = ['Cache Hash', 'cache hash', 'Cache', 'hash'];

    for (const keyword of keywords) {
      const results = await searchFullText(keyword);
      if (results && results.length > 0) {
        searchResults = searchResults.concat(results);
        console.log(`✓ 找到 ${results.length} 个包含 "${keyword}" 的文档`);
      }
    }

    // 去重
    const uniqueResults = [];
    const seenIds = new Set();
    for (const result of searchResults) {
      if (!seenIds.has(result.id)) {
        seenIds.add(result.id);
        uniqueResults.push(result);
      }
    }

    if (uniqueResults.length > 0) {
      console.log(`\n✓ 共找到 ${uniqueResults.length} 个相关文档:\n`);
      for (let i = 0; i < Math.min(10, uniqueResults.length); i++) {
        const doc = uniqueResults[i];
        try {
          const hpath = await getDocHPathByID(doc.root_id || doc.id);
          console.log(`  ${i + 1}. ${doc.content || doc.hPath}`);
          console.log(`     ID: ${doc.id}`);
          console.log(`     路径: ${hpath}`);
          console.log(`     类型: ${doc.type}`);
        } catch (e) {
          console.log(`  ${i + 1}. ${doc.content || doc.id}`);
        }
        console.log();
      }
    } else {
      console.log('✗ 未找到包含"Cache Hash"的文档');
      console.log();
    }

    // 列出所有笔记本
    console.log('📚 步骤2: 列出所有笔记本...');
    console.log('─'.repeat(60));

    const notebooks = await listNotebooks();
    console.log(`\n✓ 找到 ${notebooks.length} 个笔记本:\n`);

    for (let i = 0; i < notebooks.length; i++) {
      const nb = notebooks[i];
      const status = nb.closed ? '📴' : '📖';
      console.log(`  ${i + 1}. ${status} ${nb.name} (ID: ${nb.id})`);
    }

    console.log();
    console.log('═'.repeat(60));
    console.log('下一步操作建议:');
    console.log('═'.repeat(60));
    console.log(`
1. 在思源笔记中手动打开/创建目标文档
2. 复制实践内容文档内容
3. 粘贴到思源笔记中

实践内容位置:
  C:\\Users\\m01213\\Project\\CacheHash\\docs\\SIYUAN_PRACTICE_CONTENT.md

或者使用思源笔记API创建新文档:
  node siyuan-client.js create-doc <notebook-id> <path> <markdown-file>
`);

  } catch (error) {
    console.error('\n❌ 发生错误:', error.message);
    console.error('\n请确保:');
    console.log('1. 思源笔记正在运行');
    console.log('2. API服务已启用');
    console.log('3. API Token配置正确');
  }
}

main().catch(console.error);
