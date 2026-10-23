/* Reader-visible date semantics. Missing days are never filled in. */
globalThis.ArchiveModel=(()=>{
 const dateOf=(r,basis)=>r.d?.[basis]||(Number.isFinite(r.y?.[basis])?{value:String(r.y[basis]),precision:'year',kind:basis,status:'year_only'}:null);
 const precision={day:0,month:1,year:2};
 function compareDates(a,b,basis,direction='new'){
  const x=dateOf(a,basis),y=dateOf(b,basis);if(!x||!y)return (x?0:1)-(y?0:1)||a.t.localeCompare(b.t);
  const sign=direction==='old'?1:-1,year=sign*(Number(x.value.slice(0,4))-Number(y.value.slice(0,4)));
  if(year)return year;
  // Unknown parts cannot be called newer/older than known dates in the same year.
  const group=(precision[x.precision]??3)-(precision[y.precision]??3);if(group)return group;
  return sign*x.value.localeCompare(y.value)||a.t.localeCompare(b.t);
 }
 const resourceLabel=l=>l.kind==='code'?(l.state==='repository_only'?'GitHub · 구현 미공개':'GitHub'):l.kind==='project'?'Project':l.kind==='huggingface'?({model:'HF Model',dataset:'HF Dataset',demo:'HF Demo'}[l.role]||'Hugging Face'):'Paper';
 return {dateOf,compareDates,resourceLabel};
})();
