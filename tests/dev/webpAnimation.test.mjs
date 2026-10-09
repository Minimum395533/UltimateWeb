import assert from 'node:assert/strict';
import test from 'node:test';
import { hasAnimatedWebpFeatureFlag } from '../../src/dev/webpAnimation.ts';

function webpHeader({ extended = true, animated = true } = {}) {
  const header = new Uint8Array(21);
  header.set(new TextEncoder().encode('RIFF'), 0);
  header.set(new TextEncoder().encode('WEBP'), 8);
  header.set(new TextEncoder().encode(extended ? 'VP8X' : 'VP8 '), 12);
  header[20] = animated ? 0x02 : 0;
  return header;
}

test('animated WebP detection checks the RIFF and animation feature flag', () => {
  assert.equal(hasAnimatedWebpFeatureFlag(webpHeader()), true);
  assert.equal(hasAnimatedWebpFeatureFlag(webpHeader({ animated: false })), false);
  assert.equal(hasAnimatedWebpFeatureFlag(webpHeader({ extended: false })), false);
  assert.equal(hasAnimatedWebpFeatureFlag(new Uint8Array(20)), false);
});
