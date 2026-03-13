---
name: siyuan
description: "SiYuan Note (思源笔记) API integration for managing notebooks, documents, blocks, and queries. Use when the user needs to interact with SiYuan Note (a privacy-first, self-hosted knowledge management system) for: (1) Creating, updating, deleting, or moving documents, (2) Manipulating content blocks with precise block-level updates, (3) Querying notebooks and content via SQL, (4) Batch operations on documents, (5) Searching content and cleaning up corrupted documents, (6) Working with block embeds and references. Requires SIYUAN_API_TOKEN environment variable to be configured."
---

# SiYuan Note API

Interact with SiYuan Note (思源笔记) using its kernel API via the bundled JavaScript client.

## Configuration

```bash
export SIYUAN_API_URL=http://127.0.0.1:6806   # default
export SIYUAN_API_TOKEN=your-token-here         # required if auth enabled
```

## Quick Start

```javascript
const SiYuanClient = require('./scripts/siyuan-client-v3.js');
const client = new SiYuanClient();

// List notebooks
const notebooks = await client.listNotebooks();

// Create document
const docId = await client.createDocWithMd(notebookId, '/path', '# Title\nContent');

// Smart update (only modifies changed blocks, preserves IDs)
const result = await client.updateDocSmart(notebookId, '/path', '# Updated\nNew content');

// Batch create
await client.createDocs([
  { notebook: notebookId, path: '/doc1', markdown: '# Doc1' },
  { notebook: notebookId, path: '/doc2', markdown: '# Doc2' }
]);

// Search
const results = await client.searchFullText('keyword');

// SQL query
const blocks = await client.querySql("SELECT * FROM blocks WHERE content LIKE '%keyword%'");
```

## CLI Usage

```bash
node scripts/siyuan-client-v3.js test                        # Test connection
node scripts/siyuan-client-v3.js ls                           # List notebooks
node scripts/siyuan-client-v3.js docs <notebook-id>           # List documents
node scripts/siyuan-client-v3.js create-batch <nb> <json>     # Batch create
node scripts/siyuan-client-v3.js update <nb> <path> <md>      # Smart update
node scripts/siyuan-client-v3.js update-batch <nb> <json>     # Batch smart update
node scripts/siyuan-client-v3.js blocks <nb> <path>           # View block structure
node scripts/siyuan-client-v3.js delete <nb> <path>           # Delete document
node scripts/siyuan-client-v3.js search <keyword>             # Full-text search
node scripts/siyuan-client-v3.js status <nb>                  # Show statistics
node scripts/siyuan-client-v3.js cleanup <nb>                 # Cleanup corrupted docs
node scripts/siyuan-client-v3.js check <nb> <path>            # Check doc existence
```

## Core Workflows

### Create or Update Documents

1. **New document**: Use `createDocWithMd(notebook, path, markdown)`
2. **Update existing**: Use `updateDocSmart(notebook, path, markdown)` — only modifies changed blocks, preserves document/block IDs and timestamps
3. **Batch operations**: Use `createDocs([...])` or `updateDocsSmart([...])`

### Document Management

```javascript
// Check existence
const exists = await client.checkDocExists(notebookId, '/path');

// List documents (optionally filtered by prefix)
const docs = await client.listDocuments(notebookId, '/prefix');

// Delete
await client.removeDoc(notebookId, '/path');

// Batch delete
await client.removeDocs(notebookId, ['/doc1', '/doc2']);
```

### Block Operations

```javascript
// Get block content
const content = await client.getBlockKramdown('block-id');

// Update block
await client.updateBlock('block-id', '**New content**', 'markdown');

// Append block
await client.appendBlock('New paragraph', 'markdown', 'parent-id');

// Get child blocks
const children = await client.getChildBlocks('parent-id');

// Delete block
await client.deleteBlock('block-id');
```

### Search and Query

```javascript
// Full-text search
const results = await client.searchFullText('keyword');

// SQL query (main table: blocks)
const data = await client.querySql("SELECT * FROM blocks WHERE type='h' AND box='notebook-id'");

// Use escapeSqlValue for user input
const sql = `SELECT * FROM blocks WHERE content LIKE ${SiYuanClient.escapeSqlValue('%' + userInput + '%')}`;
```

## Important Notes

- **Block IDs**: Format `20231225120900-abc123`, permanent and unique
- **Paths**: Must start with `/`, use `/` as separator
- **SQL**: SiYuan uses SQLite; main table is `blocks` (types: d=doc, h=heading, p=paragraph, l=list, i=list-item, c=code, t=table)
- **Batch operations**: Automatic 200ms delay between operations to avoid overload
- **Error handling**: Automatic retry up to 3 attempts with exponential backoff

## References

- **[API Reference](references/api-reference.md)** — Complete client method signatures and return types
- **[API Endpoints](references/api_endpoints.md)** — Raw SiYuan kernel API endpoint details and database schema
- **[Block Embeds Guide](references/block-embeds.md)** — Block references, SQL query embeds, and cross-document linking patterns
- **[Examples](references/examples.md)** — Batch operations and maintenance workflow examples
- `scripts/check-siyuan.js` — Connection diagnostic tool
