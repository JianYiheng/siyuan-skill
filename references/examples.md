## Examples

### Example 1: Setup and Query

```javascript
const SiYuanClient = require('./scripts/siyuan-client-v3.js');

async function setup() {
  const client = new SiYuanClient();

  // Test connection
  const notebooks = await client.listNotebooks();
  console.log(`Found ${notebooks.notebooks.length} notebooks`);

  // List documents
  const docs = await client.listDocuments(notebookId);
  console.log(`Found ${docs.length} documents`);

  // Check status
  const status = await client.showStatus(notebookId);
  console.log(`Status: ${status.total} total, ${status.bad} bad`);
}
```

### Example 2: Batch Operations

```javascript
async function batchManagement() {
  const client = new SiYuanClient();

  // Batch create
  const createResults = await client.createDocs([
    { notebook: nb, path: '/doc1', markdown: '# Doc1' },
    { notebook: nb, path: '/doc2', markdown: '# Doc2' },
    { notebook: nb, path: '/doc3', markdown: '# Doc3' }
  ]);

  console.log(`Created ${createResults.filter(r => r.success).length} documents`);

  // Batch delete
  await client.removeDocs(nb, ['/doc1', '/doc2', '/doc3']);
}
```

### Example 3: Maintenance

```javascript
async function maintenance() {
  const client = new SiYuanClient();

  // Check status
  const status = await client.showStatus(notebookId);

  // Cleanup if needed
  if (status.bad > 0) {
    console.log(`Found ${status.bad} bad documents, cleaning up...`);
    await client.cleanupBadDocs(notebookId);
  }

  // Verify cleanup
  const newStatus = await client.showStatus(notebookId);
  console.log(`Clean: ${newStatus.bad} bad documents`);
}
```
