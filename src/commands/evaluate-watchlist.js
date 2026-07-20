#!/usr/bin/env node
import { commandOptions, print } from './common.js';import { buildPlannerArtifacts, savePlannerArtifacts } from '../planner/io.js';
try{const options=commandOptions(process.argv.slice(2)),a=await buildPlannerArtifacts(options);await savePlannerArtifacts(a);print({mode:options.dryRun?'dry-run':'production',watchRules:a.watchlist.length,matches:a.watchMatches.length,alerts:a.alerts.map(x=>({level:x.level,title:x.title,sourceUrl:x.sourceUrl})),output:a.paths.matches});}catch(e){console.error(e.message);process.exitCode=1;}
