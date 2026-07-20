import test from 'node:test';
import assert from 'node:assert/strict';
import { blobStorageConfigured } from '../src/cron/blob-storage.js';
import { isAuthorizedCron, weeklyConfig } from '../src/cron/weekly.js';

test('weekly cron rejects missing and incorrect bearer secrets',()=>{
  const env={CRON_SECRET:'correct-horse-battery'};
  assert.equal(isAuthorizedCron({},env),false);
  assert.equal(isAuthorizedCron({authorization:'Bearer wrong'},env),false);
  assert.equal(isAuthorizedCron({authorization:'Bearer correct-horse-battery'},env),true);
});

test('weekly crawl cap is bounded and defaults safely',()=>{
  assert.equal(weeklyConfig({}).maxListings,25);
  assert.equal(weeklyConfig({PG_CRAWLER_WEEKLY_MAX_LISTINGS:'60'}).maxListings,60);
  assert.equal(weeklyConfig({PG_CRAWLER_WEEKLY_MAX_LISTINGS:'1000'}).maxListings,100);
  assert.equal(weeklyConfig({PG_CRAWLER_WEEKLY_MAX_LISTINGS:'nope'}).maxListings,25);
});

test('blob configuration accepts a read-write token or Vercel OIDC credentials',()=>{
  assert.equal(blobStorageConfigured({}),false);
  assert.equal(blobStorageConfigured({BLOB_READ_WRITE_TOKEN:'token'}),true);
  assert.equal(blobStorageConfigured({VERCEL_OIDC_TOKEN:'oidc',BLOB_STORE_ID:'store'}),true);
});
