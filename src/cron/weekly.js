import { timingSafeEqual } from 'node:crypto';
import { defaults } from '../core/config.js';
import { runCrawler } from '../core/crawler.js';
import { createLogger } from '../core/logger.js';
import { adapter } from '../sources/paragliding-secondhand.js';
import { BlobStorage } from './blob-storage.js';

function sameSecret(actual,expected){
  const a=Buffer.from(actual??''),b=Buffer.from(expected??'');
  return a.length===b.length&&a.length>0&&timingSafeEqual(a,b);
}

export function isAuthorizedCron(headers,env=process.env) {
  return Boolean(env.CRON_SECRET)&&sameSecret(headers.authorization,`Bearer ${env.CRON_SECRET}`);
}

export function weeklyConfig(env=process.env){
  const max=Number(env.PG_CRAWLER_WEEKLY_MAX_LISTINGS??25);
  return {...defaults,dryRun:false,fixtureOnly:false,resume:false,forceRefresh:true,maxListings:Number.isInteger(max)&&max>0?Math.min(max,100):25,batchSize:5,concurrency:2,delayMs:1000,indexPages:1,dataDir:'/tmp/pg-secondhand-crawler'};
}

export async function executeWeeklyCrawl({env=process.env,logger=createLogger(false)}={}){
  const storage=new BlobStorage(),startedAt=new Date().toISOString();
  await storage.init(adapter.name);
  try{
    const summary=await runCrawler({config:weeklyConfig(env),adapter,storage,logger});
    storage.state.lastRun={status:'completed',startedAt,finishedAt:new Date().toISOString(),summary};
    await storage.flush();
    return storage.state.lastRun;
  }catch(error){
    storage.state.lastRun={status:'failed',startedAt,finishedAt:new Date().toISOString(),error:error.message};
    await storage.flush();
    throw error;
  }
}
