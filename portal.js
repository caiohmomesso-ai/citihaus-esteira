/* Citihaus · Meu Contrato — portal do cliente por fase do contrato
   Em contrato → Contrato assinado → Contrato ativo → Desocupação → Encerrado */
(function(){
if(!TOKEN) return;
PS.fia = PS.fia || null; PS.editar = PS.editar || null; PS.resAberto = PS.resAberto || false; PS.fiaLink = PS.fiaLink || false;
const DE = ['Aviso de saída','Vistoria de saída','Reparos e acerto','Entrega das chaves'];
const FASES = [['contrato','Em contrato'],['assinado','Assinado'],['ativo','Ativo'],['desoc','Desocupação'],['encerrado','Encerrado']];

function fase(d){
  const c=d.contrato||{}, ds=(c.situacao||{}).desocupacao, t=c.tarefas||{};
  if(ds && ds.etapa>=4) return 'encerrado';
  if(ds) return 'desoc';
  if(c.etapa===6) return 'ativo';
  if(c.etapa>=3 || t['2-1']) return 'assinado';
  return 'contrato';
}
const addMeses = (iso, m) => { const d=new Date(iso+'T12:00:00'); const dia=d.getDate(); d.setDate(1); d.setMonth(d.getMonth()+m); const ult=new Date(d.getFullYear(), d.getMonth()+1, 0).getDate(); d.setDate(Math.min(dia, ult)); return d; };
const iso = d => d.toISOString().slice(0,10);
const diasAte = d => Math.ceil((d - new Date()) / 864e5);
const tempoTxt = dias => { if(dias<0) return Math.abs(dias)+' dia'+(Math.abs(dias)===1?'':'s')+' atrás'; if(dias<45) return dias+' dia'+(dias===1?'':'s'); const m=Math.floor(dias/30.44), r=Math.round(dias-m*30.44); return m+' mes'+(m===1?'':'es')+(r?' e '+r+' dia'+(r===1?'':'s'):''); };

/* ---------- status ---------- */
function status(d){
  const c=d.contrato, sit=c.situacao||{}, ds=sit.desocupacao, F=fase(d);
  if(F==='encerrado') return {ic:'🏁', cor:'var(--muted)', bg:'var(--surface-2)', tit:'Imóvel desocupado', det:'Contrato encerrado'+(ds.encerrado_em?' em '+dataBR(ds.encerrado_em):'')+'. Obrigado pela parceria!'};
  if(F==='desoc') return {ic:'🚚', cor:'var(--warn)', bg:'var(--warn-soft)', tit:'Em desocupação', det:'Etapa: '+DE[ds.etapa]+(ds.saida_prevista?' · saída prevista '+dataBR(ds.saida_prevista):'')};
  if(F==='ativo') return {ic:'✅', cor:'var(--ok)', bg:'var(--ok-soft)', tit:'Contrato ativo', det:(c.entrada?'Em vigor desde '+dataBR(c.entrada)+'. ':'')+'Precisa de algo? Abra um chamado aqui embaixo.'};
  const ce=CLIENTE_ETAPAS[c.etapa]||['Em andamento',''];
  if(F==='assinado') return {ic:'✍️', cor:'var(--accent-ink)', bg:'var(--accent-soft)', tit:'Contrato assinado', det:'Agora: '+ce[0]+(ce[1]?' — '+ce[1]:'')};
  return {ic:'📝', cor:'var(--info)', bg:'var(--info-soft)', tit:'Em contrato', det:'Etapa '+(c.etapa+1)+' de 6 · '+ce[0]+(ce[1]?' — '+ce[1]:'')};
}
function statusHtml(d){
  const s=status(d), F=fase(d), k=FASES.findIndex(x=>x[0]===F);
  return `<div class="box status-imv" style="background:${s.bg};border-color:transparent">
    <div style="display:flex;gap:12px;align-items:center"><div style="font-size:30px;line-height:1">${s.ic}</div>
      <div style="min-width:0"><div style="font-size:11.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${s.cor}">Status do imóvel</div>
      <div style="font-family:var(--f-display);font-size:19px;font-weight:700">${esc(s.tit)}</div>
      <div class="muted" style="font-size:13px">${esc(s.det)}</div></div></div>
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-top:12px">${FASES.map(([id,n],i)=>`<div><div style="height:6px;border-radius:99px;background:${i<k?'var(--ok)':i===k?s.cor:'var(--line)'}"></div><div style="font-size:10.5px;margin-top:4px;color:${i===k?'var(--fg)':'var(--muted)'};font-weight:${i===k?700:500}">${n}</div></div>`).join('')}</div>
  </div>`;
}

/* ---------- peças ---------- */
function andamentoHtml(d){
  const c=d.contrato, etapa=c.etapa, pe=portalPend(d);
  const tl=CLIENTE_ETAPAS.map(([t,s],i)=>{const st=etapa>i||etapa===6?'done':etapa===i?'now':''; return `<div class="tl-i ${st}"><div class="dot">${st==='done'?'✓':i+1}</div><div><b>${t}</b><span>${st==='now'?(i===0&&pe.length?'Faltam '+pe.length+' itens seus':'Em andamento'):s}</span></div></div>`}).join('');
  return `<div class="box"><h2>Andamento do contrato</h2><div class="tl">${tl}</div></div>`;
}
function docsHtml(pd, papel, attr, titulo){
  const st=docStatusMap(pd.documentos), p=pd.pessoa||{};
  const ds=reqDocs(papel,p.estado_civil).map(t=>{const o=st[t]||{status:'pendente'};
    const tag={pendente:'<span class="pill p-warn">Falta enviar</span>',enviado:'<span class="pill p-info">Recebido · em conferência</span>',ok:'<span class="pill p-ok">Aprovado</span>',refazer:'<span class="pill p-bad">Enviar de novo</span>'}[o.status];
    return `<div class="updoc"><div style="min-width:0;flex:1 1 200px"><div style="font-weight:500">${esc(DOC[t])}</div>${o.obs&&o.status==='refazer'?`<div style="font-size:12.5px;color:var(--bad)">${esc(o.obs)}</div>`:''}</div>
     <div class="row">${tag}${o.status!=='ok'?`<label class="btn sm ${o.status==='enviado'?'':'pri'} up">${o.status==='enviado'?'Trocar arquivo':'Enviar arquivo'}<input type="file" ${attr}="${t}" accept="image/*,.pdf"></label>`:''}</div></div>`}).join('');
  return `<div class="box"><h2>${titulo}</h2>${ds}<p class="muted" style="font-size:12.5px;margin:10px 0 0">Foto legível ou PDF. Casado(a) ou em união estável: pedimos também a CNH do cônjuge.${papel==='fiador'?' A matrícula do imóvel do fiador precisa estar atualizada.':''}</p></div>`;
}
function pendAviso(d){
  const pe=portalPend(d);
  return pe.length ? `<div class="miss-c">Faltam ${pe.length} ${pe.length>1?'itens':'item'} seus: ${esc(pe.slice(0,3).join(', '))}${pe.length>3?'…':''}${pe.some(x=>['Nome completo','WhatsApp','E-mail','Estado civil','Conta para repasse'].includes(x))?' <button class="btn sm" data-peditar="eu" style="margin-left:6px">✏️ Completar dados</button>':''}</div>`
    : `<div class="ok-c">Sua parte está completa. Acompanhe as próximas etapas por aqui.</div>`;
}
function fiadorHtml(d){
  if(d.papel!=='inquilino' || !d.fiador) return '';
  const f=PS.fia, fp=(f&&f.pessoa)||{}, link=linkPortal(d.fiador.token);
  const msg=`Olá! Você foi indicado(a) como fiador(a) na minha locação com a Citihaus. Por este link você envia seus dados e documentos direto para eles: ${link}`;
  const pend = f ? portalPend(f) : [];
  return `<div class="box" style="border-color:var(--accent)"><div class="row between" style="margin-bottom:8px"><h2 style="margin:0">🤝 Seu fiador</h2>${f?(pend.length?`<span class="pill p-warn">Faltam ${pend.length}</span>`:'<span class="pill p-ok">Completo</span>'):''}</div>
    <p class="muted" style="margin:0 0 10px;font-size:13px">Você mesmo pode preencher os dados e enviar os documentos do seu fiador por aqui.</p>
    ${f?`<div class="row between" style="padding:10px 12px;background:var(--surface-2);border-radius:10px;margin-bottom:10px"><div><b>${esc(fp.nome||'Fiador ainda sem nome')}</b><div class="muted" style="font-size:12.5px">${esc([fp.telefone,fp.email,fp.estado_civil].filter(Boolean).join(' · ')||'Dados não preenchidos')}</div></div><button class="btn sm" data-peditar="fia">✏️ Editar dados</button></div>
      ${docsHtml(f,'fiador','data-fup','Documentos do fiador').replace('<div class="box">','<div>').replace('<h2>','<h3 style="font-size:14px;margin:4px 0 8px">').replace('</h2>','</h3>')}`:'<p class="muted">Carregando…</p>'}
    <details style="margin-top:10px" ${PS.fiaLink?'open':''}><summary style="cursor:pointer;font-size:13px;font-weight:600">Prefere que o fiador preencha? Envie o link para ele</summary>
      <div class="linkbox" style="border-radius:10px;margin-top:8px"><code>${esc(link)}</code><button class="btn sm" data-copytxt="${esc(msg)}">Copiar mensagem</button><a class="btn sm" style="text-decoration:none;color:#fff;background:#25D366;border-color:#25D366" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(msg)}">💬 WhatsApp</a></div></details>
  </div>`;
}
function prazoHtml(c){
  const sit=c.situacao||{}; if(!c.entrada) return '';
  const ini=new Date(c.entrada+'T12:00:00'), fim=sit.fim?new Date(sit.fim+'T12:00:00'):addMeses(c.entrada,30), est=!sit.fim;
  let k=1, re=addMeses(c.entrada,12); while(re<=new Date() && k<20){ k++; re=addMeses(c.entrada,12*k); }
  const total=Math.max(1,fim-ini), pass=Math.min(100,Math.max(0,Math.round((Date.now()-ini)/total*100)));
  const dF=diasAte(fim), dR=diasAte(re);
  return `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:4px 0 12px">
    <div style="background:var(--surface-2);border-radius:12px;padding:12px"><div style="font-size:12px;color:var(--muted);font-weight:600">⏳ Fim do contrato</div><div style="font-family:var(--f-display);font-size:18px;font-weight:700">${dF>=0?'faltam '+tempoTxt(dF):'encerrado'}</div><div class="muted" style="font-size:12px">${dataBR(iso(fim))}${est?' (estimado: 30 meses)':''}</div>
      <div style="height:6px;border-radius:99px;background:var(--line);margin-top:8px;overflow:hidden"><i style="display:block;height:100%;width:${pass}%;background:var(--accent)"></i></div></div>
    <div style="background:var(--surface-2);border-radius:12px;padding:12px"><div style="font-size:12px;color:var(--muted);font-weight:600">📈 Próximo reajuste</div><div style="font-family:var(--f-display);font-size:18px;font-weight:700">${re<=fim?'em '+tempoTxt(dR):'—'}</div><div class="muted" style="font-size:12px">${re<=fim?dataBR(iso(re)):'Sem reajuste até o fim'} · ${esc(sit.indice||'índice do contrato')}</div></div>
  </div>`;
}
function resumoHtml(d){
  let base=''; const sit0=d.contrato.situacao;
  try{ if(sit0 && sit0.importado) d.contrato.situacao=Object.assign({}, sit0, {docs_comprovados:true}); base=window.resumoPortalHtml?window.resumoPortalHtml():''; }catch(_){} finally{ d.contrato.situacao=sit0; }
  const tmp=document.createElement('div'); tmp.innerHTML=base; const r=tmp.firstElementChild;
  const pill=r?r.querySelector('.pill'):null, grade=r&&r.children[1]?r.children[1].outerHTML:'';
  return `<div class="box resumo-c"><div class="row between" data-restg="1" role="button" tabindex="0" aria-expanded="${PS.resAberto}" style="cursor:pointer"><h2 style="margin:0">Resumo do contrato</h2><div class="row" style="gap:8px">${pill?pill.outerHTML:''}<span class="muted" style="font-size:13px;font-weight:600">${PS.resAberto?'Fechar ▴':'Ver ▾'}</span></div></div>
    <div ${PS.resAberto?'':'hidden'} style="margin-top:12px">${prazoHtml(d.contrato)}${grade}</div></div>`;
}
function desocHtml(d){
  const c=d.contrato, ds=(c.situacao||{}).desocupacao, t=ds.tarefas||{}, papel=d.papel;
  const passos=DE.map((e,i)=>`<div><div style="height:6px;border-radius:99px;background:${ds.etapa>i?'var(--ok)':ds.etapa===i?'var(--warn)':'var(--line)'}"></div><div style="font-size:10.5px;margin-top:4px;font-weight:${ds.etapa===i?700:500};color:${ds.etapa===i?'var(--fg)':'var(--muted)'}">${e}</div></div>`).join('');
  const item=(ok, txt, sub)=>`<div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid var(--line)"><span style="font-size:16px">${ok?'✅':'⬜'}</span><div><div style="font-weight:${ok?500:600};${ok?'color:var(--muted)':''}">${txt}</div>${sub?`<div class="muted" style="font-size:12.5px">${sub}</div>`:''}</div></div>`;
  const lista = papel==='inquilino' ? [
      item(t['0-0'], 'Aviso de saída enviado', ds.aviso?'Recebido em '+dataBR(ds.aviso):''),
      item(t['1-0'], 'Agendar a vistoria de saída', ds.vistoria?'Marcada para '+dataBR(ds.vistoria):'A Citihaus vai combinar o dia com você'),
      item(t['1-1'], 'Deixar o imóvel vazio, limpo e como na vistoria de entrada', 'Pintura, chaves, controles e reparos combinados'),
      item(t['2-1'], 'Quitar as contas finais de energia, água e gás', 'Envie os comprovantes por um chamado aqui no portal'),
      item(t['3-0']&&t['3-1'], 'Devolver as chaves e assinar o termo de entrega', ds.saida_prevista?'Saída prevista: '+dataBR(ds.saida_prevista):'')]
    : [
      item(t['0-0'], 'Aviso de saída do inquilino recebido', ds.aviso?'Em '+dataBR(ds.aviso):''),
      item(t['1-1'], 'Vistoria de saída', ds.vistoria?'Marcada para '+dataBR(ds.vistoria):'A agendar'),
      item(t['2-0']&&t['2-2'], 'Reparos e acerto final', 'Você recebe o resumo do acerto'),
      item(t['3-0']&&t['3-1'], 'Chaves devolvidas à Citihaus', ds.saida_prevista?'Saída prevista: '+dataBR(ds.saida_prevista):''),
      item(false, 'Imóvel liberado para nova locação', 'A Citihaus fala com você para anunciar de novo')];
  return `<div class="box" style="border-color:var(--amber)"><h2>🚚 Desocupação</h2>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px">${passos}</div>
    <div style="font-size:12.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:2px">${papel==='inquilino'?'O que você precisa fazer':'Como está a saída'}</div>
    ${lista.join('')}
    <p class="muted" style="font-size:12.5px;margin:10px 0 0">Dúvidas sobre a saída? Abra um chamado aqui embaixo ou fale pelo WhatsApp ${esc(CFG.WHATSAPP)}.</p></div>`;
}
function editarModal(d){
  const quem=PS.editar, f = quem==='fia' ? PS.fia : d; if(!f) return '';
  const p=f.pessoa||{}, papel=quem==='fia'?'fiador':d.papel;
  return `<div class="ov center" data-pfechar="1" style="position:fixed;inset:0;background:rgba(30,20,15,.45);display:flex;align-items:center;justify-content:center;z-index:40;padding:16px">
   <form class="modal" id="${quem==='fia'?'dados-fia':'dados'}" style="width:min(520px,100%)">
    <div class="m-h"><span class="mono" style="color:var(--accent-ink)">${quem==='fia'?'Dados do fiador':PAPEL[papel]}</span><h2 style="font-size:19px;margin-top:4px">✏️ ${quem==='fia'?'Editar dados do fiador':'Seus dados'}</h2></div>
    <div class="m-b"><div class="fgrid">
     <label class="f full">Nome completo<input id="d-nome" value="${esc(p.nome)}" placeholder="Como está na CNH" autocomplete="name"></label>
     <label class="f">WhatsApp<input id="d-tel" value="${esc(p.telefone)}" inputmode="tel" autocomplete="tel"></label>
     <label class="f">E-mail<input id="d-email" type="email" value="${esc(p.email)}" placeholder="seu@email.com" autocomplete="email"></label>
     <label class="f ${papel==='proprietario'?'':'full'}">Estado civil<select id="d-est"><option value="">Selecione</option>${ESTADOS.map(o=>`<option ${p.estado_civil===o?'selected':''}>${o}</option>`).join('')}</select></label>
     ${papel==='proprietario'?`<label class="f">Conta para repasse<input id="d-banco" value="${esc(p.banco)}" placeholder="Banco · Agência · Conta · PIX"></label>`:''}
    </div></div>
    <div class="m-f"><button type="button" class="btn" data-pfechar="1">Cancelar</button><button class="btn pri" type="submit">Salvar dados</button></div></form></div>`;
}

/* ---------- tela ---------- */
portalRender = function(){
  const d=PS.d; if(!d) return; const c=d.contrato, p=d.pessoa||{}, papel=d.papel, F=fase(d);
  topEl.hidden=false; topEl.className='top top-portal';
  topEl.innerHTML=`<div class="wrap top-in"><div class="brand"><img src="${LOGO}" alt="Citihaus"><span>Contrato ${c.numero}</span></div>
    <button class="btn sm" data-peditar="eu" title="Editar meus dados" style="max-width:60vw"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">👤 ${esc(p.nome?p.nome.split(' ')[0]:'Meus dados')}</span> ✏️</button></div>`;
  const sub = {contrato:'Acompanhe aqui a locação do '+c.imovel+' e envie seus documentos.', assinado:'Contrato do '+c.imovel+' assinado. Veja os próximos passos até as chaves.',
    ativo:'Seu contrato do '+c.imovel+' está ativo.', desoc:'Acompanhe a desocupação do '+c.imovel+'.', encerrado:'O contrato do '+c.imovel+' foi encerrado.'}[F];
  const slot='<div class="resumo" hidden></div>';
  let corpo='';
  if(F==='contrato') corpo = pendAviso(d) + andamentoHtml(d) + docsHtml(d,papel,'data-pup','Seus documentos') + fiadorHtml(d) + slot;
  if(F==='assinado') corpo = andamentoHtml(d) + slot;
  if(F==='ativo') corpo = (papel==='fiador' ? '' : resumoHtml(d) + chBoxPortal()) + slot;
  if(F==='desoc') corpo = desocHtml(d) + (papel==='fiador' ? '' : chBoxPortal()) + slot;
  if(F==='encerrado') corpo = `<div class="box" style="text-align:center"><div style="font-size:40px">🧡</div><h2>Obrigado pela parceria!</h2><p class="muted" style="margin:0">Quando precisar de um imóvel de novo, a Citihaus está aqui. WhatsApp ${esc(CFG.WHATSAPP)}.</p></div>` + slot;
  app.innerHTML=`<div class="wrap"><div class="portal">
   <section class="hello"><small>${PAPEL[papel]} · Contrato ${c.numero}</small><h1>Olá${p.nome?', '+esc(p.nome.split(' ')[0]):''}</h1><p>${esc(sub)}</p>
   <div class="kv"><span>Aluguel <b>${brl(c.aluguel)}</b></span>${c.entrada?`<span>Entrada <b>${dataBR(c.entrada)}</b></span>`:''}<span>Garantia <b>${esc(c.garantia)}</b></span></div></section>
   ${statusHtml(d)}
   ${corpo}
   <div class="lgpd"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>
   <span>Você vê apenas os seus dados e documentos. Só a equipe Citihaus tem acesso. Dúvidas: WhatsApp ${esc(CFG.WHATSAPP)}.</span></div>
  </div>${PS.editar?editarModal(d):''}</div>`;
};

/* ---------- dados e eventos ---------- */
const portalLoadOrig = portalLoad;
portalLoad = async function(){
  await portalLoadOrig();
  const d=PS.d;
  if(d && d.papel==='inquilino' && d.fiador && d.fiador.token && fase(d)==='contrato'){
    try{ PS.fia = await q(sb.rpc('portal_dados',{p_token:d.fiador.token})); }catch(e){ console.warn('fiador', e); PS.fia=null; }
    portalRender();
  }
};
const fiaTok = () => PS.d && PS.d.fiador && PS.d.fiador.token;
document.addEventListener('click', e=>{
  const t=e.target.closest('button,[data-pfechar],[data-restg]'); if(!t) return; const d=t.dataset;
  if(d.peditar){ e.stopImmediatePropagation(); PS.editar=d.peditar; return portalRender(); }
  if(d.pfechar!==undefined && (e.target===t || t.tagName==='BUTTON')){ e.stopImmediatePropagation(); PS.editar=null; return portalRender(); }
  if(d.restg){ e.stopImmediatePropagation(); PS.resAberto=!PS.resAberto; return portalRender(); }
}, true);
document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && PS.editar){ PS.editar=null; portalRender(); }
  if((e.key==='Enter'||e.key===' ') && e.target.dataset && e.target.dataset.restg){ e.preventDefault(); PS.resAberto=!PS.resAberto; portalRender(); }
});
document.addEventListener('submit', e=>{
  const f=e.target;
  if(f.id==='dados'){ PS.editar=null; return; } /* o app.js salva e recarrega */
  if(f.id==='dados-fia'){ e.preventDefault(); e.stopImmediatePropagation(); const g=id=>{ const x=f.querySelector('#'+id); return x?x.value:''; };
    PS.editar=null;
    return portalAcao(async()=>{ await q(sb.rpc('portal_salvar',{p_token:fiaTok(), p_nome:g('d-nome'), p_telefone:g('d-tel'), p_email:g('d-email'), p_estado:g('d-est'), p_banco:null})); toast('Dados do fiador salvos'); }); }
}, true);
document.addEventListener('change', e=>{
  const el=e.target; if(!el.dataset || !el.dataset.fup || !el.files || !el.files[0]) return; e.stopImmediatePropagation();
  const tipo=el.dataset.fup, file=el.files[0];
  portalAcao(async()=>{ toast('Enviando '+DOC[tipo]+' do fiador…'); const tk=await q(sb.rpc('portal_upload',{p_token:fiaTok(), p_doc_tipo:tipo})); const r=await enviarPonte(tk,file); toast('Recebido! '+r.arquivo); });
}, true);

if(PS.d) portalLoad();
})();
