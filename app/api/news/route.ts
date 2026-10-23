import { latest, history, edition } from '../../../lib/journal';
export const dynamic='force-dynamic';
export async function GET(request:Request){const p=new URL(request.url).searchParams;try{const data=p.has('history')?await history():p.has('edition')?await edition(p.get('edition')!):await latest();return Response.json(data,{status:data?200:404,headers:{'cache-control':'no-store'}});}catch{return Response.json({error:'Edição indisponível'},{status:503});}}
