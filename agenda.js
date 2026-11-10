/* Citihaus · Agenda por usuário: follow-ups de chamados, comercial, financeiro, contratos… */
(function(){
if(TOKEN) return;
D.agenda = D.agenda || [];
const TIPOS = [['Follow-up','🔁'],['Chamado','🎫'],['Comercial','🤝'],['Visita','🗓️'],['Financeiro','💰'],['Contrato','📄'],['Captação','🏠'],['Reunião','👥'],['Outro','📌']];
const icT = t => (TIPOS.find(x=>x[0]===t)||TIPOS[8])[1];
const DS = ['dom','seg','ter','qua','qui','sex','sáb'];
const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const hm = d => new Date(d).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'});
const segunda = d => { const x=new Date(d); x.setHours(0,0,0,0); const k=(x.getDay()+6)%7; x.setDate(x.getDate()-k); return x; };
const eu = () => S.me && S.me.nome;
const doFiltro = a => { const p=S.agPess||eu(); return p==='todos' || a.responsavel===p; };

function refInfo(a){
  if(!a.ref_tipo || !a.ref_id) return null;
  if(a.ref_tipo==='chamado'){ const h=D.chamados.find(x=>x.id===a.ref_id); return h && {t:'🎫 '+h.protocolo, attr:`data-chteam="${h.id}"`}; }
  if(a.ref_tipo==='negocio'){ const n=(D.negocios||[]).find(x=>x.id===a.ref_id); return n && {t:'🤝 '+n.nome, attr:`data-negopen="${n.id}"`}; }
  if(a.ref_tipo==='contrato'){ const c=D.contratos.find(x=>x.id===a.ref_id); return c && {t:'📄 Contrato '+c.numero, attr:`data-open="${c.id}" data-go="1"`}; }
  if(a.ref_tipo==='captacao'){ const c=(D.captacoes||[]).find(x=>x.id===a.ref_id); return c && {t:'🏠 CAP-'+String(c.numero).padStart(3,'0'), attr:`data-capopen="${c.id}"`}; }
  if(a.ref_tipo==='imovel'){ const i=D.imoveis.find(x=>x.id===a.ref_id); return i && {t:'🏠 '+i.titulo, attr:`data-imvopen="${i.id}"`}; }
  return null;
}
function item(a, compacto){
  const r=refInfo(a), atras=!a.feito_em && new Date(a.quando)<new Date();
  return `<div style="display:flex;gap:8px;align-items:flex-start;padding:8px 10px;border:1px solid ${atras?'var(--bad)':'var(--line)'};border-radius:10px;background:${a.feito_em?'var(--bg)':'var(--surface,#fff)'};margin-bottom:6px;${a.feito_em?'opacity:.6':''}">
    <button type="button" data-agok="${a.id}" title="${a.feito_em?'Reabrir':'Concluir'}" aria-label="${a.feito_em?'Reabrir':'Concluir'}" style="flex:none;width:22px;height:22px;border-radius:50%;border:2px solid ${a.feito_em?'var(--ok)':'var(--line)'};background:${a.feito_em?'var(--ok)':'transparent'};color:#fff;font-size:12px;cursor:pointer;padding:0;line-height:18px">${a.feito_em?'✓':''}</button>
    <button type="button" data-agedit="${a.id}" style="all:unset;cursor:pointer;flex:1;min-width:0">
      <div style="font-size:12px;${atras?'color:var(--bad);font-weight:700':''}" class="${atras?'':'muted'}">${compacto?hm(a.quando):new Date(a.quando).toLocaleString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})} · ${icT(a.tipo)} ${esc(a.tipo)}${(S.agPess==='todos')?' · '+esc(a.responsavel):''}</div>
      <div style="font-weight:600;font-size:13.5px;${a.feito_em?'text-decoration:line-through':''}">${esc(a.titulo)}</div></button>
    ${r?`<button type="button" class="btn sm ghost" ${r.attr} style="flex:none;font-size:11.5px;padding:3px 8px">${esc(r.t)}</button>`:''}</div>`;
}

function agendaHtml(){
  const L=D.agenda.filter(doFiltro), agora=new Date(), hoje=ymd(agora);
  const atrasados=L.filter(a=>!a.feito_em && new Date(a.quando)<agora && ymd(new Date(a.quando))<hoje).sort((a,b)=>new Date(a.quando)-new Date(b.quando));
  const ini=segunda(new Date(Date.now()+(S.agSem||0)*7*864e5)), diasW=[...Array(7)].map((_,k)=>{ const d=new Date(ini); d.setDate(d.getDate()+k); return d; });
  const doDia = d => L.filter(a=>ymd(new Date(a.quando))===ymd(d)).sort((a,b)=>new Date(a.quando)-new Date(b.quando));
  const nHoje=L.filter(a=>!a.feito_em && ymd(new Date(a.quando))===hoje).length, n7=L.filter(a=>!a.feito_em && new Date(a.quando)>agora && new Date(a.quando)-agora<7*864e5).length;
  const pessoas=(D.equipe||[]).map(e=>e.nome);
  const hr=new Date().getHours(), saud=hr<12?'Bom dia':hr<18?'Boa tarde':'Boa noite';
  const chAb=D.chamados.filter(h=>h.status!=='resolvido' && !h.arquivado_em), pz=window.chPrazoDe, ue=window.chUteisEntre;
  const chAtr=pz?chAb.filter(h=>ue(new Date(), pz(h))<0).length:0, chHoje=pz?chAb.filter(h=>ue(new Date(), pz(h))===0).length:0;
  const ng=(D.negocios||[]).filter(n=>!n.arquivado_em && !['cliente','perdido'].includes(n.etapa)), ngFu=ng.filter(n=>n.proximo_contato && n.proximo_contato<=hoje).length, ngOpp=ng.filter(n=>n.etapa==='opp').length;
  const ctAnd=D.contratos.filter(c=>c.etapa<6).length, capAnd=(D.captacoes||[]).filter(c=>c.etapa<5 && !c.arquivada_em).length;
  const card=(ic,tit,big,sub,go,alerta)=>`<button class="card" data-navgo="${go}" style="text-align:left;${alerta?'border-color:var(--bad);box-shadow:inset 3px 0 0 var(--bad)':''}"><span class="code">${ic} ${tit}</span><div style="font-family:var(--f-display);font-size:28px;font-weight:700;line-height:1.1;${alerta?'color:var(--bad)':''}">${big}</div><div class="meta">${sub}</div></button>`;
  return `<div class="head"><div><h1>🏠 ${saud}, ${esc(eu().split(' ')[0])}!</h1><p>${new Date().toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'long'})} · o que pede atenção hoje</p></div><button class="btn pri" data-agnovo="1">+ Agendar</button></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:14px">
    ${card('📅','Minha agenda', atrasados.length+nHoje, `${nHoje} hoje · ${atrasados.length} atrasado(s)`, 'agenda', atrasados.length>0)}
    ${card('🎫','Chamados', chAtr+chHoje, `${chAtr} atrasado(s) · ${chHoje} vencem hoje · ${chAb.length} abertos`, 'contratos|chamados', chAtr>0)}
    ${card('🤝','Comercial', ngFu, `follow-up(s) para hoje · ${ngOpp} oportunidade(s)`, 'contratos|comercial', false)}
    ${card('📄','Em andamento', ctAnd+capAnd, `${ctAnd} contrato(s) · ${capAnd} captação(ões)`, 'contratos|contratos', false)}
  </div>
  <h2 style="font-size:16px;margin:6px 0 8px">📅 Agenda</h2>
  <div class="row" style="gap:8px;flex-wrap:wrap;margin:0 0 12px"><div class="seg-b">${[[eu(),'👤 Minha'],...pessoas.filter(p=>p!==eu()).map(p=>[p,p.split(' ')[0]]),['todos','Todos']].map(([k,v])=>`<button data-agpess="${esc(k)}" aria-pressed="${(S.agPess||eu())===k}">${esc(v)}</button>`).join('')}</div></div>
  <div class="stats">
    <div class="stat ${atrasados.length?'hl':''}"><b style="${atrasados.length?'color:var(--bad)':''}">${atrasados.length}</b><span>atrasados</span></div>
    <div class="stat"><b>${nHoje}</b><span>para hoje</span></div>
    <div class="stat"><b>${n7}</b><span>nos próximos 7 dias</span></div>
    <div class="stat"><b>${L.filter(a=>a.feito_em && Date.now()-new Date(a.feito_em)<7*864e5).length}</b><span>concluídos na semana</span></div>
  </div>
  ${atrasados.length?`<div class="box" style="margin-top:12px;border-color:var(--bad)"><h2 style="color:var(--bad)">⏰ Atrasados (${atrasados.length})</h2>${atrasados.map(a=>item(a,false)).join('')}</div>`:''}
  <div class="row between" style="margin:16px 0 8px;gap:8px;flex-wrap:wrap"><h2 style="font-size:16px;margin:0">Semana de ${ini.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})} a ${diasW[6].toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}</h2>
    <div class="row" style="gap:6px"><button class="btn sm" data-agsem="-1">← Anterior</button><button class="btn sm ${S.agSem?'':'pri'}" data-agsem="0">Esta semana</button><button class="btn sm" data-agsem="1">Próxima →</button></div></div>
  <div class="board-scroll"><div class="board" style="grid-auto-columns:minmax(190px,1fr)">${diasW.map(d=>{ const its=doDia(d), eh=ymd(d)===hoje;
    return `<section class="col" style="${eh?'outline:2px solid var(--accent);outline-offset:-2px':''}"><div class="col-h"><div><h3>${DS[d.getDay()]} ${d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})}${eh?' · hoje':''}</h3><small>${its.filter(a=>!a.feito_em).length} pendente(s)</small></div><button class="btn sm ghost" data-agnovo="1" data-agdia="${ymd(d)}" title="Agendar neste dia" style="padding:2px 8px">+</button></div>
      ${its.length?its.map(a=>item(a,true)).join(''):'<div class="empty">Livre</div>'}</section>`; }).join('')}</div></div>`;
}

function modalAg(){
  const m=S.modal, a=m.id && D.agenda.find(x=>x.id===m.id);
  const base = a ? new Date(a.quando) : (()=>{ const d=m.dia?new Date(m.dia+'T14:00'):new Date(Date.now()+864e5); d.setHours(14,0,0,0); return d; })();
  const r = a ? refInfo(a) : (m.ref ? refInfo({ref_tipo:m.ref.split('|')[0], ref_id:m.ref.split('|')[1]}) : null);
  const tipo = a ? a.tipo : (m.tp||'Follow-up');
  const atalho=(rot,dd)=>{ const d=new Date(); d.setDate(d.getDate()+dd); if(d.getDay()===6) d.setDate(d.getDate()+2); if(d.getDay()===0) d.setDate(d.getDate()+1); return `<button type="button" class="btn sm" data-agatal="${ymd(d)}">${rot}</button>`; };
  return `<div class="ov center"><form class="modal" id="f-ag" data-id="${a?a.id:''}" data-ref="${esc(a?((a.ref_tipo||'')+'|'+(a.ref_id||'')):(m.ref||''))}" style="max-width:540px">
   <div class="m-h"><span class="mono" style="color:var(--accent-ink)">Agenda${r?' · '+esc(r.t):''}</span><h2 style="font-size:19px;margin-top:4px">${a?'✏️ Editar compromisso':'📅 Agendar'}</h2></div>
   <div class="m-b">
    <label class="f full">O que fazer<input id="ag-t" required maxlength="140" value="${esc(a?a.titulo:(m.titulo||''))}" placeholder="Ex.: Ligar para cobrar retorno da proposta"></label>
    <div class="f full">Tipo<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${TIPOS.map(([t,ic])=>`<label class="btn sm"><input type="radio" name="ag-tp" value="${t}" ${tipo===t?'checked':''} style="accent-color:var(--accent)"> ${ic} ${t}</label>`).join('')}</div></div>
    <label class="f">Data<input id="ag-d" type="date" required value="${ymd(base)}"></label>
    <label class="f">Hora<input id="ag-h" type="time" required value="${String(base.getHours()).padStart(2,'0')}:${String(base.getMinutes()).padStart(2,'0')}"></label>
    <div class="f full"><div class="row" style="gap:6px;flex-wrap:wrap">${atalho('Amanhã',1)}${atalho('Em 2 dias',2)}${atalho('Em 1 semana',7)}${atalho('Em 15 dias',15)}</div></div>
    <label class="f">Responsável<select id="ag-r">${(D.equipe||[]).map(e=>`<option ${(a?a.responsavel:eu())===e.nome?'selected':''}>${esc(e.nome)}</option>`).join('')}</select></label>
    <label class="f full">Observação<textarea class="ta" id="ag-o" rows="2">${esc(a&&a.obs||'')}</textarea></label>
    <div class="note full" id="ag-aviso" style="display:none"></div>
   </div>
   <div class="m-f">${a?`<button type="button" class="btn ghost" style="color:var(--bad)" data-agdel="${a.id}">${S.agDel===a.id?'Confirmar exclusão':'🗑 Excluir'}</button><span style="flex:1"></span>`:''}<button type="button" class="btn" data-mclose="1">Cancelar</button><button class="btn pri" type="submit">${a?'Salvar':'Agendar'}</button></div></form></div>`;
}
function avisoHora(){ const h=document.getElementById('ag-h'), d=document.getElementById('ag-d'), el=document.getElementById('ag-aviso'); if(!h||!el) return;
  const [hh]=h.value.split(':').map(Number), dia=d.value?new Date(d.value+'T12:00').getDay():1;
  const msg = hh>=12&&hh<14 ? '🍽️ Esse horário cai no almoço (12h–14h).' : hh>=17 ? '🎾 Depois das 17h. Tem certeza?' : (dia===0||dia===6) ? '📆 É fim de semana.' : '';
  el.style.display = msg?'':'none'; el.textContent = msg; }

/* bloco "Próximos follow-ups" nas gavetas */
function boxRef(tipo, id, titulo){
  const its=D.agenda.filter(a=>a.ref_tipo===tipo && a.ref_id===id && !a.feito_em).sort((a,b)=>new Date(a.quando)-new Date(b.quando));
  return `<div class="sec" id="ag-ref"><div class="row between" style="gap:8px;flex-wrap:wrap"><h3 style="margin:0">📅 Follow-up</h3><button class="btn sm pri" data-agnovo="1" data-agref="${tipo}|${id}" data-agtit="${esc(titulo)}" data-agtipo="${tipo==='chamado'?'Chamado':tipo==='negocio'?'Comercial':tipo==='contrato'?'Contrato':'Follow-up'}">+ Agendar follow-up</button></div>
    ${its.length?`<div style="margin-top:8px">${its.map(a=>item(a,false)).join('')}</div>`:'<p class="muted" style="margin:6px 0 0;font-size:13px">Nada agendado.</p>'}</div>`;
}

/* ---------- dados ---------- */
const carregarAg = carregar;
carregar = async function(){
  await carregarAg.apply(this, arguments);
  if(!S.me) return;
  try{ D.agenda = await q(sb.from('agenda').select('*').gte('quando', new Date(Date.now()-120*864e5).toISOString()).order('quando')) || []; }catch(_){ }
};

/* ---------- telas ---------- */
const modalAgO = modalHtml;
modalHtml = function(){ return S.modal && S.modal.tipo==='agenda' ? modalAg() : modalAgO(); };
const renderAg = render;
render = function(){
  renderAg.apply(this, arguments);
  if(!S.me) return;
  const nav=document.querySelector('nav.sub');
  if(nav && !nav.querySelector('[data-tab="agenda"]')){
    const pend=D.agenda.filter(a=>a.responsavel===eu() && !a.feito_em && ymd(new Date(a.quando))<=ymd(new Date())).length;
    const ref=nav.querySelector('[data-tab="dashboard"]');
    const html=`<button data-tab="agenda" aria-pressed="${S.tab==='agenda'}">📅 Agenda${pend?`<span class="tabn">${pend}</span>`:''}</button>`;
    if(ref) ref.insertAdjacentHTML('afterend', html); else nav.insertAdjacentHTML('afterbegin', html);
  }
  if(S.tab==='agenda' && nav){
    nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.tab==='agenda'));
    const w=document.querySelector('#app .wrap'); [...w.children].forEach(ch=>{ if(ch!==nav) ch.remove(); });
    w.insertAdjacentHTML('beforeend', agendaHtml());
  }
  /* gavetas: chamado, negócio, contrato */
  const ch=document.querySelector('aside.drawer[aria-label^="Chamado "]'), h=S.chTeam && D.chamados.find(x=>x.id===S.chTeam);
  if(ch && h && !ch.querySelector('#ag-ref')){ const s=ch.querySelector('.d-body > .sec'); if(s) s.insertAdjacentHTML('afterend', boxRef('chamado', h.id, 'Follow-up do chamado '+h.protocolo+' · '+h.titulo)); }
  const nd=document.getElementById('neg-drawer'), n=S.negOpen && (D.negocios||[]).find(x=>x.id===S.negOpen);
  if(nd && n && !nd.querySelector('#ag-ref')){ const s=nd.querySelector('.d-body .sec.box'); if(s) s.insertAdjacentHTML('beforebegin', boxRef('negocio', n.id, 'Retornar para '+n.nome)); }
  const cd=document.querySelector('aside.drawer[aria-label^="Contrato "]'), c=S.open && D.contratos.find(x=>x.id===S.open);
  if(cd && c && !cd.querySelector('#ag-ref')){ const b=cd.querySelector('.d-body'); if(b) b.insertAdjacentHTML('afterbegin', boxRef('contrato', c.id, 'Contrato '+c.numero+' · ')); }
  if(S.modal && S.modal.tipo==='agenda') avisoHora();
};

/* ---------- eventos ---------- */
document.addEventListener('click', e=>{
  if(!S.me) return; const b=e.target.closest('button'); if(!b) return; const d=b.dataset;
  if(d.agnovo){ e.stopImmediatePropagation(); S.agDel=null; S.modal={tipo:'agenda', dia:d.agdia||'', ref:d.agref||'', titulo:d.agtit||'', tp:d.agtipo||'Follow-up'}; return render(); }
  if(d.agedit){ e.stopImmediatePropagation(); S.agDel=null; S.modal={tipo:'agenda', id:d.agedit}; return render(); }
  if(d.agpess){ e.stopImmediatePropagation(); S.agPess=d.agpess; return render(); }
  if(d.agsem!==undefined){ e.stopImmediatePropagation(); S.agSem = d.agsem==='0' ? 0 : (S.agSem||0)+Number(d.agsem); return render(); }
  if(d.agatal){ e.stopImmediatePropagation(); const x=document.getElementById('ag-d'); if(x){ x.value=d.agatal; avisoHora(); } return; }
  if(d.agok){ e.stopImmediatePropagation(); const a=D.agenda.find(x=>x.id===d.agok); if(!a) return; const v=a.feito_em?null:new Date().toISOString();
    (async()=>{ try{ await q(sb.from('agenda').update({feito_em:v}).eq('id',a.id)); a.feito_em=v; render(); toast(v?'✅ Concluído':'Reaberto'); }catch(err){ falha(err); } })(); return; }
  if(d.agdel){ e.stopImmediatePropagation(); if(S.agDel!==d.agdel){ S.agDel=d.agdel; return render(); }
    return acao(async()=>{ await q(sb.from('agenda').delete().eq('id',d.agdel)); S.modal=null; S.agDel=null; }, 'Compromisso excluído'); }
}, true);
document.addEventListener('input', e=>{ if(e.target.id==='ag-h'||e.target.id==='ag-d') avisoHora(); });
document.addEventListener('submit', e=>{
  const f=e.target; if(f.id!=='f-ag') return; e.preventDefault(); e.stopImmediatePropagation();
  const g=s=>f.querySelector(s).value.trim(), quando=new Date(g('#ag-d')+'T'+g('#ag-h')), [rt,ri]=(f.dataset.ref||'|').split('|');
  if(isNaN(quando)) return toast('Confira a data e a hora');
  const row={titulo:g('#ag-t'), tipo:(f.querySelector('[name=ag-tp]:checked')||{}).value||'Follow-up', quando:quando.toISOString(), responsavel:g('#ag-r'), obs:g('#ag-o')||null, ref_tipo:rt||null, ref_id:ri||null};
  return acao(async()=>{
    if(f.dataset.id) await q(sb.from('agenda').update(row).eq('id',f.dataset.id));
    else await q(sb.from('agenda').insert(Object.assign(row,{criado_por:S.me.nome})));
    if(rt==='negocio' && ri) await q(sb.from('negocios').update({proximo_contato:g('#ag-d')}).eq('id',ri));
    S.modal=null; }, `📅 ${f.dataset.id?'Atualizado':'Agendado'} para ${quando.toLocaleString('pt-BR',{weekday:'short',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}${row.responsavel!==S.me.nome?' · '+row.responsavel:''}`);
}, true);
if(S.me) carregar().then(render).catch(()=>{});
})();
