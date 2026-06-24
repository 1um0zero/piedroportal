import { readFileSync, writeFileSync, mkdirSync } from 'fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>l.split('=').map(s=>s.trim())).map(([k,...v])=>[k,v.join('=')]))
const DEV='https://orgc86abc8f.crm4.dynamics.com'
const tok=await fetch(`https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:env.DATAVERSE_CLIENT_ID,client_secret:env.DATAVERSE_CLIENT_SECRET,scope:`${DEV}/.default`})})
const{access_token}=await tok.json()
const api=async p=>{const r=await fetch(`${DEV}/api/data/v9.2${p}`,{headers:{Authorization:`Bearer ${access_token}`,Accept:'application/json'}});if(!r.ok)return{__err:`${r.status}: ${(await r.text()).slice(0,160)}`};return r.json()}
const wf=await api(`/mspp_webforms?$select=mspp_webformid,mspp_name`)
console.log(`WEBFORMS (${wf.value.length}):`)
for(const f of wf.value)console.log(`  ${f.mspp_name.padEnd(45)} ${f.mspp_webformid}`)
// steps with their JS + target entity
const st=await api(`/mspp_webformsteps?$select=mspp_webformstepid,mspp_name,mspp_targetentitylogicalname,_mspp_webform_value,mspp_registerstartupscript`)
console.log(`\nSTEPS (${st.value.length}) — name | entity | js? | webformId:`)
for(const s of st.value){
  const js=s.mspp_registerstartupscript
  console.log(`  ${(s.mspp_name||'?').padEnd(34)} ${(s.mspp_targetentitylogicalname||'').padEnd(26)} ${js?`JS:${js.length}`:'—'.padEnd(8)} wf=${s._mspp_webform_value}`)
}
