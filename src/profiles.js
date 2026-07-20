import { readFile } from 'node:fs/promises';

const defaultPlanUrl=new URL('../config/kit-plans/griffin-primary-kit.json',import.meta.url),defaultWatchlistUrl=new URL('../config/watchlist.json',import.meta.url);
const json=async pathname=>JSON.parse(await readFile(pathname,'utf8'));
const finite=(value,name,{min=0}={})=>{const number=Number(value);if(!Number.isFinite(number)||number<min)throw new Error(`${name} must be at least ${min}`);return number;};

export async function loadDefaultProfile(){
  return {id:'griffin-primary-kit',displayName:'Griffin',plan:await json(defaultPlanUrl),watchlist:await json(defaultWatchlistUrl),updatedAt:null};
}

export function normalizeProfile(input,id=input?.id){
  if(!/^[a-z0-9][a-z0-9-]{1,62}$/.test(id??''))throw new Error('Profile ID must be a 2–63 character lowercase slug');
  if(!input?.displayName?.trim())throw new Error('Profile display name is required');
  const plan=structuredClone(input.plan??{}),watchlist=structuredClone(input.watchlist??[]);
  plan.kitPlanId=id;plan.pilotWeightKg=finite(plan.pilotWeightKg,'Pilot weight',{min:20});plan.estimatedAllUpWeightRangeKg={min:finite(plan.estimatedAllUpWeightRangeKg?.min,'All-up minimum',{min:20}),max:finite(plan.estimatedAllUpWeightRangeKg?.max,'All-up maximum',{min:20})};
  if(plan.estimatedAllUpWeightRangeKg.max<plan.estimatedAllUpWeightRangeKg.min)throw new Error('All-up maximum must be greater than or equal to the minimum');
  plan.maximumTotalBudget={amount:finite(plan.maximumTotalBudget?.amount,'Maximum budget'),currency:plan.maximumTotalBudget?.currency??'USD'};
  if(!Array.isArray(watchlist))throw new Error('Watchlist must be an array');
  for(const type of ['wing','harness','reserve','helmet']){for(const key of ['targetLow','targetHigh','absoluteMaximum'])plan.allocations[type][key]=finite(plan.allocations?.[type]?.[key],`${type} ${key}`);const range=plan.allocations[type];if(range.targetLow>range.targetHigh||range.targetHigh>range.absoluteMaximum)throw new Error(`${type} price range must be ordered low, target, maximum`);}
  plan.requireWingPorosityPass=Boolean(plan.requireWingPorosityPass);plan.requireInspectionReport=Boolean(plan.requireInspectionReport);
  return {id,displayName:input.displayName.trim().slice(0,80),plan,watchlist,updatedAt:new Date().toISOString()};
}

export function publicProfile(profile){return{id:profile.id,displayName:profile.displayName,plan:profile.plan,watchlist:profile.watchlist,updatedAt:profile.updatedAt};}
