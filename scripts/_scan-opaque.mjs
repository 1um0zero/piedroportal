import { readFileSync } from 'fs'
import { resolve } from 'path'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'
const env = Object.fromEntries(readFileSync(resolve(process.cwd(),'.env.local'),'utf8').split('\n')
  .filter(l=>l.includes('=')&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i).trim(),l.slice(i+1).trim()]}))
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const PUB=`${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/products/`
// list all
let names=[],off=0
while(true){const {data}=await sb.storage.from('products').list('',{limit:100,offset:off,sortBy:{column:'name',order:'asc'}})
  const f=(data??[]).filter(x=>x.id&&/\.(png|jpe?g)$/i.test(x.name)); names.push(...f.map(x=>x.name)); if(!data||data.length<100)break; off+=100}
console.log('total images:',names.length)
let opaque=[], done=0, err=0
let i=0
const worker=async()=>{while(i<names.length){const name=names[i++]
  try{const res=await fetch(PUB+encodeURIComponent(name)); const buf=Buffer.from(await res.arrayBuffer())
    const {data:raw,info}=await sharp(buf).ensureAlpha().raw().toBuffer({resolveWithObject:true})
    const a=[raw[3],raw[(info.width-1)*4+3],raw[((info.height-1)*info.width)*4+3]]
    if(a.every(v=>v>200)) opaque.push(name)
  }catch{err++}
  if(++done%200===0)process.stdout.write(`\r ${done}/${names.length} opaque=${opaque.length} err=${err}`)
}}
await Promise.all(Array.from({length:10},worker))
console.log('\n\nSTILL-OPAQUE images:',opaque.length,'| errors:',err)
console.log(opaque.slice(0,50).join('\n'))
