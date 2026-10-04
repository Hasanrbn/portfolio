import { createHmac } from 'node:crypto';

/**
 * Returns a salted, one-way hash of an IP address, or null when there is no
 * salt or no address. The hash lets repeated spam from one source be noticed
 * without storing the address itself. Without a salt the IP would be easy to
 * recover (there are only about 4 billion IPv4 addresses), so no salt means
 * nothing is stored.
 */
export function hashIp(ip, salt) {
  if (typeof ip !== 'string' || ip === '' || typeof salt !== 'string' || salt === '') {
    return null;
  }
  return createHmac('sha256', salt).update(ip).digest('hex');
}
