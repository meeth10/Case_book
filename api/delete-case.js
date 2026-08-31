const { requireAuth } = require('./_auth');
const { del } = require('@vercel/blob');

const OWNER=process.env.GITHUB_OWNER||'meeth10';
const REPO=process.env.GITHUB_REPO||'Case_book';
const BRANCH=process.env.GITHUB_BRANCH||'main';
const PATH=process.env.GITHUB_DATA_PATH||'data/cases.json';
const TOKEN=process.env.GITHUB_TOKEN;
const base=`https://api.github.com/repos/${OWNER}/${REPO}`;
const ghHeaders=()=>({Authorization:`Bearer ${TOKEN}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'});

async function readCases(){
  if(!TOKEN)throw new Error('GITHUB_TOKEN is not configured in Vercel.');
  const r=await fetch(`${base}/contents/${PATH}?ref=${encodeURIComponent(BRANCH)}&t=${Date.now()}`,{headers:ghHeaders(),cache:'no-store'});
  if(!r.ok)throw new Error(`GitHub read failed (${r.status}).`);
  const f=await r.json();
  const cases=JSON.parse(Buffer.from(f.content.replace(/\n/g,''),'base64').toString('utf8'));
  if(!Array.isArray(cases))throw new Error('data/cases.json must contain an array.');
  return {cases,sha:f.sha};
}

async function writeCases(cases,sha){
  const body={message:`Delete case (${cases.length} remaining)`,content:Buffer.from(JSON.stringify(cases,null,2),'utf8').toString('base64'),branch:BRANCH,sha};
  const r=await fetch(`${base}/contents/${PATH}`,{method:'PUT',headers:{...ghHeaders(),'Content-Type':'application/json'},body:JSON.stringify(body)});
  if(!r.ok)throw new Error(`GitHub write failed (${r.status}).`);
}

function githubPath(v){
  const prefix=`https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/`;
  if(v?.startsWith(prefix))return decodeURIComponent(v.slice(prefix.length));
  if(v&&!v.includes('://')&&!v.startsWith('mailto:'))return v.replace(/^\/+/,'');
  return null;
}

async function removeAttachment(url){
  if(!url||url.startsWith('mailto:'))return {deleted:false};
  if(url.includes('.public.blob.vercel-storage.com')){
    await del(url);
    return {deleted:true};
  }
  const path=githubPath(url);
  if(!path||!TOKEN)return {deleted:false};
  const r=await fetch(`${base}/contents/${path}?ref=${encodeURIComponent(BRANCH)}&t=${Date.now()}`,{headers:ghHeaders(),cache:'no-store'});
  if(r.status===404)return {deleted:false};
  if(!r.ok)throw new Error(`Could not inspect attachment (${r.status}).`);
  const f=await r.json();
  const d=await fetch(`${base}/contents/${path}`,{method:'DELETE',headers:{...ghHeaders(),'Content-Type':'application/json'},body:JSON.stringify({message:`Delete case file: ${path}`,sha:f.sha,branch:BRANCH})});
  if(!d.ok)throw new Error(`Could not delete attachment (${d.status}).`);
  return {deleted:true};
}

module.exports=async(req,res)=>{
  if(!requireAuth(req,res))return;
  if(req.method!=='DELETE')return res.status(405).json({error:'Method not allowed'});
  try{
    const id=req.body?.id;
    if(!id)return res.status(400).json({error:'Missing case id.'});
    const {cases,sha}=await readCases();
    const index=cases.findIndex(c=>c.id===id);
    if(index===-1)return res.status(404).json({error:'Case not found.'});
    const target=cases[index];
    const remaining=cases.filter(c=>c.id!==id);
    await writeCases(remaining,sha);
    let orphanedFiles=0;
    for(const a of target.attachments||[]){
      try{const result=await removeAttachment(a.href);if(!result.deleted&&a.href?.includes('.public.blob.vercel-storage.com'))orphanedFiles++;}
      catch{orphanedFiles++;}
    }
    return res.status(200).json({deleted:true,orphanedFiles,remaining:remaining.length});
  }catch(e){return res.status(400).json({error:e.message||'Could not delete case.'});}
};
