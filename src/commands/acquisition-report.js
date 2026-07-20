#!/usr/bin/env node
import { commandOptions, print } from './common.js';import { buildPlannerArtifacts, savePlannerArtifacts } from '../planner/io.js';
try{const options=commandOptions(process.argv.slice(2)),a=await buildPlannerArtifacts(options);await savePlannerArtifacts(a);print(a.report);}catch(e){console.error(e.message);process.exitCode=1;}
