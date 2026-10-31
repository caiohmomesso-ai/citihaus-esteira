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
  D.comunicados = D.comunicados || []; D.leituras = D.leituras || {}; D.emailP = D.emailP || null;
  const carregarOrig = carregar;
  carregar = async function(){
    await carregarOrig();
    try{
      const [cm, lt, ep] = await Promise.all([
        q(sb.from('comunicados').select('*').order('created_at',{ascending:false})),
        q(sb.from('comunicado_leitura').select('comunicado_id,pessoa_id')),
        q(sb.rpc('equipe_email_painel')).catch(()=>null)
      ]);
      D.comunicados = cm; D.leituras = {}; lt.forEach(l=>(D.leituras[l.comunicado_id]=D.leituras[l.comunicado_id]||[]).push(l.pessoa_id));
      D.emailP = ep;
    }catch(e){ console.warn('comunicados', e); }
  };

  const destinatarios = m => {
    const ps = D.partes.filter(x => m.publico==='todos' || m.publico===x.papel || (m.publico==='parte' && x.id===m.parte_id) || (m.publico==='varios' && (m.parte_ids||[]).includes(x.id)));
    return [...new Set(ps.map(x=>x.pessoa_id))];
  };
  const rotParte = x => { const c=pAtiva(x); return `Contrato ${c?c.numero:'?'} · ${PAPEL[x.papel]} · ${nomeP(P(x.pessoa_id), x.papel)}`; };
  const rotDestino = m => {
    if(m.publico==='parte'){ const x=D.partes.find(k=>k.id===m.parte_id); return x?rotParte(x):'Pessoa removida'; }
    if(m.publico==='varios'){ const ds=destinatarios(m); return ds.length===1 ? (P(ds[0]).nome||'1 pessoa') : ds.length+' pessoas'; }
    return PUBLICO[m.publico];
  };
  const PUB2 = Object.assign({}, PUBLICO, {varios:'Várias pessoas (marcar)'});
  const semAcento = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase().trim();
  const dig = s => { let d=String(s||'').replace(/\D/g,''); if(d.length>11 && d.startsWith('55')) d=d.slice(2); return d; };
  const achaPessoas = cel => { const d=dig(cel); if(d.length<8) return [];
    return Object.values(D.pessoas).filter(p=>{ const t=dig(p.telefone); if(!t) return false; return t===d || (t.length>=8 && d.length>=8 && t.slice(-8)===d.slice(-8)); }); };
  const tipoCat = t => Object.keys(CATS).find(c=>semAcento(c)===semAcento(t)) || Object.keys(CATS).find(c=>semAcento(t) && semAcento(c).startsWith(semAcento(t).slice(0,5))) || 'Aviso';

  S.msgForm = S.msgForm || {publico:'todos', parte:'', sel:[], busca:'', categoria:'Parabéns', titulo:'', texto:''};
  S.msgForm.sel = S.msgForm.sel || [];
  S.lote = S.lote || null;

  const selecaoHtml = f => {
    const busca = semAcento(f.busca);
    const ps = D.partes.slice().sort((a,b)=>(pAtiva(a)?.numero||0)-(pAtiva(b)?.numero||0)||(a.papel>b.papel?1:-1))
      .filter(x=>!busca || semAcento(rotParte(x)).includes(busca));
    return `<div class="full" style="border:1px solid var(--line);border-radius:12px;padding:10px">
      <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:8px"><input id="m-busca" value="${esc(f.busca||'')}" placeholder="Buscar nome ou contrato" style="flex:1;min-width:160px;border:1px solid var(--line);border-radius:9px;padding:7px 10px;background:var(--bg)">
        <button type="button" class="btn sm" data-msgsel="inquilino">+ Inquilinos</button><button type="button" class="btn sm" data-msgsel="proprietario">+ Proprietários</button><button type="button" class="btn sm" data-msgsel="fiador">+ Fiadores</button><button type="button" class="btn sm" data-msgsel="limpar">Limpar</button></div>
      <div style="max-height:220px;overflow:auto;display:grid;gap:2px">${ps.map(x=>`<label style="display:flex;gap:8px;align-items:center;padding:5px 6px;border-radius:8px;font-size:13.5px;cursor:pointer;${f.sel.includes(x.id)?'background:var(--accent-soft)':''}"><input type="checkbox" data-msgck="${x.id}" ${f.sel.includes(x.id)?'checked':''} style="width:16px;height:16px;accent-color:var(--accent)">${esc(rotParte(x))}${P(x.pessoa_id).email?'':' <span class="muted" style="font-size:11.5px">· sem e-mail</span>'}</label>`).join('')||'<span class="muted">Ninguém encontrado</span>'}</div>
      <div class="muted" style="font-size:12.5px;margin-top:6px"><b>${f.sel.length}</b> marcada(s)</div></div>`;
  };

  const loteHtml = () => {
    const L = S.lote;
    const modelo = `<button type="button" class="btn sm" data-msgmodelocsv="1">⬇ Baixar planilha modelo</button>`;
    if(!L) return `<div class="box"><h2 style="margin:0 0 6px">📥 Envio em massa por planilha</h2>
      <p class="muted" style="margin:0 0 12px;font-size:13.5px">Um recado diferente para cada cliente. Colunas: <b>celular</b>, <b>tipo</b>, <b>titulo</b>, <b>mensagem</b>. Aceita Excel (.xlsx) ou CSV. A pessoa é encontrada pelo celular do cadastro.</p>
      <div class="row" style="gap:8px;flex-wrap:wrap"><label class="btn pri sm" style="cursor:pointer">Subir planilha<input type="file" hidden accept=".csv,.xlsx,.xls,text/csv" id="m-planilha"></label>${modelo}</div></div>`;
    const ok = L.linhas.filter(l=>l.pessoas.length && l.titulo && l.mensagem);
    return `<div class="box"><div class="row between" style="margin-bottom:10px"><h2 style="margin:0">📥 ${esc(L.arquivo)}</h2><span class="pill ${ok.length===L.linhas.length?'p-ok':'p-warn'}">${ok.length} de ${L.linhas.length} prontas</span></div>
      <div style="overflow:auto;max-height:340px;border:1px solid var(--line);border-radius:10px"><table style="min-width:620px;margin:0"><thead><tr><th>#</th><th>Celular</th><th>Cliente</th><th>Tipo</th><th>Título</th><th>Mensagem</th></tr></thead><tbody>
      ${L.linhas.map((l,i)=>{ const bad=!l.pessoas.length||!l.titulo||!l.mensagem; return `<tr style="${bad?'background:var(--bad-soft)':''}"><td>${i+1}</td><td class="mono" style="font-size:12.5px">${esc(l.celular)}</td>
        <td>${l.pessoas.length?l.pessoas.map(p=>`<span style="color:var(--ok)">●</span> ${esc(p.nome)}`).join('<br>'):'<span style="color:var(--bad)">● Não encontrado</span>'}</td>
        <td>${cat(l.tipo).ic} ${esc(l.tipo)}</td><td>${esc(l.titulo)||'<span style="color:var(--bad)">vazio</span>'}</td><td style="max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(l.mensagem)||'<span style="color:var(--bad)">vazio</span>'}</td></tr>`; }).join('')}</tbody></table></div>
      <div class="note" style="margin-top:10px">Linhas em vermelho ficam de fora (celular não cadastrado ou sem título/mensagem).</div>
      <div class="row" style="justify-content:flex-end;gap:8px;margin-top:12px"><button type="button" class="btn" data-msgloteclear="1">Cancelar</button><button type="button" class="btn pri" data-msglotego="1" ${ok.length?'':'disabled'}>Enviar ${ok.length} mensage${ok.length===1?'m':'ns'}</button></div></div>`;
  };

  const emailHtml = () => {
    const E = D.emailP, adm = S.me && S.me.papel==='admin';
    if(!E) return '';
    const st = !E.chave ? ['p-warn','Aguardando chave do Resend'] : E.ativo ? ['p-ok','Ligado'] : ['p-info','Desligado'];
    const ST = {pendente:'p-warn', enviando:'p-info', enviado:'p-ok', erro:'p-bad', expirado:'p-info'};
    return `<div class="box"><div class="row between" style="margin-bottom:10px"><h2 style="margin:0">✉️ E-mails automáticos</h2><span class="pill ${st[0]}">${st[1]}</span></div>
      <p class="muted" style="margin:0 0 12px;font-size:13.5px">O cliente recebe e-mail quando: chega <b>mensagem nova</b>, a Citihaus <b>responde ou abre chamado</b>, o contrato <b>avança de etapa</b>, um <b>documento é aprovado ou recusado</b>.</p>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
        <div style="background:var(--bg);border-radius:10px;padding:10px"><div style="font-size:22px;font-weight:700">${E.hoje}</div><div class="muted" style="font-size:12px">enviados hoje</div></div>
        <div style="background:var(--bg);border-radius:10px;padding:10px"><div style="font-size:22px;font-weight:700">${E.fila}</div><div class="muted" style="font-size:12px">na fila</div></div>
        <div style="background:var(--bg);border-radius:10px;padding:10px"><div style="font-size:22px;font-weight:700;color:${E.erros?'var(--bad)':'inherit'}">${E.erros}</div><div class="muted" style="font-size:12px">erros (7 dias)</div></div></div>
      ${adm?`<form id="f-email" class="fgrid">
        <label class="f full">Chave do Resend ${E.chave?'<span style="color:var(--ok)">· configurada ✓</span>':''}<input id="e-key" type="password" autocomplete="off" placeholder="${E.chave?'Deixe vazio para manter a atual':'re_...'}"></label>
        <label class="f full">Remetente<input id="e-de" value="${esc(E.remetente||'')}" placeholder="Citihaus &lt;contato@citihaus.com.br&gt;"></label>
        <label class="f" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="e-on" ${E.ativo?'checked':''} style="width:18px;height:18px;accent-color:var(--accent)"> Envio ligado</label>
        <div class="row" style="justify-content:flex-end"><button class="btn pri" type="submit">Salvar</button></div></form>
        <form id="f-emailteste" class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><input id="e-teste" type="email" placeholder="seu@email.com" style="flex:1;min-width:180px;border:1px solid var(--line);border-radius:9px;padding:8px 10px;background:var(--bg)"><button class="btn sm" type="submit" ${E.chave&&E.ativo?'':'disabled'}>Enviar e-mail de teste</button></form>`
      :'<div class="note">Só o administrador liga ou desliga o envio.</div>'}
      ${E.ultimos&&E.ultimos.length?`<details style="margin-top:12px"><summary style="cursor:pointer;font-weight:600;font-size:13.5px">Últimos e-mails</summary><div style="overflow:auto;margin-top:8px"><table style="min-width:520px;margin:0"><thead><tr><th>Para</th><th>Assunto</th><th>Status</th><th>Quando</th></tr></thead><tbody>
        ${E.ultimos.map(u=>`<tr><td style="font-size:12.5px">${esc(u.para)}</td><td style="font-size:12.5px">${esc(u.assunto)}${u.erro?`<div style="color:var(--bad);font-size:11.5px">${esc(u.erro.slice(0,120))}</div>`:''}</td><td><span class="pill ${ST[u.status]||'p-info'}">${esc(u.status)}</span></td><td style="font-size:12px">${quando(u.created_at)}</td></tr>`).join('')}</tbody></table></div></details>`:''}
    </div>`;
  };

  const mensagensHtml = () => {
    const f = S.msgForm;
    const lista = D.comunicados.map(m=>{ const dest=destinatarios(m), lidos=(D.leituras[m.id]||[]).filter(id=>dest.includes(id)).length, k=cat(m.categoria);
      return `<tr><td style="font-size:20px">${k.ic}</td><td><b>${esc(m.titulo)}</b><div class="muted" style="font-size:12.5px;max-width:420px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(m.texto)}</div></td>
        <td>${esc(m.categoria)}</td><td>${esc(rotDestino(m))}</td><td>${quando(m.created_at)}<div class="muted" style="font-size:12px">${esc(m.autor_nome||'')}</div></td>
        <td><span class="pill ${lidos&&lidos===dest.length?'p-ok':'p-info'}">${lidos}/${dest.length} lida${dest.length===1?'':'s'}</span></td>
        <td><button class="btn sm" data-msgdel="${m.id}" style="${S.msgDel===m.id?'border-color:var(--bad);color:var(--bad)':''}">${S.msgDel===m.id?'Confirmar exclusão':'Excluir'}</button></td></tr>`; }).join('');
    const destTxt = f.publico==='parte' ? (f.parte?esc(rotParte(D.partes.find(x=>x.id===f.parte)||{})):'escolha a pessoa')
      : f.publico==='varios' ? destinatarios({publico:'varios', parte_ids:f.sel}).length+' pessoa(s) marcada(s)'
      : PUBLICO[f.publico]+' ('+destinatarios({publico:f.publico}).length+')';
    const partes = D.partes.slice().sort((a,b)=>(pAtiva(a)?.numero||0)-(pAtiva(b)?.numero||0));
    return `<div class="head"><div><h1>Mensagens</h1><p>Recados para os clientes que não são chamados: parabéns, benefícios, avisos e novidades. Aparecem no portal${D.emailP&&D.emailP.ativo?' e chegam por e-mail':''}.</p></div></div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:16px;margin-top:18px;align-items:start">
     <div style="display:grid;gap:16px">
     <form class="box" id="f-msg"><h2 style="margin:0 0 12px">Nova mensagem</h2>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">${MODELOS.map((m,i)=>`<button type="button" class="btn sm" data-msgmodelo="${i}">${cat(m[0]).ic} ${esc(m[1])}</button>`).join('')}</div>
      <div class="fgrid">
       <label class="f">Para<select id="m-pub">${Object.entries(PUB2).map(([k,v])=>`<option value="${k}" ${f.publico===k?'selected':''}>${v}</option>`).join('')}</select></label>
       <label class="f">Tipo<select id="m-cat">${Object.keys(CATS).map(c=>`<option ${f.categoria===c?'selected':''}>${c}</option>`).join('')}</select></label>
       ${f.publico==='parte'?`<label class="f full">Pessoa<select id="m-parte" required><option value="">Escolha…</option>${partes.map(x=>`<option value="${x.id}" ${f.parte===x.id?'selected':''}>${esc(rotParte(x))}</option>`).join('')}</select></label>`:''}
       ${f.publico==='varios'?selecaoHtml(f):''}
       <label class="f full">Título<input id="m-tit" required maxlength="90" value="${esc(f.titulo)}" placeholder="Ex.: Feliz aniversário!"></label>
       <label class="f full">Mensagem<textarea class="ta" id="m-txt" rows="5" required placeholder="Escreva o recado para o cliente">${esc(f.texto)}</textarea></label>
      </div>
      <div class="note" style="margin-top:12px">Vai para: <b>${destTxt}</b>. Não abre chamado e o cliente não precisa responder.</div>
      <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn pri" type="submit">Enviar mensagem</button></div>
     </form>
     ${loteHtml()}
     </div>
     <div style="display:grid;gap:16px">
     ${emailHtml()}
     <div class="box" style="padding:0;overflow:hidden"><div style="padding:16px 16px 0"><h2 style="margin:0">Enviadas</h2></div>
      <div style="overflow-x:auto"><table style="min-width:640px"><thead><tr><th></th><th>Mensagem</th><th>Tipo</th><th>Para</th><th>Enviada</th><th>Leitura</th><th></th></tr></thead>
      <tbody>${lista||'<tr><td colspan="7" class="muted">Nenhuma mensagem enviada ainda.</td></tr>'}</tbody></table></div></div>
     </div>
    </div>`;
  };

  const lerForm = () => { const g=id=>document.getElementById(id); if(!g('m-pub')) return;
    Object.assign(S.msgForm, {publico:g('m-pub').value, categoria:g('m-cat').value, parte:g('m-parte')?g('m-parte').value:S.msgForm.parte,
      busca:g('m-busca')?g('m-busca').value:S.msgForm.busca, titulo:g('m-tit').value, texto:g('m-txt').value}); };
  const reRender = (foco) => { const y=window.scrollY; render(); window.scrollTo(0,y); if(foco){ const el=document.getElementById(foco); if(el){ el.focus(); const v=el.value; el.value=''; el.value=v; } } };

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

  /* ---------- leitura da planilha ---------- */
  const lerCSV = txt => {
    txt = txt.replace(/^﻿/,'');
    const prim = txt.split(/\r?\n/)[0]||''; const sep = (prim.match(/;/g)||[]).length > (prim.match(/,/g)||[]).length ? ';' : (prim.includes('\t')?'\t':',');
    const rows=[]; let row=[], cell='', aspas=false;
    for(let i=0;i<txt.length;i++){ const ch=txt[i];
      if(aspas){ if(ch==='"'){ if(txt[i+1]==='"'){ cell+='"'; i++; } else aspas=false; } else cell+=ch; continue; }
      if(ch==='"') aspas=true; else if(ch===sep){ row.push(cell); cell=''; } else if(ch==='\n'){ row.push(cell); rows.push(row); row=[]; cell=''; } else if(ch!=='\r') cell+=ch; }
    if(cell!==''||row.length){ row.push(cell); rows.push(row); }
    return rows;
  };
  const carregarXLSX = () => window.XLSX ? Promise.resolve() : new Promise((ok,err)=>{ const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'; s.onload=ok; s.onerror=()=>err(new Error('Não consegui abrir o Excel. Salve como CSV e tente de novo.')); document.head.appendChild(s); });
  const montarLote = (rows, arquivo) => {
    rows = rows.filter(r=>r.some(c=>String(c||'').trim()));
    if(rows.length<2) throw new Error('A planilha está vazia');
    const h = rows[0].map(semAcento);
    const col = (...n) => h.findIndex(x=>n.some(k=>x===k||x.startsWith(k)));
    const iC=col('celular','telefone','whatsapp','fone'), iT=col('tipo','categoria'), iTi=col('titulo','assunto'), iM=col('mensagem','texto','recado');
    if(iC<0 || iM<0) throw new Error('A planilha precisa das colunas "celular" e "mensagem"');
    const linhas = rows.slice(1).map(r=>{ const g=i=>i<0?'':String(r[i]??'').trim(); const celular=g(iC);
      return {celular, pessoas:achaPessoas(celular), tipo:tipoCat(g(iT)), titulo:g(iTi)||(g(iT)?tipoCat(g(iT)):''), mensagem:g(iM)}; });
    if(linhas.length>500) throw new Error('Máximo de 500 linhas por planilha');
    S.lote = {arquivo, linhas};
  };

  document.addEventListener('click', e=>{
    const b = e.target.closest('button'); if(!b) return;
    if(b.dataset.tab==='mensagens'){ e.stopImmediatePropagation(); S.tab='mensagens'; S.open=null; S.chTeam=null; S.msgDel=null; try{history.replaceState(null,'','#mensagens');}catch(_){} 
      render(); q(sb.rpc('equipe_email_painel')).then(p=>{ D.emailP=p; if(S.tab==='mensagens') reRender(); }).catch(()=>{}); return; }
    if(b.dataset.msgparte){ e.stopImmediatePropagation(); S.msgForm={publico:'parte', parte:b.dataset.msgparte, sel:[], busca:'', categoria:'Aviso', titulo:'', texto:''}; S.tab='mensagens'; S.open=null; S.modal=null; try{history.replaceState(null,'','#mensagens');}catch(_){} return render(); }
    if(b.dataset.msgmodelo!==undefined){ e.stopImmediatePropagation(); lerForm(); const m=MODELOS[+b.dataset.msgmodelo]; S.msgForm.categoria=m[0]; S.msgForm.titulo=m[1]; S.msgForm.texto=m[2]; return reRender(); }
    if(b.dataset.msgsel){ e.stopImmediatePropagation(); lerForm(); const k=b.dataset.msgsel;
      if(k==='limpar') S.msgForm.sel=[]; else S.msgForm.sel=[...new Set(S.msgForm.sel.concat(D.partes.filter(x=>x.papel===k).map(x=>x.id)))];
      return reRender(); }
    if(b.dataset.msgmodelocsv){ e.stopImmediatePropagation();
      const csv='﻿celular;tipo;titulo;mensagem\n(17) 99999-0000;Parabéns;Feliz aniversário!;Toda a equipe Citihaus deseja um feliz aniversário!\n(17) 98888-0000;Benefício Citihaus;Desconto exclusivo;Você tem 10% de desconto no parceiro X.\n';
      const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})); a.download='modelo_mensagens_citihaus.csv'; a.click(); return; }
    if(b.dataset.msgloteclear){ e.stopImmediatePropagation(); S.lote=null; return reRender(); }
    if(b.dataset.msglotego){ e.stopImmediatePropagation();
      const ok=S.lote.linhas.filter(l=>l.pessoas.length && l.titulo && l.mensagem);
      const rows=ok.map(l=>{ const ids=D.partes.filter(x=>l.pessoas.some(p=>p.id===x.pessoa_id)).map(x=>x.id);
        return {categoria:l.tipo, titulo:l.titulo.slice(0,90), texto:l.mensagem, publico:'varios', parte_ids:ids, autor_nome:S.me.nome}; }).filter(r=>r.parte_ids.length);
      return acao(async()=>{ for(let i=0;i<rows.length;i+=100) await q(sb.from('comunicados').insert(rows.slice(i,i+100))); S.lote=null; }, rows.length+' mensagens enviadas.'); }
    if(b.dataset.msgdel){ e.stopImmediatePropagation(); const id=b.dataset.msgdel;
      if(S.msgDel!==id){ S.msgDel=id; return reRender(); }
      S.msgDel=null; return acao(async()=>{ await q(sb.from('comunicados').delete().eq('id',id)); }, 'Mensagem excluída'); }
  }, true);
  document.addEventListener('change', e=>{
    const el=e.target;
    if(el.id==='m-pub'){ lerForm(); return reRender(); }
    if(el.dataset && el.dataset.msgck){ lerForm(); const id=el.dataset.msgck; S.msgForm.sel = el.checked ? [...new Set(S.msgForm.sel.concat(id))] : S.msgForm.sel.filter(x=>x!==id); return reRender(); }
    if(el.id==='m-planilha' && el.files && el.files[0]){ e.stopImmediatePropagation(); const file=el.files[0];
      (async()=>{ try{
        let rows;
        if(/\.(xlsx|xls)$/i.test(file.name)){ await carregarXLSX(); const wb=XLSX.read(await file.arrayBuffer(),{type:'array'}); rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,raw:false,defval:''}); }
        else { const buf=await file.arrayBuffer(); let txt=new TextDecoder('utf-8').decode(buf); if(txt.includes('�')) txt=new TextDecoder('windows-1252').decode(buf); rows=lerCSV(txt); }
        montarLote(rows, file.name); reRender();
      }catch(err){ falha(err); } })();
    }
  }, true);
  let tBusca; document.addEventListener('input', e=>{ if(e.target.id==='m-busca'){ clearTimeout(tBusca); tBusca=setTimeout(()=>{ lerForm(); reRender('m-busca'); }, 250); } }, true);
  document.addEventListener('submit', e=>{
    const fm=e.target;
    if(fm.id==='f-email'){ e.preventDefault(); e.stopImmediatePropagation();
      const key=fm.querySelector('#e-key').value.trim(), de=fm.querySelector('#e-de').value.trim(), on=fm.querySelector('#e-on').checked;
      if(on && !key && !(D.emailP&&D.emailP.chave)) return toast('Cole a chave do Resend antes de ligar');
      return acao(async()=>{ await q(sb.rpc('admin_email_config',{p_api_key:key||null, p_remetente:de||null, p_ativo:on})); }, on?'E-mails automáticos ligados':'Configuração salva'); }
    if(fm.id==='f-emailteste'){ e.preventDefault(); e.stopImmediatePropagation();
      const para=fm.querySelector('#e-teste').value.trim();
      return acao(async()=>{ await q(sb.rpc('admin_email_teste',{p_para:para})); }, 'Teste na fila. Chega em até 1 minuto.'); }
    if(fm.id!=='f-msg') return; e.preventDefault(); e.stopImmediatePropagation(); lerForm();
    const f=S.msgForm;
    if(f.publico==='parte' && !f.parte) return toast('Escolha a pessoa');
    if(f.publico==='varios' && !f.sel.length) return toast('Marque pelo menos uma pessoa');
    if(!f.titulo.trim() || !f.texto.trim()) return toast('Preencha título e mensagem');
    acao(async()=>{ await q(sb.from('comunicados').insert({categoria:f.categoria, titulo:f.titulo.trim(), texto:f.texto.trim(), publico:f.publico,
        parte_id:f.publico==='parte'?f.parte:null, parte_ids:f.publico==='varios'?f.sel:null, autor_nome:S.me.nome}));
      S.msgForm=Object.assign({}, f, {titulo:'', texto:'', sel:f.publico==='varios'?[]:f.sel}); }, 'Mensagem enviada. Já aparece no portal do cliente.');
  }, true);

  if((location.hash||'')==='#mensagens') S.tab='mensagens';
  if(S.me) carregar().then(render).catch(()=>{});
}
})();
