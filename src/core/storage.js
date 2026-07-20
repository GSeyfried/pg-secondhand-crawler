import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { uniqueName } from './util.js';
export class Storage {
  constructor(config) { this.config=config; this.root=config.dryRun ? path.join(config.dataDir,'dry-run') : config.dataDir; }
  async init(source) { for(const dir of ['raw','staging','errors','checkpoints','normalized','cache','planner']) await mkdir(path.join(this.root,dir,...(['raw','staging','errors'].includes(dir)?[source]:[])),{recursive:true}); }
  rawPath(source,id) { return path.join(this.root,'raw',source,`${id ?? 'unknown'}-${uniqueName()}.json`); }
  async saveRaw(source,id,envelope) { const p=this.rawPath(source,id); await writeFile(p,JSON.stringify(envelope,null,2),{flag:'wx'}); return p; }
  async saveStaging(source,batch,records) { const p=path.join(this.root,'staging',source,`batch-${batch}-${uniqueName()}.json`); await writeFile(p,JSON.stringify(records,null,2),{flag:'wx'}); return p; }
  checkpointPath(source) { return path.join(this.root,'checkpoints',`${source}.json`); }
  async loadCheckpoint(source) { try{return JSON.parse(await readFile(this.checkpointPath(source),'utf8'));}catch{return {completedUrls:[],nextOffset:0,batchesCompleted:0};} }
  async saveCheckpoint(source,value) { await writeFile(this.checkpointPath(source),JSON.stringify(value,null,2)); }
  async saveError(source,error) { const p=path.join(this.root,'errors',source,`${uniqueName()}.json`); await writeFile(p,JSON.stringify(error,null,2),{flag:'wx'}); }
  databasePath() { return path.join(this.root,'normalized',this.config.dryRun?'normalized-preview.json':'listings.json'); }
  comparisonsPath() { return path.join(this.root,'normalized',this.config.dryRun?'kit-comparisons-preview.json':'kit-comparisons.json'); }
  async loadDatabase() { try{return JSON.parse(await readFile(this.databasePath(),'utf8'));}catch{return [];} }
  async saveDatabase(records) { await writeFile(this.databasePath(),JSON.stringify(records,null,2)); }
  async saveComparisons(value) { await writeFile(this.comparisonsPath(),JSON.stringify(value,null,2)); }
  historyPath() { return path.join(this.root,'planner','listing-history.json'); }
  async loadHistory() { try{return JSON.parse(await readFile(this.historyPath(),'utf8'));}catch{return [];} }
  async saveHistory(value) { await writeFile(this.historyPath(),JSON.stringify(value,null,2)); }
}
