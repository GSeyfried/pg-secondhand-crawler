import test from 'node:test';
import assert from 'node:assert/strict';
import { upsert } from '../src/core/dedupe.js';
const listing=(id,url,title='Ozone Buzz Z7 MS')=>({id,source:'s',sourceListingId:id,sourceUrl:url,title,contentHash:`hash-${id}`,images:[],firstSeenAt:'old'});
test('exact source IDs update and preserve first seen time',()=>{const db=[listing('1','https://x.test/a')];const newer={...listing('1','https://x.test/changed'),'firstSeenAt':'new','lastSeenAt':'now'};const result=upsert(db,newer);assert.equal(result.action,'updated');assert.equal(db.length,1);assert.equal(db[0].firstSeenAt,'old');});
test('fuzzy matches warn but do not merge',()=>{const db=[listing('1','https://x.test/a')];const result=upsert(db,listing('2','https://x.test/b','Ozone Buzz Z7 size MS'));assert.equal(result.action,'inserted');assert.equal(db.length,2);assert.deepEqual(result.fuzzy,['1']);});
