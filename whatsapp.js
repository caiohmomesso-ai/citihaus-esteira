/* Citihaus · Meu Contrato — WhatsApp: documentos recebidos pelo WhatsApp caem no contrato certo */
(function(){
if(TOKEN) return;
const TIPOS = {cnh:'CNH / RG', resid:'Comprovante de residência', cert:'Certidão nasc./casamento', cnhc:'CNH do cônjuge', mat:'Matrícula do imóvel', iptu:'Capa do IPTU', contas:'Contas de consumo', outro:'Outro (não é documento)'};
const PROV = {zapi:'Z-API (conecta por QR code)', '360dialog':'360dialog (oficial, mantém o app)', meta:'Meta Cloud API (oficial)'};
D.waEnt = D.waEnt || []; D.waP = D.waP || null;

const carregarOrig = carregar;
carregar = async function(){
  await carregarOrig();
  try{
    const [en, p] = await Promise.all([
      q(sb.from('whatsapp_entrada').select('*').order('recebido_em',{ascending:false}).limit(200)),
      q(sb.rpc('equipe_wa_painel')).catch(()=>null)
    ]);
    D.waEnt = en; D.waP = p;
  }catch(e){ console.warn('whatsapp', e); }
};
const quando = d => { const t=new Date(d); return t.toLocaleDateString('pt-BR')+' '+t.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); };
const fmtTel = t => { let d=String(t||'').replace(/\D/g,''); if(d.length>11&&d.startsWith('55')) d=d.slice(2); return d.length===11?`(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`:d.length===10?`(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`:t; };
const ST = {pendente:['p-warn','Para conferir'], salvo:['p-ok','Concluído'], ignorado:['p-mute','Ignorado'], erro:['p-bad','Erro']};

function linhaHtml(e){
  const p=e.pessoa_id?P(e.pessoa_id):null, st=ST[e.status]||ST.pendente, c=e.contrato_id&&(D.contratos.find(k=>k.id===e.contrato_id)||{});
  const pessoas=Object.values(D.pessoas).filter(x=>x.nome).sort((a,b)=>a.nome.localeCompare(b.nome));
  const acao = (e.status==='pendente'||e.status==='erro') && e.arquivo_path && e.tipo_msg!=='audio' && !e.equipe_nome ? `<div class="row" style="gap:6px;margin-top:8px">
      <select data-wap="${e.id}" style="flex:1;min-width:150px;border:1px solid var(--line);border-radius:8px;padding:6px 8px;background:var(--bg)"><option value="">Pessoa…</option>${pessoas.map(x=>`<option value="${x.id}" ${x.id===e.pessoa_id?'selected':''}>${esc(x.nome)}${x.telefone?' · '+esc(x.telefone):''}</option>`).join('')}</select>
      <select data-wat="${e.id}" style="flex:1;min-width:150px;border:1px solid var(--line);border-radius:8px;padding:6px 8px;background:var(--bg)"><option value="">Tipo…</option>${Object.entries(TIPOS).filter(([k])=>k!=='outro').map(([k,v])=>`<option value="${k}" ${k===e.doc_tipo_ia?'selected':''}>${v}</option>`).join('')}</select>
      <button class="btn sm pri" data-wasalvar="${e.id}">Salvar no contrato</button><button class="btn sm" data-waign="${e.id}">Ignorar</button></div>` : '';
  return `<div class="box" style="padding:12px;display:flex;gap:12px;align-items:flex-start">
    <div style="font-size:26px;line-height:1">${e.tipo_msg==='audio'?'🎤':e.tipo_msg==='text'?'💬':e.mime==='application/pdf'?'📄':'🖼️'}</div>
    <div style="flex:1;min-width:0">
      <div class="row between" style="gap:8px"><b>${esc(e.equipe_nome||p&&p.nome||e.nome_contato||'Contato não identificado')}</b>${e.equipe_nome?' <span class="pill p-info">Equipe</span>':''}<span class="pill ${st[0]}">${st[1]}</span></div>
      <div class="muted" style="font-size:12.5px">${fmtTel(e.telefone)} · ${quando(e.recebido_em)}${c&&c.numero?' · Contrato '+c.numero:''}${!e.pessoa_id&&!e.equipe_nome?' · <b style="color:var(--bad)">celular não está no cadastro</b>':''}</div>
      ${e.transcricao?`<div style="font-size:13px;margin-top:6px;background:var(--bg);border-radius:8px;padding:8px 10px">🎤 <i>${esc(e.transcricao.slice(0,600))}${e.transcricao.length>600?'…':''}</i></div>`:''}
      <div style="font-size:13px;margin-top:4px">${e.acao==='chamado'?`🎫 Chamado <b>${esc(e.salvo_como)}</b> ${e.ia_resumo?'· '+esc(e.ia_resumo):''}`:e.acao==='captacao'?`🏠 Captação <b>${esc(e.salvo_como)}</b> criada${e.ia_resumo?' · '+esc(e.ia_resumo):''}`:e.acao==='foto_captacao'?`📸 Foto adicionada à <b>${esc(e.salvo_como)}</b>`:e.tipo_msg==='text'||e.tipo_msg==='audio'?(e.texto&&!e.transcricao?`“${esc(e.texto.slice(0,200))}”`:'Sem ação automática'):e.salvo_como?`✅ Salvo como <b>${esc(TIPOS[e.salvo_como]||e.salvo_como)}</b>`:e.doc_tipo_ia?`🤖 IA: <b>${esc(TIPOS[e.doc_tipo_ia]||e.doc_tipo_ia)}</b>${e.confianca!=null?' ('+Math.round(e.confianca*100)+'%)':''}`:'🤖 Sem leitura da IA'}${!['chamado','captacao'].includes(e.acao)&&e.ia_resumo?' · '+esc(e.ia_resumo):''}${e.acao==='chamado'&&e.texto?` · “${esc(e.texto.slice(0,120))}”`:''}${e.tipo_msg!=='text'&&e.texto?` · “${esc(e.texto.slice(0,80))}”`:''}</div>
      ${e.erro?`<div style="font-size:12px;color:var(--bad);margin-top:2px">${esc(e.erro.slice(0,160))}</div>`:''}
      ${e.arquivo_path?`<a class="btn sm" style="margin-top:8px" href="storage:${esc(e.arquivo_path)}">Ver arquivo</a>`:''}
      ${acao}
    </div></div>`;
}
function configHtml(){
  const W=D.waP||{}, adm=S.me.papel==='admin', pv=W.provider||'zapi';
  const passos = {
    zapi:['Crie a conta em z-api.io e uma instância.','Na instância, leia o QR code com o WhatsApp do (17) 93634-8613 (como no WhatsApp Web).','Copie o ID da instância, o Token e o Client-Token (aba Segurança) para os campos abaixo.','Em Webhooks → "Ao receber", cole o endereço do webhook mostrado aqui.'],
    '360dialog':['Contrate a 360dialog e faça o cadastro com coexistência (mantém o app WhatsApp Business no celular).','Gere a API Key no painel 360dialog e cole abaixo.','Configure o webhook do número com o endereço mostrado aqui.'],
    meta:['No Meta for Developers, crie um app do tipo Business com o produto WhatsApp.','Cole o Phone number ID e um token permanente (usuário do sistema) abaixo.','Em WhatsApp → Configuração, cole o endereço do webhook e o token de verificação, e assine o campo "messages".']
  }[pv];
  return `<div class="box"><div class="row between" style="margin-bottom:8px"><h2 style="margin:0">⚙ Conexão do WhatsApp</h2><span class="pill ${W.ativo&&W.token?'p-ok':'p-warn'}">${W.ativo&&W.token?'Recebendo':'Desligado'}</span></div>
    <p class="muted" style="margin:0 0 10px;font-size:13px">Número: <b>${esc(W.numero||'')}</b> · Transcrição de áudio: ${W.openai?'<b style="color:var(--ok)">ok</b>':'<b style="color:var(--bad)">pendente</b>'} · IA: ${W.ia?'<b style="color:var(--ok)">configurada</b>':'<b style="color:var(--bad)">pendente</b> (chave em Captações → ⚙ Integrações)'}</p>
    ${adm?`<form id="f-wa" class="fgrid">
      <label class="f full">Provedor<select id="wa-prov">${Object.entries(PROV).map(([k,v])=>`<option value="${k}" ${pv===k?'selected':''}>${v}</option>`).join('')}</select></label>
      <ol class="full" style="margin:0;padding-left:18px;font-size:13px;color:var(--muted)">${passos.map(x=>`<li>${x}</li>`).join('')}</ol>
      <label class="f full">${pv==='zapi'?'ID da instância':pv==='meta'?'Phone number ID':'(não precisa)'}<input id="wa-extra" value="${esc(W.extra||'')}" ${pv==='360dialog'?'disabled':''}></label>
      <label class="f">${pv==='zapi'?'Token da instância':pv==='meta'?'Token de acesso':'API Key'} ${W.token?'<span style="color:var(--ok)">✓</span>':''}<input id="wa-tok" type="password" autocomplete="off" placeholder="${W.token?'Deixe vazio para manter':''}"></label>
      <label class="f">${pv==='zapi'?'Client-Token (segurança)':'—'}<input id="wa-tok2" type="password" autocomplete="off" ${pv==='zapi'?'':'disabled'}></label>
      <div class="full note" style="word-break:break-all"><b>Endereço do webhook:</b> ${esc(W.webhook||'')} <button type="button" class="btn sm" data-copytxt="${esc(W.webhook||'')}">Copiar</button>
        ${pv==='meta'&&W.verify_token?`<br><b>Token de verificação:</b> ${esc(W.verify_token)} <button type="button" class="btn sm" data-copytxt="${esc(W.verify_token)}">Copiar</button>`:''}</div>
      <label class="f full">Chave da OpenAI (transcrever áudios) ${W.openai?'<span style="color:var(--ok)">✓ configurada</span>':''}<input id="wa-openai" type="password" autocomplete="off" placeholder="${W.openai?'Deixe vazio para manter':'sk-…'}"></label>
      <label class="f" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="wa-ch" ${W.chamados!==false?'checked':''} style="width:18px;height:18px;accent-color:var(--accent)"> Abrir chamados automaticamente</label>
      <label class="f" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="wa-cap" ${W.captacao!==false?'checked':''} style="width:18px;height:18px;accent-color:var(--accent)"> Captação por áudio da equipe</label>
      <label class="f" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="wa-on" ${W.ativo?'checked':''} style="width:18px;height:18px;accent-color:var(--accent)"> Receber documentos</label>
      <label class="f" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="wa-resp" ${W.responder?'checked':''} style="width:18px;height:18px;accent-color:var(--accent)"> Responder "Recebemos sua CNH ✅"</label>
      <div class="full row" style="justify-content:flex-end"><button class="btn pri" type="submit">Salvar</button></div>
    </form>`:'<div class="note">Só o administrador configura a conexão.</div>'}
  </div>`;
}
function whatsappHtml(){
  const L=D.waEnt, f=S.waFiltro||'pendente', W=D.waP||{};
  const lista=L.filter(e=>f==='todos'||e.status===f||(f==='pendente'&&e.status==='erro'));
  const n=s=>L.filter(e=>e.status===s||(s==='pendente'&&e.status==='erro')).length;
  return `<div class="head"><div><h1>WhatsApp</h1><p>Tudo o que chega no WhatsApp da Citihaus: documentos vão para o contrato, pedidos viram chamado e áudios da equipe descrevendo imóvel viram captação. O que a IA não tiver certeza fica para você conferir.</p></div></div>
  <div class="stats">
    <div class="stat hl"><b>${n('pendente')}</b><span>para conferir</span></div>
    <div class="stat"><b>${n('salvo')}</b><span>salvos automaticamente ou pela equipe</span></div>
    <div class="stat"><b>${W.hoje||0}</b><span>recebidos nas últimas 24h</span></div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;margin-top:18px;align-items:start">
    <div><div class="seg-b" style="margin-bottom:10px">${[['pendente','Para conferir'],['salvo','Salvos'],['ignorado','Ignorados'],['todos','Todos']].map(([k,v])=>`<button data-wafil="${k}" aria-pressed="${f===k}">${v}</button>`).join('')}</div>
      <div style="display:grid;gap:10px">${lista.length?lista.map(linhaHtml).join(''):'<div class="empty">Nada por aqui.</div>'}</div></div>
    ${configHtml()}
  </div>`;
}

const renderOrig = render;
render = function(){
  renderOrig();
  if(!S.me || TOKEN) return;
  const nav=document.querySelector('nav.sub'); if(!nav) return;
  if(!nav.querySelector('[data-tab="whatsapp"]')){
    const n=D.waEnt.filter(e=>e.status==='pendente'||e.status==='erro').length;
    const ref=nav.querySelector('[data-tab="mensagens"]')||nav.querySelector('[data-tab="chamados"]')||nav.lastElementChild;
    ref.insertAdjacentHTML('afterend', `<button data-tab="whatsapp" aria-pressed="${S.tab==='whatsapp'}">WhatsApp${n?`<span class="tabn">${n}</span>`:''}</button>`);
  }
  if(S.tab==='whatsapp'){
    nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.tab==='whatsapp'));
    const w=document.querySelector('#app .wrap'); [...w.children].forEach(ch=>{ if(ch!==nav) ch.remove(); });
    w.insertAdjacentHTML('beforeend', whatsappHtml());
  }
};

document.addEventListener('click', e=>{
  const b=e.target.closest('button'); if(!b) return; const d=b.dataset;
  if(d.tab==='whatsapp'){ e.stopImmediatePropagation(); S.tab='whatsapp'; S.open=null; S.chTeam=null; try{history.replaceState(null,'','#whatsapp');}catch(_){} return render(); }
  if(d.wafil){ e.stopImmediatePropagation(); S.waFiltro=d.wafil; return render(); }
  if(d.wasalvar){ e.stopImmediatePropagation(); const id=d.wasalvar, pe=document.querySelector(`[data-wap="${id}"]`).value, tp=document.querySelector(`[data-wat="${id}"]`).value;
    if(!pe||!tp) return toast('Escolha a pessoa e o tipo do documento');
    return acao(async()=>{ await q(sb.rpc('equipe_wa_salvar',{p_entrada:id, p_pessoa:pe, p_tipo:tp})); }, 'Documento salvo no contrato'); }
  if(d.waign){ e.stopImmediatePropagation(); return acao(async()=>{ await q(sb.from('whatsapp_entrada').update({status:'ignorado'}).eq('id',d.waign)); }, 'Ignorado'); }
}, true);
document.addEventListener('change', e=>{ if(e.target.id==='wa-prov'){ e.stopImmediatePropagation(); D.waP=Object.assign({}, D.waP, {provider:e.target.value}); render(); } }, true);
document.addEventListener('submit', e=>{
  if(e.target.id!=='f-wa') return; e.preventDefault(); e.stopImmediatePropagation(); const f=e.target, g=id=>f.querySelector('#'+id);
  acao(async()=>{ if(g('wa-openai').value.trim()) await q(sb.rpc('admin_wa_transcricao',{p_key:g('wa-openai').value.trim()})); await q(sb.rpc('admin_wa_automacoes',{p_chamados:g('wa-ch').checked, p_captacao:g('wa-cap').checked})); await q(sb.rpc('admin_wa_config',{p_provider:g('wa-prov').value, p_extra:g('wa-extra').disabled?'':g('wa-extra').value, p_token:g('wa-tok').value||null, p_token2:g('wa-tok2').disabled?null:(g('wa-tok2').value||null), p_ativo:g('wa-on').checked, p_responder:g('wa-resp').checked})); }, 'Conexão do WhatsApp salva');
}, true);

if((location.hash||'')==='#whatsapp') S.tab='whatsapp';
if(S.me) carregar().then(render).catch(()=>{});
})();
