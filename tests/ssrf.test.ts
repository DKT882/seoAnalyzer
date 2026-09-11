import { describe, it } from 'node:test';
import assert from 'node:assert';
import { isPrivateOrReservedIp, validateHostnameSsrf } from '../lib/utils/ssrfGuard';

describe('SSRF Protection Guard', () => {
  it('correctly blocks IPv4 private, loopback, and metadata addresses', () => {
    assert.strictEqual(isPrivateOrReservedIp('127.0.0.1'), true);
    assert.strictEqual(isPrivateOrReservedIp('127.0.1.5'), true);
    assert.strictEqual(isPrivateOrReservedIp('10.0.0.1'), true);
    assert.strictEqual(isPrivateOrReservedIp('172.16.0.1'), true);
    assert.strictEqual(isPrivateOrReservedIp('192.168.1.100'), true);
    assert.strictEqual(isPrivateOrReservedIp('169.254.169.254'), true); // AWS/GCP metadata
    assert.strictEqual(isPrivateOrReservedIp('0.0.0.0'), true);
  });

  it('correctly blocks IPv6 loopback, link-local, unique-local, and IPv4-mapped IPv6 addresses', () => {
    assert.strictEqual(isPrivateOrReservedIp('::1'), true);
    assert.strictEqual(isPrivateOrReservedIp('fe80::1'), true);
    assert.strictEqual(isPrivateOrReservedIp('fc00::1'), true);
    assert.strictEqual(isPrivateOrReservedIp('fd00:ec2::254'), true);
    assert.strictEqual(isPrivateOrReservedIp('::ffff:127.0.0.1'), true); // IPv4-mapped loopback
    assert.strictEqual(isPrivateOrReservedIp('::ffff:169.254.169.254'), true); // IPv4-mapped metadata
    assert.strictEqual(isPrivateOrReservedIp('::ffff:192.168.1.1'), true); // IPv4-mapped private
  });

  it('allows valid public IP addresses', () => {
    assert.strictEqual(isPrivateOrReservedIp('8.8.8.8'), false);
    assert.strictEqual(isPrivateOrReservedIp('1.1.1.1'), false);
    assert.strictEqual(isPrivateOrReservedIp('142.250.190.46'), false);
  });

  it('blocks localhost and internal hostnames', async () => {
    const localhostCheck = await validateHostnameSsrf('localhost');
    assert.strictEqual(localhostCheck.isSafe, false);

    const localCheck = await validateHostnameSsrf('app.internal');
    assert.strictEqual(localCheck.isSafe, false);
  });
});
