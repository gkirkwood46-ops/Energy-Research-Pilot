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
 return {month,yearsRequested:years,yearsAvailable:count,complete:count===years,winningYears:observations.filter(r=>r.returnPct>0).length,averageReturnPct:count?observations.reduce((s,r)=>s+r.returnPct,0)/count:null,observations};
}
return {monthlyReturns,summary};
});
