# Block Embeds and References

SiYuan Note supports three types of references for cross-document linking.

## 1. Document Embed

Embeds entire document content using path:

```markdown
![[/设备/NAS 系统配置]]
```

**Limitation**: Breaks if document path changes.

## 2. SQL Query Block Embed (Recommended)

Embeds specific block content using SQL query:

```markdown
{{select * from blocks where id='20260126133417-jlaz5i7'}}
```

**Advanced examples**:

```markdown
<!-- Embed multiple blocks by condition -->
{{select * from blocks where box='20260126131900-0lb6cit' and type='d' and content like '%NAS%'}}

<!-- Embed child blocks -->
{{select * from blocks where root_id='20260126133417-jlaz5i7' and type='h'}}
```

**Why recommended**: Block IDs are permanent, survives document reorganization, supports complex SQL queries.

## 3. Block Reference

Creates a clickable reference/link to a specific block:

```markdown
((20260126133417-jlaz5i7))
```

## Getting Block IDs

**Method 1: SQL Query**
```javascript
const blocks = await client.querySql(
  "SELECT * FROM blocks WHERE hpath='/设备/NAS 系统配置'"
);
const blockId = blocks[0].id;
```

**Method 2: List Documents**
```javascript
const docs = await client.listDocuments(notebookId, '/设备');
const targetDoc = docs.find(d => d.hpath === '/设备/NAS 系统配置');
const blockId = targetDoc.id;
```

## Comparison

| Feature | Document Embed `![[]]` | SQL Query Embed `{{ }}` | Block Reference `(())` |
|---------|----------------------|------------------------|----------------------|
| Reference | Document path | SQL query result | Block ID |
| Stability | Breaks if path changes | Permanent | Permanent |
| Flexibility | Low (entire doc) | **High (SQL query)** | Low (single block) |
| Best For | Quick doc reference | **Production use** | Cross-document links |

## Example: Creating Document with SQL Query Embed

```javascript
const docs = await client.listDocuments(notebookId, '/设备');
const nasDoc = docs.find(d => d.hpath === '/设备/NAS 系统配置');
const nasBlockId = nasDoc.id;

await client.createDocWithMd(
  notebookId,
  '/配置/网络拓扑/保利',
  `# 保利网络架构

## 设备清单

| 设备 | 角色 | 状态 |
|------|------|------|
| Mini主机 | NAS服务器 | 运行中 |

## Mini主机 详细信息

{{select * from blocks where id='${nasBlockId}'}}
`
);
```
