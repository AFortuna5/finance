export function validObservation(row:any,now=new Date()){
  if(typeof row?.data!=='string'||!/^\d{2}\/\d{2}\/\d{4}$/.test(row.data)||row.valor==null||String(row.valor).trim()==='')return false;
  const [day,month,year]=row.data.split('/').map(Number);
  const date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCDate()===day&&date.getUTCMonth()===month-1&&date.getUTCFullYear()===year&&+date<=+now&&Number.isFinite(Number(row.valor));
}
