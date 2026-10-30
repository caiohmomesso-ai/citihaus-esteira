/* Citihaus · Meu Contrato — Mensagens (comunicados que não são chamados) + resumo sempre visível */
(function(){
const CATS = {
  'Parabéns':        {ic:'🎉', cor:'var(--accent)'},
  'Benefício Citihaus':{ic:'🎁', cor:'var(--ok)'},
  'Aviso':           {ic:'📣', cor:'var(--info)'},
  'Novidade':        {ic:'✨', cor:'var(--amber)'},
  'Lembrete':        {ic:'⏰', cor:'var(--warn)'}
};
const cat = c => CATS[c] || CATS['Aviso'];
const MODELOS = [
  ['Parabéns','Feliz aniversário!','Toda a equipe Citihaus deseja um feliz aniversário! Que o novo ano venha cheio de conquistas. Conte sempre com a gente.'],
  ['Parabéns','Um ano de contrato','Hoje completamos um ano juntos neste contrato. Obrigado pela confiança na Citihaus!'],
  ['Benefício Citihaus','Desconto exclusivo para clientes Citihaus','Clientes Citihaus têm condição especial com nossos parceiros. Fale com a gente pelo WhatsApp para saber como usar.'],
  ['Lembrete','Vencimento do aluguel','Passando para lembrar que o boleto do aluguel vence no dia 10. Se já pagou, desconsidere.'],
  ['Novidade','Novidade no portal','Agora você acompanha tudo do seu contrato por aqui: resumo, chamados e mensagens da Citihaus.']
];
const PUBLICO = {todos:'Todos os clientes', inquilino:'Todos os inquilinos', proprietario:'Todos os proprietários', fiador:'Todos os fiadores', parte:'Uma pessoa'};
const quando = d => { const t=new Date(d); return t.toLocaleDateString('pt-BR')+' '+t.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); };
const pAtiva = x => { const c=(D.contratosTodos||D.contratos).find(k=>k.id===x.contrato_id); return c; };

/* ================= PORTAL DO CLIENTE ================= */
if(TOKEN){
  PS.msgs = PS.msgs || null; PS.msgNovas = PS.msgNovas || {};
  const carregarMsgs = async () => { try{ PS.msgs = await q(sb.rpc('portal_mensagens',{p_token:TOKEN})); }catch(e){ console.warn(e); PS.msgs = PS.msgs||[]; } };
  const portalLoadOrig = portalLoad;
  portalLoad = async function(){ await carregarMsgs(); return portalLoadOrig(); };

  const msgsHtml = () => {
    const ms = PS.msgs||[];
    if(!ms.length) return `<div class="box msgs"><h2 style="margin:0 0 6px">Mensagens da Citihaus</h2><p class="muted" style="margin:0">Nenhuma mensagem por enquanto. Avisos, benefícios e novidades da Citihaus aparecem aqui.</p></div>`;
    const novas = ms.filter(m=>!m.lido || PS.msgNovas[m.id]).length;
    return `<div class="box msgs"><div class="row between" style="margin-bottom:10px"><h2 style="margin:0">Mensagens da Citihaus</h2>${novas?`<span class="pill p-info">${novas} nova${novas>1?'s':''}</span>`:''}</div>
      <div style="display:grid;gap:10px">${ms.map(m=>{ const k=cat(m.categoria), nova=!m.lido||PS.msgNovas[m.id];
        return `<div style="display:flex;gap:12px;padding:12px;border-radius:12px;border:1px solid var(--line);${nova?'border-left:4px solid '+k.cor+';':''}background:var(--bg)">
          <div style="font-size:24px;line-height:1">${k.ic}</div>
          <div style="min-width:0;flex:1"><div class="row between" style="gap:8px"><span style="font-size:11.5px;font-weight:700;color:${k.cor};text-transform:uppercase;letter-spacing:.04em">${esc(m.categoria)}</span><span class="muted" style="font-size:12px">${nova?'<b style="color:'+k.cor+'">Nova · </b>':''}${dataBR(m.created_at)}</span></div>
          <b style="display:block;margin:2px 0 4px">${esc(m.titulo)}</b><div style="font-size:14px;white-space:pre-wrap">${esc(m.texto)}</div></div></div>`; }).join('')}</div></div>`;
  };

  const garantirPortal = () => {
    const d = PS.d; if(!d) return;
    const portal = document.querySelector('.portal'); if(!portal) return;
    let hello = portal.querySelector('.hello');
    // resumo do contrato: sempre presente, logo abaixo da saudação
    if(!portal.querySelector('.resumo') && typeof window.resumoPortalHtml === 'function'){
      const h = window.resumoPortalHtml();
      if(hello) hello.insertAdjacentHTML('afterend', h); else portal.insertAdjacentHTML('afterbegin', h);
    }
    if(!portal.querySelector('.msgs')){
      const ref = portal.querySelector('.resumo') || hello;
      if(ref) ref.insertAdjacentHTML('afterend', msgsHtml()); else portal.insertAdjacentHTML('afterbegin', msgsHtml());
    }
    // marca como lidas (continua destacada como "Nova" nesta visita)
    (PS.msgs||[]).filter(m=>!m.lido).forEach(m=>{ m.lido=true; PS.msgNovas[m.id]=true; sb.rpc('portal_mensagem_lida',{p_token:TOKEN,p_id:m.id}).then(()=>{}); });
  };
  const portalRenderOrig = portalRender;
  portalRender = function(){ portalRenderOrig(); try{ garantirPortal(); }catch(e){ console.error(e); } };

  // rede de segurança: se qualquer coisa redesenhar a tela sem o resumo/mensagens, recoloca
  let agendado=false;
  new MutationObserver(()=>{ if(agendado) return; agendado=true; requestAnimationFrame(()=>{ agendado=false;
    const p=document.querySelector('.portal'); if(p && PS.d && (!p.querySelector('.resumo') || !p.querySelector('.msgs'))) try{ garantirPortal(); }catch(e){} }); })
    .observe(document.getElementById('app'), {childList:true, subtree:true});

  carregarMsgs().then(()=>{ if(PS.d) portalRender(); });
}

/* ================= EQUIPE ================= */
if(!TOKEN){
  D.comunicados = D.comunicados || []; D.leituras = D.leituras || {};
  const carregarOrig = carregar;
  carregar = async function(){
    await carregarOrig();
    try{
      const [cm, lt] = await Promise.all([
        q(sb.from('comunicados').select('*').order('created_at',{ascending:false})),
        q(sb.from('comunicado_leitura').select('comunicado_id,pessoa_id'))
      ]);
      D.comunicados = cm; D.leituras = {}; lt.forEach(l=>(D.leituras[l.comunicado_id]=D.leituras[l.comunicado_id]||[]).push(l.pessoa_id));
    }catch(e){ console.warn('comunicados', e); }
  };

  const destinatarios = m => {
    const ps = D.partes.filter(x => m.publico==='todos' || m.publico===x.papel || (m.publico==='parte' && x.id===m.parte_id));
    return [...new Set(ps.map(x=>x.pessoa_id))];
  };
  const rotParte = x => { const c=pAtiva(x); return `Contrato ${c?c.numero:'?'} · ${PAPEL[x.papel]} · ${nomeP(P(x.pessoa_id), x.papel)}`; };
  const rotDestino = m => m.publico==='parte' ? (D.partes.find(x=>x.id===m.parte_id) ? rotParte(D.partes.find(x=>x.id===m.parte_id)) : 'Pessoa removida') : PUBLICO[m.publico];

  S.msgForm = S.msgForm || {publico:'todos', parte:'', categoria:'Parabéns', titulo:'', texto:''};
  const mensagensHtml = () => {
    const f = S.msgForm;
    const partes = D.partes.slice().sort((a,b)=>(pAtiva(a)?.numero||0)-(pAtiva(b)?.numero||0));
    const lista = D.comunicados.map(m=>{ const dest=destinatarios(m), lidos=(D.leituras[m.id]||[]).filter(id=>dest.includes(id)).length, k=cat(m.categoria);
      return `<tr><td style="font-size:20px">${k.ic}</td><td><b>${esc(m.titulo)}</b><div class="muted" style="font-size:12.5px;max-width:420px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(m.texto)}</div></td>
        <td>${esc(m.categoria)}</td><td>${esc(rotDestino(m))}</td><td>${quando(m.created_at)}<div class="muted" style="font-size:12px">${esc(m.autor_nome||'')}</div></td>
        <td><span class="pill ${lidos&&lidos===dest.length?'p-ok':'p-info'}">${lidos}/${dest.length} lida${dest.length===1?'':'s'}</span></td>
        <td><button class="btn sm" data-msgdel="${m.id}" style="${S.msgDel===m.id?'border-color:var(--bad);color:var(--bad)':''}">${S.msgDel===m.id?'Confirmar exclusão':'Excluir'}</button></td></tr>`; }).join('');
    return `<div class="head"><div><h1>Mensagens</h1><p>Recados para os clientes que não são chamados: parabéns, benefícios, avisos e novidades. Aparecem no portal de cada cliente.</p></div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;margin-top:18px;align-items:start">
     <form class="box" id="f-msg"><h2 style="margin:0 0 12px">Nova mensagem</h2>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${MODELOS.map((m,i)=>`<button type="button" class="btn sm" data-msgmodelo="${i}">${cat(m[0]).ic} ${esc(m[1])}</button>`).join('')}</div>
      <div class="fgrid">
       <label class="f">Para<select id="m-pub">${Object.entries(PUBLICO).map(([k,v])=>`<option value="${k}" ${f.publico===k?'selected':''}>${v}</option>`).join('')}</select></label>
       <label class="f">Tipo<select id="m-cat">${Object.keys(CATS).map(c=>`<option ${f.categoria===c?'selected':''}>${c}</option>`).join('')}</select></label>
       ${f.publico==='parte'?`<label class="f full">Pessoa<select id="m-parte" required><option value="">Escolha…</option>${partes.map(x=>`<option value="${x.id}" ${f.parte===x.id?'selected':''}>${esc(rotParte(x))}</option>`).join('')}</select></label>`:''}
       <label class="f full">Título<input id="m-tit" required maxlength="90" value="${esc(f.titulo)}" placeholder="Ex.: Feliz aniversário!"></label>
       <label class="f full">Mensagem<textarea class="ta" id="m-txt" rows="5" required placeholder="Escreva o recado para o cliente">${esc(f.texto)}</textarea></label>
      </div>
      <div class="note" style="margin-top:12px">Vai para: <b>${f.publico==='parte'?(f.parte?esc(rotParte(D.partes.find(x=>x.id===f.parte)||{})):'escolha a pessoa'):PUBLICO[f.publico]+' ('+destinatarios({publico:f.publico}).length+')'}</b>. Não abre chamado e o cliente não precisa responder.</div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn pri" type="submit">Enviar mensagem</button></div>
     </form>
     <div class="box" style="padding:0;overflow:hidden"><div style="padding:16px 16px 0"><h2 style="margin:0">Enviadas</h2></div>
      <div style="overflow-x:auto"><table style="min-width:640px"><thead><tr><th></th><th>Mensagem</th><th>Tipo</th><th>Para</th><th>Enviada</th><th>Leitura</th><th></th></tr></thead>
      <tbody>${lista||'<tr><td colspan="7" class="muted">Nenhuma mensagem enviada ainda.</td></tr>'}</tbody></table></div></div>
    </div>`;
  };

  const lerForm = () => { const g=id=>document.getElementById(id); if(!g('m-pub')) return;
    S.msgForm = {publico:g('m-pub').value, categoria:g('m-cat').value, parte:g('m-parte')?g('m-parte').value:S.msgForm.parte, titulo:g('m-tit').value, texto:g('m-txt').value}; };

  const renderOrig = render;
  render = function(){
    renderOrig();
    if(!S.me || TOKEN) return;
    const nav=document.querySelector('nav.sub'); if(!nav) return;
    if(!nav.querySelector('[data-tab="mensagens"]')){
      const ref = nav.querySelector('[data-tab="chamados"]') || nav.lastElementChild;
      ref.insertAdjacentHTML('afterend', `<button data-tab="mensagens" aria-pressed="${S.tab==='mensagens'}">Mensagens</button>`);
    }
    if(S.tab==='mensagens'){
      nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.tab==='mensagens'));
      const w=document.querySelector('#app .wrap'); [...w.children].forEach(ch=>{ if(ch!==nav) ch.remove(); });
      w.insertAdjacentHTML('beforeend', mensagensHtml());
    }
  };

  // botão "Mensagem" em cada parte do contrato
  const parteOrig = parteHtml;
  parteHtml = function(c, x){
    return parteOrig(c, x).replace(`<button class="btn sm" data-chequipe="${x.id}">Abrir chamado</button>`,
      `<button class="btn sm" data-chequipe="${x.id}">Abrir chamado</button><button class="btn sm" data-msgparte="${x.id}">Mensagem</button>`);
  };

  document.addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return;
    if(b.dataset.tab==='mensagens'){ e.stopImmediatePropagation(); S.tab='mensagens'; S.open=null; S.chTeam=null; S.msgDel=null; try{history.replaceState(null,'','#mensagens');}catch(_){} return render(); }
    if(b.dataset.msgparte){ e.stopImmediatePropagation(); S.msgForm={publico:'parte', parte:b.dataset.msgparte, categoria:'Aviso', titulo:'', texto:''}; S.tab='mensagens'; S.open=null; S.modal=null; try{history.replaceState(null,'','#mensagens');}catch(_){} return render(); }
    if(b.dataset.msgmodelo!==undefined){ e.stopImmediatePropagation(); lerForm(); const m=MODELOS[+b.dataset.msgmodelo]; S.msgForm.categoria=m[0]; S.msgForm.titulo=m[1]; S.msgForm.texto=m[2]; return render(); }
    if(b.dataset.msgdel){ e.stopImmediatePropagation(); const id=b.dataset.msgdel;
      if(S.msgDel!==id){ S.msgDel=id; return render(); }
      S.msgDel=null; return acao(async()=>{ await q(sb.from('comunicados').delete().eq('id',id)); }, 'Mensagem excluída'); }
  }, true);
  document.addEventListener('change', e=>{ if(e.target.id==='m-pub'){ lerForm(); render(); } }, true);
  document.addEventListener('submit', e=>{
    if(e.target.id!=='f-msg') return; e.preventDefault(); e.stopImmediatePropagation(); lerForm();
    const f=S.msgForm;
    if(f.publico==='parte' && !f.parte) return toast('Escolha a pessoa');
    if(!f.titulo.trim() || !f.texto.trim()) return toast('Preencha título e mensagem');
    acao(async()=>{ await q(sb.from('comunicados').insert({categoria:f.categoria, titulo:f.titulo.trim(), texto:f.texto.trim(), publico:f.publico, parte_id:f.publico==='parte'?f.parte:null, autor_nome:S.me.nome}));
      S.msgForm={publico:f.publico, parte:f.parte, categoria:f.categoria, titulo:'', texto:''}; }, 'Mensagem enviada. Já aparece no portal do cliente.');
  }, true);

  if((location.hash||'')==='#mensagens') S.tab='mensagens';
  if(S.me) carregar().then(render).catch(()=>{});
}
})();
