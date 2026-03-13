#!/usr/bin/env node
/**
 * SiYuan Note API Client v3 - 增强版（多平台支持）
 *
 * 新增功能（来自本地JS脚本）：
 * - 批量创建文档
 * - 删除文档（多种方式）
 * - 路径查询
 * - 子文档管理
 * - 文档状态查询
 * - 块操作增强
 * - 多平台路径处理
 *
 * 配置:
 * - SIYUAN_API_URL (默认: http://127.0.0.1:6806)
 * - SIYUAN_API_TOKEN (可选)
 */

const http = require('http');
const fs = require('fs');
const os = require('os');

const SIYUAN_API_URL = process.env.SIYUAN_API_URL || 'http://127.0.0.1:6806';
const SIYUAN_API_TOKEN = process.env.SIYUAN_API_TOKEN;
const MAX_RETRIES = 3;
const RETRY_DELAY = 200;

/**
 * 多平台路径处理工具
 *
 * 问题：在不同平台和 shell 环境中，路径的传递方式不同：
 * - Linux/macOS: /foo/bar → /foo/bar ✅
 * - Windows CMD: "/foo/bar" → /foo/bar ✅
 * - Windows PowerShell: "/foo/bar" → /foo/bar ✅
 * - Windows Git Bash: /foo/bar → C:/Program Files/Git/foo ❌
 *
 * 解决方案：检测并还原被转换的路径
 */
function normalizeSiYuanPath(path) {
  if (!path) return path;

  // 检测是否是 Windows 风格的绝对路径（被 Git Bash 转换过）
  // 格式如: C:/Program Files/Git/foo 或 C:\Program Files\Git\foo
  const windowsPathRegex = /^[A-Za-z]:[/\\]/;

  if (windowsPathRegex.test(path)) {
    // 路径被转换了，需要提取原始的思源笔记路径
    // Git Bash 将 /foo 转换为 C:/Program Files/Git/foo
    // 我们提取最后一个路径组件作为原始路径

    // 统一分隔符
    const normalized = path.replace(/\\/g, '/');

    // 提取最后一个 / 之后的所有内容
    const lastSlashIndex = normalized.lastIndexOf('/');
    let extracted = normalized.substring(lastSlashIndex);

    // 确保以 / 开头
    if (!extracted.startsWith('/')) {
      extracted = '/' + extracted;
    }

    // 如果提取的路径看起来像 Git 安装路径，说明可能有多层嵌套
    // 例如: C:/Program Files/Git/siyuan/notebook → /notebook
    const gitPaths = ['/Program Files/Git/', '/Git/', '/usr/', '/local/', '/bin/'];
    for (const gitPath of gitPaths) {
      if (normalized.includes(gitPath)) {
        const parts = normalized.split(gitPath)[1].split('/');
        // 找到第一个非空路径组件
        const originalPath = '/' + parts.filter(p => p && p !== '').join('/');
        return originalPath;
      }
    }

    return extracted;
  }

  // 去除可能的外层引号（Windows CMD/PowerShell）
  if ((path.startsWith('"') && path.endsWith('"')) ||
      (path.startsWith("'") && path.endsWith("'"))) {
    path = path.slice(1, -1);
  }

  // 确保路径以 / 开头（思源笔记路径格式）
  if (path && !path.startsWith('/')) {
    path = '/' + path;
  }

  return path;
}

/**
 * 检测当前运行环境（用于调试）
 */
function detectEnvironment() {
  const platform = os.platform();
  const shell = process.env.SHELL;
  const term = process.env.TERM;

  return {
    platform,
    shell,
    term,
    isWindows: platform === 'win32',
    isMac: platform === 'darwin',
    isLinux: platform === 'linux',
    isGitBash: platform === 'win32' && (shell || '').includes('bash')
  };
}

class SiYuanClient {
  constructor(baseUrl = null, token = null) {
    this.baseUrl = baseUrl || SIYUAN_API_URL;
    
    // Token validation - keep optional for backward compatibility
    if (token !== null && token !== undefined) {
      // Token was explicitly provided, validate it
      const trimmedToken = String(token).trim();
      if (trimmedToken.length === 0) {
        console.warn('⚠️  [SiYuanClient] Token validation failed: Token is empty or whitespace-only. Setting token to null.');
        this.token = null;
      } else {
        this.token = trimmedToken;
      }
    } else {
      // No token provided, use default from environment
      this.token = SIYUAN_API_TOKEN;
    }
  }

  async callWithRetry(endpoint, data = {}, retries = MAX_RETRIES) {
    for (let i = 0; i < retries; i++) {
      try {
        const result = await this.call(endpoint, data);
        return result;
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.delay(RETRY_DELAY);
      }
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Escapes a value for safe use in SQL queries to prevent SQL injection.
   * 
   * This function implements defense-in-depth by properly escaping user-supplied values
   * when constructing SQL queries dynamically. Note that parameterized queries are the
   * preferred method when available.
   * 
   * @param {*} value - The value to escape (string, number, null, undefined, etc.)
   * @returns {string} - The escaped value ready for use in SQL queries
   * 
   * @example
   * // String escaping
   * escapeSqlValue("O'Reilly") => "O''Reilly"
   * 
   * @example
   * // Backslash escaping
   * escapeSqlValue("path\\to\\file") => "path\\\\to\\\\file"
   * 
   * @example
   * // Semicolon escaping (prevents multi-statement injection)
   * escapeSqlValue("value; DROP TABLE") => "value\\; DROP TABLE"
   * 
   * @example
   * // Null handling
   * escapeSqlValue(null) => "NULL"
   * 
   * @example
   * // Number handling
   * escapeSqlValue(123) => "123"
   * 
   * @example
   * // Undefined handling
   * escapeSqlValue(undefined) => "NULL"
   */
  static escapeSqlValue(value) {
    // Handle null and undefined
    if (value === null || value === undefined) {
      return 'NULL';
    }

    // Handle numbers - return as-is (no escaping needed for numeric literals)
    if (typeof value === 'number') {
      return String(value);
    }

    // Handle booleans
    if (typeof value === 'boolean') {
      return value ? '1' : '0';
    }

    // Convert to string if not already
    const str = String(value);

    // Escape sequence for SQL literals:
    // 1. First escape backslashes (must be done first to avoid double-escaping)
    // 2. Then escape single quotes by doubling them
    // 3. Then escape semicolons with backslash to prevent multi-statement injection
    
    let escaped = str;
    
    // Escape backslashes by doubling them
    escaped = escaped.replace(/\\/g, '\\\\');
    
    // Escape single quotes by doubling them (SQL standard for string literals)
    escaped = escaped.replace(/'/g, "''");
    
    // Escape semicolons with backslash to prevent statement injection
    // Note: The backslash will be handled by the database's escape mechanism
    escaped = escaped.replace(/;/g, '\\;');
    
    // Wrap in single quotes for SQL string literals
    return `'${escaped}'`;
  }

  async call(endpoint, data = {}) {
    const url = new URL(this.baseUrl);
    const options = {
      hostname: url.hostname,
      port: url.port || 6806,
      path: endpoint,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (this.token) {
      options.headers['Authorization'] = `Token ${this.token}`;
    }

    return new Promise((resolve, reject) => {
      const req = http.request(options, (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          try {
            if (body.trim() === '') {
              reject(new Error('空响应 - 思源笔记可能未运行'));
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

  // ==================== 笔记本操作 ====================

  async listNotebooks() {
    return await this.callWithRetry('/api/notebook/lsNotebooks');
  }

  // ==================== 文档操作 ====================

  /**
   * 创建文档（使用Markdown）
   */
  async createDocWithMd(notebook, docPath, markdown = '') {
    return await this.callWithRetry('/api/filetree/createDocWithMd', {
      notebook,
      path: docPath,
      markdown
    });
  }

  /**
   * 批量创建文档
   */
  async createDocs(docs) {
    const results = [];
    for (const doc of docs) {
      try {
        const id = await this.createDocWithMd(doc.notebook, doc.path, doc.markdown);
        results.push({ success: true, id, path: doc.path });
        console.log(`✅ 创建成功: ${doc.path}`);
      } catch (e) {
        results.push({ success: false, error: e.message, path: doc.path });
        console.log(`❌ 创建失败: ${doc.path} - ${e.message}`);
      }
      await this.delay(200); // 避免请求过快
    }
    return results;
  }

  /**
   * 删除文档（通过ID，推荐使用）
   * 官方 API: /api/filetree/removeDocByID
   */
  async removeDocByID(docId) {
    return await this.callWithRetry('/api/filetree/removeDocByID', {
      id: docId
    });
  }

  /**
   * 删除文档（通过人类可读路径）
   * 会先通过路径获取ID，再删除
   */
  async removeDoc(notebook, docPath) {
    // 先尝试通过 getIDsByHPath 获取 ID
    let ids = await this.getIDsByHPath(notebook, docPath);

    // 如果 getIDsByHPath 返回空，使用 SQL 查询作为后备
    if (!ids || ids.length === 0) {
      const sql = `SELECT id FROM blocks WHERE box=${SiYuanClient.escapeSqlValue(notebook)} AND type='d' AND hpath=${SiYuanClient.escapeSqlValue(docPath)}`;
      const result = await this.querySql(sql);
      if (result && result.length > 0) {
        ids = result.map(row => row.id);
      }
    }

    if (!ids || ids.length === 0) {
      throw new Error(`文档不存在: ${docPath}`);
    }
    // 通过 ID 删除
    return await this.removeDocByID(ids[0]);
  }

  /**
   * 批量删除文档（通过ID，推荐使用）
   */
  async removeDocsByIDs(docIds) {
    const results = [];

    for (const docId of docIds) {
      try {
        await this.removeDocByID(docId);
        results.push({ success: true, id: docId });
        console.log(`✅ 删除成功: ${docId}`);
      } catch (e) {
        results.push({ success: false, id: docId, error: e.message });
        console.log(`❌ 删除失败: ${docId} - ${e.message}`);
      }
      await this.delay(200);
    }
    return results;
  }

  /**
   * 批量删除文档（通过路径）
   */
  async removeDocs(notebook, docPaths) {
    const results = [];
    // 按路径长度降序排序，先删除深层文档
    const sortedPaths = [...docPaths].sort((a, b) => b.length - a.length);

    for (const path of sortedPaths) {
      try {
        await this.removeDoc(notebook, path);
        results.push({ success: true, path });
        console.log(`✅ 删除成功: ${path}`);
      } catch (e) {
        results.push({ success: false, path, error: e.message });
        console.log(`❌ 删除失败: ${path} - ${e.message}`);
      }
      await this.delay(200);
    }
    return results;
  }

  /**
   * 删除文档（通过文档ID，包含子文档）
   */
  async deleteDoc(notebook, docPath) {
    return await this.callWithRetry('/api/filetree/deleteDoc', {
      notebook,
      path: docPath
    });
  }

  /**
   * 获取文档的可读路径
   */
  async getHPathByPath(notebook, path) {
    return await this.callWithRetry('/api/filetree/getHPathByPath', {
      notebook,
      path
    });
  }

  /**
   * 通过ID获取文档路径
   */
  async getHPathByID(id) {
    return await this.callWithRetry('/api/filetree/getHPathByID', { id });
  }

  /**
   * 通过人类可读路径获取文档ID
   * 官方 API: /api/filetree/getIDsByHPath
   */
  async getIDsByHPath(notebook, hpath) {
    return await this.callWithRetry('/api/filetree/getIDsByHPath', {
      notebook,
      path: hpath
    });
  }

  // ==================== 块操作 ====================

  /**
   * 获取块的Kramdown格式内容
   */
  async getBlockKramdown(id) {
    return await this.callWithRetry('/api/block/getBlockKramdown', { id });
  }

  /**
   * 更新块内容
   */
  async updateBlock(id, data, dataType = 'markdown') {
    return await this.callWithRetry('/api/block/updateBlock', {
      id,
      dataType,
      data
    });
  }

  /**
   * 追加块内容
   */
  async appendBlock(data, dataType, parentId) {
    return await this.callWithRetry('/api/block/appendBlock', {
      dataType,
      data,
      parentID: parentId
    });
  }

  /**
   * 删除块
   */
  async deleteBlock(id) {
    return await this.callWithRetry('/api/block/deleteBlock', { id });
  }

  /**
   * 获取子块
   */
  async getChildBlocks(id) {
    return await this.callWithRetry('/api/block/getChildBlocks', { id });
  }

  // ==================== 搜索和查询 ====================

  /**
   * 全文搜索
   */
  async searchFullText(keyword, notebookId = null) {
    const params = { query: keyword, method: 0 };
    if (notebookId) params.notebookBook = notebookId;
    return await this.callWithRetry('/api/search/fullTextSearch', params);
  }

  /**
   * SQL查询
   */
  async querySql(sql) {
    return await this.callWithRetry('/api/query/sql', { stmt: sql });
  }

  /**
   * 查询文档列表
   */
  async listDocuments(notebook, pathPrefix = '') {
    let sql = `SELECT id, hpath FROM blocks WHERE box=${SiYuanClient.escapeSqlValue(notebook)} AND type='d'`;
    if (pathPrefix) {
      sql += ` AND hpath LIKE ${SiYuanClient.escapeSqlValue(pathPrefix + '%')}`;
    }
    sql += " AND hpath NOT LIKE '/C:%' ORDER BY hpath";
    return await this.querySql(sql);
  }

  /**
   * 查询子文档
   */
  async listSubDocuments(notebook, parentPath) {
    const sql = `SELECT id, hpath, content FROM blocks
                 WHERE box=${SiYuanClient.escapeSqlValue(notebook)} AND type='d'
                 AND hpath LIKE ${SiYuanClient.escapeSqlValue(parentPath + '/%')}
                 AND hpath != ${SiYuanClient.escapeSqlValue(parentPath)}
                 ORDER BY hpath`;
    return await this.querySql(sql);
  }

  /**
   * 检查文档是否存在
   */
  async checkDocExists(notebook, docPath) {
    try {
      // 先尝试通过 getIDsByHPath 获取 ID
      let ids = await this.getIDsByHPath(notebook, docPath);

      // 如果失败，使用 SQL 查询作为后备
      if (!ids || ids.length === 0) {
        const sql = `SELECT id FROM blocks WHERE box=${SiYuanClient.escapeSqlValue(notebook)} AND type='d' AND hpath=${SiYuanClient.escapeSqlValue(docPath)}`;
        const result = await this.querySql(sql);
        return result && result.length > 0;
      }

      return ids && ids.length > 0;
    } catch (e) {
      return false;
    }
  }

  /**
   * 检查块是否存在
   */
  async checkBlockExists(blockId) {
    try {
      await this.getBlockKramdown(blockId);
      return true;
    } catch (e) {
      return false;
    }
  }

  // ==================== 高级功能 ====================

  /**
   * 清理错误路径的文档（如 /C: 开头的路径）
   */
  async cleanupBadDocs(notebook, badPathPattern = '/C:%') {
    const sql = `SELECT id, hpath FROM blocks
                 WHERE box=${SiYuanClient.escapeSqlValue(notebook)} AND type='d'
                 AND hpath LIKE ${SiYuanClient.escapeSqlValue(badPathPattern)}
                 ORDER BY length(hpath) DESC`;

    const docs = await this.querySql(sql);
    console.log(`找到 ${docs.length} 个错误文档`);

    return await this.removeDocs(notebook, docs.map(d => d.hpath));
  }

  /**
   * 显示文档状态
   */
  async showStatus(notebook) {
    const allDocs = await this.listDocuments(notebook);
    const badDocs = await this.querySql(
      `SELECT hpath FROM blocks WHERE box=${SiYuanClient.escapeSqlValue(notebook)} AND type='d' AND hpath LIKE '/C:%'`
    );

    console.log('\n═══════════════════════════════════════');
    console.log('📊 文档状态\n');
    console.log(`✅ 正常文档: ${allDocs.length - badDocs.length} 个`);
    console.log(`❌ 错误文档: ${badDocs.length} 个`);
    console.log('═══════════════════════════════════════\n');

    return { total: allDocs.length, bad: badDocs.length, good: allDocs.length - badDocs.length };
  }

  /**
   * 查找重复的文档
   */
  async findDuplicates(notebook) {
    const sql = `SELECT hpath, COUNT(*) as count FROM blocks
                 WHERE box=${SiYuanClient.escapeSqlValue(notebook)} AND type='d'
                 GROUP BY hpath HAVING count > 1`;
    return await this.querySql(sql);
  }

  // ==================== 精确块级更新 ====================

  /**
   * 获取文档的所有块（包括子块）
   */
  async getDocBlocks(notebook, docPath) {
    const ids = await this.getIDsByHPath(notebook, docPath);
    if (!ids || ids.length === 0) {
      return [];
    }

    const docId = ids[0];
    const sql = `SELECT id, type, content, hash, parent_id
                 FROM blocks
                 WHERE root_id=${SiYuanClient.escapeSqlValue(docId)} AND box=${SiYuanClient.escapeSqlValue(notebook)}
                 ORDER BY created`;
    return await this.querySql(sql);
  }

  /**
   * 计算块的签名（用于匹配）
   * 改进版：使用内容的完整哈希值，确保精确匹配
   */
  computeBlockSignature(content) {
    if (!content) return 'empty_block';
    // 使用完整内容的规范化版本作为签名
    const normalized = content.trim().replace(/\s+/g, ' ');
    return normalized;
  }

  /**
   * 计算内容哈希（简单哈希函数）
   */
  computeContentHash(content) {
    if (!content) return 0;
    let hash = 0;
    const str = content.trim();
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * 解析 Markdown 为块结构
   * 改进版：在内容中保留 # 符号，让思源笔记 API 自动识别标题
   */
  parseMarkdownToBlocks(markdown) {
    const blocks = [];
    const lines = markdown.split('\n');
    let currentBlock = { type: 'p', content: '' };

    for (const line of lines) {
      // 检测标题
      const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        // 保存当前块
        if (currentBlock.content.trim()) {
          blocks.push({ ...currentBlock });
        }
        // 创建新标题块（保留 # 符号，让思源笔记 API 自动处理）
        blocks.push({
          type: 'p',
          content: line  // 保留完整的 # 符号
        });
        currentBlock = { type: 'p', content: '' };
      } else if (line.trim() === '') {
        // 空行：保存当前块
        if (currentBlock.content.trim()) {
          blocks.push({ ...currentBlock });
          currentBlock = { type: 'p', content: '' };
        }
      } else {
        // 普通段落
        if (currentBlock.content) {
          currentBlock.content += '\n';
        }
        currentBlock.content += line;
      }
    }

    // 保存最后一个块
    if (currentBlock.content.trim()) {
      blocks.push(currentBlock);
    }

    return blocks;
  }

  /**
   * 智能更新文档（精确块级更新）
   * 只修改需要改动的块
   */
  async updateDocSmart(notebook, docPath, markdown) {
    console.log(`📝 智能更新文档: ${docPath}`);

    // 1. 检查文档是否存在
    const ids = await this.getIDsByHPath(notebook, docPath);
    if (!ids || ids.length === 0) {
      console.log('  ⚠️  文档不存在，创建新文档');
      return await this.createDocWithMd(notebook, docPath, markdown);
    }

    const docId = ids[0];

    // 2. 获取现有块
    const existingBlocks = await this.getDocBlocks(notebook, docPath);
    console.log(`  📊 现有块: ${existingBlocks.length} 个`);

    // 3. 解析新的 Markdown
    const newBlocks = this.parseMarkdownToBlocks(markdown);
    console.log(`  📄 新块: ${newBlocks.length} 个`);

    // 4. 创建现有块的签名映射（使用内容签名，不依赖类型）
    const existingMap = new Map();
    for (const block of existingBlocks) {
      if (block.id === docId) continue; // 跳过文档根块
      const signature = this.computeBlockSignature(block.content);
      existingMap.set(signature, block);
    }

    // 5. 比较并更新
    let updated = 0;
    let created = 0;
    let unchanged = 0;

    for (const newBlock of newBlocks) {
      // 使用内容签名匹配（不依赖类型）
      const signature = this.computeBlockSignature(newBlock.content);

      const existingBlock = existingMap.get(signature);

      if (existingBlock) {
        // 块存在，检查内容是否完全相同
        if (existingBlock.content !== newBlock.content) {
          // 内容不同，更新
          await this.updateBlock(existingBlock.id, newBlock.content, 'markdown');
          console.log(`  ✏️  更新: ${newBlock.content.substring(0, 30)}...`);
          updated++;
        } else {
          unchanged++;
          console.log(`  ✅ 不变: ${newBlock.content.substring(0, 30)}...`);
        }
        // 从映射中移除，表示已处理
        existingMap.delete(signature);
      } else {
        // 块不存在，创建
        await this.appendBlock(newBlock.content, 'markdown', docId);
        console.log(`  ➕ 创建: ${newBlock.content.substring(0, 30)}...`);
        created++;
      }
    }

    // 6. 删除在新内容中不存在的块
    let deleted = 0;
    for (const [signature, block] of existingMap) {
      await this.deleteBlock(block.id);
      console.log(`  🗑️  删除: ${block.content.substring(0, 30)}...`);
      deleted++;
    }

    console.log(`\n  ✅ 完成: ${updated} 更新, ${created} 创建, ${deleted} 删除, ${unchanged} 不变\n`);

    return {
      docId,
      updated,
      created,
      deleted,
      unchanged
    };
  }

  /**
   * 智能批量更新文档
   */
  async updateDocsSmart(docs) {
    const results = [];

    for (const doc of docs) {
      try {
        const result = await this.updateDocSmart(doc.notebook, doc.path, doc.markdown);
        results.push({
          success: true,
          path: doc.path,
          ...result
        });
      } catch (e) {
        results.push({
          success: false,
          path: doc.path,
          error: e.message
        });
        console.log(`❌ 更新失败: ${doc.path} - ${e.message}`);
      }
      await this.delay(300);
    }

    return results;
  }
}

// CLI 接口
async function main() {
  const client = new SiYuanClient();
  const command = process.argv[2];

  try {
    switch (command) {
      case 'list':
      case 'ls': {
        const notebooks = await client.listNotebooks();
        console.log('\n📚 笔记本列表:\n');
        notebooks.notebooks.forEach((nb, i) => {
          const status = nb.closed ? '📴 已关闭' : '📖 打开';
          console.log(`  ${i + 1}. ${nb.name} - ${status}`);
          console.log(`     ID: ${nb.id}`);
        });
        break;
      }

      case 'docs': {
        const notebookId = process.argv[3];
        if (!notebookId) {
          console.error('使用方法: node siyuan-client-v3.js docs <notebook-id>');
          process.exit(1);
        }
        const docs = await client.listDocuments(notebookId);
        console.log(`\n📄 文档列表 (${docs.length} 个):\n`);
        docs.forEach(doc => console.log(`  ${doc.hpath}`));
        break;
      }

      case 'create-batch': {
        const notebookId = process.argv[3];
        const jsonFile = process.argv[4];

        if (!notebookId || !jsonFile) {
          console.error('使用方法: node siyuan-client-v3.js create-batch <notebook-id> <json-file>');
          process.exit(1);
        }

        const docsData = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
        const results = await client.createDocs(
          docsData.map(d => ({ notebook: notebookId, ...d }))
        );

        console.log(`\n✅ 完成: ${results.filter(r => r.success).length}/${results.length}`);
        break;
      }

      case 'delete': {
        const notebookId = process.argv[3];
        let docPath = process.argv[4];

        if (!notebookId || !docPath) {
          console.error('使用方法: node siyuan-client-v3.js delete <notebook-id> <doc-path>');
          process.exit(1);
        }

        // 多平台路径规范化
        docPath = normalizeSiYuanPath(docPath);

        await client.removeDoc(notebookId, docPath);
        console.log(`\n✅ 删除成功: ${docPath}`);
        break;
      }

      case 'cleanup': {
        const notebookId = process.argv[3];
        if (!notebookId) {
          console.error('使用方法: node siyuan-client-v3.js cleanup <notebook-id>');
          process.exit(1);
        }

        await client.cleanupBadDocs(notebookId);
        console.log('\n✅ 清理完成');
        break;
      }

      case 'status': {
        const notebookId = process.argv[3];
        if (!notebookId) {
          console.error('使用方法: node siyuan-client-v3.js status <notebook-id>');
          process.exit(1);
        }

        await client.showStatus(notebookId);
        break;
      }

      case 'check': {
        const notebookId = process.argv[3];
        let docPath = process.argv[4];

        if (!notebookId || !docPath) {
          console.error('使用方法: node siyuan-client-v3.js check <notebook-id> <doc-path>');
          process.exit(1);
        }

        // 多平台路径规范化
        docPath = normalizeSiYuanPath(docPath);

        const exists = await client.checkDocExists(notebookId, docPath);
        console.log(`\n${exists ? '✅ 存在' : '❌ 不存在'}: ${docPath}`);
        break;
      }

      case 'search': {
        const keyword = process.argv[3];
        if (!keyword) {
          console.error('使用方法: node siyuan-client-v3.js search "keyword"');
          process.exit(1);
        }

        const results = await client.searchFullText(keyword);
        console.log(`\n🔍 搜索 "${keyword}": ${results.length} 个结果\n`);
        results.slice(0, 10).forEach((doc, i) => {
          console.log(`  ${i + 1}. ${doc.content || doc.hPath}`);
        });
        break;
      }

      case 'test': {
        console.log('\n🧪 测试连接...\n');
        await client.listNotebooks();
        console.log('✅ 连接成功！');
        break;
      }

      case 'env': {
        const env = detectEnvironment();
        console.log('\n🖥️  运行环境检测:\n');
        console.log(`   平台: ${env.platform}`);
        console.log(`   Shell: ${env.shell || '未检测到'}`);
        console.log(`   Terminal: ${env.term || '未检测到'}`);
        console.log(`   是否 Windows: ${env.isWindows ? '是' : '否'}`);
        console.log(`   是否 Git Bash: ${env.isGitBash ? '是' : '否'}`);

        // 测试路径规范化
        console.log('\n📝 路径规范化测试:\n');
        const testPaths = [
          '/foo/bar',
          'C:/Program Files/Git/foo/bar',
          'foo/bar',
          '"foo/bar"'
        ];
        testPaths.forEach(path => {
          const normalized = normalizeSiYuanPath(path);
          console.log(`   "${path}"`);
          console.log(`   → "${normalized}"\n`);
        });
        break;
      }

      case 'update': {
        const notebookId = process.argv[3];
        let docPath = process.argv[4];
        const markdown = process.argv[5];

        if (!notebookId || !docPath || !markdown) {
          console.error('使用方法: node siyuan-client-v3.js update <notebook-id> <doc-path> <markdown>');
          process.exit(1);
        }

        docPath = normalizeSiYuanPath(docPath);
        await client.updateDocSmart(notebookId, docPath, markdown);
        break;
      }

      case 'update-batch': {
        const notebookId = process.argv[3];
        const jsonFile = process.argv[4];

        if (!notebookId || !jsonFile) {
          console.error('使用方法: node siyuan-client-v3.js update-batch <notebook-id> <json-file>');
          process.exit(1);
        }

        const docsData = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
        const results = await client.updateDocsSmart(
          docsData.map(d => ({ notebook: notebookId, ...d }))
        );

        const successCount = results.filter(r => r.success).length;
        console.log(`\n✅ 完成: ${successCount}/${results.length}`);
        break;
      }

      case 'blocks': {
        const notebookId = process.argv[3];
        let docPath = process.argv[4];

        if (!notebookId || !docPath) {
          console.error('使用方法: node siyuan-client-v3.js blocks <notebook-id> <doc-path>');
          process.exit(1);
        }

        docPath = normalizeSiYuanPath(docPath);
        const blocks = await client.getDocBlocks(notebookId, docPath);
        console.log(`\n📦 文档块 (${blocks.length} 个):\n`);
        blocks.forEach((block, i) => {
          const preview = block.content ? block.content.substring(0, 40).replace(/\n/g, ' ') : '(空)';
          console.log(`  ${i + 1}. [${block.type}] ${preview}...`);
          console.log(`     ID: ${block.id}`);
        });
        break;
      }

      default:
        console.log(`
SiYuan Client v3.2 - 精确块级更新版（标题匹配优化）

使用方法:
  node siyuan-client-v3.js ls                          列出笔记本
  node siyuan-client-v3.js docs <notebook-id>          列出文档
  node siyuan-client-v3.js create-batch <nb> <json>    批量创建文档
  node siyuan-client-v3.js delete <nb> <path>          删除文档
  node siyuan-client-v3.js update <nb> <path> <md>     智能更新文档（精确块级）
  node siyuan-client-v3.js update-batch <nb> <json>    批量智能更新文档
  node siyuan-client-v3.js blocks <nb> <path>          查看文档块结构
  node siyuan-client-v3.js cleanup <nb>                清理错误文档
  node siyuan-client-v3.js status <nb>                 显示状态
  node siyuan-client-v3.js check <nb> <path>           检查文档存在
  node siyuan-client-v3.js search <keyword>            搜索
  node siyuan-client-v3.js test                        测试连接
  node siyuan-client-v3.js env                         环境检测

示例:
  node siyuan-client-v3.js ls
  node siyuan-client-v3.js docs 20260126131900-0lb6cit
  node siyuan-client-v3.js blocks 20260126131900-0lb6cit "/设备/MacBook Pro"
  node siyuan-client-v3.js update 20260126131900-0lb6cit "/设备/MacBook Pro" "# 新内容\\n\\n更新后的内容"
  node siyuan-client-v3.js delete 20260126131900-0lb6cit "/维护/维护日志"
  node siyuan-client-v3.js env

新功能 - 精确块级更新：
  - 只修改需要改动的块，保留不变的块
  - 支持块创建、更新、删除
  - 保留文档 ID 和时间戳
  - 使用块签名匹配技术

注意：
  - 支持多平台（Windows/Linux/macOS）
  - 自动处理路径转换问题（Git Bash/CMD/PowerShell）
  - 路径建议使用引号包裹
        `);
    }
  } catch (error) {
    console.error(`❌ 错误: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = SiYuanClient;
