import { sha256 } from '../core/util.js';

const locationText=location=>location?.raw??([location?.city,location?.region,location?.country].filter(Boolean).join(', ')||null);
const containsInspection=text=>/\b(?:inspect(?:ed|ion)|check(?:ed)?|trim(?:med| check)|service report)\b/i.test(text??'');
const containsPorosity=text=>/\bporosity\b/i.test(text??'');

export function observationFromListing(listing,observedAt) {
  return {listingId:listing.id,observedAt,status:listing.status??'active',equipmentType:listing.listingType,price:listing.price??{amount:null,currency:null},priceType:'asking-price',title:listing.title,descriptionHash:listing.description?sha256(listing.description):null,location:locationText(listing.location),contentHash:listing.contentHash,sellerName:listing.seller?.name??null,inspectionDocumented:containsInspection(listing.description),porosityDocumented:containsPorosity(listing.description),sellerChanges:[],sourceChanges:[]};
}

function changes(previous,current) {
  const events=[],sellerChanges=[],sourceChanges=[];
  if(previous.price?.amount!==current.price?.amount||previous.price?.currency!==current.price?.currency){const before=previous.price,after=current.price;const direction=before?.amount!=null&&after?.amount!=null?(after.amount<before.amount?'price-drop':'price-increase'):'price-change';events.push({type:direction,before,after});sourceChanges.push({field:'price',before,after});}
  for(const field of ['title','descriptionHash','location','inspectionDocumented','porosityDocumented'])if(previous[field]!==current[field]){const type=field==='inspectionDocumented'&&current[field]?'inspection-information-added':field==='porosityDocumented'&&current[field]?'porosity-information-added':`${field}-changed`;events.push({type,before:previous[field],after:current[field]});sourceChanges.push({field,before:previous[field],after:current[field]});}
  if(previous.sellerName!==current.sellerName){events.push({type:'seller-changed',before:previous.sellerName,after:current.sellerName});sellerChanges.push({before:previous.sellerName,after:current.sellerName});}
  return{events,sellerChanges,sourceChanges};
}

export function updateListingHistory(existing,currentListings,{observedAt=new Date().toISOString(),completeSnapshot=false,source=null}={}) {
  const histories=structuredClone(existing??[]),byId=new Map(histories.map(x=>[x.listingId,x])),seen=new Set(),report={newListings:[],unchangedListings:[],priceDrops:[],priceIncreases:[],relisted:[],removed:[],changed:[]};
  for(const listing of currentListings){seen.add(listing.id);const observation=observationFromListing(listing,observedAt);let history=byId.get(listing.id);
    if(!history){history={listingId:listing.id,equipmentType:listing.listingType,source:listing.source,sourceListingId:listing.sourceListingId,sourceUrl:listing.sourceUrl,firstSeenAt:observedAt,lastSeenAt:observedAt,status:'active',observations:[observation],lifecycleEvents:[{type:'new-listing',at:observedAt}]};histories.push(history);byId.set(listing.id,history);report.newListings.push(listing.id);continue;}
    const previous=history.observations.at(-1);const delta=changes(previous,observation);observation.sellerChanges=delta.sellerChanges;observation.sourceChanges=delta.sourceChanges;
    if(history.status!=='active'){history.lifecycleEvents.push({type:'relisted',at:observedAt,previousStatus:history.status});report.relisted.push(listing.id);}
    if(!delta.events.length&&previous.contentHash===observation.contentHash)report.unchangedListings.push(listing.id);else{for(const event of delta.events){history.lifecycleEvents.push({...event,at:observedAt});if(event.type==='price-drop')report.priceDrops.push(listing.id);if(event.type==='price-increase')report.priceIncreases.push(listing.id);}report.changed.push(listing.id);}
    history.observations.push(observation);history.lastSeenAt=observedAt;history.status='active';history.sourceUrl=listing.sourceUrl;
  }
  if(completeSnapshot)for(const history of histories){if(history.status==='active'&&(!source||history.source===source)&&!seen.has(history.listingId)){history.status='removed-possibly-sold';history.lifecycleEvents.push({type:'removed-possibly-sold',at:observedAt,finalPriceType:'unknown-final-price'});report.removed.push(history.listingId);}}
  return{histories,report};
}

export function priceDropSummary(history,asOf=new Date().toISOString()) {
  const priced=history.observations.filter(x=>x.price?.amount!=null);if(!priced.length)return null;const first=priced[0],last=priced.at(-1),changes=history.lifecycleEvents.filter(x=>x.type==='price-drop'||x.type==='price-increase');const drops=history.lifecycleEvents.filter(x=>x.type==='price-drop');const lastChange=changes.at(-1)?.at??first.observedAt;
  return{originalPrice:first.price.amount,currentPrice:last.price.amount,currency:last.price.currency,absoluteDrop:first.price.amount-last.price.amount,percentDrop:first.price.amount?Number((((first.price.amount-last.price.amount)/first.price.amount)*100).toFixed(2)):null,priceChangeCount:changes.length,priceDropCount:drops.length,daysSinceFirstSeen:Math.max(0,Math.floor((Date.parse(asOf)-Date.parse(history.firstSeenAt))/86400000)),daysSinceLastChange:Math.max(0,Math.floor((Date.parse(asOf)-Date.parse(lastChange))/86400000)),pattern:drops.length>1?'multiple-price-drops':drops.length===1?'first-price-drop':first.price.amount===last.price.amount?'no-reduction':'price-increased'};
}
