import assert from 'node:assert/strict';
export class MemoryStore {
  constructor(){this.data=new Map();this.queue=Promise.resolve();}
  async get(key){return structuredClone(this.data.get(key)??null);}
  async list(path,filter,options={}){
    let items=[...this.data.entries()].filter(([k,v])=>k.startsWith(path+'/') && k.split('/').length===path.split('/').length+1 && (!filter || v[filter[0]]===filter[1])).map(([,v])=>structuredClone(v));
    if(options.orderBy)items.sort((a,b)=>(a[options.orderBy]-b[options.orderBy])*(options.direction==='desc'?-1:1));
    if(options.limit)items=items.slice(0,options.limit);
    return items;
  }
  runTransaction(callback){
    const run=this.queue.then(async()=>{
      const next=new MemoryStore();next.data=structuredClone(this.data);let wrote=false;
      const result=await callback({get:async key=>{assert.equal(wrote,false,'Every read precedes writes');return next.get(key);},
        list:async(...args)=>{assert.equal(wrote,false,'Every query precedes writes');return next.list(...args);},
        set:(key,value)=>{wrote=true;next.data.set(key,structuredClone(value));}});
      this.data=next.data;return result;
    });this.queue=run.catch(()=>{});return run;
  }
}
