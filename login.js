/* Citihaus · Esteira — login por celular + senha, aba Acessos e senha do cliente (complementa app.js) */
(function(){
const DOM = '@equipe.citihaus.app';
const cel = t => { let d=String(t||'').replace(/\D/g,''); if(d.length===13 && d.startsWith('55')) d=d.slice(2); return d; };
const fmtCel = t => { const d=cel(t); return d.length===11?`(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`:d.length===10?`(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`:t; };
const gerarSenha = () => { const a='abcdefghjkmnpqrstuvwxyz23456789'; let s=''; const r=crypto.getRandomValues(new Uint32Array(8)); r.forEach(n=>s+=a[n%a.length]); return s; };
const urlSite = () => location.origin + location.pathname;
const msgAcesso = (nome, tel, senha, cliente) => `Olá${nome?', '+nome.split(' ')[0]:''}! ${cliente?'Este é o seu acesso ao portal da Citihaus, onde você acompanha o seu contrato, envia documentos e abre chamados.':'Este é o seu acesso à Esteira de Contratos da Citihaus.'}\n\nSite: ${urlSite()}\nCelular: ${fmtCel(tel)}\nSenha: ${senha}`;
const LS = {setup:false, lista:null, eq:null};

/* ---------- tela de login ---------- */
loginRender = async function(msg){
  topEl.hidden = true;
  let setup = false; try{ const r = await sb.rpc('setup_disponivel'); setup = !!r.data; }catch(_){}
  app.innerHTML = `<div class="wrap"><form class="login" id="login"><img src="${LOGO}" alt="Citihaus"><h1>Entrar</h1>
   ${msg?`<div class="err">${esc(msg)}</div>`:''}
   <label class="f">Celular<input id="l-cel" inputmode="tel" autocomplete="username" placeholder="(17) 99999-9999" required></label>
   <label class="f">Senha<input id="l-senha" type="password" autocomplete="current-password" required></label>
   <button class="btn pri" type="submit">Entrar</button>
   <p class="muted" style="margin:0;font-size:12.5px">Equipe e clientes da Citihaus entram aqui com o celular e a senha recebidos da imobiliária. Esqueceu a senha? Fale com a Citihaus pelo WhatsApp ${esc(CFG.WHATSAPP)}.</p>
   ${setup?'<button class="btn ghost" type="button" data-setup="1">Primeiro acesso do administrador</button>':''}</form></div>`;
};
function setupRender(){
  app.innerHTML = `<div class="wrap"><form class="login" id="setup"><img src="${LOGO}" alt="Citihaus"><h1>Primeiro acesso</h1>
   <p class="muted" style="margin:0">Cadastre o administrador do sistema. Esta tela só aparece uma vez.</p>
   <label class="f">Seu nome<input id="s-nome" required></label>
   <label class="f">Seu celular<input id="s-cel" inputmode="tel" placeholder="(17) 99999-9999" required></label>
   <label class="f">Crie uma senha (mínimo 6 caracteres)<input id="s-senha" type="password" minlength="6" autocomplete="new-password" required></label>
   <button class="btn pri" type="submit">Criar administrador e entrar</button>
   <button class="btn ghost" type="button" data-voltar="1">Voltar</button></form></div>`;
}
function escolherContrato(lista){
  app.innerHTML = `<div class="wrap"><div class="login"><img src="${LOGO}" alt="Citihaus"><h1>Seus contratos</h1>
   ${lista.map(c=>`<a class="btn" style="justify-content:space-between;text-decoration:none" href="?c=${esc(c.token)}"><span>Contrato ${esc(c.numero)} · ${esc(c.imovel)}</span><span class="muted">${esc(PAPEL[c.papel]||'')}</span></a>`).join('')}
   <button class="btn ghost" type="button" data-voltar="1">Sair</button></div></div>`;
}
async function entrar(tel, senha){
  const t = cel(tel);
  if(t.length < 10) return loginRender('Digite o celular com DDD.');
  const {error} = await sb.auth.signInWithPassword({email: t + DOM, password: senha});
  if(!error) return equipeInit();
  const r = await sb.rpc('portal_login', {p_tel: t, p_senha: senha});
  const d = r.data || {};
  if(d.contratos && d.contratos.length){
    try{ localStorage.setItem('citihaus_cli', JSON.stringify(d.contratos)); }catch(_){}
    if(d.contratos.length === 1){ location.href = urlSite() + '?c=' + d.contratos[0].token; return; }
    return escolherContrato(d.contratos);
  }
  return loginRender(d.erro || (r.error && r.error.message) || 'Celular ou senha incorretos');
}

/* ---------- aba Acessos (admin) ---------- */
const renderOrig = render;
render = function(){
  renderOrig();
  if(!S.me) return;
  const nav = document.querySelector('nav.sub');
  if(nav && S.me.papel === 'admin' && !nav.querySelector('[data-tab="acessos"]')){
    nav.insertAdjacentHTML('beforeend', `<button data-tab="acessos" aria-pressed="${S.tab==='acessos'}">Acessos</button>`);
  }
  if(S.tab === 'acessos'){
    nav && nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.tab==='acessos'));
    const w = document.querySelector('#app .wrap'); [...w.children].forEach(ch=>{ if(ch!==nav) ch.remove(); });
    w.insertAdjacentHTML('beforeend', acessosHtml());
    if(!LS.eq) carregarEquipe();
  }
};
async function carregarEquipe(){ try{ LS.eq = await q(sb.from('equipe').select('*').order('nome')); }catch(e){ LS.eq=[]; falha(e); } render(); }
function acessosHtml(){
  const eq = LS.eq;
  return `<div class="head"><div><h1>Acessos da equipe</h1><p>Cada pessoa entra com o celular e a senha que você criar aqui. Para clientes, use o botão “Senha de acesso” dentro do contrato.</p></div><button class="btn pri" data-newacesso="1">+ Novo acesso</button></div>
  <div class="tbl-wrap"><table><thead><tr><th>Nome</th><th>Celular</th><th>Perfil</th><th></th></tr></thead><tbody>
  ${eq===null?'<tr><td colspan="4" class="muted">Carregando…</td></tr>':eq.map(e=>`<tr><td><b>${esc(e.nome)}</b>${e.user_id===S.me.user_id?' <span class="pill p-acc">você</span>':''}</td>
    <td class="num">${e.telefone?esc(fmtCel(e.telefone)):'<span class="muted">Login antigo por e-mail</span>'}</td><td>${e.papel==='admin'?'Administrador':'Corretor'}</td>
    <td style="text-align:right">${e.telefone?`<button class="btn sm ghost" data-trocasenha="${e.user_id}">Nova senha</button>`:''}${e.user_id!==S.me.user_id?`<button class="btn sm ghost" data-rmeq="${e.user_id}">Remover</button>`:''}</td></tr>`).join('')}
  </tbody></table></div>`;
}

/* ---------- modais ---------- */
const modalOrig = modalHtml;
modalHtml = function(){
  const m = S.modal;
  if(m.tipo === 'acesso'){ const e = m.uid ? (LS.eq||[]).find(x=>x.user_id===m.uid) : null;
    return `<div class="ov center"><form class="modal" id="f-acesso">
     <div class="m-h"><h2 style="font-size:19px">${e?'Nova senha para '+esc(e.nome):'Novo acesso da equipe'}</h2></div>
     <div class="m-b">
      <label class="f full">Nome<input id="a-nome" value="${esc(e?e.nome:'')}" required></label>
      <label class="f">Celular<input id="a-cel" inputmode="tel" value="${esc(e?fmtCel(e.telefone):'')}" placeholder="(17) 99999-9999" required ${e?'readonly':''}></label>
      <label class="f">Perfil<select id="a-papel"><option value="corretor" ${e&&e.papel!=='admin'?'selected':''}>Corretor</option><option value="admin" ${e&&e.papel==='admin'?'selected':''}>Administrador</option></select></label>
      <label class="f full">Senha<input id="a-senha" value="${gerarSenha()}" minlength="6" required></label>
      <div class="note full">A senha já vem gerada. Depois de salvar, copie a mensagem e mande no WhatsApp da pessoa.</div>
     </div>
     <div class="m-f"><button type="button" class="btn" data-mclose="1">Cancelar</button><button class="btn pri" type="submit">Salvar acesso</button></div></form></div>`; }
  if(m.tipo === 'senhacli'){ const p = P(m.pid);
    return `<div class="ov center"><form class="modal" id="f-senhacli" data-pid="${m.pid}">
     <div class="m-h"><span class="mono" style="color:var(--accent-ink)">Portal do cliente</span><h2 style="font-size:19px;margin-top:4px">Senha de acesso · ${esc(p.nome||'cliente')}</h2></div>
     <div class="m-b">
      <label class="f">Celular do cliente<input id="c-cel" inputmode="tel" value="${esc(p.telefone)}" placeholder="(17) 99999-9999" required></label>
      <label class="f">Senha<input id="c-senha" value="${gerarSenha()}" minlength="6" required></label>
      <div class="note full">O cliente entra no site com este celular e esta senha e vê só os contratos dele. Criar uma senha nova substitui a anterior.</div>
     </div>
     <div class="m-f"><button type="button" class="btn" data-mclose="1">Cancelar</button><button class="btn pri" type="submit">Salvar senha</button></div></form></div>`; }
  if(m.tipo === 'pronto'){
    return `<div class="ov center"><div class="modal"><div class="m-h"><h2 style="font-size:19px">Acesso criado ✅</h2></div>
     <div class="m-b"><div class="full"><p class="muted" style="margin:0 0 8px">Mande esta mensagem no WhatsApp da pessoa:</p>
      <pre class="tree" style="white-space:pre-wrap">${esc(m.texto)}</pre></div></div>
     <div class="m-f"><button type="button" class="btn" data-mclose="1">Fechar</button><button type="button" class="btn pri" data-copytxt="${esc(m.texto)}">Copiar mensagem</button></div></div></div>`; }
  return modalOrig();
};

/* botão "Senha de acesso" em cada parte do contrato */
const parteOrig = parteHtml;
parteHtml = function(c, x){
  return parteOrig(c, x).replace(`<button class="btn sm ghost" data-editp="${P(x.pessoa_id).id}">`,
    `<button class="btn sm" data-senhacli="${x.pessoa_id}">${P(x.pessoa_id).senha_hash?'Nova senha':'Senha de acesso'}</button><button class="btn sm ghost" data-editp="${P(x.pessoa_id).id}">`);
};

/* ---------- eventos (capturam antes dos do app.js) ---------- */
document.addEventListener('click', e=>{
  const t = e.target.closest('button'); if(!t) return; const d = t.dataset;
  const pare = () => { e.stopImmediatePropagation(); e.preventDefault(); };
  if(d.setup){ pare(); return setupRender(); }
  if(d.voltar){ pare(); try{ localStorage.removeItem('citihaus_cli'); }catch(_){} return loginRender(); }
  if(d.copytxt && !TOKEN){ pare(); return copiar(d.copytxt); }
  if(d.tab === 'acessos'){ pare(); S.tab='acessos'; S.open=null; S.chTeam=null; LS.eq=null; try{history.replaceState(null,'','#acessos');}catch(_){} return render(); }
  if(d.newacesso){ pare(); S.modal={tipo:'acesso'}; return render(); }
  if(d.trocasenha){ pare(); S.modal={tipo:'acesso', uid:d.trocasenha}; return render(); }
  if(d.senhacli){ pare(); S.modal={tipo:'senhacli', pid:d.senhacli}; return render(); }
  if(d.rmeq){ pare(); const eqp=(LS.eq||[]).find(x=>x.user_id===d.rmeq);
    if(t.dataset.confirma!=='1'){ t.dataset.confirma='1'; t.textContent='Confirmar remoção de '+(eqp?eqp.nome:''); return; }
    return acao(async()=>{ await q(sb.rpc('admin_remover_equipe',{p_user:d.rmeq})); LS.eq=null; }, 'Acesso removido'); }
}, true);

document.addEventListener('submit', async e=>{
  const f = e.target, v = id => { const x=f.querySelector('#'+id); return x ? x.value.trim() : ''; };
  if(!['login','setup','f-acesso','f-senhacli'].includes(f.id)) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const btn = f.querySelector('button[type=submit]'); if(btn) btn.disabled = true;
  try{
    if(f.id === 'login') return await entrar(v('l-cel'), f.querySelector('#l-senha').value);
    if(f.id === 'setup'){
      await q(sb.rpc('setup_primeiro_admin', {p_nome:v('s-nome'), p_tel:v('s-cel'), p_senha:f.querySelector('#s-senha').value}));
      return await entrar(v('s-cel'), f.querySelector('#s-senha').value);
    }
    if(f.id === 'f-acesso'){
      const nome=v('a-nome'), tel=v('a-cel'), senha=v('a-senha');
      await q(sb.rpc('admin_salvar_equipe', {p_nome:nome, p_tel:tel, p_senha:senha, p_papel:v('a-papel')}));
      LS.eq = null; S.modal = {tipo:'pronto', texto: msgAcesso(nome, tel, senha, false)}; render(); return;
    }
    if(f.id === 'f-senhacli'){
      const pid=f.dataset.pid, tel=v('c-cel'), senha=v('c-senha'), p=P(pid);
      if(cel(tel) !== cel(p.telefone)) await q(sb.from('pessoas').update({telefone: tel}).eq('id', pid));
      await q(sb.rpc('equipe_senha_cliente', {p_pessoa:pid, p_senha:senha}));
      await carregar(); S.modal = {tipo:'pronto', texto: msgAcesso(p.nome, tel, senha, true)}; render(); return;
    }
  }catch(err){
    if(f.id==='login' || f.id==='setup') return loginRender(err.message || 'Não deu para entrar');
    falha(err); if(btn) btn.disabled = false;
  }
}, true);


/* ---------- documentos guardados no sistema (Supabase Storage) ---------- */
enviarPonte = async function(ticket, file){
  if(file.size > 25e6) throw new Error('Arquivo maior que 25 MB. Envie uma versão menor.');
  const f = await lerArquivo(file);
  const bin = atob(f.data), bytes = new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  const ext = (String(f.name).split('.').pop()||'pdf').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,5) || 'pdf';
  const path = `tickets/${ticket}/arquivo.${ext}`;
  const up = await sb.storage.from('documentos').upload(path, new Blob([bytes], {type: f.mime}), {contentType: f.mime, upsert: false});
  if(up.error) throw new Error('Não deu para enviar o arquivo: ' + up.error.message);
  const arquivo = await q(sb.rpc('concluir_upload', {p_ticket: ticket, p_path: path, p_ext: ext}));
  return {ok: true, arquivo};
};
async function abrirDoc(path){
  const w = window.open('', '_blank');
  const r = await sb.storage.from('documentos').createSignedUrl(path, 300);
  if(r.error){ if(w) w.close(); return falha(r.error); }
  if(w) w.location = r.data.signedUrl; else location.href = r.data.signedUrl;
}
document.addEventListener('click', e=>{
  const a = e.target.closest('a[href^="storage:"]'); if(!a) return;
  e.preventDefault(); e.stopImmediatePropagation(); abrirDoc(a.getAttribute('href').slice(8));
}, true);

const drawerOrig = drawer;
drawer = function(c){
  return drawerOrig(c)
    .replace('<span class="muted" style="font-size:12.5px">A pasta no Drive é criada no primeiro envio de documento.</span>',
      `<button class="btn sm" data-zip="${c.id}" style="margin-top:6px">⬇ Baixar documentos do contrato (.zip)</button>`)
    .replace(/<a class="drive-link"[^>]*>Abrir pasta no Drive ↗<\/a>/,
      `<button class="btn sm" data-zip="${c.id}" style="margin-top:6px">⬇ Baixar documentos do contrato (.zip)</button>`);
};
const PASTAS = {proprietario:'01-Proprietario', inquilino:'02-Inquilino', fiador:'03-Fiador'};
async function baixarZip(cid){
  const c = D.contratos.find(k=>k.id===cid); if(!c) return;
  if(!window.JSZip) return toast('Recarregue a página e tente de novo.');
  const itens = [];
  partesDe(c).forEach(x=>{ Object.values(D.docs[x.pessoa_id]||{}).forEach(d=>{ if(String(d.drive_url||'').startsWith('storage:')) itens.push({path:d.drive_url.slice(8), nome:PASTAS[x.papel]+'/'+d.arquivo}); }); });
  D.chamados.filter(h=>h.contrato_id===cid).forEach(h=>(D.msgs[h.id]||[]).forEach(m=>{ if(String(m.anexo_url||'').startsWith('storage:')) itens.push({path:m.anexo_url.slice(8), nome:'07-Chamados/'+m.anexo}); }));
  if(!itens.length) return toast('Este contrato ainda não tem documentos enviados.');
  document.body.classList.add('sending'); toast('Preparando '+itens.length+' arquivo(s)…');
  try{
    const r = await sb.storage.from('documentos').createSignedUrls(itens.map(i=>i.path), 300);
    if(r.error) throw r.error;
    const zip = new JSZip(), raiz = zip.folder(pastaC(c));
    for(let i=0;i<itens.length;i++){ const u = r.data[i] && r.data[i].signedUrl; if(!u) continue; const b = await (await fetch(u)).blob(); raiz.file(itens[i].nome, b); }
    const blob = await zip.generateAsync({type:'blob'});
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = pastaC(c) + '.zip'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(a.href), 5000);
    toast('Pronto! Arraste a pasta do .zip para LOCACOES no Drive.');
  }catch(err){ falha(err); } finally{ document.body.classList.remove('sending'); }
}
document.addEventListener('click', e=>{
  const t = e.target.closest('button[data-zip]'); if(!t) return;
  e.stopImmediatePropagation(); baixarZip(t.dataset.zip);
}, true);

/* se a tela antiga de login já apareceu, troca pela nova */
if(!TOKEN && document.getElementById('login')) loginRender();
if(!TOKEN && S.me) render();
})();
