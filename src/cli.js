#!/usr/bin/env node
import { loadConfig, help } from './core/config.js';
import { createLogger } from './core/logger.js';
import { Storage } from './core/storage.js';
import { runCrawler } from './core/crawler.js';
import { adapter as paraglidingSecondhand } from './sources/paragliding-secondhand.js';
const adapters=new Map([[paraglidingSecondhand.name,paraglidingSecondhand]]);
try { const config=await loadConfig(process.argv.slice(2));if(config.help){console.log(help);process.exit(0);}const adapter=config.source==='all'?paraglidingSecondhand:adapters.get(config.source);if(!adapter)throw new Error(`Unknown source: ${config.source}. Available: all, ${[...adapters.keys()].join(', ')}`);const logger=createLogger(config.verbose);logger.info('Crawl started',{source:config.source,dryRun:config.dryRun,fixtureOnly:config.fixtureOnly});const summary=await runCrawler({config,adapter,storage:new Storage(config),logger});console.log('\nCrawl summary');for(const [key,value] of Object.entries(summary))console.log(`${key.replace(/[A-Z]/g,m=>` ${m.toLowerCase()}`)}: ${value}`);console.log(`mode: ${config.dryRun?'dry-run (production database unchanged)':'production'}`);}
catch(error){console.error(JSON.stringify({level:'error',message:error.message,stack:process.env.PG_CRAWLER_VERBOSE==='true'?error.stack:undefined}));process.exitCode=1;}
