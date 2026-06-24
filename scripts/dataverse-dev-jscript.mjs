import { readFileSync, writeFileSync, mkdirSync } from 'fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>l.split('=').map(s=>s.trim())).map(([k,...v])=>[k,v.join('=')]))
const DEV='https://orgc86abc8f.crm4.dynamics.com'
const tok=await fetch(`https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:env.DATAVERSE_CLIENT_ID,client_secret:env.DATAVERSE_CLIENT_SECRET,scope:`${DEV}/.default`})})
const{access_token}=await tok.json()
const api=async p=>{const r=await fetch(`${DEV}/api/data/v9.2${p}`,{headers:{Authorization:`Bearer ${access_token}`,Accept:'application/json'}});if(!r.ok)throw new Error(`${r.status} ${p}: ${(await r.text()).slice(0,200)}`);return r.json()}
// 1) List JS web resources WITHOUT content (cheap), filter by name.
const list=await api(`/webresourceset?$select=webresourceid,name,displayname&$filter=webresourcetype eq 3`)
const hits=list.value.filter(w=>/custom|order|wpp|piedro|cr56f/i.test(w.name)||/custom|order|wpp|piedro/i.test(w.displayname||''))
console.log(`JS web resources total ${list.value.length}, matching ${hits.length}:`)
mkdirSync('docs/custom-orders-jscript',{recursive:true})
// 2) Fetch content per-resource by id (avoids ERR_STRING_TOO_LONG).
for(const w of hits){
  const one=await api(`/webresourceset(${w.webresourceid})?$select=name,content`)
  const js=Buffer.from(one.content,'base64').toString('utf8')
  const safe=w.name.replace(/[^\w.-]/g,'_')
  writeFileSync(`docs/custom-orders-jscript/${safe}`,js)
  console.log(`  ${w.name}  (${js.length} chars) -> saved`)
}
console.log('done')
