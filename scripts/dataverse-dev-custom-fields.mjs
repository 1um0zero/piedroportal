import { readFileSync, writeFileSync } from 'fs'
const env = Object.fromEntries(readFileSync('.env.local','utf8').split('\n').filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>l.split('=').map(s=>s.trim())).map(([k,...v])=>[k,v.join('=')]))
const DEV='https://orgc86abc8f.crm4.dynamics.com'
const tok=await fetch(`https://login.microsoftonline.com/${env.DATAVERSE_TENANT_ID}/oauth2/v2.0/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials',client_id:env.DATAVERSE_CLIENT_ID,client_secret:env.DATAVERSE_CLIENT_SECRET,scope:`${DEV}/.default`})})
const{access_token}=await tok.json()
const api=async p=>{const r=await fetch(`${DEV}/api/data/v9.2${p}`,{headers:{Authorization:`Bearer ${access_token}`,Accept:'application/json'}});if(!r.ok)throw new Error(`${r.status} ${p}: ${(await r.text()).slice(0,200)}`);return r.json()}
const ENT='cr56f_wpp_custom_orders'
const attrs=await api(`/EntityDefinitions(LogicalName='${ENT}')/Attributes?$select=LogicalName,AttributeType,DisplayName,RequiredLevel,IsCustomAttribute`)
const rows=attrs.value.filter(a=>a.IsCustomAttribute&&!/^cr56f_wpp_custom_order$/.test(a.LogicalName)).map(a=>({name:a.LogicalName,type:a.AttributeType,label:a.DisplayName?.UserLocalizedLabel?.Label??'',req:a.RequiredLevel?.Value}))
rows.sort((x,y)=>x.name.localeCompare(y.name))
console.log(`cr56f_wpp_custom_orders — ${rows.length} custom attributes:\n`)
for(const r of rows){console.log(`  ${r.name.padEnd(42)} ${String(r.type).padEnd(14)} ${r.req==='ApplicationRequired'?'REQ ':'    '}${r.label}`)}
writeFileSync('docs/custom-orders-dev-fields.json',JSON.stringify(rows,null,2))
console.log(`\n→ saved docs/custom-orders-dev-fields.json`)
