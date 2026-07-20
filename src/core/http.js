import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { sha256, sleep } from './util.js';

export class HttpError extends Error { constructor(category, message, status=null) { super(message); this.category=category; this.status=status; } }
export class HttpClient {
  constructor({ timeoutMs, maxRetries, delayMs, forceRefresh, cacheDir, logger }) { Object.assign(this,{timeoutMs,maxRetries,delayMs,forceRefresh,cacheDir,logger}); this.lastRequest=0; }
  async fetchText(url) {
    const cachePath=path.join(this.cacheDir, `${sha256(url)}.json`); await mkdir(this.cacheDir,{recursive:true});
    if (!this.forceRefresh) try { const c=JSON.parse(await readFile(cachePath,'utf8')); return {...c, cached:true}; } catch {}
    let last;
    for (let attempt=0; attempt<=this.maxRetries; attempt++) {
      const wait=Math.max(0,this.delayMs-(Date.now()-this.lastRequest)); if(wait) await sleep(wait); this.lastRequest=Date.now();
      try {
        const response=await fetch(url,{headers:{'user-agent':'pg-secondhand-crawler/0.1 (+catalog research; respectful public-page fetcher)','accept':'text/html,application/xhtml+xml,application/json'},signal:AbortSignal.timeout(this.timeoutMs),redirect:'follow'});
        const body=await response.text(); const result={url:response.url,status:response.status,body,retrievedAt:new Date().toISOString()};
        if(response.status===403) throw new HttpError('Blocked request','Server returned 403',403);
        if(response.status===404) return result;
        if(response.status===429) throw new HttpError('Rate limit','Server returned 429',429);
        if(response.status>=500) throw new HttpError('Invalid response',`Server returned ${response.status}`,response.status);
        if(!response.ok) throw new HttpError('Invalid response',`Server returned ${response.status}`,response.status);
        await writeFile(cachePath,JSON.stringify(result)); return result;
      } catch(error) {
        last=error instanceof HttpError ? error : new HttpError('Network error',error.message);
        if(last.status===403 || attempt===this.maxRetries) throw last;
        const retryAfter=last.status===429 ? 5000 : 250*(2**attempt); this.logger.warn('Request retry',{url,attempt:attempt+1,errorCategory:last.category,delayMs:retryAfter}); await sleep(retryAfter);
      }
    }
    throw last;
  }
}
