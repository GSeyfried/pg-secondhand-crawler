import { canonicalUrl } from './util.js';
const tokens=s=>new Set((s??'').toLowerCase().match(/[a-z0-9]+/g)??[]);
function similarity(a,b){const x=tokens(a),y=tokens(b);if(!x.size||!y.size)return 0;let n=0;for(const t of x)if(y.has(t))n++;return n/new Set([...x,...y]).size;}
export function upsert(records,incoming) {
  let index=records.findIndex(r=>r.source===incoming.source&&r.sourceListingId&&r.sourceListingId===incoming.sourceListingId);
  if(index<0) index=records.findIndex(r=>canonicalUrl(r.sourceUrl)===canonicalUrl(incoming.sourceUrl));
  if(index<0&&incoming.contentHash) index=records.findIndex(r=>r.contentHash===incoming.contentHash || incoming.images.some(x=>(r.images??[]).includes(x)));
  const fuzzy=records.filter(r=>r.id!==incoming.id&&r.source===incoming.source&&similarity(r.title,incoming.title)>=0.75).map(r=>r.id);
  if(index>=0){const firstSeenAt=records[index].firstSeenAt;records[index]={...records[index],...incoming,firstSeenAt};return{action:'updated',duplicate:true,fuzzy};}
  records.push(incoming); return {action:'inserted',duplicate:false,fuzzy};
}
