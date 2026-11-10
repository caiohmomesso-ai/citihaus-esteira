/* Citihaus · chamados internos da equipe + prioridade com prazo em dias úteis + título automático */
(function(){
if(TOKEN) return;

const PRI = {
  critico:    {ic:'🔴', n:'Crítico',    d:1,  cl:'p-bad'},
  urgente:    {ic:'🟠', n:'Urgente',    d:2,  cl:'p-warn'},
  normal:     {ic:'🔵', n:'Normal',     d:5,  cl:'p-info'},
  sem_pressa: {ic:'🟢', n:'Sem pressa', d:15, cl:'p-mute'}};
const PRI_K = ['critico','urgente','normal','sem_pressa'];
const TIPOS_INT = ['Manutenção','Financeiro','Documentação','Vistoria','Jurídico','Captação','Atendimento','Administrativo','Outro'];

/* feriados nacionais, SP (09/07) e Rio Preto (19/03) */
const FER = new Set(['2026-01-01','2026-02-16','2026-02-17','2026-03-19','2026-04-03','2026-04-21','2026-05-01','2026-06-04','2026-07-09','2026-09-07','2026-10-12','2026-11-02','2026-11-15','2026-11-20','2026-12-25',
  '2027-01-01','2027-02-08','2027-02-09','2027-03-19','2027-03-26','2027-04-21','2027-05-01','2027-05-27','2027-07-09','2027-09-07','2027-10-12','2027-11-02','2027-11-15','2027-11-20','2027-12-25']);
const ymd = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const util = d => d.getDay()!==0 && d.getDay()!==6 && !FER.has(ymd(d));
function somaUteis(ini, n){ const d=new Date(ini); d.setHours(12,0,0,0); let k=0; while(k<n){ d.setDate(d.getDate()+1); if(util(d)) k++; } return d; }
function uteisEntre(a, b){ /* dias úteis de a (exclusive) até b (inclusive); negativo se b < a */
  const x=new Date(a); x.setHours(12,0,0,0); const y=new Date(b); y.setHours(12,0,0,0); if(ymd(x)===ymd(y)) return 0;
  const s = y>x ? 1 : -1; let n=0; const d=new Date(x); while(ymd(d)!==ymd(y)){ d.setDate(d.getDate()+s); if(util(d)) n+=s; } return n; }
const prazoDe = h => somaUteis(h.created_at, (PRI[h.prioridade]||PRI.normal).d);
const dCurta = d => d.toLocaleDateString('pt-BR',{weekday:'short', day:'2-digit', month:'2-digit'}).replace('.','');
function prazoPill(h){
  if(h.status==='resolvido') return '';
  const pz=prazoDe(h), r=uteisEntre(new Date(), pz);
  const [cl,t] = r<0 ? ['p-bad',`⏰ Atrasado ${-r} dia${r<-1?'s':''} útil${r<-1?'eis':''}`.replace('útileis','úteis')] : r===0 ? ['p-bad','⏰ Vence hoje'] : r===1 ? ['p-warn','Vence amanhã'] : ['p-mute',`Vence ${dCurta(pz)}`];
  return `<span class="pill ${cl}" title="Prazo: ${pz.toLocaleDateString('pt-BR')}">${t}</span>`;
}
const priPill = h => { const p=PRI[h.prioridade]||PRI.normal; return `<span class="pill ${p.cl}">${p.ic} ${p.n}</span>`; };
const ordemPrazo = (a,b) => prazoDe(a)-prazoDe(b) || PRI_K.indexOf(a.prioridade)-PRI_K.indexOf(b.prioridade);
const ctNome = c => c ? `Contrato ${c.numero} · ${(D.imoveis.find(i=>i.id===c.imovel_id)||{}).titulo||''}` : '';
const imvNome = id => (D.imoveis.find(i=>i.id===id)||{}).titulo || '';
const ctOpcoes = sel => D.contratos.slice().sort((a,b)=>b.numero-a.numero).map(c=>`<option value="${c.id}" ${sel===c.id?'selected':''}>${esc(ctNome(c))}</option>`).join('');
const imvOpcoes = sel => D.imoveis.slice().sort((a,b)=>String(a.titulo).localeCompare(String(b.titulo))).map(i=>`<option value="${i.id}" ${sel===i.id?'selected':''}>${esc(i.titulo)}</option>`).join('');

/* título automático: "Tipo · Imóvel · resumo" */
function tituloAuto(tipo, cid, iid, texto){
  const c=cid&&D.contratos.find(k=>k.id===cid), onde = c ? (imvNome(c.imovel_id)||'Contrato '+c.numero) : imvNome(iid);
  const STOP = /^(de|do|da|dos|das|no|na|nos|nas|em|e|o|a|os|as|para|pra|com|um|uma|que|por|ao|à)$/i;
  let ws = String(texto||'').replace(/\s+/g,' ').trim().split(' ').filter(Boolean).slice(0,5);
  while(ws.length && STOP.test(ws[ws.length-1].replace(/[.,;:!?]+$/,''))) ws.pop();
  const resumo = ws.join(' ').replace(/[.,;:!?]+$/,'');
  return [tipo, onde, resumo && resumo.length>2 ? resumo.charAt(0).toUpperCase()+resumo.slice(1) : ''].filter(Boolean).join(' · ').slice(0,120);
}

/* ---------- quadro de chamados ---------- */
chamadosEquipe = function(){
  const cols=['aberto','atendimento','aguardando','resolvido'];
  const desc={aberto:'Novo, sem resposta da equipe',atendimento:'Equipe resolvendo',aguardando:'Depende do cliente ou do proprietário',resolvido:'Encerrado'};
  const f=S.chFil||'todos';
  const pass = h => f==='todos' || (f==='interno'&&h.interno) || (f==='cliente'&&!h.interno) || (f==='atrasado'&&h.status!=='resolvido'&&uteisEntre(new Date(),prazoDe(h))<0);
  const nAtr = D.chamados.filter(h=>h.status!=='resolvido'&&uteisEntre(new Date(),prazoDe(h))<0).length;
  return `<div class="head"><div><h1>Chamados</h1><p>Abertos pelo cliente no portal. Cada um tem protocolo e fica ligado ao contrato.</p></div><button class="btn pri" data-chnovo="1">+ Novo chamado</button></div>
  <div class="row" style="gap:8px;flex-wrap:wrap;margin:-4px 0 12px"><div class="seg-b">${[['todos','Todos'],['cliente','👤 De clientes'],['interno','🏢 Internos'],['atrasado',`⏰ Atrasados${nAtr?' ('+nAtr+')':''}`]].map(([k,v])=>`<button data-chfil="${k}" aria-pressed="${f===k}">${v}</button>`).join('')}</div>
   <span class="muted" style="font-size:12px">Prazo em dias úteis: ${PRI_K.map(k=>`${PRI[k].ic} ${PRI[k].n} ${PRI[k].d}`).join(' · ')}</span></div>
  <div class="board-scroll"><div class="board" style="grid-auto-columns:minmax(250px,1fr)">${cols.map(s=>{
    const hs=D.chamados.filter(h=>h.status===s && pass(h)); s==='resolvido' ? hs.sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at)) : hs.sort(ordemPrazo);
    return `<section class="col"><div class="col-h"><div><h3>${chSt(s,'equipe')[1]}</h3><small>${desc[s]}</small></div><span class="count">${hs.length}</span></div>
    ${hs.length?hs.map(h=>{ const c=h.contrato_id&&D.contratos.find(k=>k.id===h.contrato_id), quem = h.interno ? `🏢 Interno${h.responsavel?' · '+esc(h.responsavel):''}` : `${esc(nomeP(P(h.pessoa_id),h.papel))} · ${PAPEL[h.papel]||''}`;
      return `<button class="card" data-chteam="${h.id}"><span class="code">${esc(h.protocolo)}</span><h4>${esc(h.titulo)}</h4>
      <div class="meta">${quem}</div><div class="meta">${c?esc(pastaC(c)):h.imovel_id?'🏠 '+esc(imvNome(h.imovel_id)):h.interno?'<span class="muted">Sem contrato vinculado</span>':''}</div>
      <div class="row" style="gap:5px;flex-wrap:wrap">${priPill(h)}${prazoPill(h)}${h.orc_status==='pendente'?'<span class="pill p-acc">Orçamento pendente</span>':''}${s==='resolvido'&&!h.interno?(h.avaliacao?`<span class="pill p-ok">${'★'.repeat(h.avaliacao)}</span>`:'<span class="pill p-mute">Sem avaliação</span>'):''}</div></button>`; }).join(''):'<div class="empty">Nenhum chamado</div>'}</section>`;}).join('')}
  </div></div>`;
};

/* ---------- gaveta do chamado ---------- */
const priSec = h => `<div class="sec"><h3>Prioridade <span class="muted" style="font-size:12px;font-weight:500">· prazo ${prazoDe(h).toLocaleDateString('pt-BR')} (${(PRI[h.prioridade]||PRI.normal).d} dia${(PRI[h.prioridade]||PRI.normal).d>1?'s':''} úte${(PRI[h.prioridade]||PRI.normal).d>1?'is':'il'} desde a abertura)</span></h3>
  <div class="row" style="gap:6px;flex-wrap:wrap">${PRI_K.map(k=>`<button class="btn sm ${h.prioridade===k?'pri':''}" data-chpri="${h.id}|${k}">${PRI[k].ic} ${PRI[k].n} · ${PRI[k].d}d</button>`).join('')}</div></div>`;
const chDrawerInt = chDrawer;
chDrawer = function(h){
  if(!h.interno){ const out=chDrawerInt(h); const i=out.indexOf('<div class="sec"><h3>Status</h3>'); if(i<0) return out; const j=out.indexOf('</div></div>', i)+12; return out.slice(0,j)+priSec(h)+out.slice(j); }
  const c=h.contrato_id&&D.contratos.find(k=>k.id===h.contrato_id), ms=(D.msgs[h.id]||[]).slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  return `<div class="ov" data-close="1"><aside class="drawer" role="dialog" aria-label="Chamado ${esc(h.protocolo)}">
  <div class="d-head"><div class="row between" style="align-items:flex-start;flex-wrap:nowrap"><div style="min-width:0"><span class="mono" style="color:var(--accent-ink)">${esc(h.protocolo)} · 🏢 Interno</span>
    <h2 id="chi-tit" contenteditable="true" spellcheck="false" data-chtit="${h.id}" title="Clique para editar o título" style="outline:none">${esc(h.titulo)}</h2>
    <div class="contact"><span>${esc(h.tipo)}</span><span>Aberto por ${esc(h.criado_por||'equipe')} · ${dtBR(h.created_at)}</span>${c?`<span>${esc(pastaC(c))}</span>`:''}</div></div>
    <button class="x" data-close="1" aria-label="Fechar">×</button></div></div>
  <div class="d-body">
   <div class="sec"><h3>Status</h3><div class="row">${['aberto','atendimento','aguardando','resolvido'].map(s=>`<button class="btn sm ${h.status===s?'pri':''}" data-chst="${h.id}|${s}">${chSt(s,'equipe')[1]}</button>`).join('')}</div></div>
   ${priSec(h)}
   <div class="sec"><h3>Vínculo e responsável</h3><form id="f-chvinc" data-ch="${h.id}" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;align-items:end">
     <label class="f">Contrato (opcional)<select id="v-ct"><option value="">— Sem contrato —</option>${ctOpcoes(h.contrato_id)}</select></label>
     <label class="f">Imóvel (opcional)<select id="v-imv"><option value="">— Sem imóvel —</option>${imvOpcoes(h.imovel_id)}</select></label>
     <label class="f">Responsável<select id="v-resp"><option value="">— Ninguém —</option>${(D.equipe||[]).map(e=>`<option ${h.responsavel===e.nome?'selected':''}>${esc(e.nome)}</option>`).join('')}</select></label>
     <button class="btn" type="submit">Salvar</button></form>
     ${c?`<button class="btn sm ghost" style="margin-top:8px" data-open="${c.id}" data-go="1">Abrir o contrato ${esc(c.numero)} →</button>`:''}</div>
   <div class="sec"><h3>Anotações da equipe <span class="muted" style="font-size:12px;font-weight:500">· só a equipe vê</span></h3>
    <div class="thread">${ms.map(m=>`<div class="msg ${m.autor_nome===S.me.nome?'eu':'eles'}"><small>${esc(m.autor_nome||'Equipe')} · ${dtBR(m.created_at)}</small>${esc(m.texto)}</div>`).join('')||'<div class="muted" style="font-size:13px">Nenhuma anotação ainda.</div>'}</div>
    <form class="reply" data-reply="${h.id}|equipe"><textarea id="r-${h.id}-equipe" placeholder="Escreva uma anotação ou atualização" required></textarea><button class="btn pri" type="submit">Salvar</button></form></div>
  </div></aside></div>`;
};

/* ---------- modal "Novo chamado" ---------- */
const modalChi = modalHtml;
modalHtml = function(){
  const m=S.modal; if(!m || m.tipo!=='chint') return modalChi();
  const pz = k => dCurta(somaUteis(new Date(), PRI[k].d));
  return `<div class="ov center"><form class="modal" id="f-chint" style="max-width:640px">
   <div class="m-h"><span class="mono" style="color:var(--accent-ink)">Chamado interno da equipe</span><h2 style="font-size:19px;margin-top:4px">🎫 Novo chamado</h2></div>
   <div class="m-b">
    <div class="f full">Tipo<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${TIPOS_INT.map((t,i)=>`<label class="btn sm chi-op"><input type="radio" name="ci-tipo" value="${esc(t)}" ${i===0?'checked':''} style="accent-color:var(--accent)"> ${esc(t)}</label>`).join('')}</div></div>
    <div class="f full">Prioridade<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:6px;margin-top:6px">${PRI_K.map(k=>`<label class="chi-op" style="border:1px solid var(--line);border-radius:10px;padding:8px 10px;cursor:pointer;display:block"><input type="radio" name="ci-pri" value="${k}" ${k==='normal'?'checked':''} style="accent-color:var(--accent)"> <b>${PRI[k].ic} ${PRI[k].n}</b><div class="muted" style="font-size:11.5px">${PRI[k].d} dia${PRI[k].d>1?'s':''} úte${PRI[k].d>1?'is':'il'} · ${pz(k)}</div></label>`).join('')}</div></div>
    <label class="f full">O que precisa ser feito<textarea class="ta" id="ci-txt" rows="3" placeholder="Ex.: Trocar a resistência do chuveiro do banheiro social"></textarea></label>
    <label class="f">Vincular contrato <span class="muted" style="font-weight:500">(opcional)</span><select id="ci-ct"><option value="">— Sem contrato —</option>${ctOpcoes(m.ct||'')}</select></label>
    <label class="f">ou imóvel <span class="muted" style="font-weight:500">(opcional)</span><select id="ci-imv"><option value="">— Sem imóvel —</option>${imvOpcoes('')}</select></label>
    <label class="f">Responsável<select id="ci-resp"><option value="">— Ninguém —</option>${(D.equipe||[]).map(e=>`<option ${e.nome===S.me.nome?'selected':''}>${esc(e.nome)}</option>`).join('')}</select></label>
    <label class="f full">Título <span class="muted" style="font-weight:500">· criado sozinho, pode ajustar</span><input id="ci-tit" required maxlength="120"></label>
    <div class="note full">Chamado interno: só a equipe vê. O cliente e o proprietário não recebem aviso.</div>
   </div>
   <div class="m-f"><button type="button" class="btn" data-mclose="1">Cancelar</button><button class="btn pri" type="submit">Abrir chamado</button></div></form></div>`;
};
function atualizaTitulo(){
  const f=document.getElementById('f-chint'); if(!f) return; const t=f.querySelector('#ci-tit'); if(t.dataset.manual) return;
  t.value = tituloAuto((f.querySelector('[name=ci-tipo]:checked')||{}).value, f.querySelector('#ci-ct').value, f.querySelector('#ci-imv').value, f.querySelector('#ci-txt').value);
  f.querySelectorAll('.chi-op').forEach(l=>{ const i=l.querySelector('input'); l.style.borderColor = i.checked?'var(--accent)':''; l.style.background = i.checked?'var(--accent-soft)':''; });
}
const renderChi = render;
render = function(){ renderChi.apply(this, arguments); if(S.modal && S.modal.tipo==='chint') atualizaTitulo(); };
document.addEventListener('input', e=>{ if(!e.target.closest || !e.target.closest('#f-chint')) return; if(e.target.id==='ci-tit'){ e.target.dataset.manual = e.target.value ? '1' : ''; if(!e.target.value) atualizaTitulo(); return; } atualizaTitulo(); });
document.addEventListener('change', e=>{ if(e.target.closest && e.target.closest('#f-chint')){ if(e.target.id==='ci-ct' && e.target.value){ const c=D.contratos.find(k=>k.id===e.target.value); if(c) document.getElementById('ci-imv').value=c.imovel_id||''; } atualizaTitulo(); } }, true);

document.addEventListener('click', e=>{
  const b=e.target.closest('button'); if(!b || !S.me) return;
  if(b.dataset.chnovo){ e.stopImmediatePropagation(); S.modal={tipo:'chint', ct:b.dataset.chnovoct||''}; return render(); }
  if(b.dataset.chfil){ e.stopImmediatePropagation(); S.chFil=b.dataset.chfil; return render(); }
  if(b.dataset.chpri){ e.stopImmediatePropagation(); const [id,k]=b.dataset.chpri.split('|');
    return acao(async()=>{ await q(sb.from('chamados').update({prioridade:k, updated_at:new Date().toISOString()}).eq('id',id)); }, `Prioridade: ${PRI[k].n} · prazo ${prazoDe(Object.assign({},D.chamados.find(h=>h.id===id),{prioridade:k})).toLocaleDateString('pt-BR')}`); }
}, true);
document.addEventListener('submit', e=>{
  const f=e.target;
  if(f.id==='f-chint'){ e.preventDefault(); e.stopImmediatePropagation();
    const g=s=>f.querySelector(s), tit=g('#ci-tit').value.trim(); if(!tit) return toast('Escreva o título');
    return acao(async()=>{ const r=await q(sb.rpc('equipe_chamado_interno',{p_tipo:(g('[name=ci-tipo]:checked')||{}).value||'Outro', p_titulo:tit, p_texto:g('#ci-txt').value, p_prioridade:(g('[name=ci-pri]:checked')||{}).value||'normal',
        p_contrato:g('#ci-ct').value||null, p_imovel:g('#ci-imv').value||null, p_responsavel:g('#ci-resp').value||null}));
      S.modal=null; if(r&&r.id) S.chTeam=r.id; }, 'Chamado aberto ✓'); }
  if(f.id==='f-chvinc'){ e.preventDefault(); e.stopImmediatePropagation(); const id=f.dataset.ch, ct=f.querySelector('#v-ct').value||null, c=ct&&D.contratos.find(k=>k.id===ct);
    return acao(async()=>{ await q(sb.from('chamados').update({contrato_id:ct, imovel_id:f.querySelector('#v-imv').value||(c&&c.imovel_id)||null, responsavel:f.querySelector('#v-resp').value||null, updated_at:new Date().toISOString()}).eq('id',id)); }, 'Vínculo salvo ✓'); }
}, true);
/* título editável na gaveta: salva ao sair do campo */
document.addEventListener('focusout', e=>{ const el=e.target; if(!el.dataset || !el.dataset.chtit) return; const t=el.textContent.replace(/\s+/g,' ').trim(), h=D.chamados.find(k=>k.id===el.dataset.chtit);
  if(!t || !h || t===h.titulo){ if(h) el.textContent=h.titulo; return; } acao(async()=>{ await q(sb.from('chamados').update({titulo:t.slice(0,120), updated_at:new Date().toISOString()}).eq('id',h.id)); }, 'Título salvo ✓'); });
document.addEventListener('keydown', e=>{ if(e.key==='Enter' && e.target.dataset && e.target.dataset.chtit){ e.preventDefault(); e.target.blur(); } });

/* no contrato: botão para abrir chamado interno já vinculado */
const drawerChi = drawer;
drawer = function(c){ const h=drawerChi(c); const i=h.lastIndexOf('</div></aside>'); if(i<0) return h;
  return h.slice(0,i)+`<div class="sec"><button class="btn sm" data-chnovo="1" data-chnovoct="${c.id}">🎫 Abrir chamado interno deste contrato</button></div>`+h.slice(i); };
})();
