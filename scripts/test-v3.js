/**
 * 测试 siyuan-client-v3.js 的新功能
 */

const SiYuanClient = require('./siyuan-client-v3.js');

const client = new SiYuanClient();
const notebookId = '20260126131900-0lb6cit';

async function runTests() {
  console.log('\n════════════════════════════════════════════════════');
  console.log('🧪 测试 SiYuan Client v3 新功能');
  console.log('════════════════════════════════════════════════════\n');

  // 测试1: 列出文档
  console.log('📋 测试1: 列出所有文档');
  try {
    const docs = await client.listDocuments(notebookId);
    console.log(`✅ 找到 ${docs.length} 个文档\n`);
  } catch (e) {
    console.log(`❌ 失败: ${e.message}\n`);
  }

  // 测试2: 检查文档存在
  console.log('🔍 测试2: 检查文档是否存在');
  try {
    const exists1 = await client.checkDocExists(notebookId, '/数码产品总览');
    const exists2 = await client.checkDocExists(notebookId, '/不存在的文档');
    console.log(`  /数码产品总览: ${exists1 ? '✅ 存在' : '❌ 不存在'}`);
    console.log(`  /不存在的文档: ${exists2 ? '✅ 存在' : '❌ 不存在'}\n`);
  } catch (e) {
    console.log(`❌ 失败: ${e.message}\n`);
  }

  // 测试3: 查询子文档
  console.log('📂 测试3: 查询子文档');
  try {
    const subDocs = await client.listSubDocuments(notebookId, '/设备');
    console.log(`✅ 找到 ${subDocs.length} 个子文档:`);
    subDocs.forEach(doc => console.log(`  - ${doc.hpath}`));
    console.log('');
  } catch (e) {
    console.log(`❌ 失败: ${e.message}\n`);
  }

  // 测试4: 显示状态
  console.log('📊 测试4: 显示文档状态');
  try {
    await client.showStatus(notebookId);
  } catch (e) {
    console.log(`❌ 失败: ${e.message}\n`);
  }

  // 测试5: 批量创建文档
  console.log('📝 测试5: 批量创建文档');
  try {
    const testDocs = [
      {
        path: '/测试/v3-测试1',
        markdown: '# V3 测试文档1\n\n这是通过 v3 client 批量创建的。'
      },
      {
        path: '/测试/v3-测试2',
        markdown: '# V3 测试文档2\n\n批量创建功能测试。'
      }
    ];

    const results = await client.createDocs(
      testDocs.map(d => ({ notebook: notebookId, ...d }))
    );

    const successCount = results.filter(r => r.success).length;
    console.log(`\n✅ 批量创建完成: ${successCount}/${results.length} 成功\n`);
  } catch (e) {
    console.log(`❌ 失败: ${e.message}\n`);
  }

  // 测试6: 获取块内容
  console.log('📄 测试6: 获取块Kramdown内容');
  try {
    const block = await client.getBlockKramdown('20260126133416-e3lyvrt');
    console.log(`✅ 成功获取块内容`);
    console.log(`  内容预览: ${block.kramdown.substring(0, 50)}...\n`);
  } catch (e) {
    console.log(`❌ 失败: ${e.message}\n`);
  }

  // 测试7: 更新块内容
  console.log('✏️  测试7: 更新块内容');
  try {
    await client.updateBlock('20260126133416-8t5dyw4', '**更新后的内容**', 'markdown');
    console.log(`✅ 块内容更新成功\n`);
  } catch (e) {
    console.log(`❌ 失败: ${e.message}\n`);
  }

  console.log('════════════════════════════════════════════════════');
  console.log('✅ 所有测试完成');
  console.log('════════════════════════════════════════════════════\n');
}

runTests().catch(console.error);
