const { requireAuth } = require('./_auth');
const OWNER=process.env.GITHUB_OWNER||'meeth10', REPO=process.env.GITHUB_REPO||'Case_book', BRANCH=process.env.GITHUB_BRANCH||'main', PATH=process.env.GITHUB_DATA_PATH||'data/cases.json', TOKEN=process.env.GITHUB_TOKEN;
const base=`https://api.github.com/repos/${OWNER}/${REPO}`;
const ghHeaders=()=>({Authorization:`Bearer ${TOKEN}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'});
async function readCases(){
  if(!TOKEN) throw new Error('GITHUB_TOKEN is not configured in Vercel.');
  const r=await fetch(`${base}/contents/${PATH}?ref=${encodeURIComponent(BRANCH)}&t=${Date.now()}`,{headers:ghHeaders(),cache:'no-store'});
  if(r.status===404) return {cases:[],sha:null};
  if(!r.ok) throw new Error(`GitHub read failed (${r.status}).`);
  const f=await r.json(), cases=JSON.parse(Buffer.from(f.content.replace(/\n/g,''),'base64').toString('utf8'));
  if(!Array.isArray(cases)) throw new Error('data/cases.json must contain an array.');
  return {cases,sha:f.sha};
}
function validate(cases){if(!Array.isArray(cases))throw new Error('Cases must be an array.');for(const c of cases){if(!c||typeof c!=='object'||!c.id||!c.title||!c.tab)throw new Error('Every case needs id, tab and title.');if(c.attachments&&!Array.isArray(c.attachments))throw new Error(`Attachments for ${c.id} must be an array.`);}}
async function writeCases(cases,sha){validate(cases);const body={message:`Update case record (${cases.length} cases)`,content:Buffer.from(JSON.stringify(cases,null,2),'utf8').toString('base64'),branch:BRANCH};if(sha)body.sha=sha;const r=await fetch(`${base}/contents/${PATH}`,{method:'PUT',headers:{...ghHeaders(),'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error(`GitHub write failed (${r.status}).`);}
module.exports=async(req,res)=>{
  if(req.method==='GET'){try{const {cases}=await readCases();res.setHeader('Cache-Control','no-store');return res.status(200).json({cases});}catch(e){return res.status(500).json({error:e.message});}}
  if(!requireAuth(req,res))return;
  if(req.method!=='PUT')return res.status(405).json({error:'Method not allowed'});
  try{const incoming=req.body?.cases;validate(incoming);const current=await readCases();await writeCases(incoming,current.sha);return res.status(200).json({cases:incoming});}catch(e){return res.status(400).json({error:e.message||'Could not save cases.'});}
};
