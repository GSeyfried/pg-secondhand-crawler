const CORE_COMPONENTS=['wing','harness','reserve'];
const componentPatterns={
  wing:/\b(?:paraglider|glider|wing|canopy)\b/i,
  harness:/\bharness(?:es)?\b/i,
  reserve:/\b(?:reserve|rescue)(?:\s+(?:parachute|chute))?\b/i,
  instrument:/\b(?:vario(?:meter)?|flight instrument|gps)\b/i,
  helmet:/\bhelmet\b/i,
  bag:/\b(?:rucksack|concertina|fast[ -]?pack|packing bag)\b/i
};

export function classifyEquipment(category='',title='',description='') {
  const c=category.toLowerCase(),text=`${title}\n${description}`;
  const listingType=c.includes('full kit')?'full-kit':c.includes('harness')?'harness':c.includes('reserve')?'reserve':c.includes('instrument')?'instrument':c.includes('helmet')?'helmet':c.includes('paraglider')?'wing':'other';
  const detected=listingType==='full-kit'?Object.entries(componentPatterns).filter(([,pattern])=>pattern.test(text)).map(([type])=>type):listingType==='other'?[]:[listingType];
  const missing=CORE_COMPONENTS.filter(type=>!detected.includes(type));
  return {listingType,bundle:{claimedFullKit:listingType==='full-kit',componentsDetected:detected,coreComponentsRequired:CORE_COMPONENTS,missingCoreComponents:missing,coreComplete:missing.length===0}};
}

function componentView(record){return{id:record.id,type:record.listingType,title:record.title,sourceUrl:record.sourceUrl,price:record.price,cost:record.cost,location:record.location};}
export function buildKitComparisons(records,generatedAt=new Date().toISOString()) {
  const priced=records.filter(r=>r.price?.amount!=null&&r.price.currency&&r.location?.isNorthAmerica===true);
  const fullKits=priced.filter(r=>r.listingType==='full-kit').map(r=>({...componentView(r),bundle:r.bundle}));
  const currencies=[...new Set(priced.map(r=>r.price.currency))];const assembledKits=[];
  for(const currency of currencies){
    const byType=Object.fromEntries(CORE_COMPONENTS.map(type=>[type,priced.filter(r=>r.listingType===type&&r.price.currency===currency).sort((a,b)=>a.price.amount-b.price.amount).slice(0,10)]));
    if(CORE_COMPONENTS.some(type=>!byType[type].length))continue;
    combinations: for(const wing of byType.wing)for(const harness of byType.harness)for(const reserve of byType.reserve){
      const components=[wing,harness,reserve].map(componentView);const knownItemSubtotal=components.reduce((sum,x)=>sum+x.price.amount,0);const unknownShippingComponents=components.filter(x=>x.cost?.shippingIncluded!==true).length;
      assembledKits.push({id:`assembled:${wing.id}:${harness.id}:${reserve.id}`,currency,totalAmount:knownItemSubtotal,knownItemSubtotal,costCompleteness:{shippingComplete:unknownShippingComponents===0,unknownShippingComponents,taxesIncluded:false,inspectionIncluded:false},components,compatibilityStatus:'unverified',warnings:['Known subtotal excludes any unlisted shipping, tax, inspection, repair, or currency-conversion costs.','Size, weight range, certification, condition, and shipping compatibility require human review.']});
      if(assembledKits.length>=250)break combinations;
    }
  }
  assembledKits.sort((a,b)=>a.currency.localeCompare(b.currency)||a.totalAmount-b.totalAmount);
  const comparisons=fullKits.map(full=>{const alternatives=assembledKits.filter(a=>a.currency===full.price.currency).slice(0,10).map(a=>({...a,differenceFromFullKit:a.knownItemSubtotal-full.price.amount,knownItemCostDifference:a.knownItemSubtotal-full.price.amount,cheaperOption:a.knownItemSubtotal<full.price.amount?'assembled-components':a.knownItemSubtotal>full.price.amount?'marketplace-full-kit':'equal'}));return{fullKit:full,assembledAlternatives:alternatives,warning:'Difference compares known listing prices only; total acquisition cost may differ.'};});
  return {generatedAt,methodology:{coreComponents:CORE_COMPONENTS,currencyPolicy:'No currency conversion. Only identical currencies are compared.',compatibilityPolicy:'Generated combinations are cost scenarios, not compatibility recommendations.',maximumCandidates:250},summary:{fullKits:fullKits.length,assembledCandidates:assembledKits.length,comparableFullKits:comparisons.filter(x=>x.assembledAlternatives.length).length},fullKits,assembledKits,comparisons};
}
