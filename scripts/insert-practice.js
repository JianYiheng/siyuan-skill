#!/usr/bin/env node
/**
 * 插入Cache Hash实践内容到思源笔记
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
          const result = JSON.parse(body);
          if (result.code !== 0) {
            reject(new Error(result.msg || 'API error'));
          } else {
            resolve(result.data);
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
  const data = await callApi('/api/search/fullTextSearch', {
    query: keyword,
    method: 0, // 0: 关键字, 1: 查询语法, 2: SQL, 3: 正则表达式
  });
  return data.blocks || [];
}

async function getBlockKramdown(id) {
  const data = await callApi('/api/block/getBlockKramdown', {
    id,
  });
  return data.content;
}

async function appendBlock(parentId, dataType, data) {
  const result = await callApi('/api/block/appendBlock', {
    dataType,
    data,
    parentID: parentId,
  });
  return result;
}

async function insertPracticeContent() {
  try {
    console.log('正在搜索包含"Cache Hash"或"cache hash"的文档...');

    // 搜索相关文档
    let blocks = [];
    try {
      blocks = await searchFullText('cache hash');
    } catch (e) {
      // 尝试另一个关键词
      blocks = await searchFullText('Cache');
    }

    if (blocks.length === 0) {
      console.log('未找到包含"cache hash"的文档');
      console.log('请提供目标文档的block ID，使用以下方法之一:');
      console.log('1. 在思源笔记中打开目标文档，复制文档ID');
      console.log('2. 手动指定要插入的文档路径');

      // 列出所有笔记本
      const notebooks = await callApi('/api/notebook/lsNotebooks');
      console.log('\n可用的笔记本:');
      for (const nb of notebooks.notebooks) {
        console.log(`  - ${nb.name} (ID: ${nb.id})`);
      }
      return;
    }

    console.log(`\n找到 ${blocks.length} 个相关块:`);
    for (let i = 0; i < Math.min(5, blocks.length); i++) {
      const block = blocks[i];
      console.log(`\n${i + 1}. ${block.content || block.hPath}`);
      console.log(`   ID: ${block.id}`);
      console.log(`   类型: ${block.type}`);
      console.log(`   路径: ${block.hPath}`);
    }

    if (blocks.length === 0) {
      console.log('\n没有找到匹配的文档');
      return;
    }

    // 使用第一个找到的文档
    const targetBlock = blocks[0];
    console.log(`\n将在文档 "${targetBlock.hPath}" (ID: ${targetBlock.id}) 中插入内容`);

    // 读取实践内容
    const contentPath = path.join(__dirname, '../../docs/SIYUAN_PRACTICE_CONTENT.md');
    const markdownContent = fs.readFileSync(contentPath, 'utf-8');

    // 分段插入内容（按标题分割）
    const sections = markdownContent.split('\n## ').filter(s => s.trim());

    console.log(`\n准备插入 ${sections.length} 个章节...`);

    let parentId = targetBlock.id;
    let insertedCount = 0;

    for (const section of sections) {
      try {
        // 清理section标题
        const cleanSection = section.trim();
        if (!cleanSection) continue;

        // 将markdown标题转换为思源格式
        const headingLevel = (cleanSection.match(/^#+/) || ['###'])[0].length;
        const titleText = cleanSection.replace(/^#+\s*/, '').split('\n')[0];

        // 先插入标题
        await appendBlock(parentId, 'heading', `#${'#'.repeat(headingLevel)} ${titleText}`);
        insertedCount++;

        // 插入内容段落
        const contentLines = cleanSection.split('\n').slice(1);
        let currentParagraph = [];

        for (const line of contentLines) {
          if (line.trim() === '') {
            if (currentParagraph.length > 0) {
              await appendBlock(parentId, 'p', currentParagraph.join('\n'));
              insertedCount++;
              currentParagraph = [];
            }
          } else if (line.match(/^#{1,6}\s/)) {
            // 遇到新的标题，先保存当前段落
            if (currentParagraph.length > 0) {
              await appendBlock(parentId, 'p', currentParagraph.join('\n'));
              insertedCount++;
              currentParagraph = [];
            }
            // 这里可以递归处理子标题，但为了简化，我们作为普通文本处理
            currentParagraph.push(line);
          } else if (line.match(/^\|/)) {
            // 表格行
            if (currentParagraph.length > 0 && !currentParagraph[0].startsWith('|')) {
              await appendBlock(parentId, 'p', currentParagraph.join('\n'));
              insertedCount++;
              currentParagraph = [];
            }
            currentParagraph.push(line);
          } else if (line.match(/^```/)) {
            // 代码块
            if (currentParagraph.length > 0) {
              await appendBlock(parentId, 'p', currentParagraph.join('\n'));
              insertedCount++;
              currentParagraph = [];
            }
          } else if (line.match(/^[!\[]*\[.*\]\(.*\)/)) {
            // 图片或链接
            if (currentParagraph.length > 0) {
              await appendBlock(parentId, 'p', currentParagraph.join('\n'));
              insertedCount++;
              currentParagraph = [];
            }
            currentParagraph.push(line);
          } else {
            currentParagraph.push(line);
          }
        }

        // 保存最后的段落
        if (currentParagraph.length > 0) {
          await appendBlock(parentId, 'p', currentParagraph.join('\n'));
          insertedCount++;
        }
      } catch (e) {
        console.error(`插入章节时出错: ${e.message}`);
      }
    }

    console.log(`\n✓ 成功插入 ${insertedCount} 个内容块`);
    console.log(`\n请在思源笔记中查看文档: ${targetBlock.hPath}`);

  } catch (error) {
    console.error('发生错误:', error.message);
    console.error('\n请确保:');
    console.log('1. 思源笔记正在运行');
    console.log('2. API地址正确 (默认: http://127.0.0.1:6806)');
    console.log('3. 如果启用了API鉴权，请设置SIYUAN_API_TOKEN环境变量');
  }
}

// 运行
insertPracticeContent().catch(console.error);
