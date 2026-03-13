#!/usr/bin/env node
/**
 * Token Validation Tests
 * Tests the token validation in SiYuanClient constructor
 */

const SiYuanClient = require('./siyuan-client-v3.js');

console.log('═══════════════════════════════════════');
console.log('🧪 Token Validation Tests');
console.log('═══════════════════════════════════════\n');

let passed = 0;
let failed = 0;

function test(description, tokenTest, expectNull) {
  try {
    const client = new SiYuanClient(null, tokenTest);
    const isNull = client.token === null;

    if (isNull === expectNull) {
      console.log(`✅ PASS: ${description}`);
      console.log(`   Input: ${JSON.stringify(tokenTest)}`);
      console.log(`   Token set to null: ${isNull}\n`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${description}`);
      console.log(`   Input: ${JSON.stringify(tokenTest)}`);
      console.log(`   Expected token to be null: ${expectNull}`);
      console.log(`   Actually null: ${isNull}\n`);
      failed++;
    }
  } catch (error) {
    console.log(`❌ ERROR: ${description}`);
    console.log(`   Error: ${error.message}\n`);
    failed++;
  }
}

// Test 1: Empty string token (should be rejected and set to null)
test(
  'Empty string token is rejected',
  '',
  true  // Expect token to be null
);

// Test 2: Whitespace-only token (should be rejected and set to null)
test(
  'Whitespace-only token is rejected',
  '   ',
  true  // Expect token to be null
);

// Test 3: Tab and space token (should be rejected)
test(
  'Tab and space token is rejected',
  '\t \n',
  true  // Expect token to be null
);

// Test 4: Valid token (should be accepted)
test(
  'Valid token is accepted',
  'valid-token',
  false  // Expect token to NOT be null
);

// Test 5: Token with spaces but valid content (should be accepted after trim)
test(
  'Token with leading/trailing spaces is accepted',
  '  valid-token  ',
  false  // Expect token to NOT be null
);

// Test 6: Null token (should use environment variable or stay null)
test(
  'Null token uses environment or stays null',
  null,
  false  // Not checking specifically, should not throw
);

// Test 7: Undefined token (should use environment variable or stay null)
test(
  'Undefined token uses environment or stays null',
  undefined,
  false  // Not checking specifically, should not throw
);

// Test 8: Numeric token (should be converted to string)
test(
  'Numeric token is converted to string',
  12345,
  false  // Expect token to NOT be null
);

console.log('═══════════════════════════════════════');
console.log(`📊 Results: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════\n');

if (failed === 0) {
  console.log('✅ Token Tests [PASS]');
  process.exit(0);
} else {
  console.log('❌ Token Tests [FAIL]');
  process.exit(1);
}
