# SiYuan Kernel API Endpoints Reference

Complete reference for SiYuan Note kernel API endpoints.

## API Response Format

All API responses follow this format:

```json
{
  "code": 0,
  "msg": "",
  "data": {}
}
```

- `code`: 0 for success, non-zero for errors
- `msg`: Empty string on success, error message otherwise
- `data`: Response data (varies by endpoint)

## Configuration

Environment variables:
- `SIYUAN_API_URL`: API base URL (default: `http://127.0.0.1:6806`)
- `SIYUAN_API_TOKEN`: Authorization token (if enabled)

## Notebook Operations

### List Notebooks
- **Endpoint**: `/api/notebook/lsNotebooks`
- **Parameters**: None
- **Returns**: `{"notebooks": [{id, name, icon, sort, closed}]}`

### Open Notebook
- **Endpoint**: `/api/notebook/openNotebook`
- **Parameters**: `{"notebook": "notebook-id"}`
- **Returns**: `null`

### Close Notebook
- **Endpoint**: `/api/notebook/closeNotebook`
- **Parameters**: `{"notebook": "notebook-id"}`
- **Returns**: `null`

### Rename Notebook
- **Endpoint**: `/api/notebook/renameNotebook`
- **Parameters**: `{"notebook": "notebook-id", "name": "new-name"}`
- **Returns**: `null`

### Create Notebook
- **Endpoint**: `/api/notebook/createNotebook`
- **Parameters**: `{"name": "notebook-name"}`
- **Returns**: `{"notebook": {id, name, icon, sort, closed}}`

### Remove Notebook
- **Endpoint**: `/api/notebook/removeNotebook`
- **Parameters**: `{"notebook": "notebook-id"}`
- **Returns**: `null`

### Get Notebook Config
- **Endpoint**: `/api/notebook/getNotebookConf`
- **Parameters**: `{"notebook": "notebook-id"}`
- **Returns**: `{box, conf, name}`

### Set Notebook Config
- **Endpoint**: `/api/notebook/setNotebookConf`
- **Parameters**: `{"notebook": "notebook-id", "conf": {...}}`
- **Returns**: Configuration object

## Document Operations

### Create Document with Markdown
- **Endpoint**: `/api/filetree/createDocWithMd`
- **Parameters**:
  - `notebook`: Notebook ID
  - `path`: Document path (must start with `/`)
  - `markdown`: GFM Markdown content
- **Returns**: Document ID (string)

### Rename Document
- **Endpoint**: `/api/filetree/renameDoc`
- **Parameters**: `{"notebook": "...", "path": "...", "title": "..."}`
- **Returns**: `null`

### Remove Document
- **Endpoint**: `/api/filetree/removeDoc`
- **Parameters**: `{"notebook": "...", "path": "..."}`
- **Returns**: `null`

### Move Documents
- **Endpoint**: `/api/filetree/moveDocs`
- **Parameters**: `{"fromPaths": [...], "toNotebook": "...", "toPath": "..."}`
- **Returns**: `null`

### Get Human-Readable Path by Path
- **Endpoint**: `/api/filetree/getHPathByPath`
- **Parameters**: `{"notebook": "...", "path": "..."}`
- **Returns**: Human-readable path (string)

### Get Human-Readable Path by ID
- **Endpoint**: `/api/filetree/getHPathByID`
- **Parameters**: `{"id": "block-id"}`
- **Returns**: Human-readable path (string)

## Block Operations

### Insert Block
- **Endpoint**: `/api/block/insertBlock`
- **Parameters**:
  - `dataType`: "markdown" or "dom"
  - `data`: Block content
  - `nextID`: Next block ID (optional)
  - `previousID`: Previous block ID (optional)
  - `parentID`: Parent block ID (optional)
- **Returns**: Operation result with new block ID

### Prepend Block
- **Endpoint**: `/api/block/prependBlock`
- **Parameters**:
  - `dataType`: "markdown" or "dom"
  - `data`: Block content
  - `parentID`: Parent block ID
- **Returns**: Operation result with new block ID

### Append Block
- **Endpoint**: `/api/block/appendBlock`
- **Parameters**:
  - `dataType`: "markdown" or "dom"
  - `data`: Block content
  - `parentID`: Parent block ID
- **Returns**: Operation result with new block ID

### Update Block
- **Endpoint**: `/api/block/updateBlock`
- **Parameters**:
  - `id`: Block ID
  - `dataType`: "markdown" or "dom"
  - `data`: New block content
- **Returns**: Operation result

### Delete Block
- **Endpoint**: `/api/block/deleteBlock`
- **Parameters**: `{"id": "block-id"}`
- **Returns**: Operation result

### Move Block
- **Endpoint**: `/api/block/moveBlock`
- **Parameters**:
  - `id`: Block ID to move
  - `previousID`: Previous block ID (optional)
  - `parentID`: Parent block ID (optional)
- **Returns**: Operation result

### Get Block Kramdown
- **Endpoint**: `/api/block/getBlockKramdown`
- **Parameters**: `{"id": "block-id"}`
- **Returns**: `{id, kramdown}`

### Get Child Blocks
- **Endpoint**: `/api/block/getChildBlocks`
- **Parameters**: `{"id": "parent-block-id"}`
- **Returns**: `[{id, type, subType}]`

### Transfer Block Reference
- **Endpoint**: `/api/block/transferBlockRef`
- **Parameters**:
  - `fromID`: Source block ID
  - `toID`: Target block ID
  - `refIDs`: Reference block IDs (optional)
- **Returns**: `null`

## Attribute Operations

### Set Block Attributes
- **Endpoint**: `/api/attr/setBlockAttrs`
- **Parameters**:
  - `id`: Block ID
  - `attrs`: Attributes object (custom attrs must start with "custom-")
- **Returns**: `null`

### Get Block Attributes
- **Endpoint**: `/api/attr/getBlockAttrs`
- **Parameters**: `{"id": "block-id"}`
- **Returns**: Attributes object including id, title, type, updated, etc.

## SQL Query

### Execute SQL
- **Endpoint**: `/api/query/sql`
- **Parameters**: `{"stmt": "SQL STATEMENT"}`
- **Returns**: Array of result objects

## Template Operations

### Render Template
- **Endpoint**: `/api/template/render`
- **Parameters**:
  - `id`: Document ID
  - `path`: Template file absolute path
- **Returns**: `{content, path}`

### Render Sprig
- **Endpoint**: `/api/template/renderSprig`
- **Parameters**: `{"template": "template string"}`
- **Returns**: Rendered string

## File Operations

### Get File
- **Endpoint**: `/api/file/getFile`
- **Parameters**: `{"path": "/data/..."}`
- **Returns**: File content (text)

### Write File
- **Endpoint**: `/api/file/putFile`
- **Parameters**: Multipart form data
  - `path`: File path in workspace
  - `isDir`: Create directory only (boolean)
  - `modTime`: Modification time (Unix timestamp)
  - `file`: File content
- **Returns**: `null`

### Remove File
- **Endpoint**: `/api/file/removeFile`
- **Parameters**: `{"path": "/data/..."}`
- **Returns**: `null`

### Rename File
- **Endpoint**: `/api/file/renameFile`
- **Parameters**: `{"path": "...", "newPath": "..."}`
- **Returns**: `null`

### List Directory
- **Endpoint**: `/api/file/readDir`
- **Parameters**: `{"path": "/data/..."}`
- **Returns**: `[{isDir, name}]`

## Export

### Export Markdown
- **Endpoint**: `/api/export/exportMdContent`
- **Parameters**: `{"id": "doc-id"}`
- **Returns**: `{hPath, content}`

## Notification

### Push Message
- **Endpoint**: `/api/notification/pushMsg`
- **Parameters**:
  - `msg`: Message text
  - `timeout`: Duration in milliseconds (default: 7000)
- **Returns**: `{id: "message-id"}`

### Push Error Message
- **Endpoint**: `/api/notification/pushErrMsg`
- **Parameters**:
  - `msg`: Error message
  - `timeout`: Duration in milliseconds (default: 7000)
- **Returns**: `{id: "message-id"}`

## System

### Get Boot Progress
- **Endpoint**: `/api/system/bootProgress`
- **Parameters**: None
- **Returns**: `{details, progress}`

### Get Version
- **Endpoint**: `/api/system/version`
- **Parameters**: None
- **Returns**: Version string (e.g., "1.3.5")

### Get Current Time
- **Endpoint**: `/api/system/currentTime`
- **Parameters**: None
- **Returns**: Unix timestamp in milliseconds

## Database Schema Reference

Key tables for SQL queries:

### blocks
Main table for all content blocks
- `id`: Block ID
- `type`: Block type (d=doc, h=heading, p=paragraph, l=list, etc.)
- `box`: Notebook ID
- `path`: Document path
- `content`: Block content (text)
- `markdown`: Markdown content
- `created`: Creation timestamp
- `updated`: Update timestamp

Common block types:
- `d`: Document
- `h`: Heading (h1-h6)
- `p`: Paragraph
- `l`: List (ul, ol)
- `i`: List item
- `b`: Blockquote
- `c`: Code block
- `t`: Table
- `html`: HTML block

### Example SQL Queries

```sql
-- Search for content
SELECT * FROM blocks WHERE content LIKE '%keyword%'

-- Get all headings in a notebook
SELECT * FROM blocks WHERE type = 'h' AND box = 'notebook-id'

-- Get recent documents
SELECT * FROM blocks WHERE type = 'd' ORDER BY updated DESC LIMIT 10

-- Get blocks with custom attribute
SELECT * FROM blocks WHERE id IN (
  SELECT id FROM attributes WHERE name = 'custom-attr' AND value = 'something'
)
```
