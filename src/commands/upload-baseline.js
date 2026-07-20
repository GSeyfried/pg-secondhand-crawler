#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const json=async pathname=>JSON.parse(await readFile(pathname,'utf8'));
try{
  if(!process.env.CRON_SECRET)throw new Error('CRON_SECRET is missing. Add it to ignored .env.local.');
  const listings=await json('data/normalized/listings.json'),history=await json('data/planner/listing-history.json'),body=gzipSync(JSON.stringify({source:'local-full-site',listings,history})),base=(process.env.VERCEL_PRODUCTION_URL??'https://pg-secondhand-crawler.vercel.app').replace(/\/$/,'');
  const response=await fetch(`${base}/api/admin/baseline`,{method:'POST',headers:{authorization:`Bearer ${process.env.CRON_SECRET}`,'content-type':'application/json','content-encoding':'gzip'},body,signal:AbortSignal.timeout(120000)}),result=await response.json();if(!response.ok)throw new Error(result.error??`Upload failed with ${response.status}`);console.log(JSON.stringify(result,null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
