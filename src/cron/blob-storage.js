import path from 'node:path';
import os from 'node:os';
import { get, put } from '@vercel/blob';

export const WEEKLY_STATE_PATH='pg-secondhand-crawler/weekly-state.json';
const blankState=()=>({version:1,listings:[],history:[],comparisons:null,checkpoints:{},errors:[],lastRun:null});

export function blobStorageConfigured(env=process.env) {
  return Boolean(env.BLOB_READ_WRITE_TOKEN||(env.VERCEL_OIDC_TOKEN&&env.BLOB_STORE_ID));
}

export async function loadWeeklyState() {
  if(!blobStorageConfigured())throw new Error('Persistent storage is not configured. Connect a private Vercel Blob store to this project.');
  const result=await get(WEEKLY_STATE_PATH,{access:'private',useCache:false});
  if(!result)return blankState();
  if(result.statusCode!==200||!result.stream)return blankState();
  return {...blankState(),...await new Response(result.stream).json()};
}

export class BlobStorage {
  constructor(){this.root=path.join(os.tmpdir(),'pg-secondhand-crawler');this.state=blankState();}
  async init(){this.state=await loadWeeklyState();}
  async saveRaw(source,id){return `vercel-blob://raw-omitted/${source}/${id??'unknown'}`;}
  async saveStaging(){return null;}
  async saveError(source,error){this.state.errors.push({source,...error});this.state.errors=this.state.errors.slice(-100);}
  async loadCheckpoint(source){return this.state.checkpoints[source]??{completedUrls:[],nextOffset:0,batchesCompleted:0};}
  async saveCheckpoint(source,value){this.state.checkpoints[source]=value;}
  async loadDatabase(){return this.state.listings;}
  async saveDatabase(value){this.state.listings=value;}
  async saveComparisons(value){this.state.comparisons=value;}
  async loadHistory(){return this.state.history;}
  async saveHistory(value){this.state.history=value;}
  async flush(){
    this.state.updatedAt=new Date().toISOString();
    await put(WEEKLY_STATE_PATH,JSON.stringify(this.state),{access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'application/json',cacheControlMaxAge:60});
  }
}
