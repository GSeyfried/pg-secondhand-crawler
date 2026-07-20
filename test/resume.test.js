import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { runCrawler } from '../src/core/crawler.js';
import { Storage } from '../src/core/storage.js';
import { defaults } from '../src/core/config.js';

const urls=['https://example.test/listings/a-1','https://example.test/listings/b-2','https://example.test/listings/c-3'];
function fakeAdapter(fetches){return{name:'fake',baseUrl:'https://example.test',async fixtureUrls(){return urls;},async fetchFixture(url){fetches.push(url);return{url,status:200,body:url,retrievedAt:'2026-01-01T00:00:00.000Z'};},sourceId(url){return url.split('-').pop();},parse(_html,{url,retrievedAt,rawRecordPath,contentHash}){const sourceListingId=this.sourceId(url);return{id:`fake-${sourceListingId}`,source:'fake',sourceListingId,sourceUrl:url,listingType:'wing',bundle:{claimedFullKit:false,componentsDetected:['wing'],coreComponentsRequired:['wing','harness','reserve'],missingCoreComponents:['harness','reserve'],coreComplete:false},manufacturer:null,model:null,title:`Listing ${sourceListingId}`,description:null,price:{amount:100,currency:'USD'},cost:{shippingIncluded:null},location:{raw:'USA',city:null,region:null,country:'US',isNorthAmerica:true},equipment:{},seller:{name:null,profileUrl:null},images:[],listedAt:null,listingAgeDays:null,firstSeenAt:retrievedAt,lastSeenAt:retrievedAt,status:'active',parseConfidence:1,rawRecordPath,retrievedAt,contentHash};}};}
const logger={debug(){},info(){},warn(){},error(){}};

test('resume skips completed URLs even when discovery order changes',async()=>{const dataDir=await mkdtemp(path.join(os.tmpdir(),'pg-crawler-resume-'));try{const fetches=[];const first={...defaults,dataDir,dryRun:true,fixtureOnly:true,maxListings:2,batchSize:1,delayMs:0};await runCrawler({config:first,adapter:fakeAdapter(fetches),storage:new Storage(first),logger});assert.deepEqual(fetches,urls.slice(0,2));urls.unshift('https://example.test/listings/new-0');const resumed={...first,resume:true,maxListings:5};const summary=await runCrawler({config:resumed,adapter:fakeAdapter(fetches),storage:new Storage(resumed),logger});assert.equal(summary.listingsSkipped,2);assert.deepEqual(fetches.slice(2),['https://example.test/listings/new-0','https://example.test/listings/c-3']);const db=JSON.parse(await readFile(path.join(dataDir,'dry-run/normalized/normalized-preview.json'),'utf8'));assert.equal(db.length,4);}finally{urls.shift();await rm(dataDir,{recursive:true,force:true});}});
