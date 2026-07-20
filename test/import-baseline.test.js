import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeHistories } from '../src/cron/import-baseline.js';

test('baseline history merge retains unique chronological observations',()=>{const existing=[{listingId:'a',firstSeenAt:'2026-01-01',lastSeenAt:'2026-01-02',status:'active',observations:[{observedAt:'2026-01-01',contentHash:'one'}],lifecycleEvents:[{type:'new-listing',at:'2026-01-01'}]}],incoming=[{listingId:'a',firstSeenAt:'2026-01-01',lastSeenAt:'2026-01-03',status:'active',observations:[{observedAt:'2026-01-01',contentHash:'one'},{observedAt:'2026-01-03',contentHash:'two'}],lifecycleEvents:[{type:'new-listing',at:'2026-01-01'},{type:'price-drop',at:'2026-01-03'}]}],merged=mergeHistories(existing,incoming);assert.equal(merged.length,1);assert.equal(merged[0].observations.length,2);assert.equal(merged[0].lifecycleEvents.length,2);assert.equal(merged[0].lastSeenAt,'2026-01-03');});
