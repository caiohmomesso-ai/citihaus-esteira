/* Citihaus · Esteira comercial — funil DNA de Vendas: Lead → MQL → SAL → Oportunidade → Cliente (+ Perdido) */
(function(){
if(TOKEN) return;
D.negocios = D.negocios || []; D.negHist = D.negHist || {};

const NE = [
  {k:'lead',    ic:'📥', n:'Lead',         d:'Contato novo, com alguma fonte de origem',        lim:1},
  {k:'mql',     ic:'🎯', n:'MQL',          d:'Qualificado pelo marketing para vendas avaliar',  lim:1},
  {k:'sal',     ic:'🤝', n:'SAL',          d:'Aceito por vendas, já com corretor',              lim:3},
  {k:'opp',     ic:'🔥', n:'Oportunidade', d:'Condição real de fechar: visita e proposta',      lim:7},
  {k:'cliente', ic:'🏆', n:'Cliente',      d:'Assinou o contrato',                              lim:0},
  {k:'perdido', ic:'💤', n:'Perdido',      d:'Saiu do funil, volta para nutrição',              lim:0}];
const NEk = k => NE.find(x=>x.k===k) || NE[0];
const ORIGENS = ['Site','Instagram','Meta Ads','Google Ads','WhatsApp','Portal','Indicação','Placa','Prospecção ativa','Evento','Outro'];
const MOTIVOS = ['Preço','Localização','Comprou ou alugou com outro','Sem retorno','Crédito ou financiamento negado','Desistiu','Só pesquisando','Outro'];
const VST = [['agendada','Agendada'],['realizada','Realizada'],['cancelada','Cancelada'],['nao_compareceu','Não compareceu']];
const PST = [['em_analise','Em análise'],['aceita','Aceita'],['recusada','Recusada'],['contraproposta','Contraproposta'],['cancelada','Cancelada']];
const dias = d => Math.floor((Date.now()-new Date(d))/864e5);
const hojeStr = () => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const imvT = id => (D.imoveis.find(i=>i.id===id)||{}).titulo || '';
const visDe = n => (D.visitas||[]).filter(v=>v.negocio_id===n.id);
const propDe = n => (D.propostas||[]).filter(p=>p.negocio_id===n.id);
const nomeEq = () => (D.equipe||[]).map(e=>e.nome);
const campo = 'border:1px solid var(--line);border-radius:8px;padding:6px 9px;background:var(--bg);font:inherit;width:100%;box-sizing:border-box';

function falta(n){
  const f=[];
  if(n.etapa==='lead'){ if(!n.telefone) f.push('Celular do lead'); if(!n.origem) f.push('Origem do contato'); }
  if(n.etapa==='mql'){ if(!n.corretor) f.push('Corretor que vai atender'); }
  if(n.etapa==='sal'){ if(!n.imovel_id && !visDe(n).length) f.push('Imóvel de interesse ou uma visita'); }
  if(n.etapa==='opp'){ if(!propDe(n).some(p=>p.status==='aceita')) f.push('Proposta aceita'); }
  return f;
}
function alertaPill(n){
  if(n.etapa==='cliente'||n.etapa==='perdido') return '';
  if(n.proximo_contato){ const h=hojeStr(); if(n.proximo_contato<h) return `<span class="pill p-bad">⏰ Follow-up atrasado</span>`; if(n.proximo_contato===h) return `<span class="pill p-warn">⏰ Follow-up hoje</span>`; }
  const e=NEk(n.etapa), dd=dias(n.etapa_em||n.created_at);
  return dd>e.lim ? `<span class="pill p-bad">Parado há ${dd} dia${dd>1?'s':''}</span>` : `<span class="pill p-mute">${dd?dd+' dia'+(dd>1?'s':'')+' aqui':'Hoje'}</span>`;
}
function cardNeg(n){
  const vs=visDe(n), ps=propDe(n), pa=ps.find(p=>p.status==='aceita');
  return `<button class="card" data-negopen="${n.id}" draggable="true" data-negdrag="${n.id}">
    <span class="code">NEG-${String(n.numero).padStart(3,'0')} · ${n.interesse==='Locação'?'🔑 Locação':'🏡 Compra'}</span><h4>${esc(n.nome)}</h4>
    <div class="meta">${esc(n.origem||'Sem origem')}${n.corretor?' · '+esc(n.corretor):''}</div>
    ${n.imovel_id?`<div class="meta">🏠 ${esc(imvT(n.imovel_id))}</div>`:''}
    <div class="row" style="gap:5px;flex-wrap:wrap">${alertaPill(n)}${vs.length?`<span class="pill p-info">🗓️ ${vs.length}</span>`:''}${ps.length?`<span class="pill ${pa?'p-ok':'p-acc'}">💬 ${pa?brl(pa.valor):ps.length}</span>`:''}${n.etapa==='perdido'&&n.motivo_perda?`<span class="pill p-mute">${esc(n.motivo_perda)}</span>`:''}</div></button>`;
}

window.comercialHtml2 = function(){
  const L=D.negocios.filter(n=>!n.arquivado_em), f=S.ngFil||'todos';
  const pass = n => f==='todos' || (f==='Compra'&&n.interesse==='Compra') || (f==='Locação'&&n.interesse==='Locação') || (f==='meus'&&n.corretor===S.me.nome);
  const ativos=L.filter(n=>!['cliente','perdido'].includes(n.etapa)), opp=L.filter(n=>n.etapa==='opp');
  const conv = (() => { const tot=D.negocios.filter(n=>dias(n.created_at)<=90).length, cli=D.negocios.filter(n=>n.etapa==='cliente'&&dias(n.created_at)<=90).length; return tot?Math.round(cli/tot*100):null; })();
  const arq=D.negocios.filter(n=>n.arquivado_em).sort((a,b)=>new Date(b.arquivado_em)-new Date(a.arquivado_em));
  return `<div class="head"><div><h1>🤝 Comercial</h1><p>Funil DNA de Vendas: do primeiro contato até o contrato assinado. Arraste o card para mudar de etapa.</p></div><button class="btn pri" data-ngnovo="1">+ Novo lead</button></div>
  <div class="stats">
    <div class="stat"><b>${ativos.length}</b><span>negócios em andamento</span></div>
    <div class="stat hl"><b>${opp.length}</b><span>oportunidades quentes</span></div>
    <div class="stat"><b>${ativos.filter(n=>n.proximo_contato&&n.proximo_contato<=hojeStr()).length}</b><span>follow-ups para hoje</span></div>
    <div class="stat"><b>${conv==null?'—':conv+'%'}</b><span>conversão em clientes (90 dias)</span></div>
  </div>
  <div class="row" style="gap:8px;flex-wrap:wrap;margin:10px 0"><div class="seg-b">${[['todos','Todos'],['Compra','🏡 Compra'],['Locação','🔑 Locação'],['meus','👤 Meus']].map(([k,v])=>`<button data-ngfil="${k}" aria-pressed="${f===k}">${v}</button>`).join('')}</div></div>
  <div class="board-scroll"><div class="board">${NE.map(e=>{ const cs=L.filter(n=>n.etapa===e.k&&pass(n)).sort((a,b)=>new Date(a.etapa_em)-new Date(b.etapa_em));
    const fim = e.k==='cliente'||e.k==='perdido';
    return `<section class="col" data-ngcol="${e.k}"><div class="col-h"><div><h3>${e.ic} ${e.n}</h3><small>${e.d}</small></div><span class="count">${cs.length}</span></div>
    ${fim&&cs.length?`<button class="btn sm ghost" style="width:100%;margin-bottom:8px" data-ngarqall="${e.k}">${S.ngArqAll===e.k?'Confirmar: arquivar '+cs.length:'📦 Arquivar ('+cs.length+')'}</button>`:''}
    ${cs.length?cs.map(cardNeg).join(''):'<div class="empty">Nenhum negócio aqui</div>'}</section>`; }).join('')}</div></div>
  ${arq.length?`<div style="margin-top:12px"><button class="btn sm ghost" data-ngarqver="1">📦 Negócios arquivados (${arq.length}) ${S.ngArqVer?'▲':'▼'}</button>
   ${S.ngArqVer?`<div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>Nº</th><th>Nome</th><th>Resultado</th><th>Imóvel</th><th>Arquivado</th><th></th></tr></thead><tbody>${arq.map(n=>`<tr><td class="mono">NEG-${String(n.numero).padStart(3,'0')}</td><td><b>${esc(n.nome)}</b></td><td>${NEk(n.etapa).ic} ${NEk(n.etapa).n}${n.motivo_perda&&n.etapa==='perdido'?' · '+esc(n.motivo_perda):''}</td><td>${esc(imvT(n.imovel_id))}</td><td class="num">${dataBR(n.arquivado_em)}</td><td><button class="btn sm" data-negopen="${n.id}">Abrir</button></td></tr>`).join('')}</tbody></table></div>`:''}</div>`:''}`;
};

function drawerNeg(n){
  const i=NE.findIndex(e=>e.k===n.etapa), f=falta(n), vs=visDe(n), ps=propDe(n), imv=n.imovel_id&&D.imoveis.find(x=>x.id===n.imovel_id);
  const passos=NE.slice(0,5).map((e,k)=>`<div style="flex:1;height:6px;border-radius:99px;background:${n.etapa==='perdido'?'var(--line)':i>k?'var(--ok)':i===k?'var(--accent)':'var(--line)'}" title="${e.n}"></div>`).join('');
  const sel=(attr,id,ops,v)=>`<select ${attr}="${id}" style="border:1px solid var(--line);border-radius:8px;padding:5px 8px;background:var(--bg)">${ops.map(([k,t])=>`<option value="${k}" ${v===k?'selected':''}>${t}</option>`).join('')}</select>`;
  const prox = i<4 ? NE[i+1] : null, ant = i>0 && i<=4 ? NE[i-1] : null;
  const fimAcao = n.etapa==='cliente' ? `<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px">${n.interesse==='Locação'&&imv&&imv.status==='Disponível'?`<button class="btn pri" data-new="${imv.id}">📄 Iniciar contrato de locação</button>`:''}${n.interesse==='Compra'?`<button class="btn pri" data-dvenda="1">💰 Registrar venda</button>`:''}</div>` : '';
  const h=(D.negHist[n.id]||[]).slice().sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
  return `<div class="ov" data-negclose="1"><aside class="drawer" role="dialog" aria-label="Negócio ${esc(n.nome)}" id="neg-drawer">
  <div class="d-head"><div class="row between" style="align-items:flex-start;flex-wrap:nowrap"><div style="min-width:0"><span class="mono" style="color:var(--accent-ink)">NEG-${String(n.numero).padStart(3,'0')} · ${n.interesse==='Locação'?'🔑 Locação':'🏡 Compra'}</span><h2>${esc(n.nome)}</h2>
    <div class="muted" style="font-size:12.5px">${NEk(n.etapa).ic} ${NEk(n.etapa).n} · ${dias(n.etapa_em)} dia(s) nesta etapa${n.corretor?' · corretor '+esc(n.corretor):''}</div></div>
    <button class="x" data-negclose="1" aria-label="Fechar">×</button></div>
    <div style="display:flex;gap:4px;margin-top:12px">${passos}</div></div>
  <div class="d-body">
   ${n.etapa==='perdido'?`<div class="gate"><div class="gt"><b>💤 Perdido${n.motivo_perda?' · '+esc(n.motivo_perda):''}.</b> Fica para a nutrição (newsletter e remarketing).</div><button class="btn" data-ngmov="${n.id}|lead">↩ Reativar como lead</button></div>`
     : n.etapa==='cliente'?`<div class="gate yes"><div class="gt"><b>🏆 Cliente!</b> ${n.arquivado_em?'Arquivado.':'Arquive quando terminar o pós-venda.'}</div>${n.arquivado_em?`<button class="btn" data-ngarq="${n.id}|0">↩ Voltar para o quadro</button>`:`<button class="btn" data-ngarq="${n.id}|1">📦 Arquivar</button>`}</div>${fimAcao}`
     : `<div class="gate ${f.length?'no':'yes'}"><div class="gt">${f.length?`<b>Para virar ${prox.n}, falta:</b><ul>${f.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:`<b>Pronto para virar ${prox.n}.</b>`}</div>
       <div class="row" style="gap:6px;flex-wrap:wrap">${ant?`<button class="btn ghost" data-ngmov="${n.id}|${ant.k}">← ${ant.n}</button>`:''}<button class="btn ${f.length?'':'pri'}" data-ngmov="${n.id}|${prox.k}">${f.length?'Avançar mesmo assim':'Avançar'} → ${prox.ic} ${prox.n}</button></div></div>`}
   ${n.etapa==='perdido'&&n.arquivado_em?`<div class="row" style="margin-bottom:10px"><button class="btn sm" data-ngarq="${n.id}|0">↩ Voltar para o quadro</button></div>`:n.etapa==='perdido'?`<div class="row" style="margin-bottom:10px"><button class="btn sm" data-ngarq="${n.id}|1">📦 Arquivar</button></div>`:''}
   ${!['perdido','cliente'].includes(n.etapa)?`<div class="sec"><details><summary style="cursor:pointer;color:var(--bad);font-size:13px">💤 Marcar como perdido</summary><div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px">${MOTIVOS.map(m=>`<button class="btn sm" data-ngperd="${n.id}|${esc(m)}">${esc(m)}</button>`).join('')}</div></details></div>`:''}
   <div class="sec box"><h3>👤 Contato</h3><form id="f-neg" data-n="${n.id}" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px">
     <label class="f">Nome<input data-ngf="nome" value="${esc(n.nome)}"></label>
     <label class="f">Celular<input data-ngf="telefone" value="${esc(n.telefone||'')}" inputmode="tel"></label>
     <label class="f">E-mail<input data-ngf="email" value="${esc(n.email||'')}" inputmode="email"></label>
     <label class="f">Interesse<select data-ngf="interesse">${['Compra','Locação'].map(x=>`<option ${n.interesse===x?'selected':''}>${x}</option>`).join('')}</select></label>
     <label class="f">Origem<select data-ngf="origem"><option value="">—</option>${ORIGENS.map(x=>`<option ${n.origem===x?'selected':''}>${x}</option>`).join('')}</select></label>
     <label class="f">Corretor<select data-ngf="corretor"><option value="">—</option>${nomeEq().map(x=>`<option ${n.corretor===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>
     <label class="f">Imóvel de interesse<select data-ngf="imovel_id"><option value="">—</option>${D.imoveis.slice().sort((a,b)=>String(a.titulo).localeCompare(String(b.titulo))).map(x=>`<option value="${x.id}" ${n.imovel_id===x.id?'selected':''}>${esc(x.titulo)}</option>`).join('')}</select></label>
     <label class="f">Orçamento (R$)<input data-ngf="orcamento" value="${n.orcamento?esc(String(n.orcamento)):''}" inputmode="decimal"></label>
     <label class="f">Próximo contato<input data-ngf="proximo_contato" type="date" value="${esc(n.proximo_contato||'')}"></label>
     <label class="f" style="grid-column:1/-1">Observações<textarea data-ngf="obs" rows="2" style="${campo}">${esc(n.obs||'')}</textarea></label></form>
     <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap">${n.telefone&&window.waBtn?window.waBtn(n.telefone,`Olá${n.nome?', '+n.nome.split(' ')[0]:''}! Aqui é da Citihaus 🧡 `,'WhatsApp'):''}${imv?`<button class="btn sm ghost" data-imvopen="${imv.id}">🏠 Ver ficha do imóvel</button>`:''}</div></div>
   <div class="sec box"><h3>🗓️ Visitas (${vs.length}) ${imv?'<span class="muted" style="font-size:12px;font-weight:500">· o proprietário vê o retorno no Citihaus+, sem o nome do visitante</span>':''}</h3>
     ${vs.map(v=>`<div style="padding:8px 10px;border:1px solid var(--line);border-radius:10px;margin-bottom:6px"><div class="row between" style="gap:6px;flex-wrap:wrap"><b>${new Date(v.quando).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}${v.imovel_id?' · '+esc(imvT(v.imovel_id)):''}</b>${sel('data-ngvisst',v.id,VST,v.status)}</div>
       <input data-ngvisfb="${v.id}" value="${esc(v.feedback||'')}" placeholder="Retorno da visita" style="${campo};margin-top:6px"></div>`).join('')||'<p class="muted" style="margin:0 0 6px">Nenhuma visita ainda.</p>'}
     <form id="f-ngvis" data-n="${n.id}" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;align-items:end;margin-top:8px">
       <label class="f">Data e hora<input id="ngv-q" type="datetime-local" required></label>
       <label class="f">Imóvel<select id="ngv-i">${D.imoveis.map(x=>`<option value="${x.id}" ${n.imovel_id===x.id?'selected':''}>${esc(x.titulo)}</option>`).join('')}</select></label>
       <button class="btn" type="submit">+ Agendar visita</button></form></div>
   <div class="sec box"><h3>💬 Propostas (${ps.length})</h3>
     ${ps.map(p=>`<div style="padding:8px 10px;border:1px solid var(--line);border-radius:10px;margin-bottom:6px"><div class="row between" style="gap:6px;flex-wrap:wrap"><b>${brl(p.valor)}${p.tipo==='Locação'?'/mês':''} · ${esc(imvT(p.imovel_id))}</b>${sel('data-ngpropst',p.id,PST,p.status)}</div>
       <div class="muted" style="font-size:12.5px">${dataBR(p.data)}${p.condicoes?' · '+esc(p.condicoes):''}</div>
       ${p.status_prop?`<div style="margin-top:6px"><span class="pill ${p.status_prop==='Quero aceitar'?'p-ok':p.status_prop==='Não aceito'?'p-bad':'p-info'}">Proprietário: ${esc(p.status_prop)}</span>${p.resposta_prop?` <span style="font-size:13px">“${esc(p.resposta_prop)}”</span>`:''}</div>`:p.status==='em_analise'?'<div class="muted" style="font-size:12px;margin-top:4px">Aguardando o proprietário responder no Citihaus+</div>':''}</div>`).join('')||'<p class="muted" style="margin:0 0 6px">Nenhuma proposta ainda.</p>'}
     <form id="f-ngprop" data-n="${n.id}" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;align-items:end;margin-top:8px">
       <label class="f">Imóvel<select id="ngp-i" required><option value="">—</option>${D.imoveis.map(x=>`<option value="${x.id}" ${n.imovel_id===x.id?'selected':''}>${esc(x.titulo)}</option>`).join('')}</select></label>
       <label class="f">Valor (R$)<input id="ngp-v" inputmode="decimal" required></label>
       <label class="f" style="grid-column:1/-1">Condições<input id="ngp-c" placeholder="Ex.: 30% de entrada + financiamento Caixa"></label>
       <button class="btn" type="submit">+ Registrar proposta</button></form></div>
   ${h.length?`<div class="sec"><h3>Histórico</h3>${h.map(x=>`<div style="font-size:13px;padding:6px 0;border-bottom:1px solid var(--line)"><span class="muted" style="font-size:12px">${dtBR(x.created_at)}</span> · ${esc(x.texto)}</div>`).join('')}</div>`:''}
  </div></aside></div>`;
}

function modalNovo(){
  const m=S.modal;
  return `<div class="ov center"><form class="modal" id="f-ngnovo" style="max-width:560px">
   <div class="m-h"><span class="mono" style="color:var(--accent-ink)">Esteira comercial</span><h2 style="font-size:19px;margin-top:4px">📥 Novo lead</h2></div>
   <div class="m-b">
    <label class="f">Nome<input id="nn-n" required></label>
    <label class="f">Celular<input id="nn-t" inputmode="tel"></label>
    <label class="f">Interesse<select id="nn-i"><option>Compra</option><option ${m.imv&&(D.imoveis.find(x=>x.id===m.imv)||{}).finalidade==='Locação'?'selected':''}>Locação</option></select></label>
    <label class="f">Origem<select id="nn-o"><option value="">—</option>${ORIGENS.map(x=>`<option>${x}</option>`).join('')}</select></label>
    <label class="f">Imóvel de interesse <span class="muted" style="font-weight:500">(opcional)</span><select id="nn-imv"><option value="">—</option>${D.imoveis.slice().sort((a,b)=>String(a.titulo).localeCompare(String(b.titulo))).map(x=>`<option value="${x.id}" ${m.imv===x.id?'selected':''}>${esc(x.titulo)}</option>`).join('')}</select></label>
    <label class="f">Corretor<select id="nn-c"><option value="">— Ainda não —</option>${nomeEq().map(x=>`<option>${esc(x)}</option>`).join('')}</select></label>
    <label class="f full">Observações<textarea class="ta" id="nn-obs" rows="2" placeholder="O que ele procura, faixa de valor, prazo…"></textarea></label>
   </div>
   <div class="m-f"><button type="button" class="btn" data-mclose="1">Cancelar</button><button class="btn pri" type="submit">Criar lead</button></div></form></div>`;
}

/* ---------- dados ---------- */
const carregarNg = carregar;
carregar = async function(){
  await carregarNg.apply(this, arguments);
  if(!S.me) return;
  try{ const [ns, hs] = await Promise.all([q(sb.from('negocios').select('*').order('created_at',{ascending:false})), q(sb.from('negocio_hist').select('*').order('created_at'))]);
    D.negocios=ns||[]; D.negHist={}; (hs||[]).forEach(h=>(D.negHist[h.negocio_id]=D.negHist[h.negocio_id]||[]).push(h)); }catch(_){ }
};

/* ---------- encaixe nas telas ---------- */
const modalNg = modalHtml;
modalHtml = function(){ return S.modal && S.modal.tipo==='ngnovo' ? modalNovo() : modalNg(); };
const kanbanNg = kanban;
kanban = function(){
  const h = kanbanNg.apply(this, arguments);
  const nAt = D.negocios.filter(n=>!n.arquivado_em && !['cliente','perdido'].includes(n.etapa)).length;
  return h.replace('<button class="btn sm" data-dscroll="sec-contratos">', `<button class="btn sm" data-dscroll="sec-comercial">🤝 Comercial (${nAt})</button><button class="btn sm" data-dscroll="sec-contratos">`)
          .replace('<div id="sec-contratos"', `<div id="sec-comercial" style="border-top:2px solid var(--line);scroll-margin-top:80px">${window.comercialHtml2()}</div><div id="sec-contratos"`);
};
const renderNg = render;
render = function(){
  renderNg.apply(this, arguments);
  if(!S.me) return;
  const n = S.negOpen && D.negocios.find(x=>x.id===S.negOpen);
  if(n && !S.modal && !document.getElementById('neg-drawer')) layer.insertAdjacentHTML('beforeend', drawerNeg(n));
  /* captação: visitas e propostas agora ficam no comercial */
  const cc=document.getElementById('cap-comercial');
  if(cc && !cc.dataset.mov){ cc.dataset.mov='1'; const c=(D.captacoes||[]).find(k=>k.id===S.capOpen), vs=(D.visitas||[]).filter(v=>v.captacao_id===c?.id).length, ps=(D.propostas||[]).filter(p=>p.captacao_id===c?.id).length;
    cc.innerHTML = `<h3>🤝 Visitas e propostas</h3><p class="muted" style="margin:0 0 8px;font-size:13px">Agora ficam na <b>esteira comercial</b> (aba Contratos) e na ficha do imóvel em Imóveis.${vs||ps?` Esta captação tem ${vs} visita(s) e ${ps} proposta(s) registradas.`:''}</p><button class="btn sm" data-tab="contratos" data-capclose="1">Ir para o comercial →</button>`; }
  /* ficha do imóvel: negócios ligados */
  const fd=document.getElementById('imv-drawer');
  if(fd && S.imvOpen && !document.getElementById('imv-negs')){
    const ns=D.negocios.filter(x=>x.imovel_id===S.imvOpen);
    const box=`<div class="sec box" id="imv-negs"><div class="row between" style="margin-bottom:6px"><h3 style="margin:0">🤝 Negócios (${ns.length})</h3><button class="btn sm pri" data-ngnovo="1" data-ngimv="${S.imvOpen}">+ Novo negócio</button></div>
      ${ns.map(x=>`<button class="card" data-negopen="${x.id}" style="margin-bottom:6px;flex-direction:row;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap"><span><b>${esc(x.nome)}</b> <span class="muted" style="font-size:12.5px">· ${x.interesse}${x.corretor?' · '+esc(x.corretor):''}</span></span><span class="pill p-acc">${NEk(x.etapa).ic} ${NEk(x.etapa).n}</span></button>`).join('')||'<p class="muted" style="margin:0;font-size:13px">Nenhum negócio ainda para este imóvel.</p>'}</div>`;
    const ref=[...fd.querySelectorAll('.d-body > .sec')].find(x=>/Comercial|Contratos|Histórico/.test((x.querySelector('h3')||{}).textContent||''));
    if(ref) ref.insertAdjacentHTML('beforebegin', box); else fd.querySelector('.d-body').insertAdjacentHTML('beforeend', box);
  }
  prepararDragNg();
};

/* ---------- arrastar entre etapas ---------- */
let arrastando=null;
function prepararDragNg(){
  document.querySelectorAll('#sec-comercial [data-negdrag]').forEach(c=>{ if(c.dataset.dg) return; c.dataset.dg='1';
    c.addEventListener('dragstart', e=>{ arrastando=c.dataset.negdrag; e.dataTransfer.effectAllowed='move'; try{ e.dataTransfer.setData('text/plain', arrastando); }catch(_){ } c.style.opacity='.5'; });
    c.addEventListener('dragend', ()=>{ c.style.opacity=''; arrastando=null; document.querySelectorAll('[data-ngcol]').forEach(x=>x.style.outline=''); }); });
  document.querySelectorAll('#sec-comercial [data-ngcol]').forEach(col=>{ if(col.dataset.dg) return; col.dataset.dg='1';
    col.addEventListener('dragover', e=>{ if(!arrastando) return; e.preventDefault(); col.style.outline='2px dashed var(--accent)'; });
    col.addEventListener('dragleave', ()=>{ col.style.outline=''; });
    col.addEventListener('drop', e=>{ e.preventDefault(); col.style.outline=''; const id=arrastando; arrastando=null; if(!id) return; const n=D.negocios.find(x=>x.id===id);
      if(!n || n.etapa===col.dataset.ngcol) return; if(col.dataset.ngcol==='perdido'){ S.negOpen=id; render(); return toast('Escolha o motivo em “Marcar como perdido”'); } mover(id, col.dataset.ngcol); }); });
}
function mover(id, et){ const n=D.negocios.find(x=>x.id===id); const f=n?falta(n):[];
  return acao(async()=>{ await q(sb.from('negocios').update({etapa:et, motivo_perda: et==='perdido'?n.motivo_perda:null}).eq('id',id)); }, `${NEk(et).ic} Movido para ${NEk(et).n}${f.length&&NE.findIndex(e=>e.k===et)>NE.findIndex(e=>e.k===n.etapa)?' · ainda falta: '+f.join(', '):''}`); }

/* ---------- eventos ---------- */
document.addEventListener('click', e=>{
  if(!S.me) return;
  const b=e.target.closest('button,a');
  if(b && (b.dataset.new || b.dataset.dvenda) && S.negOpen){ if(b.dataset.new) S.negOpen=null; return; } /* deixa "Iniciar contrato" / "Registrar venda" seguirem */
  const ov=e.target.closest('[data-negclose]');
  if(ov && (e.target===ov || (b && b.dataset.negclose!==undefined))){ e.stopImmediatePropagation(); S.negOpen=null; return render(); }
  if(!b) return; const d=b.dataset;
  if(d.negopen){ e.stopImmediatePropagation(); S.negOpen=d.negopen; S.imvOpen=null; return render(); }
  if(d.imvopen){ e.stopImmediatePropagation(); S.negOpen=null; S.imvOpen=d.imvopen; S.tab='imoveis'; return render(); }
  if(d.ngnovo){ e.stopImmediatePropagation(); S.modal={tipo:'ngnovo', imv:d.ngimv||''}; return render(); }
  if(d.ngfil){ e.stopImmediatePropagation(); S.ngFil=d.ngfil; return render(); }
  if(d.ngarqver){ e.stopImmediatePropagation(); S.ngArqVer=!S.ngArqVer; return render(); }
  if(d.ngmov){ e.stopImmediatePropagation(); const [id,et]=d.ngmov.split('|'); return mover(id, et); }
  if(d.ngperd){ e.stopImmediatePropagation(); const [id,m]=d.ngperd.split('|');
    return acao(async()=>{ await q(sb.from('negocios').update({etapa:'perdido', motivo_perda:m}).eq('id',id)); }, '💤 Marcado como perdido · '+m); }
  if(d.ngarq){ e.stopImmediatePropagation(); const [id,on]=d.ngarq.split('|');
    return acao(async()=>{ await q(sb.from('negocios').update({arquivado_em:on==='1'?new Date().toISOString():null}).eq('id',id)); if(on==='1') S.negOpen=null; }, on==='1'?'Negócio arquivado ✓':'Negócio de volta no quadro'); }
  if(d.ngarqall){ e.stopImmediatePropagation(); const et=d.ngarqall; if(S.ngArqAll!==et){ S.ngArqAll=et; render(); setTimeout(()=>{ if(S.ngArqAll===et){ S.ngArqAll=null; render(); } },6000); return; }
    S.ngArqAll=null; const ids=D.negocios.filter(n=>n.etapa===et&&!n.arquivado_em).map(n=>n.id);
    return acao(async()=>{ await q(sb.from('negocios').update({arquivado_em:new Date().toISOString()}).in('id',ids)); }, ids.length+' negócio(s) arquivado(s) ✓'); }
}, true);
document.addEventListener('change', e=>{
  const el=e.target, d=el.dataset||{}; if(!S.me) return;
  if(d.ngf){ e.stopImmediatePropagation(); const f=el.closest('#f-neg'); if(!f) return; const id=f.dataset.n, n=D.negocios.find(x=>x.id===id); let v=el.value.trim();
    if(d.ngf==='nome' && !v) return toast('O nome não pode ficar vazio');
    if(d.ngf==='orcamento') v = v ? (num(v)||null) : null; else if(!v) v=null;
    (async()=>{ try{ await q(sb.from('negocios').update({[d.ngf]:v}).eq('id',id)); n[d.ngf]=v; toast('Salvo ✓'); if(['imovel_id','corretor','telefone','origem'].includes(d.ngf)){ await carregar(); render(); } }catch(err){ falha(err); } })(); }
  if(d.ngvisst||d.ngvisfb){ e.stopImmediatePropagation(); const id=d.ngvisst||d.ngvisfb, patch=d.ngvisst?{status:el.value}:{feedback:el.value.trim()||null};
    (async()=>{ try{ await q(sb.from('visitas').update(patch).eq('id',id)); Object.assign((D.visitas||[]).find(x=>x.id===id)||{},patch); toast('Visita atualizada ✓'); }catch(err){ falha(err); } })(); }
  if(d.ngpropst){ e.stopImmediatePropagation(); const id=d.ngpropst;
    (async()=>{ try{ await q(sb.from('propostas').update({status:el.value}).eq('id',id)); Object.assign((D.propostas||[]).find(x=>x.id===id)||{},{status:el.value}); toast(el.value==='aceita'?'Proposta aceita ✓ · pode avançar o negócio':'Proposta atualizada ✓'); render(); }catch(err){ falha(err); } })(); }
}, true);
document.addEventListener('submit', e=>{
  const f=e.target; if(!S.me) return; const g=s=>{ const x=f.querySelector(s); return x?x.value.trim():''; };
  if(f.id==='f-neg'){ e.preventDefault(); e.stopImmediatePropagation(); return; }
  if(f.id==='f-ngnovo'){ e.preventDefault(); e.stopImmediatePropagation();
    return acao(async()=>{ const r=await q(sb.from('negocios').insert({nome:g('#nn-n'), telefone:g('#nn-t')||null, interesse:g('#nn-i'), origem:g('#nn-o')||null, imovel_id:g('#nn-imv')||null, corretor:g('#nn-c')||null, obs:g('#nn-obs')||null, criado_por:S.me.nome}).select().single());
      S.modal=null; if(r&&r.id) S.negOpen=r.id; }, '📥 Lead criado'); }
  if(f.id==='f-ngvis'){ e.preventDefault(); e.stopImmediatePropagation(); const n=D.negocios.find(x=>x.id===f.dataset.n), im=D.imoveis.find(x=>x.id===g('#ngv-i'));
    if(!g('#ngv-q')) return toast('Informe a data e a hora'); if(!im) return toast('Escolha o imóvel');
    return acao(async()=>{ await q(sb.from('visitas').insert({negocio_id:n.id, imovel_id:im.id, captacao_id:im.captacao_id||null, quando:new Date(g('#ngv-q')).toISOString(), visitante:n.nome, visitante_tel:n.telefone||null, corretor:n.corretor||S.me.nome}));
      if(!n.imovel_id) await q(sb.from('negocios').update({imovel_id:im.id}).eq('id',n.id)); }, 'Visita agendada 🗓️'); }
  if(f.id==='f-ngprop'){ e.preventDefault(); e.stopImmediatePropagation(); const n=D.negocios.find(x=>x.id===f.dataset.n), im=D.imoveis.find(x=>x.id===g('#ngp-i')), v=num(g('#ngp-v'));
    if(!im) return toast('Escolha o imóvel'); if(!v) return toast('Informe o valor');
    return acao(async()=>{ await q(sb.from('propostas').insert({negocio_id:n.id, imovel_id:im.id, captacao_id:im.captacao_id||null, proponente:n.nome, proponente_tel:n.telefone||null, tipo:n.interesse==='Locação'?'Locação':'Venda', valor:v, condicoes:g('#ngp-c')||null, corretor:n.corretor||S.me.nome}));
      if(!n.imovel_id) await q(sb.from('negocios').update({imovel_id:im.id}).eq('id',n.id)); }, 'Proposta registrada · o proprietário já vê no Citihaus+'); }
}, true);
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && S.negOpen && !S.modal){ S.negOpen=null; render(); } });
if(S.me) carregar().then(render).catch(()=>{});
})();
