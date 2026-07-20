const norm=value=>(value??'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const includesModel=(listing,watch)=>{const model=norm(listing.model),title=norm(listing.title);if(watch.models?.some(x=>model===norm(x)||title.includes(norm(x))))return'exact';if(watch.modelFamily&&(model.includes(norm(watch.modelFamily))||title.includes(norm(watch.modelFamily))))return'family';return watch.models?.length||watch.modelFamily?false:'type';};
export function matchWatchItem(listing,watch) {
  const reasons=[],manual=[];if(listing.listingType!==watch.equipmentType)return{matched:false,reasons:['equipment type mismatch'],manualReview:[]};
  if(watch.manufacturer&&norm(listing.manufacturer)!==norm(watch.manufacturer))return{matched:false,reasons:['manufacturer mismatch'],manualReview:[]};
  const modelMatch=includesModel(listing,watch);if(!modelMatch)return{matched:false,reasons:['model mismatch'],manualReview:[]};reasons.push(`${modelMatch} model match`);
  if(watch.acceptableSizes?.length){if(!listing.equipment?.size)manual.push('size unknown');else if(!watch.acceptableSizes.some(x=>norm(x)===norm(listing.equipment.size)))return{matched:false,reasons:['size mismatch'],manualReview:[]};}
  if(watch.maximumPrice!=null&&listing.price?.amount!=null&&listing.price.amount>watch.maximumPrice)reasons.push('above maximum price');
  if(watch.yearRange&&listing.equipment?.year!=null&&(listing.equipment.year<watch.yearRange.min||listing.equipment.year>watch.yearRange.max))return{matched:false,reasons:['year outside range'],manualReview:[]};
  if(watch.geographicArea?.length&&!watch.geographicArea.includes(listing.location?.country))return{matched:false,reasons:['outside geographic area'],manualReview:[]};
  if(watch.requiredCertification){const cert=norm(listing.equipment?.certification);if(!cert)manual.push('certification unknown');else if(norm(watch.requiredCertification)==='low en b'&&cert==='en b')manual.push('EN-B level requires manual verification');else if(!cert.includes(norm(watch.requiredCertification)))return{matched:false,reasons:['certification mismatch'],manualReview:[]};}
  if(watch.requirePorosityPass&&!/porosity[^.\n]{0,50}\b(?:pass|good|excellent)\b/i.test(listing.description??''))manual.push('porosity pass not documented');
  return{matched:true,matchType:modelMatch,reasons,manualReview:manual,hardRequirementsPassed:manual.length===0,maximumPrice:watch.maximumPrice??null,preferredPrice:watch.preferredPrice??null,priceAtOrBelowTarget:listing.price?.amount!=null&&listing.price.amount<=(watch.preferredPrice??watch.maximumPrice)};
}
export function evaluateWatchlist(listings,watchlist){const matches=[];for(const listing of listings)for(const watch of watchlist){const result=matchWatchItem(listing,watch);if(result.matched)matches.push({watchId:watch.id,listingId:listing.id,sourceUrl:listing.sourceUrl,title:listing.title,price:listing.price,...result});}return matches;}
