import { upsert } from '../core/dedupe.js';
import { buildKitComparisons } from '../core/kits.js';
import { BlobStorage, blobStorageConfigured } from './blob-storage.js';

const uniqueBy=(items,key)=>[...new Map(items.map(item=>[key(item),item])).values()];
export function mergeHistories(existing,incoming){const byId=new Map(existing.map(history=>[history.listingId,structuredClone(history)]));for(const next of incoming){if(!next?.listingId)continue;const current=byId.get(next.listingId);if(!current){byId.set(next.listingId,structuredClone(next));continue;}const observations=uniqueBy([...(current.observations??[]),...(next.observations??[])],x=>`${x.observedAt}:${x.contentHash??''}`).sort((a,b)=>a.observedAt.localeCompare(b.observedAt)),events=uniqueBy([...(current.lifecycleEvents??[]),...(next.lifecycleEvents??[])],x=>JSON.stringify(x)).sort((a,b)=>(a.at??'').localeCompare(b.at??'')),latest=(next.lastSeenAt??'')>(current.lastSeenAt??'')?next:current;byId.set(next.listingId,{...current,...latest,firstSeenAt:[current.firstSeenAt,next.firstSeenAt].filter(Boolean).sort()[0],lastSeenAt:[current.lastSeenAt,next.lastSeenAt].filter(Boolean).sort().at(-1),observations,lifecycleEvents:events});}return[...byId.values()];}

export async function importBaseline(payload){
  if(!blobStorageConfigured())throw new Error('Connect a private Vercel Blob store before importing a baseline.');
  if(!Array.isArray(payload?.listings)||!Array.isArray(payload?.history))throw new Error('Baseline must include listings and history arrays.');
  if(payload.listings.length>10000||payload.history.length>10000)throw new Error('Baseline exceeds the 10,000-record safety limit.');
  const storage=new BlobStorage();await storage.init();const before=storage.state.listings.length;
  for(const listing of payload.listings){if(!listing?.id||!/^https?:\/\//.test(listing.sourceUrl??''))throw new Error('Every imported listing requires an ID and HTTP source URL.');upsert(storage.state.listings,listing);}
  storage.state.history=mergeHistories(storage.state.history,payload.history);storage.state.comparisons=buildKitComparisons(storage.state.listings);storage.state.lastBaselineImport={importedAt:new Date().toISOString(),source:payload.source??'local-full-site',submittedListings:payload.listings.length,totalListings:storage.state.listings.length,historyCount:storage.state.history.length};await storage.flush();return{...storage.state.lastBaselineImport,addedListings:storage.state.listings.length-before};
}
