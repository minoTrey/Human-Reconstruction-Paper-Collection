// Conditional-frame analysis: no full abstracts or catalog mutations.
(() => {
'use strict';
const $=s=>document.querySelector(s), esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const names={
 primary_task:{appearance_avatar_reconstruction:'외형·아바타 복원',generation_editing:'생성·편집',generic3d:'일반 3D',geometry_reconstruction:'표면·기하 복원',mixed_primary:'복합 과제',observed_motion_reconstruction:'관측 동작 복원',pose_shape_estimation:'자세·체형 추정',rendering_only:'렌더링',supporting_resource:'기반 자료·모듈',unknown:'미상'},
 primary_representation:{explicit_mesh:'직접 메시',gaussian:'Gaussian',hybrid:'혼합 표현',image2d:'2D 영상',implicit_surface:'암시적 표면',not_applicable:'해당 없음',parametric_mesh:'매개변수 메시',point_cloud:'점군',pointmap:'포인트맵',radiance_field:'NeRF·신경장',skeleton3d:'3D 골격',texture_uv:'UV 텍스처',unknown:'미상'}
};
const palette=['#2456ab','#36877e','#8a68a7','#bf793c','#4d849f','#a36e78','#6b75ab','#778941','#a8794d','#4f7b74','#8281a1','#6c8ea0'];
let data=null,promise=null,field='primary_representation',evidence=[],evidencePage=0,origin=null,reference=null,evidenceRequest=0;
const size=12,fmt=n=>Number(n).toFixed(1),label=(f,k)=>names[f]?.[k]||k;
const fieldIndex=f=>data.enums.fields.indexOf(f),labelIndex=(f,k)=>data.enums.labels[f].indexOf(k);
const periodIndex=p=>data.enums.period_names.indexOf(p);
const metric=(p,f,k)=>data.metrics.find(r=>r[0]===periodIndex(p)&&r[1]===fieldIndex(f)&&r[2]===labelIndex(f,k));
const col=f=>6+fieldIndex(f);
const selected=(p,f,k)=>data.papers.filter(r=>data.period_years[p].includes(r[2])&&(k==null||r[col(f)]===labelIndex(f,k)));
const primaryLabels=f=>f==='primary_representation'?['gaussian','parametric_mesh','radiance_field','implicit_surface','hybrid','unknown']:['appearance_avatar_reconstruction','pose_shape_estimation','geometry_reconstruction','mixed_primary','generation_editing','unknown'];
const color=(f,k)=>k==='unknown'?'#b7c0c9':palette[data.enums.labels[f].indexOf(k)%12];
async function load(){
 if(!promise)promise=fetch('data/research-analysis-v1.json').then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json();}).then(d=>{data=d;return d;}).catch(e=>{promise=null;throw e;});
 return promise;
}
function axisSelect(){return `<label class="analysis-axis">분석 축<select id="analysis-axis"><option value="primary_representation" ${field==='primary_representation'?'selected':''}>주표현</option><option value="primary_task" ${field==='primary_task'?'selected':''}>과제</option></select></label>`;}
function render(){
 const host=$('#research-analysis-root');if(!host||!data)return;
 const g0=metric('2019_2021','primary_representation','gaussian'),g1=metric('2023_2025','primary_representation','gaussian');
 const u0=metric('2019_2021','primary_representation','unknown'),u1=metric('2023_2025','primary_representation','unknown');
 host.innerHTML=`<div class="section-head"><div><h2 id="analysis-trend-title">복원 연구, 무엇이 달라졌나</h2><p>2019–2025년, 초록에서 확인한 과제와 표현의 변화</p></div><a class="quiet-link" href="#catalog">논문으로 돌아가기</a></div>
 <div class="analysis-intro"><p>Gaussian 판정은 표본 <button data-analysis-period="2019_2021" data-analysis-field="primary_representation" data-analysis-label="gaussian">${g0[5]}/${g0[4]}편</button> → <button data-analysis-period="2023_2025" data-analysis-field="primary_representation" data-analysis-label="gaussian">${g1[5]}/${g1[4]}편</button> · 가중 추정 ${fmt(g0[6])}% → ${fmt(g1[6])}% · 넓은 구간 · 세대교체 단정 불가</p>
 <p class="analysis-caveat">주표현 미상 ${fmt(u0[6])}% → ${fmt(u1[6])}% · 제목·초록 판정 비율 · 실제 사용률·분야 점유율 아님</p></div>
 <div class="analysis-context"><p><strong>모집틀 ${data.snapshot.frame_N.toLocaleString()}편 · 확률표본 ${data.snapshot.sample_n}편</strong><span>매년 20편 · 색인 연도 기준 · 2026 제외</span></p>${axisSelect()}</div>
 <p class="analysis-context-note">목록 검색과 별개인 고정 표본 분석</p>
 <article class="analysis-chart" aria-labelledby="analysis-annual-title"><h3 id="analysis-annual-title">연도별 ${field==='primary_representation'?'주표현':'과제'} 구성</h3><p>출처 층화 가중 추정 · 연도: 표본 20편 · 범주: 해당 표본</p><div class="analysis-scale"><span>0%</span><span>50%</span><span>100%</span></div><div id="analysis-annual"></div><div class="analysis-legend">${data.enums.labels[field].map(k=>`<button data-analysis-period="2019_2025" data-analysis-field="${field}" data-analysis-label="${k}"><i style="background:${color(field,k)}"></i>${esc(label(field,k))}</button>`).join('')}</div>${annualTable()}</article>
 <article class="analysis-chart" aria-labelledby="analysis-period-title"><div class="chart-head"><h3 id="analysis-period-title">두 시기의 비교와 불확실성</h3><span>2019–21 / 2023–25</span></div><p>시기별 표본 60편 · 모집틀 287 / 688편 · 축 0–100% · 점: 가중 추정 · 선: 보수적 95% 구간 · 숫자: 근거 논문</p>${comparison(primaryLabels(field))}<section class="analysis-extra"><h4>나머지 범주도 보기</h4>${comparison(data.enums.labels[field].filter(k=>!primaryLabels(field).includes(k)))}</section><p class="analysis-footnote">확인 0 ≠ 실제 미사용 · 주 구간 exact/Bonferroni · 오분류·자료 누락 편향 제외</p></article>
 <article class="analysis-chart" aria-labelledby="analysis-coverage-title"><h3 id="analysis-coverage-title">어떤 자료를 분류했나</h3><p>초록 확보·식별 보류 제외 집합에서 추출 · 각 행의 분모: 해당 연도 기존 목록 전체</p><div class="coverage-legend"><span><i style="background:#2456ab"></i>표본</span><span><i style="background:#b8cbe7"></i>나머지 모집틀</span><span><i style="background:#bf793c"></i>식별 보류</span><span><i style="background:#e2e7ed"></i>초록 미확보</span></div>${coverage()}<p class="analysis-footnote">2026년 기존 목록은 ${host.dataset.partialCount}편 · 10/20 부분 연도 · 비교에서 제외</p></article>
 <section class="analysis-method"><h4>자료·추정 방법과 한계</h4>${methods()}</section>`;
 $('#analysis-annual').innerHTML=data.coverage_by_year.map(c=>`<div class="analysis-year"><span>${c.year}<small>표본 20 / 모집틀 ${c.eligible_population}</small></span><button class="analysis-stack" data-analysis-period="year_${c.year}" data-analysis-field="${field}" aria-label="${c.year}년 ${field==='primary_representation'?'주표현':'과제'} 표본 20편 보기">${data.enums.labels[field].map(k=>{const r=metric('year_'+c.year,field,k);return r[6]?`<span style="width:${r[6]}%;background:${color(field,k)}" title="${esc(label(field,k))}: ${fmt(r[6])}%"></span>`:'';}).join('')}</button></div>`).join('');
}
function annualTable(){
 return `<section class="analysis-extra"><h4>연도별 수치·95% 구간</h4><div class="analysis-table-scroll"><table><thead><tr><th>연도</th><th>범주</th><th>가중 추정</th><th>95% 구간</th><th>표본에서 확인</th></tr></thead><tbody>${data.metrics.filter(r=>r[0]<7&&r[1]===fieldIndex(field)).map(r=>{const k=data.enums.labels[field][r[2]],p=data.enums.period_names[r[0]];return `<tr><td>${data.period_years[p][0]}</td><td>${esc(label(field,k))}</td><td>${fmt(r[6])}%</td><td>${fmt(r[7])}–${fmt(r[8])}%</td><td><button data-analysis-period="${p}" data-analysis-field="${field}" data-analysis-label="${k}">${r[5]} / ${r[4]}편</button></td></tr>`;}).join('')}</tbody></table></div></section>`;
}
function intervalSvg(r){
 const x=v=>6+v*1.88;
 return `<svg viewBox="0 0 200 24" preserveAspectRatio="none" aria-hidden="true"><line x1="6" x2="194" y1="12" y2="12" stroke="#e2e7ed"/><line x1="${x(r[7])}" x2="${x(r[8])}" y1="12" y2="12" stroke="currentColor" stroke-width="2"/><path d="M${x(r[7])},7v10M${x(r[8])},7v10" stroke="currentColor"/><circle cx="${x(r[6])}" cy="12" r="4" fill="currentColor"/></svg>`;
}
function comparison(labels){
 return labels.map(k=>`<div class="estimate-row"><h4>${esc(label(field,k))}</h4><div class="estimate-pair">${['2019_2021','2023_2025'].map((p,i)=>{const r=metric(p,field,k);return `<button class="estimate estimate-${i}" data-analysis-period="${p}" data-analysis-field="${field}" data-analysis-label="${k}"><span>${i?'2023–25':'2019–21'}<strong>${fmt(r[6])}%</strong></span>${intervalSvg(r)}<small>95% ${fmt(r[7])}–${fmt(r[8])}%</small><small>확인 ${r[5]}/${r[4]}편</small></button>`;}).join('')}</div></div>`).join('');
}
function coverage(){
 return `<div class="coverage-rows">${data.coverage_by_year.map(c=>{const missing=c.all_reference-c.abstract_available;const rest=c.eligible_population-c.sample_n;return `<div class="coverage-row"><div><strong>${c.year}</strong><span>기존 목록 ${c.all_reference}편</span></div><button class="coverage-stack" data-analysis-coverage="${c.year}" aria-label="${c.year} 모집틀 ${c.eligible_population}편의 논문 보기"><i style="width:${c.sample_n/c.all_reference*100}%;background:#2456ab"></i><i style="width:${rest/c.all_reference*100}%;background:#b8cbe7"></i><i style="width:${c.identity_excluded_with_abstract/c.all_reference*100}%;background:#bf793c"></i><i style="width:${missing/c.all_reference*100}%;background:#e2e7ed"></i></button><p>초록 ${c.abstract_available} · 보류 ${c.identity_excluded_with_abstract} · 모집틀 ${c.eligible_population} · 표본 ${c.sample_n}</p></div>`;}).join('')}</div><section class="analysis-extra"><h4>범위·출처를 바꾸면</h4><p>직접 복원 주과제 / 기반 모듈 포함 범위의 보조 비교 · 넓은 조건부 구간 · 확정 결론 아님</p><div class="analysis-table-scroll"><table><thead><tr><th>시기</th><th>범위</th><th>표본 포함</th><th>가중 추정</th><th>95% 구간</th></tr></thead><tbody>${data.cohort_sensitivity.filter(c=>!c.field).map(c=>`<tr><td>${c.period.replaceAll('_','–')}</td><td>${c.cohort==='narrow_cohort'?'직접 복원 주과제':'기반 모듈까지'}</td><td>${c.observed_n}/${c.n}</td><td>${fmt(c.weighted_share_pct)}%</td><td>${c.exact95.map(fmt).join('–')}%</td></tr>`).join('')}</tbody></table></div><p>출처별 Gaussian 판정</p><div class="analysis-table-scroll"><table><thead><tr><th>시기</th><th>초록 출처</th><th>모집틀 / 표본</th><th>판정 / 표본</th><th>가중 추정 · 95% 구간</th></tr></thead><tbody>${data.source_sensitivity.filter(r=>r[2]===3&&r[3]===1).map(r=>`<tr><td>${r[0]===7?'2019–21':'2023–25'}</td><td>${r[1]?'OpenAlex':'arXiv'}</td><td>${r[4]} / ${r[5]}</td><td>${r[6]} / ${r[5]}</td><td>${fmt(r[7])}% · ${fmt(r[8])}–${fmt(r[9])}%</td></tr>`).join('')}</tbody></table></div></section>`;
}
function methods(){
 const s=data.unknown_allocation_sensitivity.rows.find(r=>r.label==='gaussian');
 return `<p><strong>범위</strong> · 2019–2025 색인 연도 · 초록 확보·식별 보류 제외 모집틀 1,099편</p>
 <p><strong>표본</strong> · 연도×출처 14층 · 출처별 비례 배분·무복원 무작위 · 140편, 연도별 20편 · 별도 목적표본 30·32편 미합산</p>
 <p><strong>분류</strong> · AI 초록 1회 · 사람·전편 본문 검증 아님 · 제목·초록 맥락 4건 포함 · 분모에 미상 포함</p>
 <p><strong>주표현</strong> · 자체 인체 방법의 표현 · 입력·가이드·비교 방법·diffusion 사전 정보와 구분</p>
 <p><strong>가중치·구간</strong> · 층별 Nh/nh · 층별 exact hypergeometric + Bonferroni 95% · 범주별 구간 · 전체 범주 동시 95% 보장 아님</p>
 <p><strong>오차 범위</strong> · 표본추출 오차만 · 검색·초록 누락·오분류 제외</p>
 <p><strong>보조 구간</strong> · 사후 추가 Hoeffding · 주 구간 대체 아님</p>
 <p><strong>미상 민감도</strong> · Gaussian 배정의 두 극단 · 기간 차이 ${fmt(s.difference_identification_low_pp)}~${fmt(s.difference_identification_high_pp)}pp · <strong>신뢰구간 아님</strong> · 표본오차·오분류·초록 누락 미포함</p>
 <section><h4>보조 구간과 시기 차이</h4><div class="analysis-table-scroll"><table><thead><tr><th>범주</th><th>뒤 시기−앞 시기</th><th>주 95% 구간</th><th>사후 Hoeffding 95%</th></tr></thead><tbody>${data.contrasts_2019_2021_to_2023_2025.filter(r=>r[0]===3).map(r=>`<tr><td>${esc(label('primary_representation',data.enums.labels.primary_representation[r[1]]))}</td><td>${fmt(r[2])}pp</td><td>${fmt(r[3])}~${fmt(r[4])}pp</td><td>${fmt(r[5])}~${fmt(r[6])}pp</td></tr>`).join('')}</tbody></table></div></section>`;
}

function dialog(){
 let d=$('#analysis-evidence-dialog');if(d)return d;
 d=document.createElement('dialog');d.id='analysis-evidence-dialog';d.setAttribute('aria-labelledby','analysis-evidence-title');
 d.innerHTML='<button class="analysis-close" aria-label="근거 목록 닫기">×</button><h2 id="analysis-evidence-title"></h2><p id="analysis-evidence-note"></p><div id="analysis-evidence-list"></div><nav aria-label="근거 논문 페이지"><button data-analysis-page="-1">이전</button><span id="analysis-evidence-page"></span><button data-analysis-page="1">다음</button></nav>';
 document.body.append(d);d.querySelector('.analysis-close').onclick=()=>d.close();d.addEventListener('close',()=>{evidenceRequest++;origin?.focus();});return d;
}
function renderEvidence(){
 $('#analysis-evidence-list').innerHTML=evidence.slice(evidencePage*size,(evidencePage+1)*size).map(r=>`<article><button class="analysis-paper-title" data-detail="${esc(r.id)}">${esc(r.title)}</button>${r.tag?`<p>${esc(r.tag)}</p>`:''}${r.excerpt?`<blockquote lang="en">${esc(r.excerpt)}</blockquote>`:''}<div>${r.paper?`<a href="${esc(r.paper)}" target="_blank" rel="noopener">Paper</a>`:''}</div></article>`).join('')||'<p>확인 0편 · 실제 미사용 근거 아님</p>';
 const count=Math.max(1,Math.ceil(evidence.length/size));$('#analysis-evidence-page').textContent=`${evidencePage+1} / ${count}`;
 for(const b of document.querySelectorAll('[data-analysis-page]'))b.disabled=Number(b.dataset.analysisPage)<0?evidencePage===0:evidencePage>=count-1;
}
function showEvidence(p,f,k,button){
 origin=button;evidencePage=0;evidenceRequest++;
 const rows=selected(p,f,k),all=selected(p,f,null),period=p.startsWith('year_')?p.slice(5):p.replaceAll('_','–');
 evidence=rows.map(r=>({id:r[0],title:r[1],tag:`${r[2]} · ${label(f,data.enums.labels[f][r[col(f)]])}`,excerpt:r[14],paper:r[11],source:r[12],locator:r[13]==='title'?'제목·초록 맥락':'초록'}));
 const d=dialog();$('#analysis-evidence-title').textContent=`${period} · ${k?label(f,k):'전체 범주'}`;
 $('#analysis-evidence-note').textContent=`AI 분류 확인 ${rows.length} / 표본 ${all.length}편 · 모집틀 전수 분류 아님 · 제목: 논문 상세`;
 renderEvidence();d.showModal();d.querySelector('.analysis-close').focus();
}
async function showFrame(year,button){
 origin=button;evidencePage=0;const request=++evidenceRequest;const d=dialog();$('#analysis-evidence-title').textContent=`${year}년 모집틀`;
 $('#analysis-evidence-note').textContent='확률표본의 모집틀 · 전수 분류 아님 · 논문 불러오는 중';
 $('#analysis-evidence-list').innerHTML='';d.showModal();
 try{
  if(!reference){const response=await fetch('data/reference.json');if(!response.ok)throw Error('HTTP '+response.status);reference=new Map((await response.json()).map(r=>[r.id,r]));}
  if(!d.open||request!==evidenceRequest)return;
  const ids=data.frame_strata.filter(r=>r[0]===year).flatMap(r=>r[4]);
  evidence=ids.map(id=>reference.get(id)).filter(Boolean).map(r=>({id:r.id,title:r.t,paper:r.l.find(l=>l.kind==='paper')?.u}));
  $('#analysis-evidence-note').textContent=`모집틀 ${ids.length}편 · AI 초록 확률표본 20편`;renderEvidence();
 }catch(e){if(d.open&&request===evidenceRequest)$('#analysis-evidence-note').textContent='논문 목록 로딩 실패 · 다시 열기';}
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-analysis-period],[data-analysis-coverage],[data-analysis-page]');if(!b||!data)return;
 if(b.hasAttribute('data-analysis-period'))showEvidence(b.dataset.analysisPeriod,b.dataset.analysisField,b.dataset.analysisLabel||null,b);
 if(b.hasAttribute('data-analysis-coverage'))showFrame(Number(b.dataset.analysisCoverage),b);
 if(b.hasAttribute('data-analysis-page')){evidencePage+=Number(b.dataset.analysisPage);renderEvidence();$('#analysis-evidence-dialog').scrollTop=0;$('#analysis-evidence-dialog .analysis-close').focus();}
});
document.addEventListener('change',e=>{if(e.target.id==='analysis-axis'){field=e.target.value;render();$('#analysis-axis').focus();}});
async function activate(){
 if(location.hash!=='#trends')return;
 const host=$('#research-analysis-root');if(!host||host.dataset.loaded)return;
 try{await load();render();host.dataset.loaded='true';}
 catch(e){host.innerHTML='<h2>연구 분석 로딩 실패</h2><p>다시 열기 · 목록 집계는 사용 가능</p>';}
}
addEventListener('hashchange',activate);activate();
})();
