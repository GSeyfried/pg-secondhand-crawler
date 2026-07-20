import path from 'node:path';
import { HttpClient } from './http.js';
import { sha256 } from './util.js';
import { validateListing } from './validate.js';
import { upsert } from './dedupe.js';
import { isRobotsAllowed } from './robots.js';
import { buildKitComparisons } from './kits.js';
import { updateListingHistory } from '../planner/history.js';

const emptySummary=()=>({indexPagesFetched:0,listingUrlsDiscovered:0,listingsAttempted:0,listingsSuccessfullyParsed:0,listingsSkipped:0,listingsRejectedOutsideNorthAmerica:0,duplicateListingsDetected:0,fetchFailures:0,parseFailures:0,recordsWouldBeInserted:0,recordsWouldBeUpdated:0,fullKitsAvailable:0,assembledKitCandidates:0});
const category=e=>e.category??(e.name==='TypeError'?'Network error':'Parse failure');
async function mapLimit(items,limit,fn){const out=new Array(items.length);let cursor=0;await Promise.all(Array.from({length:Math.min(limit,items.length)},async()=>{while(true){const i=cursor++;if(i>=items.length)return;try{out[i]={status:'fulfilled',value:await fn(items[i],i)};}catch(reason){out[i]={status:'rejected',reason};}}}));return out;}
function roundRobin(groups){const result=[];for(let i=0;groups.some(group=>i<group.length);i++)for(const group of groups)if(i<group.length)result.push(group[i]);return result;}
export async function runCrawler({config,adapter,storage,logger}) {
  const summary=emptySummary();const observedRecords=[]; await storage.init(adapter.name); const cacheDir=path.join(storage.root,'cache'); const http=new HttpClient({...config,cacheDir,logger});
  let urls=[];let robotsText=null;
  if(config.fixtureOnly){urls=await adapter.fixtureUrls(config.dataDir);summary.indexPagesFetched=1;}
  else {
    const robots=await http.fetchText(`${adapter.baseUrl}/robots.txt`);robotsText=robots.body;
    if(robots.status!==200) throw new Error(`robots.txt unavailable (${robots.status}); refusing live crawl`);
    const targets=config.fullSite&&adapter.sitemapUrl?[adapter.sitemapUrl]:[...Array(config.indexPages)].flatMap((_,index)=>adapter.indexUrls?adapter.indexUrls(index+1,config.categories):[adapter.indexUrl(index+1)]);
    if(targets.some(url=>!isRobotsAllowed(robots.body,url)))throw new Error('robots.txt disallows the configured index');
    logger.info('Robots policy checked',{source:adapter.name,stage:'robots',result:'allowed',robotsUrl:`${adapter.baseUrl}/robots.txt`});
    const groups=[];for(const target of targets){const response=await http.fetchText(target);summary.indexPagesFetched++;groups.push(adapter.extractListingUrls(response.body));}urls=roundRobin(groups);
  }
  urls=[...new Set(urls)];summary.listingUrlsDiscovered=urls.length;const discoveryIndex=new Map(urls.map((url,index)=>[url,index]));const checkpoint=config.resume?await storage.loadCheckpoint(adapter.name):{completedUrls:[],nextOffset:0,batchesCompleted:0};const completed=new Set(checkpoint.completedUrls);
  const candidates=urls.slice(config.startOffset);if(config.resume)summary.listingsSkipped=candidates.filter(url=>completed.has(url)).length;urls=candidates.filter(url=>!config.resume||!completed.has(url)).slice(0,config.maxListings);const db=await storage.loadDatabase();const initialBatches=checkpoint.batchesCompleted;
  for(let at=0;at<urls.length;at+=config.batchSize){const batchNo=initialBatches+Math.floor(at/config.batchSize)+1;const batch=urls.slice(at,at+config.batchSize);const staged=[];
    const settled=await mapLimit(batch,config.concurrency,async(url,index)=>{
      const context={source:adapter.name,listingUrl:url,batchNumber:batchNo,listingIndex:discoveryIndex.get(url)};
      summary.listingsAttempted++;logger.debug('Processing listing',{...context,stage:'fetch',result:'started'});
      if(!config.fixtureOnly&&!isRobotsAllowed(robotsText,url))throw Object.assign(new Error('robots.txt disallows listing URL'),{category:'Blocked request',context});
      let response;try{response=config.fixtureOnly?await adapter.fetchFixture(url,config.dataDir):await http.fetchText(url);}catch(e){summary.fetchFailures++;throw Object.assign(e,{context});}
      const sourceId=adapter.sourceId(url);const contentHash=sha256(response.body);const envelope={source:adapter.name,sourceListingId:sourceId,sourceUrl:url,retrievedAt:response.retrievedAt,httpStatus:response.status,raw:response.body,contentHash};
      const rawPath=await storage.saveRaw(adapter.name,sourceId,envelope);
      if(response.status===404) throw Object.assign(new Error('Listing returned 404'),{category:'Invalid response',context});
      let record;try{record=adapter.parse(response.body,{url,retrievedAt:response.retrievedAt,rawRecordPath:rawPath,contentHash});}catch(e){summary.parseFailures++;throw Object.assign(e,{context});}
      const valid=validateListing(record);if(!valid.success){summary.parseFailures++;throw Object.assign(new Error(valid.errors.join('; ')),{category:'Validation failure',context});}
      summary.listingsSuccessfullyParsed++;if(record.location.isNorthAmerica===false){summary.listingsRejectedOutsideNorthAmerica++;logger.info('Listing rejected',{...context,stage:'location',result:'outside North America'});completed.add(url);return;}
      const result=upsert(db,record);if(result.duplicate)summary.duplicateListingsDetected++;summary[result.action==='inserted'?'recordsWouldBeInserted':'recordsWouldBeUpdated']++;if(result.fuzzy.length)logger.warn('Potential fuzzy duplicate; not merged',{...context,stage:'deduplication',result:'review',candidateIds:result.fuzzy});staged.push(record);observedRecords.push(record);completed.add(url);
    });
    for(const item of settled)if(item.status==='rejected'){const e=item.reason;const errorCategory=category(e);await storage.saveError(adapter.name,{timestamp:new Date().toISOString(),errorCategory,message:e.message,...e.context});logger.error('Listing failed',{...e.context,stage:'processing',result:'failed',errorCategory,message:e.message});}
    await storage.saveStaging(adapter.name,batchNo,staged);checkpoint.completedUrls=[...completed];checkpoint.nextOffset=Math.max(checkpoint.nextOffset??0,...batch.map(url=>(discoveryIndex.get(url)??-1)+1));checkpoint.batchesCompleted=batchNo;checkpoint.lastDiscoveryCount=summary.listingUrlsDiscovered;await storage.saveCheckpoint(adapter.name,checkpoint);logger.info('Batch complete',{batchNumber:batchNo,attempted:batch.length,staged:staged.length,failures:settled.filter(x=>x.status==='rejected').length});
  }
  await storage.saveDatabase(db);const kitComparisons=buildKitComparisons(db);await storage.saveComparisons(kitComparisons);const existingHistory=await storage.loadHistory();const observedAt=new Date().toISOString();const historyUpdate=updateListingHistory(existingHistory,observedRecords,{observedAt,completeSnapshot:false,source:adapter.name});await storage.saveHistory(historyUpdate.histories);summary.fullKitsAvailable=kitComparisons.summary.fullKits;summary.assembledKitCandidates=kitComparisons.summary.assembledCandidates;summary.newListingsFound=historyUpdate.report.newListings.length;summary.priceDropsDetected=historyUpdate.report.priceDrops.length;return summary;
}
