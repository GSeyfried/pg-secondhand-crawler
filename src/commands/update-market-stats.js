#!/usr/bin/env node
import { commandOptions, print } from './common.js';import { buildPlannerArtifacts, savePlannerArtifacts } from '../planner/io.js';
try{const options=commandOptions(process.argv.slice(2)),a=await buildPlannerArtifacts(options);await savePlannerArtifacts(a,{includeHistory:!a.history.length});print({mode:options.dryRun?'dry-run':'production',groups:a.stats.groups.length,weakGroups:a.stats.groups.filter(x=>x.strength==='weak').length,output:a.paths.stats});}catch(e){console.error(e.message);process.exitCode=1;}
