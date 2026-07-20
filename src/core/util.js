import { createHash, randomUUID } from 'node:crypto';
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const stableId = (source, sourceId, url) => createHash('sha256').update(`${source}:${sourceId ?? canonicalUrl(url)}`).digest('hex').slice(0, 24);
export function canonicalUrl(input) { const u = new URL(input); u.hash=''; for (const key of [...u.searchParams.keys()]) if (/^(utm_|fbclid|gclid)/i.test(key)) u.searchParams.delete(key); u.hostname=u.hostname.toLowerCase(); u.pathname=u.pathname.replace(/\/$/, ''); return u.toString(); }
export const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
export const uniqueName = () => `${Date.now()}-${process.pid}-${randomUUID().slice(0,8)}`;
export function decodeHtml(value='') { return value.replace(/<br\s*\/?\s*>/gi,'\n').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'").replace(/\s+/g,' ').trim(); }
export const nullable = value => value === undefined || value === null || value === '' ? null : value;
