import test from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/core/config.js';
test('defaults are safe for development',async()=>{const c=await loadConfig([],{});assert.equal(c.dryRun,true);assert.equal(c.maxListings,25);assert.equal(c.concurrency,2);});
test('CLI overrides environment and parses no-boolean',async()=>{const c=await loadConfig(['--max-listings','5','--no-dry-run'],{PG_CRAWLER_MAX_LISTINGS:'9'});assert.equal(c.maxListings,5);assert.equal(c.dryRun,false);});
test('invalid numeric values fail early',async()=>{await assert.rejects(()=>loadConfig(['--batch-size','nope'],{}),/non-negative integer/);});
