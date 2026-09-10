import dns from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

export interface SsrCheckResult {
  isSafe: boolean;
  ip?: string;
  reason?: string;
}

/**
 * Validates whether an IP address belongs to private, reserved, link-local, loopback, or cloud metadata ranges.
 */
export function isPrivateOrReservedIp(ipStr: string): boolean {
  try {
    let addr = ipaddr.parse(ipStr);

    // If IPv4-mapped IPv6 address (e.g. ::ffff:127.0.0.1), unwrap to IPv4
    if (addr.kind() === 'ipv6' && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
      addr = (addr as ipaddr.IPv6).toIPv4Address();
    }

    const range = addr.range();

    // Blocked IP ranges per RFC specs & cloud metadata endpoints
    const blockedRanges = [
      'unspecified', // 0.0.0.0/8, ::/128
      'loopback',    // 127.0.0.0/8, ::1/128
      'linkLocal',   // 169.254.0.0/16, fe80::/10 (AWS/GCP/Azure metadata)
      'private',     // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7
      'uniqueLocal', // fc00::/7
      'carrierGradeNat', // 100.64.0.0/10
      'broadcast',   // 255.255.255.255/32
      'reserved',    // Reserved ranges
    ];

    if (blockedRanges.includes(range)) {
      return true;
    }

    const normalizedIp = addr.toString();

    // Explicit check for cloud metadata address (169.254.169.254 / fd00:ec2::254)
    if (normalizedIp === '169.254.169.254' || normalizedIp === 'fd00:ec2::254') {
      return true;
    }

    return false;
  } catch {
    // If parsing fails, treat as unsafe
    return true;
  }
}

/**
 * Resolves a hostname and checks ALL resulting IP addresses against SSRF rules.
 */
export async function validateHostnameSsrf(hostname: string): Promise<SsrCheckResult> {
  const normalized = hostname.trim().toLowerCase();

  // Instant rejects for common localhost aliases
  if (
    normalized === 'localhost' ||
    normalized.endsWith('.localhost') ||
    normalized.endsWith('.local') ||
    normalized.endsWith('.internal') ||
    normalized.endsWith('.lan')
  ) {
    return { isSafe: false, reason: `Blocked internal/local hostname: ${hostname}` };
  }

  // If the hostname itself is a raw IP literal, check it immediately
  if (ipaddr.isValid(normalized)) {
    if (isPrivateOrReservedIp(normalized)) {
      return { isSafe: false, ip: normalized, reason: `Direct private/reserved IP disallowed: ${normalized}` };
    }
    return { isSafe: true, ip: normalized };
  }

  // Perform DNS resolution for both IPv4 and IPv6
  try {
    const addresses = await dns.lookup(normalized, { all: true });

    if (!addresses || addresses.length === 0) {
      return { isSafe: false, reason: `DNS resolution failed: no IP address returned for ${hostname}` };
    }

    // Verify EVERY resolved IP
    for (const record of addresses) {
      if (isPrivateOrReservedIp(record.address)) {
        return {
          isSafe: false,
          ip: record.address,
          reason: `Resolved IP ${record.address} for ${hostname} falls within a private or reserved network range.`,
        };
      }
    }

    return { isSafe: true, ip: addresses[0].address };
  } catch (err: any) {
    return { isSafe: false, reason: `DNS lookup error for ${hostname}: ${err.message || err}` };
  }
}
