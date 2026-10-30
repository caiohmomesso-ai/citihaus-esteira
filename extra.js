/* Citihaus · Esteira — resumo do contrato (bolinhas) e chamado aberto pela equipe */
(function(){
/* ---------- resumo do contrato (bolinhas verde/vermelho) ---------- */
const hojeISO = () => new Date(Date.now()-3*3600e3).toISOString().slice(0,10);
function resumoItens(etapa, tar, sit, docsFalta){
  tar = tar||{}; sit = sit||{};
  if(sit.docs_comprovados) docsFalta = 0;
  const fase = (st, ok, txtOk, txtBad) => etapa < st ? {st:'na', det:'Etapa ainda não iniciada'} : etapa === st && !ok ? {st:'na', det:'Em andamento'} : ok ? {st:'ok', det:txtOk} : {st:'bad', det:txtBad};
  const it = [];
  it.push(Object.assign({rot:'Documentos'}, docsFalta ? (etapa===0?{st:'na',det:'Faltam '+docsFalta+' item(ns)'}:{st:'bad',det:'Faltam '+docsFalta+' item(ns)'}) : {st:'ok',det:'Completos'}));
  it.push(Object.assign({rot:'Contrato assinado'}, fase(2, tar['2-1'], 'Assinado por todas as partes', 'Assinatura pendente')));
  it.push(Object.assign({rot:'Laudo de vistoria'}, fase(3, tar['3-1'], 'Enviado', 'Laudo não enviado')));
  let seg;
  if(etapa < 4) seg = {st:'na', det:'Etapa ainda não iniciada'};
  else if(!tar['4-1']) seg = etapa===4 ? {st:'na', det:'Em contratação'} : {st:'bad', det:'Apólice não entregue'};
  else if(sit.seguro_venc && sit.seguro_venc < hojeISO()) seg = {st:'bad', det:'Vencido em '+dataBR(sit.seguro_venc)};
  else seg = {st:'ok', det: sit.seguro_venc ? 'Vigente até '+dataBR(sit.seguro_venc) : 'Apólice emitida'};
  it.push(Object.assign({rot:'Seguro incêndio'}, seg));
  it.push(Object.assign({rot:'Entrega das chaves'}, fase(5, tar['5-0'], 'Termo assinado', 'Termo de entrega sem assinatura')));
  let bol;
  if(etapa < 6) bol = {st:'na', det:'Começa após a entrada'};
  else if(sit.boleto === 'aberto') bol = {st:'bad', det:'Boleto em aberto'+(sit.boleto_obs?' · '+sit.boleto_obs:'')};
  else if(sit.boleto === 'em_dia') bol = {st:'ok', det:'Em dia'};
  else bol = {st:'na', det:'Sem informação'};
  it.push(Object.assign({rot:'Boleto do aluguel'}, bol));
  return it;
}
const COR = {ok:'var(--ok)', bad:'var(--bad)', na:'var(--line)'};
function resumoHtml(itens, titulo){
  const ruins = itens.filter(i=>i.st==='bad').length;
  return `<div class="box resumo"><div class="row between" style="margin-bottom:10px"><h2 style="margin:0">${titulo||'Resumo do contrato'}</h2>${ruins?`<span class="pill p-bad">${ruins} pendência${ruins>1?'s':''}</span>`:'<span class="pill p-ok">Tudo certo</span>'}</div>
   <div style="display:grid;gap:8px">${itens.map(i=>`<div style="display:flex;align-items:center;gap:10px"><span style="width:12px;height:12px;border-radius:50%;flex:none;background:${COR[i.st]}"></span><b style="font-size:13.5px;min-width:130px">${esc(i.rot)}</b><span class="muted" style="font-size:13px">${esc(i.det)}</span></div>`).join('')}</div></div>`;
}
function bolinhas(itens){ return `<span style="display:inline-flex;gap:4px">${itens.map(i=>`<span title="${esc(i.rot+': '+i.det)}" style="width:10px;height:10px;border-radius:50%;background:${COR[i.st]}"></span>`).join('')}</span>`; }
function docsFaltaEquipe(c){ return partesDe(c).reduce((a,x)=>a+pend(x.pessoa_id,x.papel).length,0); }
const resumoC = c => resumoItens(c.etapa, c.tarefas, c.situacao, docsFaltaEquipe(c));

window.resumoPortalHtml = () => { const d=PS.d; return resumoHtml(resumoItens(d.contrato.etapa, d.contrato.tarefas, d.contrato.situacao, portalPend(d).length)); };
/* portal: resumo logo abaixo da saudação */
const portalRenderOrig2 = portalRender;
portalRender = function(){
  portalRenderOrig2();
  const d = PS.d; if(!d) return;
  const falta = portalPend(d).length;
  const hello = document.querySelector('.portal .hello');
  if(hello) hello.insertAdjacentHTML('afterend', resumoHtml(resumoItens(d.contrato.etapa, d.contrato.tarefas, d.contrato.situacao, falta)));
};

/* equipe: resumo + controles no contrato, bolinhas na lista de ativos */
const drawerOrig3 = drawer;
drawer = function(c){
  const sit = c.situacao||{};
  const ctrl = `<div class="sec"><h3>Situação do contrato</h3>${resumoHtml(resumoC(c),'Como o cliente vê')}
    <form id="f-sit" data-c="${c.id}" style="margin-top:10px;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;align-items:end">
      <label class="f">Seguro vence em<input id="s-venc" type="date" value="${esc(sit.seguro_venc||'')}"></label>
      <label class="f">Boleto do mês<select id="s-bol"><option value="">Sem informação</option><option value="em_dia" ${sit.boleto==='em_dia'?'selected':''}>Em dia</option><option value="aberto" ${sit.boleto==='aberto'?'selected':''}>Em aberto</option></select></label>
      <label class="f">Observação do boleto<input id="s-obs" value="${esc(sit.boleto_obs||'')}" placeholder="Ex.: outubro vencido em 10/10"></label>
      <button class="btn" type="submit">Salvar situação</button></form></div>`;
  return drawerOrig3(c).replace('<div class="sec"><h3>Partes do contrato</h3>', ctrl + '<div class="sec"><h3>Partes do contrato</h3>');
};
const ativosOrig = window.ativosHtml;
window.ativosHtml = function(){
  return ativosOrig().replace('<th>Situação</th><th></th>','<th>Situação</th><th>Resumo</th><th></th>')
    .replace(/<td><button class="btn sm" data-open="([^"]+)">Abrir<\/button><\/td>/g, (m,id)=>{ const c=D.contratos.find(k=>k.id===id); return '<td>'+(c?bolinhas(resumoC(c)):'')+'</td>'+m; });
};

/* equipe abre chamado com inquilino / proprietário / fiador */
const parteOrig2 = parteHtml;
parteHtml = function(c, x){
  return parteOrig2(c, x).replace(`<button class="btn sm" data-senhacli="${x.pessoa_id}">`, `<button class="btn sm" data-chequipe="${x.id}">Abrir chamado</button><button class="btn sm" data-senhacli="${x.pessoa_id}">`);
};
const TIPOS_EQ = ['Aviso da Citihaus','Documento pendente','Boleto em aberto','Seguro incêndio','Vistoria','Manutenção','Renovação ou rescisão','Assinatura pendente'];
const modalOrig2 = modalHtml;
modalHtml = function(){
  const m = S.modal;
  if(m.tipo === 'chequipe'){ const x=D.partes.find(k=>k.id===m.pid), p=P(x.pessoa_id), c=D.contratos.find(k=>k.id===x.contrato_id);
    return `<div class="ov center"><form class="modal" id="f-chequipe" data-pid="${x.id}">
     <div class="m-h"><span class="mono" style="color:var(--accent-ink)">Contrato ${c.numero} · ${esc(PAPEL[x.papel])}</span><h2 style="font-size:19px;margin-top:4px">Abrir chamado com ${esc(nomeP(p,x.papel))}</h2></div>
     <div class="m-b">
      <label class="f full">Assunto<select id="q-tipo">${TIPOS_EQ.map(t=>`<option>${t}</option>`).join('')}</select></label>
      <label class="f full">Mensagem para o cliente<textarea class="ta" id="q-txt" rows="4" required placeholder="Ex.: Precisamos da assinatura no termo de entrega das chaves."></textarea></label>
      <div class="note full">O chamado aparece no portal do cliente como “Aguardando você”. Para avisar, mande também a mensagem no WhatsApp.</div>
     </div>
     <div class="m-f"><button type="button" class="btn" data-mclose="1">Cancelar</button><button class="btn pri" type="submit">Abrir chamado</button></div></form></div>`; }
  return modalOrig2();
};
document.addEventListener('click', e=>{
  const t=e.target.closest('button[data-chequipe]'); if(!t) return; e.stopImmediatePropagation();
  S.modal={tipo:'chequipe', pid:t.dataset.chequipe}; render();
}, true);
document.addEventListener('submit', e=>{
  const f=e.target; if(f.id!=='f-sit' && f.id!=='f-chequipe') return;
  e.preventDefault(); e.stopImmediatePropagation();
  if(f.id==='f-sit'){ const cid=f.dataset.c, c=D.contratos.find(k=>k.id===cid);
    const sit=Object.assign({}, c.situacao||{}, {seguro_venc:f.querySelector('#s-venc').value||null, boleto:f.querySelector('#s-bol').value||null, boleto_obs:f.querySelector('#s-obs').value.trim()});
    return acao(async()=>{ await q(sb.from('contratos').update({situacao:sit}).eq('id',cid)); await log(cid,'Situação atualizada por '+S.me.nome+(sit.boleto==='aberto'?' · boleto em aberto':'')+(sit.seguro_venc?' · seguro até '+dataBR(sit.seguro_venc):'')); }, 'Situação salva. O cliente já vê no portal.'); }
  const x=D.partes.find(k=>k.id===f.dataset.pid);
  return acao(async()=>{ const id=await q(sb.rpc('equipe_abrir_chamado',{p_parte:x.id,p_tipo:f.querySelector('#q-tipo').value,p_texto:f.querySelector('#q-txt').value}));
    S.modal=null; S.open=null; S.chTeam=id; }, 'Chamado aberto. Avise o cliente pelo WhatsApp.');
}, true);


if(!TOKEN && S.me) render();
if(TOKEN && PS.d) portalRender();
})();
