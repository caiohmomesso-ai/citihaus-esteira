/* Citihaus · clientes: criar o cliente e o acesso ao Citihaus+ direto pela equipe (sem depender de link) */
(function(){
if(TOKEN) return;
const cel = t => { let d=String(t||'').replace(/\D/g,''); if(d.length===13 && d.startsWith('55')) d=d.slice(2); return d; };
const fmtCel = t => { const d=cel(t); return d.length===11?`(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`:d.length===10?`(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`:String(t||''); };
const gerarSenha = () => { const a='abcdefghjkmnpqrstuvwxyz23456789'; let s=''; crypto.getRandomValues(new Uint32Array(8)).forEach(n=>s+=a[n%a.length]); return s; };
const site = () => location.origin + location.pathname;
const msgCliente = (nome, tel, senha) => `Olá${nome?', '+nome.trim().split(' ')[0]:''}! Seu acesso ao Citihaus+ está pronto 🧡\nLá você acompanha seu imóvel, contrato, visitas e propostas, e fala com a gente.\n\nSite: ${site()}\nCelular: ${fmtCel(tel)}\nSenha: ${senha}\n\nDepois de entrar, você pode trocar a senha em "Meus dados".`;

/* ---------- lista de Pessoas: todo mundo do cadastro, com a situação do acesso ---------- */
pessoas = function(){
  const rows={}, R=id=>rows[id]||(rows[id]={p:P(id),papeis:new Set(),cs:[],pend:0});
  D.partes.forEach(x=>{ const r=R(x.pessoa_id); r.papeis.add(PAPEL[x.papel]); const c=D.contratos.find(k=>k.id===x.contrato_id); if(c) r.cs.push(c.numero); r.pend=Math.max(r.pend,pend(x.pessoa_id,x.papel).length); });
  D.imoveis.forEach(i=>{ if(i.proprietario_id) R(i.proprietario_id).papeis.add('Proprietário'); });
  (D.captacoes||[]).forEach(c=>{ if(c.proprietario_id) R(c.proprietario_id).papeis.add('Proprietário'); });
  Object.values(D.pessoas).forEach(p=>{ if((p.nome||p.telefone) && !rows[p.id]) rows[p.id]={p,papeis:new Set(['Cliente']),cs:[],pend:0}; });
  const qq=S.busca.toLowerCase(), fa=S.cliFiltro||'todos';
  const todos=Object.values(rows), com=todos.filter(r=>r.p.senha_hash).length;
  const list=todos.filter(r=>(!qq||(r.p.nome+' '+r.p.telefone+' '+r.p.email).toLowerCase().includes(qq)) && (fa==='todos'||(fa==='com')===!!r.p.senha_hash)).sort((a,b)=>(a.p.nome||'zz').localeCompare(b.p.nome||'zz'));
  return `<div class="head"><div><h1>Pessoas</h1><p>Cadastro único de clientes. Crie o cliente aqui e já entregue o acesso ao Citihaus+.</p></div>
  <div class="row" style="gap:8px;flex-wrap:wrap"><input class="search" id="busca" placeholder="Buscar nome, telefone ou e-mail" value="${esc(S.busca)}"><button class="btn pri" data-newcli="1">+ Novo cliente</button></div></div>
  <div class="seg-b" style="margin:0 0 12px;display:inline-flex">${[['todos','Todos '+todos.length],['com','Com acesso '+com],['sem','Sem acesso '+(todos.length-com)]].map(x=>`<button data-clifiltro="${x[0]}" aria-pressed="${fa===x[0]}">${x[1]}</button>`).join('')}</div>
  <div class="tbl-wrap"><table><thead><tr><th>Nome</th><th>Papel</th><th>WhatsApp</th><th>E-mail</th><th>Contratos</th><th>Citihaus+</th><th></th></tr></thead><tbody>
  ${list.map(r=>{ const n=D.imoveis.filter(i=>i.proprietario_id===r.p.id).length, tem=!!r.p.senha_hash;
    return `<tr><td><b>${esc(r.p.nome||'A cadastrar')}</b>${n>1?`<br><span class="muted" style="font-size:12px">${n} imóveis na carteira</span>`:''}${r.pend?`<br><span class="pill p-warn">${r.pend} pendência${r.pend>1?'s':''}</span>`:''}</td><td>${[...r.papeis].join(', ')}</td>
    <td class="num">${r.p.telefone?esc(fmtCel(r.p.telefone)):'<span class="pill p-bad">Falta</span>'}</td><td>${r.p.email?esc(r.p.email):'<span class="muted">—</span>'}</td>
    <td class="mono">${r.cs.length?r.cs.join(', '):'—'}</td>
    <td><span class="pill ${tem?'p-ok':'p-mute'}">${tem?'✓ Com acesso':'Sem acesso'}</span></td>
    <td style="white-space:nowrap"><button class="btn sm ${tem?'ghost':'pri'}" data-senhacli="${r.p.id}">${tem?'Nova senha':'Criar acesso'}</button> <button class="btn sm ghost" data-editp="${r.p.id}">Editar</button></td></tr>`; }).join('')||'<tr><td colspan="7" class="muted">Ninguém aqui ainda.</td></tr>'}
  </tbody></table></div>`;
};

/* ---------- modais ---------- */
const modalCl = modalHtml;
modalHtml = function(){
  const m=S.modal;
  if(m && m.tipo==='newcli'){
    return `<div class="ov center"><form class="modal" id="f-newcli" style="max-width:520px">
     <div class="m-h"><span class="mono" style="color:var(--accent-ink)">Citihaus+</span><h2 style="font-size:19px;margin-top:4px">Novo cliente</h2></div>
     <div class="m-b">
      <label class="f full">Nome completo<input id="nc-nome" required autofocus></label>
      <label class="f">Celular (WhatsApp)<input id="nc-cel" inputmode="tel" placeholder="(17) 99999-9999" required></label>
      <label class="f">E-mail <span class="muted" style="font-weight:500">(opcional)</span><input id="nc-email" type="email"></label>
      <label class="full" style="display:flex;gap:10px;align-items:center;cursor:pointer"><input type="checkbox" id="nc-acesso" checked style="width:20px;height:20px;accent-color:var(--accent)"> <b>Criar o acesso ao Citihaus+ agora</b></label>
      <label class="f full" id="nc-senha-l">Senha<input id="nc-senha" value="${gerarSenha()}" minlength="6"></label>
      <div class="note full">O cliente entra no site com o celular e esta senha. Ao salvar, a mensagem com o acesso já sai pronta para mandar no WhatsApp dele.</div>
     </div>
     <div class="m-f"><button type="button" class="btn" data-mclose="1">Cancelar</button><button class="btn pri" type="submit">Criar cliente</button></div></form></div>`; }
  let h=modalCl();
  /* "Acesso criado": botão que já abre o WhatsApp da pessoa com a mensagem */
  if(m && m.tipo==='pronto' && m.texto && window.waUrl){ const t=(m.texto.match(/Celular:\s*([^\n]+)/)||[])[1];
    if(t && cel(t).length>=10) h=h.replace('<button type="button" class="btn pri" data-copytxt=', `<a class="btn pri" style="background:#25D366;border-color:#25D366;text-decoration:none" target="_blank" rel="noopener" href="${esc(window.waUrl(t, m.texto))}">💬 Mandar no WhatsApp</a><button type="button" class="btn" data-copytxt=`); }
  return h;
};

/* ---------- aba Configuração: atalho para clientes ---------- */
const renderCl = render;
render = function(){
  renderCl.apply(this, arguments);
  if(!S.me || S.tab!=='acessos') return;
  const w=document.querySelector('#app .wrap'); if(!w || w.querySelector('#cli-acessos')) return;
  const hp=w.querySelector('.head p'); if(hp && /Para clientes/.test(hp.textContent)) hp.textContent='Cada pessoa da equipe entra com o celular e a senha que você criar aqui.';
  const ps=Object.values(D.pessoas||{}).filter(p=>p.nome||p.telefone), com=ps.filter(p=>p.senha_hash).length;
  const box=`<div class="box" id="cli-acessos" style="margin:16px 0"><div class="row between" style="gap:10px;flex-wrap:wrap"><div><h2 style="margin:0 0 4px">🧡 Acessos de clientes (Citihaus+)</h2>
    <p class="muted" style="margin:0;font-size:13.5px"><b>${com}</b> de ${ps.length} clientes já têm acesso. Proprietários e inquilinos entram com o celular e a senha.</p></div>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn pri" data-newcli="1">+ Novo cliente</button><button class="btn" data-navgo="pessoas|">Ver todos os clientes</button></div></div></div>`;
  const tb=w.querySelector('.tbl-wrap'); if(tb) tb.insertAdjacentHTML('afterend', box); else w.insertAdjacentHTML('beforeend', box);
};

document.addEventListener('click', e=>{
  if(!S.me) return; const b=e.target.closest('button'); if(!b) return; const d=b.dataset;
  if(d.newcli){ e.stopImmediatePropagation(); S.modal={tipo:'newcli'}; return render(); }
  if(d.clifiltro){ e.stopImmediatePropagation(); S.cliFiltro=d.clifiltro; return render(); }
}, true);
document.addEventListener('change', e=>{ if(e.target.id!=='nc-acesso') return; const l=document.getElementById('nc-senha-l'); if(l) l.style.display=e.target.checked?'':'none'; });
document.addEventListener('submit', e=>{
  const f=e.target; if(f.id!=='f-newcli') return; e.preventDefault(); e.stopImmediatePropagation();
  const v=id=>f.querySelector('#'+id).value.trim(), nome=v('nc-nome'), tel=v('nc-cel'), email=v('nc-email').toLowerCase(), acesso=f.querySelector('#nc-acesso').checked, senha=v('nc-senha');
  if(cel(tel).length<10) return toast('Digite o celular com DDD');
  if(acesso && senha.length<6) return toast('A senha precisa ter pelo menos 6 caracteres');
  const ja=Object.values(D.pessoas||{}).find(p=>cel(p.telefone)===cel(tel));
  if(ja) return toast('Este celular já é de '+(ja.nome||'um cliente cadastrado')+'. Busque por ele na lista e use “'+(ja.senha_hash?'Nova senha':'Criar acesso')+'”.');
  const bt=f.querySelector('[type=submit]'); bt.disabled=true;
  (async()=>{ try{
    const np=await q(sb.from('pessoas').insert({nome, telefone:fmtCel(tel), email}).select().single());
    if(acesso) await q(sb.rpc('equipe_senha_cliente', {p_pessoa:np.id, p_senha:senha}));
    await carregar();
    if(acesso){ S.modal={tipo:'pronto', texto:msgCliente(nome, tel, senha)}; render(); }
    else { S.modal=null; render(); toast('Cliente cadastrado ✓'); }
  }catch(err){ falha(err); bt.disabled=false; } })();
}, true);
})();
