import test from 'node:test';
import assert from 'node:assert/strict';
import { loadDefaultProfile, normalizeProfile } from '../src/profiles.js';

test('default Griffin profile normalizes as a reusable pilot profile',async()=>{const profile=normalizeProfile(await loadDefaultProfile());assert.equal(profile.id,'griffin-primary-kit');assert.equal(profile.plan.pilotWeightKg,70);assert.equal(profile.plan.maximumTotalBudget.amount,3000);assert.equal(profile.watchlist.length,1);});
test('profile validation rejects unsafe IDs and reversed weight ranges',async()=>{const base=await loadDefaultProfile();assert.throws(()=>normalizeProfile(base,'../secret'),/Profile ID/);base.plan.estimatedAllUpWeightRangeKg={min:100,max:80};assert.throws(()=>normalizeProfile(base),/All-up maximum/);});
