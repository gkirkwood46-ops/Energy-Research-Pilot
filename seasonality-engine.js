// Seasonality calculation helpers for daily EOD records.
// adjusted_close must be verified against the vendor's adjustment policy.
(function(root,factory){const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.SeasonalityEngine=api;})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
function monthlyReturns(rows){
 const daily=new Map();
 for(const r of rows){
  const date=String(r.date||"").slice(0,10),price=Number(r.adjusted_close);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(price)||price<=0)continue;
  const d=new Date(date+"T00:00:00Z");
  if(Number.isNaN(d.valueOf())||d.toISOString().slice(0,10)!==date)continue;
  daily.set(date,price);
 }
 const last=new Map();
 for(const [date,price] of [...daily].sort((a,b)=>a[0].localeCompare(b[0])))last.set(date.slice(0,7),{date,price});
 const out=[];
 for(const [key,cur] of [...last].sort((a,b)=>a[0].localeCompare(b[0]))){
  const y=Number(key.slice(0,4)),m=Number(key.slice(5,7));
  const prev=last.get(m===1?(y-1)+"-12":y+"-"+String(m-1).padStart(2,"0"));
  if(prev)out.push({year:y,month:m,lastDate:cur.date,returnPct:(cur.price/prev.price-1)*100});
 }
 return out;
}
function summary(returns,month,years,asOfYear){
 if(!Number.isInteger(month)||month<1||month>12||!Number.isInteger(years)||years<1||!Number.isInteger(asOfYear))throw new RangeError("Invalid summary parameters");
 const observations=returns.filter(r=>r.month===month&&r.year<=asOfYear&&r.year>asOfYear-years&&Number.isFinite(r.returnPct)).sort((a,b)=>a.year-b.year);
 const count=observations.length;
 const values=observations.map(r=>r.returnPct).sort((a,b)=>a-b);
 const medianReturnPct=count?(count%2?values[(count-1)/2]:(values[count/2-1]+values[count/2])/2):null;
 const averageReturnPct=count?values.reduce((sum,v)=>sum+v,0)/count:null;
 // Leave-one-out influence: show the observation with the largest absolute effect on the mean.
 // The 2 percentage-point display threshold is provisional and needs validation.
 const influences=count>=5?observations.map(r=>{
  const averageWithoutPct=(averageReturnPct*count-r.returnPct)/(count-1);
  return {year:r.year,returnPct:r.returnPct,averageWithoutPct,shiftPp:Math.abs(averageReturnPct-averageWithoutPct)};
 }).sort((a,b)=>b.shiftPp-a.shiftPp||a.year-b.year):[];
 const influentialYear=influences.length&&influences[0].shiftPp>=2?influences[0]:null;
 return {month,yearsRequested:years,yearsAvailable:count,complete:count===years,winningYears:observations.filter(r=>r.returnPct>0).length,averageReturnPct,medianReturnPct,influentialYear,observations};
}
return {monthlyReturns,summary};
});
