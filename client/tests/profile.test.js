import { describe, expect, it } from 'vitest';
import { getAvatarSource, getInitials, getResumeLink } from '../src/utils/profile.js';

describe('getResumeLink', () => {
  it('returns null while the CV is empty or still a placeholder', () => {
    expect(getResumeLink('')).toBeNull();
    expect(getResumeLink('CV_URL')).toBeNull();
    expect(getResumeLink(undefined)).toBeNull();
  });

  it('treats a file on this site as a direct download', () => {
    expect(getResumeLink('/cv.pdf')).toEqual({ href: '/cv.pdf', isExternal: false });
  });

  it('treats an https address as another site', () => {
    expect(getResumeLink('https://example.org/cv.pdf')).toEqual({
      href: 'https://example.org/cv.pdf',
      isExternal: true,
    });
  });

  it('rejects script links, plain http and addresses that point to another host', () => {
    expect(getResumeLink('javascript:alert(1)')).toBeNull();
    expect(getResumeLink('http://example.org/cv.pdf')).toBeNull();
    expect(getResumeLink('//evil.example/cv.pdf')).toBeNull();
    expect(getResumeLink('/\\evil.example/cv.pdf')).toBeNull();
    expect(getResumeLink('/with space.pdf')).toBeNull();
  });
});

describe('getAvatarSource', () => {
  it('accepts a site path or an https address and nothing else', () => {
    expect(getAvatarSource('/me.jpg')).toBe('/me.jpg');
    expect(getAvatarSource('https://example.org/me.jpg')).toBe('https://example.org/me.jpg');
    expect(getAvatarSource('')).toBeNull();
    expect(getAvatarSource('AVATAR_URL')).toBeNull();
    expect(getAvatarSource('data:image/svg+xml,<svg/>')).toBeNull();
  });
});

describe('getInitials', () => {
  it('uses the first letter of the first and last word', () => {
    expect(getInitials('Muhammad Hasan Rabbani')).toBe('MR');
    expect(getInitials('  ada   lovelace ')).toBe('AL');
  });

  it('copes with a single word and with empty or missing names', () => {
    expect(getInitials('Madonna')).toBe('M');
    expect(getInitials('')).toBe('');
    expect(getInitials(undefined)).toBe('');
  });
});
