import {update} from '../../../lib/journal';
export const dynamic='force-dynamic';
// Sites dispatch enforces owner-only access for visitors and service callers.
// Do not change the Site audience without adding application authorization.
export async function POST(){try{return Response.json(await update(),{headers:{'cache-control':'no-store'}});}catch(error){return Response.json({error:error instanceof Error?error.message:'Falha ao atualizar'},{status:503});}}
