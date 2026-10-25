import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { configureReleaseSigning } = require('../plugins/withReleaseSigning.js');

test('release signing uses explicit credentials without changing debug signing', () => {
  const input = 'android { buildTypes { debug { signingConfig signingConfigs.debug } release { signingConfig signingConfigs.debug } } }';
  const output = configureReleaseSigning(input);
  assert.ok(output.includes('debug { signingConfig signingConfigs.debug }'));
  assert.ok(output.includes('release { signingConfig signingConfigs.release }'));
  assert.ok(output.includes('Release signing requires'));
  assert.equal(configureReleaseSigning(output), output);
  assert.throws(() => configureReleaseSigning('android {}'), /Could not find/);
});
