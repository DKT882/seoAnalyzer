import 'server-only';
import nodeDns from 'node:dns';
import dns from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

// Ensure DNS resolver prioritizes IPv4 to avoid hangs on unrouted IPv6 networks
try {
  if (typeof nodeDns.setDefaultResultOrder === 'function') {
    nodeDns.setDefaultResultOrder('ipv4first');
  }
} catch {
  // Ignore in environments without setDefaultResultOrder
}

export interface SsrCheckResult {
  isSafe: boolean;
  ip?: string;
  reason?: string;
}

/**
 * Normalizes alternative IP representations (32-bit dword integers, hex, octal, bracketed IPv6)
 * to standard dotted IPv4 or canonical IPv6 strings.
 */
export function tryNormalizeIpFormat(input: string): string {
  let cleaned = input.trim().toLowerCase().replace(/\.+$/, '').replace(/^\[|\]$/g, '');

  // 1. Check for 32-bit decimal dword integer (e.g., 2130706433 -> 127.0.0.1)
  if (/^\d+$/.test(cleaned)) {
    const num = Number(cleaned);
    if (!isNaN(num) && num >= 0 && num <= 0xffffffff) {
      return [
        (num >>> 24) & 255,
        (num >>> 16) & 255,
        (num >>> 8) & 255,
        num & 255,
      ].join('.');
    }
  }

  // 2. Check for single hex dword (e.g., 0x7f000001 -> 127.0.0.1)
  if (/^0x[0-9a-f]+$/i.test(cleaned)) {
    const num = parseInt(cleaned, 16);
    if (!isNaN(num) && num >= 0 && num <= 0xffffffff) {
      return [
        (num >>> 24) & 255,
        (num >>> 16) & 255,
        (num >>> 8) & 255,
        num & 255,
      ].join('.');
    }
  }

  // 3. Check for dotted hex/octal notation (e.g., 0x7f.0.0.1 or 0177.0.0.1)
  const parts = cleaned.split('.');
  if (parts.length === 4 && parts.every((p) => /^(0x[0-9a-f]+|0[0-7]+|\d+)$/i.test(p))) {
    const octets = parts.map((p) => {
      if (/^0x/i.test(p)) return parseInt(p, 16);
      if (p.length > 1 && p.startsWith('0')) return parseInt(p, 8);
      return parseInt(p, 10);
    });
    if (octets.every((o) => !isNaN(o) && o >= 0 && o <= 255)) {
      return octets.join('.');
    }
  }

  return cleaned;
}

/**
 * Validates whether an IP address belongs to private, reserved, link-local, loopback,
 * carrier-grade NAT, multicast, benchmarking, documentation, or cloud metadata ranges.
 */
export function isPrivateOrReservedIp(ipStr: string): boolean {
  try {
    const normalizedIpStr = tryNormalizeIpFormat(ipStr);
    let addr = ipaddr.parse(normalizedIpStr);

    // If IPv4-mapped IPv6 address (e.g. ::ffff:127.0.0.1, ::ffff:7f00:1), unwrap to IPv4
    if (addr.kind() === 'ipv6' && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
      addr = (addr as ipaddr.IPv6).toIPv4Address();
    }

    const range = addr.range();

    // Blocked IP ranges per IETF RFC specifications & cloud metadata endpoints
    const blockedRanges = [
      'unspecified',            // 0.0.0.0/8, ::/128
      'loopback',               // 127.0.0.0/8, ::1/128
      'linkLocal',              // 169.254.0.0/16, fe80::/10 (AWS/GCP/Azure metadata)
      'private',                // 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16, fc00::/7
      'uniqueLocal',            // fc00::/7
      'carrierGradeNat',        // 100.64.0.0/10 (RFC 6598)
      'broadcast',              // 255.255.255.255/32
      'multicast',              // 224.0.0.0/4, ff00::/8
      'benchmarking',           // 198.18.0.0/15 (RFC 2544)
      'documentation',          // 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24, 2001:db8::/32
      'ietfProtocolAssignments',// 192.0.0.0/24
      'reserved',               // 240.0.0.0/4 (Reserved for future use)
    ];

    if (blockedRanges.includes(range)) {
      return true;
    }

    const stringRepresentation = addr.toString();

    // Explicit cloud metadata safeguards (IPv4 & IPv6 IMDS)
    if (
      stringRepresentation === '169.254.169.254' ||
      stringRepresentation === 'fd00:ec2::254' ||
      stringRepresentation.startsWith('169.254.')
    ) {
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
  const normalized = hostname.trim().toLowerCase().replace(/\.+$/, '');
  const bracketCleaned = normalized.replace(/^\[|\]$/g, '');

  // Instant rejects for common localhost and internal network aliases/TLDs
  const blockedHostSuffixes = [
    'localhost',
    '.localhost',
    '.local',
    '.internal',
    '.lan',
    '.localdomain',
    '.home.arpa',
    '.corp',
    '.test',
    '.invalid',
    '.example',
  ];

  if (
    normalized === 'localhost' ||
    blockedHostSuffixes.some((suffix) =>
      suffix.startsWith('.') ? normalized.endsWith(suffix) : normalized === suffix
    )
  ) {
    return { isSafe: false, reason: `Blocked internal/local hostname: ${hostname}` };
  }

  // If the hostname itself is a raw IP literal (or numeric/hex representation), check it immediately
  const normalizedIp = tryNormalizeIpFormat(bracketCleaned);
  if (ipaddr.isValid(normalizedIp)) {
    if (isPrivateOrReservedIp(normalizedIp)) {
      return { isSafe: false, ip: normalizedIp, reason: `Direct private/reserved IP disallowed: ${hostname}` };
    }
    return { isSafe: true, ip: normalizedIp };
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
