// Presentation controller only. Catalog filters and the fixed sample stay independent.
(() => {
'use strict';
const $=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const stage=$('#statistics-stage');if(!stage)return;
const nodes={annual:$('#annual-chart'),category:$('#category-chart'),representation:$('#representation-chart')};
const homes=new Map(Object.values(nodes).map(n=>[n,{parent:n.parentNode,next:n.nextSibling}]));
const labels={
 primary_representation:{explicit_mesh:'직접 메시',gaussian:'Gaussian',hybrid:'혼합 표현',image2d:'2D 영상',implicit_surface:'암시적 표면',not_applicable:'해당 없음',parametric_mesh:'매개변수 메시',point_cloud:'점군',pointmap:'포인트맵',radiance_field:'NeRF·신경장',skeleton3d:'3D 골격',texture_uv:'UV 텍스처',unknown:'미상'},
 primary_task:{appearance_avatar_reconstruction:'외형·아바타 복원',generation_editing:'생성·편집',generic3d:'일반 3D',geometry_reconstruction:'표면·기하 복원',mixed_primary:'복합 과제',observed_motion_reconstruction:'관측 동작 복원',pose_shape_estimation:'자세·체형 추정',rendering_only:'렌더링',supporting_resource:'기반 자료·모듈',unknown:'미상'}
};
let chart='annual',field='primary_representation',core=null,loadPromise=null,revision=0,origin=null,tab='numbers',selection=null,evidencePage=0;
const fmt=n=>Number(n).toFixed(1),name=(f,k)=>labels[f]?.[k]||k;
const metric=(p,f,k)=>core.metrics.find(r=>r[0]===core.enums.period_names.indexOf(p)&&r[1]===core.enums.fields.indexOf(f)&&r[2]===core.enums.labels[f].indexOf(k));
const textSelection=()=>$('#statistics-denominator')?.textContent||'목록을 불러오는 중입니다.';
const basis=()=>$('#basis').selectedOptions[0]?.textContent||'';
async function load(){if(!loadPromise)loadPromise=fetch('data/research-analysis-v1.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(d=>core=d).catch(e=>{loadPromise=null;throw e;});return loadPromise;}
function animate(){
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 stage.getAnimations().forEach(a=>a.cancel());
 stage.animate([{opacity:.25,transform:'translateY(7px)'},{opacity:1,transform:'translateY(0)'}],{duration:200,easing:'ease-out'});
}
function syncYear(){const original=$('#year');$('#statistics-year').innerHTML=original.innerHTML;$('#statistics-year').value=original.value;}
function parkTables(){for(const n of stage.querySelectorAll(':scope>.chart-values'))$('#statistics-sources').append(n);}
function adjustAxes(){if(chart!=='annual')return;const ticks=[...nodes.annual.querySelectorAll('svg text')].filter(n=>/^\d{4}$/.test(n.textContent));ticks.forEach((n,i)=>{n.style.visibility=innerWidth<700&&ticks.length>7&&i%2===1&&i!==ticks.length-1?'hidden':'visible';});}
function returnNodes(){parkTables();for(const n of Object.values(nodes)){const h=homes.get(n);if(n.parentNode===stage)h.parent.insertBefore(n,h.next?.parentNode===h.parent?h.next:null);}}
async function render(changed=false){
 const request=++revision;returnNodes();stage.replaceChildren();stage.dataset.chart=chart;$('#focus-year-label').hidden=chart!=='category';$('#focus-field-label').hidden=chart!=='sample';syncYear();
 const insight=$('#statistics-insight');if(chart==='sample')stage.before(insight);else stage.after(insight);
 if(chart==='sample'){
  $('#statistics-context').textContent='2019–21 / 2023–25 · 표본 각 60편 · 모집틀 287 / 688편 · AI 초록 분류';
  $('#statistics-insight').textContent='조건부 표본의 판정 비율입니다. 미상도 포함하며 실제 기술 사용률·분야 전체 점유율이 아닙니다.';
  stage.textContent='표본 분석을 불러오는 중입니다.';
  try{await load();if(request!==revision)return;stage.innerHTML=samplePlot();
   $('#statistics-insight').textContent=field==='primary_representation'?'주표현 미상 41.7% → 29.9%. 보수적 95% 구간이 넓어 세대교체는 확정하지 않습니다. 확인 0건은 실제 미사용이 아닙니다.':'보수적 95% 구간이 넓어 과제 전환을 확정하지 않습니다. 미상도 분모에 포함합니다.';
  }catch(e){if(request===revision)stage.textContent='분석을 불러오지 못했습니다. 잠시 후 다시 선택해 주세요.';}
 }else{
  stage.append(nodes[chart]);$('#statistics-context').textContent=textSelection();
  const selected=$('#statistics-selection').textContent;
  const notes={annual:'2026년은 10월 20일까지의 부분 연도입니다. 이 수집 목록만으로 분야 전체 성장·감소를 단정하지 않습니다.',category:'각 논문의 주분류 하나씩 집계합니다. 주제 분류와 실제 방법의 사용 비율은 다릅니다.',representation:'여러 표현의 언급을 중복 집계합니다. 미언급은 실제 미사용이 아니며, 셀을 누르면 수치를 확인합니다.'};
  $('#statistics-insight').textContent=notes[chart]+(selected&&selected!=='검색어 없음'?' · '+selected:'');
 }
 adjustAxes();if(changed)animate();
}
function samplePlot(){
 const keys=field==='primary_representation'?['gaussian','parametric_mesh','radiance_field','implicit_surface','hybrid','unknown']:['appearance_avatar_reconstruction','pose_shape_estimation','geometry_reconstruction','mixed_primary','generation_editing','unknown'];
 return `<div class="focus-estimates">${keys.map(k=>`<div class="focus-estimate-row"><h3>${esc(name(field,k))}</h3><div class="focus-estimate-pair">${['2019_2021','2023_2025'].map((p,i)=>{const r=metric(p,field,k),x=v=>6+1.88*v,c=i?'#284dc3':'#188b91';return `<button class="focus-estimate" data-focus-evidence="${k}" data-focus-period="${p}" aria-label="${i?'2023–2025':'2019–2021'} ${esc(name(field,k))}, ${fmt(r[6])}%, 95% 구간 ${fmt(r[7])}–${fmt(r[8])}%, 확인 ${r[5]}/${r[4]}편"><span>${i?'2023–25':'2019–21'}<strong>${fmt(r[6])}%</strong></span><svg viewBox="0 0 200 24" preserveAspectRatio="none" aria-hidden="true"><line x1="6" x2="194" y1="12" y2="12" stroke="#e3ebf1"/><rect x="6" y="8" height="8" width="${r[6]*1.88}" fill="${c}" opacity=".2"/><line x1="${x(r[7])}" x2="${x(r[8])}" y1="12" y2="12" stroke="${c}" stroke-width="2"/><path d="M${x(r[7])},7v10M${x(r[8])},7v10" stroke="${c}"/><circle cx="${x(r[6])}" cy="12" r="4" fill="${c}"/></svg><small>95% ${fmt(r[7])}–${fmt(r[8])}% · 확인 ${r[5]}/${r[4]}편</small></button>`;}).join('')}</div></div>`).join('')}</div>`;
}
function ensureDialog(){
 let d=$('#statistics-dialog');if(d)return d;
 d=document.createElement('dialog');d.id='statistics-dialog';d.setAttribute('aria-labelledby','statistics-detail-title');
 d.innerHTML='<button class="statistics-close" aria-label="상세 닫기">×</button><h2 id="statistics-detail-title"></h2><nav class="statistics-detail-tabs" aria-label="상세 내용"><button data-focus-tab="numbers">수치</button><button data-focus-tab="evidence">근거 논문</button><button data-focus-tab="method">산출 방법</button></nav><div id="statistics-detail-content"></div>';
 document.body.append(d);d.querySelector('.statistics-close').onclick=()=>d.close();d.addEventListener('close',()=>{(origin?.isConnected?origin:$('#statistics-inspect')).focus({preventScroll:true});});return d;
}
function openDetail(which,button,chosen=null){origin=button;tab=which;selection=chosen;evidencePage=0;const d=ensureDialog();detailContent();if(!d.open)d.showModal();d.querySelector('.statistics-close').focus();}
function sampleRows(){
 const f=selection?.field||field,p=selection?.period||'2019_2025',k=selection?.label,fi=core.enums.fields.indexOf(f),li=k==null?null:core.enums.labels[f].indexOf(k);
 return {rows:core.papers.filter(r=>core.period_years[p].includes(r[2])&&(li==null||r[6+fi]===li)),denominator:core.papers.filter(r=>core.period_years[p].includes(r[2])).length,f,p};
}
function sampleNumbers(){
 return `<p>모집틀 1,099편 · AI 초록 분류 140편. 가중 추정과 표본 확인 건수는 다른 값입니다.</p><div class="focus-detail-scroll"><table><thead><tr><th>시기</th><th>분류</th><th>추정</th><th>95% 구간</th><th>확인 / 표본</th></tr></thead><tbody>${core.metrics.filter(r=>[7,8].includes(r[0])&&r[1]===core.enums.fields.indexOf(field)).map(r=>{const p=core.enums.period_names[r[0]],k=core.enums.labels[field][r[2]];return `<tr><td>${p.replaceAll('_','–')}</td><td>${esc(name(field,k))}</td><td>${fmt(r[6])}%</td><td>${fmt(r[7])}–${fmt(r[8])}%</td><td><button data-focus-evidence="${k}" data-focus-period="${p}">${r[5]} / ${r[4]}편</button></td></tr>`;}).join('')}</tbody></table></div>`;
}
function sampleEvidence(){
 const {rows,denominator,f,p}=sampleRows(),pages=Math.max(1,Math.ceil(rows.length/12));evidencePage=Math.max(0,Math.min(pages-1,evidencePage));
 return `<p>${esc(p.replaceAll('_','–'))} · ${selection?.label?esc(name(f,selection.label)):'전체 범주'}: 확인 ${rows.length} / 표본 ${denominator}편. 모집틀 전부를 분류한 목록이 아닙니다.</p>${rows.length?rows.slice(evidencePage*12,evidencePage*12+12).map(r=>`<article class="focus-paper"><button data-detail="${esc(r[0])}">${esc(r[1])}</button><p>${r[2]} · ${esc(name(f,core.enums.labels[f][r[6+core.enums.fields.indexOf(f)]]))}</p><blockquote lang="en">${esc(r[14])}</blockquote><div class="focus-paper-links"><a href="${esc(r[11])}" target="_blank" rel="noopener">Paper</a><a href="${esc(r[12])}" target="_blank" rel="noopener">판정 근거</a></div></article>`).join(''):'<p>이 범주로 확인한 표본이 0편입니다. 실제 미사용을 뜻하지 않습니다.</p>'}<nav class="statistics-pagination"><button data-focus-page="-1" ${evidencePage===0?'disabled':''}>이전</button><span>${evidencePage+1} / ${pages}</span><button data-focus-page="1" ${evidencePage===pages-1?'disabled':''}>다음</button></nav>`;
}
function flatten(html){const t=document.createElement('div');t.innerHTML=html;for(const summary of t.querySelectorAll('summary')){const h=document.createElement('h4');h.textContent=summary.textContent;summary.replaceWith(h);}for(const details of [...t.querySelectorAll('details')].reverse()){const div=document.createElement('div');div.append(...details.childNodes);details.replaceWith(div);}return t.innerHTML;}
function catalogNumbers(){
 const source=$('#'+({annual:'annual-chart-values',category:'category-chart-values',representation:'representation-chart-values'}[chart])),table=source?.querySelector('table');
 const heat=chart==='representation'?`<label for="focus-heat-choice">표현 선택</label><select id="focus-heat-choice">${$('#heat-representation').innerHTML}</select>`:'';
 const copy=table?.cloneNode(true);if(copy)for(const n of [copy,...copy.querySelectorAll('[id]')])n.removeAttribute('id');
 return `<p>${esc(textSelection())}</p>${heat}<div class="focus-detail-scroll">${copy?.outerHTML||'<p>집계를 불러오는 중입니다.</p>'}</div>`;
}
function detailContent(){
 const body=$('#statistics-detail-content');if(!body)return;$('#statistics-detail-title').textContent=chart==='sample'?'초록 표본 분석':$('#statistics-chart').selectedOptions[0].textContent;
 for(const b of document.querySelectorAll('[data-focus-tab]'))b.setAttribute('aria-pressed',String(b.dataset.focusTab===tab));
 if(chart==='sample'){
  if(!core){body.textContent='분석을 불러오는 중입니다.';return;}
  if(tab==='numbers')body.innerHTML=sampleNumbers();
  if(tab==='evidence')body.innerHTML=sampleEvidence();
  if(tab==='method'){
   const method=$('#research-analysis-root .analysis-method');
   body.innerHTML='<p>2019–2025년 조건부 모집틀 1,099편 / 확률표본 140편. 아래 내용은 현재 목록 집계와 별개입니다.</p>'+flatten(method?.innerHTML||'<p>AI 1회 초록 분류이며 사람 검증이 아닙니다. 미상도 분모에 포함합니다. exact/Bonferroni 95% 구간은 자료 누락·판독 오류를 포함하지 않습니다.</p>');
   body.innerHTML+='<h3>초록 확보와 표본 범위</h3><div class="focus-detail-scroll"><table><thead><tr><th>연도</th><th>기존 목록</th><th>초록 확보</th><th>식별 보류</th><th>모집틀</th><th>표본</th></tr></thead><tbody>'+core.coverage_by_year.map(c=>`<tr><td>${c.year}</td><td>${c.all_reference}</td><td>${c.abstract_available}</td><td>${c.identity_excluded_with_abstract}</td><td>${c.eligible_population}</td><td>${c.sample_n}</td></tr>`).join('')+'</tbody></table></div>';
  }
 }else{
  if(tab==='numbers')body.innerHTML=catalogNumbers();
  if(tab==='evidence')body.innerHTML=`<p>${esc(textSelection())}</p><p>선택한 검색어·주제·연도·날짜 기준을 유지한 논문 목록에서 개별 Paper 링크를 확인할 수 있습니다.</p><button id="focus-open-catalog">현재 조건의 논문 보기</button><p><a href="data/reference.json" target="_blank" rel="noopener">기존 수집 목록 JSON</a> · <a href="data/candidates.json" target="_blank" rel="noopener">검색 자료 전체 JSON</a></p>`;
  if(tab==='method')body.innerHTML=`<p>현재 목록에서 선택한 문헌의 레코드 집계입니다. 제목·초록을 의미로 읽은 확률표본 분석과 분모가 다릅니다.</p><label for="focus-basis">날짜 기준</label><select id="focus-basis">${$('#basis').innerHTML}</select><p>날짜를 확인한 레코드만 연도별로 셉니다. 미확인 월·일을 임의로 채우지 않습니다. 2026은 10월 20일까지의 부분 연도입니다.</p><p>${esc($('#annual-note').textContent)}</p><p>주제는 주분류 하나씩, 표현은 여러 자동 추출 단서를 중복 집계합니다. 표현 언급은 주 방법·실제 사용률·방법의 우수성을 뜻하지 않습니다. 자료 누락과 관련성 미확인이 있어 분야 전체 성장으로 일반화하지 않습니다.</p><p><a href="about.html#statistics" target="_blank" rel="noopener">날짜와 집계 기준</a></p>`;
 }
 if($('#focus-heat-choice'))$('#focus-heat-choice').value=$('#heat-representation').value;
 if($('#focus-basis'))$('#focus-basis').value=$('#basis').value;
}
$('#statistics-chart').onchange=e=>{chart=e.target.value;selection=null;render(true);};
$('#statistics-field').onchange=e=>{field=e.target.value;selection=null;render(true);};
$('#statistics-year').onchange=e=>{$('#year').value=e.target.value;$('#year').dispatchEvent(new Event('change'));};
$('#statistics-inspect').onclick=e=>openDetail('numbers',e.currentTarget);
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-focus-tab],[data-focus-evidence],[data-focus-page],#focus-open-catalog');if(!b)return;
 if(b.dataset.focusTab){tab=b.dataset.focusTab;detailContent();}
 if(b.hasAttribute('data-focus-evidence'))openDetail('evidence',b,{period:b.dataset.focusPeriod,field,label:b.dataset.focusEvidence});
 if(b.hasAttribute('data-focus-page')){evidencePage+=Number(b.dataset.focusPage);detailContent();$('#statistics-dialog').scrollTop=0;}
 if(b.id==='focus-open-catalog'){$('#statistics-dialog').close();location.hash='catalog';}
});
document.addEventListener('change',e=>{
 if(e.target.id==='focus-heat-choice'){$('#heat-representation').value=e.target.value;$('#heat-representation').dispatchEvent(new Event('change'));detailContent();}
 if(e.target.id==='focus-basis'){$('#basis').value=e.target.value;$('#basis').dispatchEvent(new Event('change'));detailContent();}
});
stage.addEventListener('click',e=>{
 const cell=e.target.closest('[data-heat-value]');if(cell){openDetail('numbers',cell);const note=document.createElement('p');note.textContent=cell.dataset.heatValue;$('#statistics-detail-content').prepend(note);}
});
stage.addEventListener('keydown',e=>{if(e.target.matches('[data-heat-value]')&&['Enter',' '].includes(e.key)){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}));}});
new MutationObserver(()=>{if(chart!=='sample'){syncYear();$('#statistics-context').textContent=textSelection();if(location.hash==='#trends')animate();}}).observe($('#statistics-denominator'),{childList:true,subtree:true,characterData:true});
new MutationObserver(()=>{parkTables();adjustAxes();}).observe(stage,{childList:true,subtree:true});
addEventListener('hashchange',()=>{if(location.hash==='#trends')render(false);});
render(false);
})();
