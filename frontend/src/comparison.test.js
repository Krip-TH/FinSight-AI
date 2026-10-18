import test from 'node:test';
import assert from 'node:assert/strict';
import {comparisonLabel} from './comparison.js';

test('company-specific fiscal labels align in the same comparison row', () => {
  const docs = [{company: 'Apple'}, {company: 'Microsoft'}];
  assert.equal(comparisonLabel('Apple รอบบัญชีปี 2025', docs), comparisonLabel('Microsoft รอบบัญชีปี 2025', docs));
});
test('removes company names without merging different risk topics', () => {
  const docs = [{company: 'Example Co'}];
  assert.equal(comparisonLabel('Example Co รายได้รวม', docs), 'รายได้รวม');
  assert.notEqual(comparisonLabel('Apple ความเสี่ยงภาษี', docs), comparisonLabel('Microsoft ความเสี่ยงไซเบอร์', docs));
});
