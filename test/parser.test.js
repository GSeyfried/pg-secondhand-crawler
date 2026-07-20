import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { adapter } from '../src/sources/paragliding-secondhand.js';
import { validateListing } from '../src/core/validate.js';

const dir=path.resolve('data/fixtures/paragliding-secondhand');
async function parse(name,id){const html=await readFile(path.join(dir,name),'utf8');return adapter.parse(html,{url:`https://paraglidingsecondhand.com/listings/test-${id}`,retrievedAt:'2026-01-01T00:00:00.000Z',rawRecordPath:`data/raw/${id}.json`,contentHash:`hash-${id}`});}

test('complete US fixture normalizes deterministically',async()=>{const a=await parse('01-complete-us.html',1001),b=await parse('01-complete-us.html',1001);assert.deepEqual(a,b);assert.equal(a.manufacturer,'Ozone');assert.equal(a.model,'Buzz Z7');assert.deepEqual(a.price,{amount:1800,currency:'USD'});assert.equal(a.location.isNorthAmerica,true);assert.equal(a.equipment.year,2023);assert.equal(a.listedAt,'2025-12-15T00:00:00.000Z');assert.equal(a.listingAgeDays,17);assert.equal(a.sourceUrl,'https://paraglidingsecondhand.com/listings/test-1001');assert.deepEqual(a.images,['https://images.example.test/buzz-z7.jpg']);assert.equal(validateListing(a).success,true);});
test('missing price remains null',async()=>{const x=await parse('02-missing-price-us.html',1002);assert.deepEqual(x.price,{amount:null,currency:null});assert.equal(validateListing(x).success,true);});
test('missing location is unknown, not rejected or invented',async()=>{const x=await parse('03-missing-location.html',1003);assert.deepEqual(x.location,{raw:null,city:null,region:null,country:null,isNorthAmerica:null});});
test('Canadian fixture is North American',async()=>{const x=await parse('04-canadian.html',1004);assert.equal(x.location.country,'CA');assert.equal(x.location.isNorthAmerica,true);assert.equal(x.price.currency,'CAD');});
test('German fixture is rejected by location classifier',async()=>{const x=await parse('05-outside-na.html',1005);assert.equal(x.location.isNorthAmerica,false);});
test('deleted fixture produces a categorized parse error',async()=>{await assert.rejects(()=>parse('06-deleted.html',1006),e=>e.category==='Parse failure');});
test('unexpected layout fails validation clearly',async()=>{const x=await parse('07-unexpected-layout.html',1007);const result=validateListing(x);assert.equal(result.success,false);assert.match(result.errors.join(' '),/title or meaningful description/);});
test('index parser returns unique canonical listing URLs only',()=>{const html='<a href="/listings/foo-123?utm_source=x">x</a><a href="https://paraglidingsecondhand.com/listings/foo-123">x</a><a href="/profile/listings/create">private, not a listing</a><a href="/about">no</a>';assert.deepEqual(adapter.extractListingUrls(html),['https://paraglidingsecondhand.com/listings/foo-123']);});
