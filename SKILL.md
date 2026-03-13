---
name: siyuan
version: 3.3.0
description: Manage SiYuan Note documents with precise block-level updates
triggers:
  - siyuan
  - 思源笔记
  - notebook
  - 思源
---

# SiYuan Note API v3.3

Interact with SiYuan Note (思源笔记) using its kernel API. This skill provides a comprehensive JavaScript/Node.js client with batch operations, **precise block-level updates**, advanced document management, cleanup capabilities, and improved CLI tools.

## What's New in v3.3

- ✅ **Precise Block-Level Update**: Smart update that only modifies changed blocks
- ✅ **Heading Support**: Markdown headings (`#`) are correctly recognized
- ✅ **ID Preservation**: Document and block IDs remain unchanged when content is identical
- ✅ **Better Markdown Support**: Bold, italic, lists, and other formatting preserved
- ✅ **Enhanced CLI**: New `update`, `update-batch`, and `blocks` commands

## What's New in v3.0

- ✅ **Batch Operations**: Create/delete multiple documents in one call
- ✅ **Document Management**: List, query, and check documents easily
- ✅ **Cleanup Tools**: Automatically detect and remove corrupted documents
- ✅ **Enhanced CLI**: Unified command-line interface for all operations
- ✅ **Status Monitoring**: View document statistics and health
- ✅ **Better Error Handling**: Automatic retry with exponential backoff

**Upgrade from v2**: v3 provides 10x performance improvement for batch operations and replaces 25+ individual scripts with unified commands.

## Configuration

Set environment variables (optional, defaults shown):

```bash
export SIYUAN_API_URL=http://127.0.0.1:6806
export SIYUAN_API_TOKEN=your-token-here
```

## Quick Start

### Using the v3 JavaScript Client

```javascript
const SiYuanClient = require('./scripts/siyuan-client-v3.js');

// Initialize client
const client = new SiYuanClient();

// List all documents
const docs = await client.listDocuments(notebookId);

// Batch create documents
const results = await client.createDocs([
  { notebook: notebookId, path: '/doc1', markdown: '# Doc1' },
  { notebook: notebookId, path: '/doc2', markdown: '# Doc2' }
]);

// Check if document exists
const exists = await client.checkDocExists(notebookId, '/path/to/doc');

// View document status
const status = await client.showStatus(notebookId);

// Cleanup corrupted documents
await client.cleanupBadDocs(notebookId, '/C:%');
```

### Using the v3 CLI Tool

```bash
# Test connection
node scripts/siyuan-client-v3.js test

# List documents
node scripts/siyuan-client-v3.js docs <notebook-id>

# Batch create documents
node scripts/siyuan-client-v3.js create-batch <notebook-id> docs.json

# Delete document
node scripts/siyuan-client-v3.js delete <notebook-id> "/path/to/doc"

# Check document existence
node scripts/siyuan-client-v3.js check <notebook-id> "/path/to/doc"

# View status
node scripts/siyuan-client-v3.js status <notebook-id>

# Cleanup bad documents
node scripts/siyuan-client-v3.js cleanup <notebook-id>

# Search content
node scripts/siyuan-client-v3.js search "keyword"
```

## Common Workflows

### Batch Create Documents

Create a JSON file (`docs.json`):

```json
[
  {
    "path": "/数码产品总览",
    "markdown": "# 数码产品生态系统\n\n## 核心设备\n\n- MacBook Pro\n- NAS 系统"
  },
  {
    "path": "/设备/MacBook Pro",
    "markdown": "# MacBook Pro\n\n## 配置\n\n- CPU: M2 Pro\n- 内存: 32GB"
  }
]
```

Execute:

```bash
node scripts/siyuan-client-v3.js create-batch <notebook-id> docs.json
```

Or use JavaScript:

```javascript
const client = new SiYuanClient();
const notebookId = 'your-notebook-id';

const docs = [
  { path: '/doc1', markdown: '# Document 1' },
  { path: '/doc2', markdown: '# Document 2' }
];

await client.createDocs(
  docs.map(d => ({ notebook: notebookId, ...d }))
);
```

### Document Management

```javascript
const client = new SiYuanClient();

// List all documents
const allDocs = await client.listDocuments(notebookId);

// Query subdocuments
const subDocs = await client.listSubDocuments(notebookId, '/设备');

// Check if exists
const exists = await client.checkDocExists(notebookId, '/数码产品总览');

// Get document path
const hpath = await client.getHPathByID('block-id');

// Delete document
await client.removeDoc(notebookId, '/old-document');

// Batch delete
await client.removeDocs(notebookId, ['/doc1', '/doc2', '/doc3']);
```

### Status and Cleanup

```javascript
const client = new SiYuanClient();

// Show document status
const status = await client.showStatus(notebookId);
// Returns: { total: 12, bad: 0, good: 12 }

// Cleanup corrupted documents (e.g., /C: paths)
const cleaned = await client.cleanupBadDocs(notebookId, '/C:%');

// Find duplicate documents
const duplicates = await client.findDuplicates(notebookId);
```

### Search and Query

```javascript
const client = new SiYuanClient();

// Full-text search
const results = await client.searchFullText('keyword');

// SQL query
const blocks = await client.querySql(
  "SELECT * FROM blocks WHERE content LIKE '%keyword%'"
);

// List documents with prefix
const docs = await client.listDocuments(notebookId, '/设备');
```

### Block Operations

```javascript
const client = new SiYuanClient();

// Get block Kramdown content
const content = await client.getBlockKramdown('block-id');

// Update block
await client.updateBlock('block-id', '**New content**', 'markdown');

// Check if block exists
const exists = await client.checkBlockExists('block-id');

// Get child blocks
const children = await client.getChildBlocks('parent-id');

// Append block
await client.appendBlock('New paragraph', 'markdown', 'parent-id');

// Delete block
await client.deleteBlock('block-id');
```

### Smart Block-Level Update (v3.3) ⭐

**Problem with Old Approach:**
- Traditional `createDocWithMd()` replaces entire document
- Document ID changes → breaks external references
- All blocks recreated → loses timestamps
- Inefficient for small changes

**Solution: Smart Block-Level Update**
- ✅ Only updates changed blocks
- ✅ Preserves document ID and block IDs
- ✅ Maintains external references
- ✅ Keeps creation timestamps
- ✅ Supports headings, bold, lists, etc.

```javascript
const client = new SiYuanClient();

// Smart update - only modifies changed blocks
const result = await client.updateDocSmart(
  notebookId,
  '/设备/MacBook Pro',
  `# MacBook Pro

**主力工作设备**，用于日常开发、设计和娱乐。

## 配置

- **处理器**：M3 Max（16 核心 CPU + 40 核心 GPU）
- **内存**：64GB 统一内存
- **存储**：2TB SSD
- **系统**：macOS Sequoia

## 主要用途

- 前端开发（React、Vue、Node.js）
- UI/UX 设计（Figma、Sketch）
`
);

// Result: { docId, updated, created, deleted, unchanged }
console.log(`Updated: ${result.updated}, Created: ${result.created}, Unchanged: ${result.unchanged}`);
```

**CLI Usage:**
```bash
# View document blocks
node scripts/siyuan-client-v3.js blocks <notebook-id> "/设备/MacBook Pro"

# Smart update single document
node scripts/siyuan-client-v3.js update <notebook-id> "/设备/MacBook Pro" "# Updated content"

# Smart batch update
node scripts/siyuan-client-v3.js update-batch <notebook-id> docs.json
```

**How It Works:**

1. Fetches all existing blocks in document
2. Parses new Markdown into block structure
3. Matches blocks using content signatures
4. Creates, updates, or deletes blocks as needed
5. Preserves IDs of unchanged blocks

**Example: Add Section to Existing Document**
```javascript
// Original: # MacBook Pro\n## Config\n- CPU: M3 Max

// After adding "Usage" section:
const result = await client.updateDocSmart(
  notebookId,
  '/设备/MacBook Pro',
  `# MacBook Pro

## Config

- CPU: M3 Max

## Usage  // NEW SECTION

- Development
- Design
`
);

// Result:
// - "MacBook Pro" heading: ✅ ID unchanged
// - "Config" heading: ✅ ID unchanged
// - "- CPU: M3 Max": ✅ ID unchanged
// - "Usage" heading: ✅ NEW block created
// - Development/Design items: ✅ NEW blocks created
```

**Comparison: Old vs New Approach**

| Scenario | Old (Delete + Create) | New (Smart Update) |
|----------|----------------------|-------------------|
| Document ID | ❌ Changes | ✅ **Preserved** |
| Unchanged content IDs | ❌ Changes | ✅ **Preserved** |
| External references | ❌ Breaks | ✅ **Maintained** |
| Creation time | ❌ Reset | ✅ **Preserved** |
| Update granularity | Entire document | **Block-level** |
| Performance | 2 API calls | Optimized |

### Block Embeds (块嵌入) - Best Practice

SiYuan Note supports three types of references:

#### 1. Document Embed (文档嵌入)
Embeds an entire document using its path:

```markdown
![[/设备/NAS 系统配置]]
```

**Use case**: When you want to embed the complete document content.

#### 2. SQL Query Block Embed (SQL查询嵌入块) - Recommended ⭐
Embeds a specific block's content using SQL query:

```markdown
{{select * from blocks where id='20260126133417-jlaz5i7'}}
```

**Use case**: When you want to embed a specific block's content. The SQL query result is directly displayed in the document.

**Advanced Examples**:

```markdown
<!-- Embed by block ID -->
{{select * from blocks where id='20260126133417-jlaz5i7'}}

<!-- Embed multiple blocks by condition -->
{{select * from blocks where box='20260126131900-0lb6cit' and type='d' and content like '%NAS%'}}

<!-- Embed child blocks -->
{{select * from blocks where root_id='20260126133417-jlaz5i7' and type='h'}}
```

#### 3. Block Reference (块引用)
Creates a reference/anchor to a specific block:

```markdown
((20260126133417-jlaz5i7))
```

**Use case**: When you want to create a clickable reference/link to a block.

#### How to Get Block ID

**Method 1: SQL Query**
```javascript
const client = new SiYuanClient();

// Query by document path
const blocks = await client.querySql(
  "SELECT * FROM blocks WHERE hpath='/设备/NAS 系统配置'"
);

// The root block ID is in the first result
const blockId = blocks[0].id; // e.g., '20260126133417-jlaz5i7'
console.log(`Block ID: ${blockId}`);
```

**Method 2: List Documents**
```javascript
const client = new SiYuanClient();

// List documents and find the target
const docs = await client.listDocuments(notebookId, '/设备');
const targetDoc = docs.find(d => d.hpath === '/设备/NAS 系统配置');

// Get the document root block ID
const blockId = targetDoc.id; // e.g., '20260126133417-jlaz5i7'
console.log(`Block ID: ${blockId}`);
```

#### Block Reference Comparison

| Feature | Document Embed `![[]]` | SQL Query Embed `{{ }}` | Block Reference `(())` |
|---------|----------------------|------------------------|----------------------|
| **Syntax** | `![[path]]` | `{{select ...}}` | `((block-id))` |
| **Reference** | Document path | SQL query result | Block ID |
| **Display** | Full document content | Query result (embedded) | Block anchor/link |
| **Stability** | ❌ Breaks if path changes | ✅ Permanent, never changes | ✅ Permanent |
| **Flexibility** | Low (entire doc) | **High (SQL query)** ⭐ | Low (single block) |
| **Best For** | Quick doc reference | **Production use** ⭐ | Cross-document links |
| **Example** | `![[/设备/NAS]]` | `{{select * from blocks where id='...'}}` | `((202601261-jlaz5i7))` |

#### Example: Network Topology with SQL Query Embeds

```javascript
const client = new SiYuanClient();

// 1. Get the NAS config block ID
const docs = await client.listDocuments(notebookId, '/设备');
const nasDoc = docs.find(d => d.hpath === '/设备/NAS 系统配置');
const nasBlockId = nasDoc.id; // '20260126133417-jlaz5i7'

// 2. Create network topology document with SQL query embed
const topologyDoc = {
  notebook: notebookId,
  path: '/配置/网络拓扑/保利',
  markdown: `# 保利网络架构

## 设备清单

| 设备 | 角色 | 状态 |
|------|------|------|
| Mini主机 | NAS服务器 | ✅ 运行中 |

## Mini主机 详细信息

{{select * from blocks where id='${nasBlockId}'}}
`
};

await client.createDocWithMd(
  topologyDoc.notebook,
  topologyDoc.path,
  topologyDoc.markdown
);
```

**Why SQL Query Embed `{{select ...}}` is Better**:
- ✅ Block IDs are permanent and never change
- ✅ Document reorganization doesn't break embeds
- ✅ More flexible - can query any block with SQL
- ✅ Content is directly embedded (not just a link)
- ✅ Better for long-term maintenance
- ✅ Supports complex queries (multiple blocks, filtering, etc.)





## Important Notes

- **Block IDs**: SiYuan uses unique IDs like `20231225120900-abc123`
- **Paths**: Document paths must start with `/` and use `/` as separator
- **SQL**: SiYuan uses SQLite; main table is `blocks`
- **Batch operations**: Automatic 200ms delay between operations
- **Error handling**: Automatic retry up to 3 attempts



## Support

For detailed documentation, see:
- [API Reference](references/api-reference.md) - Complete API reference with all methods
- [Examples](references/examples.md) - Code examples and usage patterns
- `scripts/test-v3.js` - Comprehensive test suite
- `scripts/check-siyuan.js` - Connection check tool
- Run `node scripts/siyuan-client-v3.js` for CLI help
