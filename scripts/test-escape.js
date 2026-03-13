#!/usr/bin/env node
/**
 * SQL Injection Prevention Tests
 * Tests the escapeSqlValue function to ensure it properly escapes malicious inputs
 */

const SiYuanClient = require('./siyuan-client-v3.js');

console.log('═══════════════════════════════════════');
console.log('🧪 SQL Injection Prevention Tests');
console.log('═══════════════════════════════════════\n');

let passed = 0;
let failed = 0;

function test(description, input, expected) {
  try {
    const result = SiYuanClient.escapeSqlValue(input);
    if (result === expected) {
      console.log(`✅ PASS: ${description}`);
      console.log(`   Input: ${JSON.stringify(input)}`);
      console.log(`   Output: ${result}\n`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${description}`);
      console.log(`   Input: ${JSON.stringify(input)}`);
      console.log(`   Expected: ${expected}`);
      console.log(`   Got: ${result}\n`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ERROR: ${description}`);
    console.log(`   Error: ${error.message}\n`);
    failed++;
  }
}

// Test 1: String with single quote (O'Reilly)
test(
  'Escapes single quote in string',
  "O'Reilly",
  "'O''Reilly'"
);

// Test 2: SQL injection attempt with DROP TABLE
test(
  'Escapes SQL injection with DROP TABLE',
  "test'; DROP TABLE blocks; --",
  "'test''\\; DROP TABLE blocks\\; --'"
);

// Test 3: Null value
test(
  'Handles null value',
  null,
  'NULL'
);

// Test 4: Number
test(
  'Handles number',
  123,
  '123'
);

// Test 5: Boolean true
test(
  'Handles boolean true',
  true,
  '1'
);

// Test 6: Boolean false
test(
  'Handles boolean false',
  false,
  '0'
);

// Test 7: Undefined
test(
  'Handles undefined',
  undefined,
  'NULL'
);

// Test 8: String with backslashes
test(
  'Escapes backslashes',
  "path\\to\\file",
  "'path\\\\to\\\\file'"
);

// Test 9: String with semicolon
test(
  'Escapes semicolon',
  "value; DROP TABLE",
  "'value\\; DROP TABLE'"
);

// Test 10: Complex SQL injection
test(
  'Escapes complex SQL injection',
  "1' OR '1'='1",
  "'1'' OR ''1''=''1'"
);

// Test 11: Empty string
test(
  'Handles empty string',
  '',
  "''"
);

// Test 12: String with quotes and backslashes
test(
  'Escapes combination of quotes and backslashes',
  "test\\'data",
  "'test\\\\''data'"
);

console.log('═══════════════════════════════════════');
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════\n');

if (failed === 0) {
  console.log('✅ SQL Tests [PASS]');
  process.exit(0);
} else {
  console.log('❌ SQL Tests [FAIL]');
  process.exit(1);
}
