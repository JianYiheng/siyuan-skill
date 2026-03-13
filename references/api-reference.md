# API Reference

Complete reference for SiYuan Skill JavaScript client methods.

## Document Operations

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `createDocWithMd()` | notebook, path, markdown | docId | Create document with markdown |
| `createDocs()` | docs[] | results[] | **Batch create documents** |
| `removeDoc()` | notebook, path | - | Delete document by path |
| `removeDocs()` | notebook, paths[] | results[] | **Batch delete documents** |
| `deleteDoc()` | notebook, path | - | Delete document with children |
| `getHPathByPath()` | notebook, path | hpath | Get human-readable path |
| `getHPathByID()` | id | hpath | Get path by block ID |

## Query Operations

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `listDocuments()` | notebook, pathPrefix | docs[] | **List all documents** |
| `listSubDocuments()` | notebook, parentPath | docs[] | **List child documents** |
| `checkDocExists()` | notebook, path | boolean | **Check if doc exists** |
| `checkBlockExists()` | blockId | boolean | **Check if block exists** |
| `searchFullText()` | keyword, notebook | results[] | Full-text search |
| `querySql()` | sql | results[] | Execute SQL query |

## Block Operations

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `getBlockKramdown()` | id | {id, kramdown} | Get block content |
| `updateBlock()` | id, data, dataType | - | Update block |
| `appendBlock()` | data, dataType, parentId | newId | Append block |
| `deleteBlock()` | id | - | Delete block |
| `getChildBlocks()` | id | blocks[] | Get child blocks |
| `getDocBlocks()` | notebook, path | blocks[] | **Get all document blocks** |
| `updateDocSmart()` | notebook, path, markdown | result | **Smart block-level update** ⭐ |
| `updateDocsSmart()` | docs[] | results[] | **Smart batch update** ⭐ |
| `computeBlockSignature()` | content | string | Compute block signature for matching |

## Utility Operations

| Method | Parameters | Returns | Description |
|--------|-----------|---------|-------------|
| `showStatus()` | notebook | {total, bad, good} | **Show statistics** |
| `cleanupBadDocs()` | notebook, pattern | results[] | **Cleanup corrupted docs** |
| `findDuplicates()` | notebook | docs[] | Find duplicate docs |
