import { readFileSync } from 'fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>l.split('=').map(s=>s.trim())).map(([k,...v])=>[k,v.join('=')]))
const DEV='https://orgc86abc8f.crm4.dynamics.com'
const tok=await fetch(`https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:env.DATAVERSE_CLIENT_ID,client_secret:env.DATAVERSE_CLIENT_SECRET,scope:`${DEV}/.default`})})
const{access_token}=await tok.json()
const api=async p=>{const r=await fetch(`${DEV}/api/data/v9.2${p}`,{headers:{Authorization:`Bearer ${access_token}`,Accept:'application/json','OData-MaxVersion':'4.0','OData-Version':'4.0','Prefer':'odata.include-annotations="*"'}});if(!r.ok)throw new Error(`${r.status} ${p}: ${(await r.text()).slice(0,200)}`);return r.json()}
const meta=await api(`/EntityDefinitions?$select=LogicalName,DisplayName,EntitySetName,IsCustomEntity`)
const custom=meta.value.filter(e=>e.IsCustomEntity)
console.log(`Custom entities (${custom.length}):`)
for(const e of custom){console.log(`  ${e.LogicalName.padEnd(45)} [${e.EntitySetName}]  ${e.DisplayName?.UserLocalizedLabel?.Label??''}`)}
