/* Citihaus · Documentos: enviar ao cliente por link (página da Citihaus com o texto e os anexos) + biblioteca de modelos */
(function(){
if(TOKEN) return;
D.docMod = D.docMod || []; D.comMod = D.comMod || []; D.envios = D.envios || [];
const CATS = ['Contratos','Locação','Venda','Captação','Formulários','Marketing','Outros'];
const CAT_IC = {Contratos:'📄',Locação:'🔑',Venda:'🏡',Captação:'🏠',Formulários:'📝',Marketing:'🎨',Outros:'📎',Documentos:'📂',Comercial:'🤝',Geral:'📣'};
const adm = () => S.me && S.me.papel==='admin';
const tam = b => !b ? '' : b>1e6 ? (b/1e6).toFixed(1).replace('.',',')+' MB' : Math.max(1,Math.round(b/1e3))+' KB';
const ext = n => (String(n||'').split('.').pop()||'').toUpperCase().slice(0,4);
const C = () => S.com || (S.com = {mod:null, base:'', titulo:'', nome:'', tel:'', email:'', imv:'', data:'', texto:'', anexos:[], editado:false});
const soNum = t => String(t||'').replace(/\D/g,'');
const baseUrl = () => location.origin + location.pathname.replace(/[^/]*$/,'');
const linkDe = tk => baseUrl() + 'doc.html?d=' + tk;
const haQuanto = d => { const m=Math.round((Date.now()-new Date(d))/6e4); return m<1?'agora':m<60?'há '+m+' min':m<1440?'há '+Math.round(m/60)+' h':m<2880?'ontem':dataBR(d); };

function preencher(t){
  const c=C(), im=c.imv && D.imoveis.find(i=>i.id===c.imv);
  return String(t||'').replace(/\{nome\}/g, c.nome ? c.nome.trim().split(' ')[0] : '').replace(/\{imovel\}/g, im ? im.titulo : '___')
    .replace(/\{corretor\}/g, S.me.nome.split(' ')[0]).replace(/\{data\}/g, c.data ? new Date(c.data).toLocaleString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '___')
    .replace(/Olá, !/g,'Olá!');
}

const CSS = `<style id="dx-css">
.dx-grid{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:16px;align-items:start;margin-top:8px}
@media (max-width:900px){.dx-grid{grid-template-columns:minmax(0,1fr)}}
.dx-lbl{font-size:12px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.04em;margin:14px 0 6px}
.dx-chips{display:flex;gap:6px;flex-wrap:wrap}
.dx-chip{border:1px solid var(--line);background:var(--bg);color:inherit;border-radius:999px;padding:7px 12px;font:600 13px/1.2 inherit;cursor:pointer;text-align:left}
.dx-chip[aria-pressed="true"]{background:var(--accent);border-color:var(--accent);color:#fff}
.dx-in{width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:10px;padding:10px 12px;background:var(--bg);color:inherit;font:inherit}
.dx-para{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px}
.dx-papel{border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--surface)}
.dx-papel-t{background:#E85D24;color:#fff;padding:10px 16px;display:flex;justify-content:space-between;align-items:baseline;border-bottom:3px solid #E99220}
.dx-papel-t b{font:700 18px var(--f-display,inherit)}
.dx-papel-t span{font-size:12px;opacity:.95}
.dx-papel input{width:100%;box-sizing:border-box;border:0;border-bottom:1px solid var(--line);background:transparent;color:var(--accent-ink);font:700 17px var(--f-display,inherit);padding:12px 16px}
.dx-papel textarea{width:100%;box-sizing:border-box;border:0;background:transparent;color:inherit;font:inherit;font-size:14.5px;line-height:1.5;padding:12px 16px;resize:vertical;min-height:210px;display:block}
.dx-papel input:focus,.dx-papel textarea:focus{outline:2px solid var(--accent);outline-offset:-2px}
.dx-acoes{display:flex;gap:8px;flex-wrap:wrap;margin-top:14px}
.dx-acoes .btn{flex:1 1 150px;justify-content:center}
.dx-item{display:flex;gap:10px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:12px;margin-bottom:8px}
@media (max-width:560px){.dx-item{flex-wrap:wrap}.dx-item>.row{width:100%;justify-content:flex-end}}
.dx-ic{flex:none;width:40px;height:40px;border-radius:10px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;color:var(--accent-ink)}
</style>`;

function docsHtml(){
  const f=S.docCat||'Todos', busca=(S.docBusca||'').toLowerCase();
  const L=D.docMod.filter(d=>(f==='Todos'||d.categoria===f) && (!busca || (d.titulo+' '+(d.descricao||'')).toLowerCase().includes(busca)));
  const c=C(), mods=D.comMod.slice().sort((a,b)=>a.ordem-b.ordem||a.titulo.localeCompare(b.titulo)), m=c.mod && D.comMod.find(x=>x.id===c.mod);
  const pessoas=Object.values(D.pessoas||{}).filter(p=>p.nome).sort((a,b)=>a.nome.localeCompare(b.nome));
  const usaData=/\{data\}/.test(c.base||''), nA=(c.anexos||[]).length;
  return `${CSS}<div class="head"><div><h1>📚 Documentos</h1><p>Monte o documento, mande pelo WhatsApp ou e-mail e veja se o cliente abriu. Ele recebe um link com a página da Citihaus.</p></div></div>
  <div class="dx-grid">

  <div class="box" id="dx-compor"><h2 style="margin:0">✉️ Enviar ao cliente</h2>
    <div class="dx-lbl">O que você quer enviar?</div>
    <div class="dx-chips">${mods.map(x=>`<button class="dx-chip" data-commod="${x.id}" aria-pressed="${c.mod===x.id}">${CAT_IC[x.categoria]||'📣'} ${esc(x.titulo.replace(/^Pedido de documentos · /,'Pedir docs · '))}</button>`).join('')}<button class="dx-chip" data-commod="branco" aria-pressed="${c.mod==='branco'}">✍️ Em branco</button></div>

    <div class="dx-lbl">Para quem</div>
    <div class="dx-para">
      <input class="dx-in" id="com-n" list="dx-pessoas" value="${esc(c.nome)}" placeholder="Nome (digite para buscar no cadastro)" autocomplete="off" aria-label="Nome do cliente">
      <input class="dx-in" id="com-t" value="${esc(c.tel)}" inputmode="tel" placeholder="Celular com DDD" aria-label="Celular">
      <input class="dx-in" id="com-e" value="${esc(c.email)}" inputmode="email" placeholder="E-mail (opcional)" aria-label="E-mail">
      <select class="dx-in" id="com-i" aria-label="Imóvel"><option value="">Imóvel (opcional)</option>${D.imoveis.slice().sort((a,b)=>String(a.titulo).localeCompare(String(b.titulo))).map(i=>`<option value="${i.id}" ${c.imv===i.id?'selected':''}>${esc(i.titulo)}</option>`).join('')}</select>
      ${usaData?`<input class="dx-in" id="com-d" type="datetime-local" value="${esc(c.data)}" aria-label="Data e hora">`:''}
    </div>
    <datalist id="dx-pessoas">${pessoas.map(p=>`<option value="${esc(p.nome)}">`).join('')}</datalist>

    <div class="dx-lbl">Documento <span style="font-weight:500;text-transform:none;letter-spacing:0">· é assim que o cliente vai ver, pode editar</span></div>
    <div class="dx-papel"><div class="dx-papel-t"><b>Citihaus</b><span>${new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'})}</span></div>
      <input id="com-a" value="${esc(c.titulo)}" placeholder="Título do documento" aria-label="Título">
      <textarea id="com-x" rows="11" placeholder="Escolha um modelo acima ou escreva aqui" aria-label="Texto">${esc(c.texto)}</textarea></div>

    <div class="dx-lbl">Anexos ${nA?`<span class="pill p-acc">${nA}</span>`:''} <span style="font-weight:500;text-transform:none;letter-spacing:0">· toque para incluir</span></div>
    ${D.docMod.length?`<div class="dx-chips">${D.docMod.map(d=>`<button class="dx-chip" data-cxanexo="${d.id}" aria-pressed="${(c.anexos||[]).includes(d.id)}">📎 ${esc(d.titulo)}</button>`).join('')}</div>`:'<div class="muted" style="font-size:13px">Nenhum arquivo na biblioteca ainda. Envie um modelo ao lado para poder anexar.</div>'}

    <div class="dx-acoes">
      <button class="btn pri" data-cxwa="1" style="background:#25D366;border-color:#25D366">💬 Enviar no WhatsApp</button>
      <button class="btn" data-cxmail="1">✉️ Enviar por e-mail</button>
      <button class="btn ghost" data-cxlink="1">🔗 Copiar link</button>
      <button class="btn ghost" data-cxver="1">👁 Ver como fica</button>
    </div>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px;align-items:center"><span class="muted" style="font-size:12px;flex:1;min-width:200px">O link vale 90 dias. O cliente lê, baixa os anexos e pode salvar em PDF.</span>
      <button class="btn sm ghost" data-comsalvar="1">💾 Salvar como modelo</button>${m&&adm()?`<button class="btn sm ghost" style="color:var(--bad)" data-comdel="${m.id}">${S.comDel===m.id?'Confirmar':'🗑 Apagar modelo'}</button>`:''}</div>
  </div>

  <div>
  <div class="box"><div class="row between" style="gap:8px;flex-wrap:wrap;margin-bottom:10px"><h2 style="margin:0">📂 Biblioteca</h2><label class="btn sm pri" style="cursor:pointer">+ Adicionar arquivo<input type="file" id="doc-up" hidden multiple></label></div>
    <input class="dx-in" id="doc-busca" type="search" value="${esc(S.docBusca||'')}" placeholder="🔎 Buscar (ex.: contrato, vistoria, ficha)" style="margin-bottom:8px">
    <div class="seg-b" style="flex-wrap:wrap;margin-bottom:10px">${['Todos',...CATS.filter(k=>D.docMod.some(d=>d.categoria===k))].map(k=>`<button data-doccat="${k}" aria-pressed="${f===k}">${k==='Todos'?'Todos':CAT_IC[k]+' '+k}</button>`).join('')}</div>
    ${L.length?L.map(d=>`<div class="dx-item"><div class="dx-ic">${esc(ext(d.nome_arquivo))||'DOC'}</div>
      <div style="flex:1;min-width:0"><b style="font-size:14px;overflow-wrap:anywhere">${esc(d.titulo)}</b><div class="muted" style="font-size:12px">${esc(d.categoria)}${d.tamanho?' · '+tam(d.tamanho):''}${d.descricao?' · '+esc(d.descricao):''}</div></div>
      <div class="row" style="gap:6px;flex:none"><button class="btn sm pri" data-docenviar="${d.id}">📤 Enviar</button><button class="btn sm" data-docbaixar="${d.id}" title="Baixar" aria-label="Baixar">⬇</button>${adm()?`<button class="btn sm ghost" style="color:var(--bad)" data-docdel="${d.id}" aria-label="Apagar">${S.docDel===d.id?'Confirmar':'🗑'}</button>`:''}</div></div>`).join('')
      :`<div class="empty">${D.docMod.length?'Nada nesta busca.':'Nenhum arquivo ainda. Adicione o contrato padrão, a ficha cadastral, o termo de vistoria… e toda a equipe encontra aqui.'}</div>`}
    <p class="muted" style="font-size:12px;margin:8px 0 0">Guarde aqui só modelos em branco. Documento com dados de cliente fica no contrato dele.</p>
  </div>

  <div class="box" style="margin-top:16px"><h2 style="margin:0 0 10px">🕓 Últimos envios</h2>
    ${D.envios.length?D.envios.slice(0,12).map(v=>`<div class="dx-item" style="padding:8px 12px"><div style="flex:1;min-width:0"><b style="font-size:13.5px;overflow-wrap:anywhere">${esc(v.titulo)}</b>
      <div class="muted" style="font-size:12px">${v.para?esc(v.para)+' · ':''}${haQuanto(v.created_at)}${(v.anexos||[]).length?' · 📎 '+v.anexos.length:''}</div></div>
      <span class="pill ${v.aberturas?'p-ok':'p-mute'}" style="flex:none">${v.aberturas?'👁 Abriu'+(v.aberturas>1?' '+v.aberturas+'x':''):'Não abriu'}</span>
      <button class="btn sm ghost" data-envlink="${v.token}" title="Copiar link" aria-label="Copiar link">🔗</button>${adm()?`<button class="btn sm ghost" style="color:var(--bad)" data-envdel="${v.token}" aria-label="Cancelar link">${S.envDel===v.token?'Cancelar link?':'🗑'}</button>`:''}</div>`).join('')
      :'<div class="muted" style="font-size:13px">Os documentos enviados aparecem aqui, com o aviso de quando o cliente abrir.</div>'}
  </div></div></div>`;
}

/* ---------- dados ---------- */
const carregarDc = carregar;
carregar = async function(){
  await carregarDc.apply(this, arguments);
  if(!S.me) return;
  try{ const [a,b]=await Promise.all([q(sb.from('doc_modelos').select('*').order('categoria').order('titulo')), q(sb.from('com_modelos').select('*').order('ordem'))]); D.docMod=a||[]; D.comMod=b||[]; }catch(_){ }
  try{ D.envios = await q(sb.from('com_envios').select('*').order('created_at',{ascending:false}).limit(30)) || []; }catch(_){ D.envios = D.envios || []; }
};
const renderDc = render;
render = function(){
  renderDc.apply(this, arguments);
  if(!S.me || S.tab!=='docs') return;
  const nav=document.querySelector('nav.sub'), w=document.querySelector('#app .wrap'); if(!w) return;
  const foco=document.activeElement && document.activeElement.id, pos=foco&&document.activeElement.selectionStart;
  [...w.children].forEach(ch=>{ if(ch!==nav && !ch.classList.contains('subnav')) ch.remove(); });
  w.insertAdjacentHTML('beforeend', docsHtml());
  if(foco){ const el=document.getElementById(foco); if(el){ el.focus(); try{ if(pos!=null) el.setSelectionRange(pos,pos); }catch(_){ } } }
};

function lerCampos(){ const c=C(), g=id=>{ const x=document.getElementById(id); return x?x.value:undefined; };
  ['nome:com-n','tel:com-t','email:com-e','imv:com-i','data:com-d','texto:com-x','titulo:com-a'].forEach(p=>{ const [k,id]=p.split(':'); const v=g(id); if(v!==undefined) c[k]=v; }); return c; }
function refazTexto(){ const c=C(); if(!c.base || c.editado) return; c.texto=preencher(c.base); const x=document.getElementById('com-x'); if(x) x.value=c.texto; }

/* cria (ou reaproveita) o link do documento */
let ultimo=null;
async function criarEnvio(c){
  const im=c.imv && D.imoveis.find(i=>i.id===c.imv);
  const anexos=(c.anexos||[]).map(id=>D.docMod.find(x=>x.id===id)).filter(Boolean).map(d=>({titulo:d.titulo, nome:d.nome_arquivo||d.titulo, path:d.path}));
  const linha={titulo:(c.titulo||'').trim()||(anexos.length===1?anexos[0].titulo:'Documento Citihaus'), texto:(c.texto||'').trim(), para:(c.nome||'').trim()||null, imovel:im?im.titulo:null, remetente:S.me.nome, anexos, criado_por:S.me.nome};
  const chave=JSON.stringify(linha);
  if(ultimo && ultimo.chave===chave) return ultimo.r;
  const r=await q(sb.from('com_envios').insert(linha).select().single());
  D.envios.unshift(r); ultimo={chave, r}; return r;
}
const msgCurta = (c, r) => `Olá${c.nome?', '+c.nome.trim().split(' ')[0]:''}! Aqui é ${S.me.nome.split(' ')[0]}, da Citihaus 🧡\n\nPreparei para você: *${r.titulo}*${(r.anexos||[]).length?` (com ${r.anexos.length} anexo${r.anexos.length>1?'s':''})`:''}\n\n👉 ${linkDe(r.token)}\n\nÉ só tocar no link para ler${(r.anexos||[]).length?' e baixar os arquivos':''}.`;

document.addEventListener('input', e=>{
  if(S.tab!=='docs') return; const id=e.target.id;
  if(id==='doc-busca'){ S.docBusca=e.target.value; render(); return; }
  if(id==='com-x'){ C().texto=e.target.value; C().editado=true; return; }
  if(id==='com-a'){ C().titulo=e.target.value; return; }
  if(id==='com-n'){ const c=lerCampos(), p=Object.values(D.pessoas||{}).find(x=>x.nome && x.nome===e.target.value);
    if(p){ c.tel=p.telefone||c.tel; c.email=p.email||c.email; const t=document.getElementById('com-t'), m=document.getElementById('com-e'); if(t) t.value=c.tel||''; if(m) m.value=c.email||''; }
    refazTexto(); return; }
  if(['com-t','com-e','com-d'].includes(id)){ lerCampos(); if(id==='com-d') refazTexto(); }
});
document.addEventListener('change', e=>{
  if(S.tab!=='docs') return; const id=e.target.id;
  if(id==='com-i'){ C().imv=e.target.value; refazTexto(); }
  if(id==='doc-up'){ const fs=[...e.target.files]; if(!fs.length) return; S.docUp=fs; S.modal={tipo:'docup'}; render(); }
});
document.addEventListener('click', e=>{
  if(!S.me) return; const b=e.target.closest('button'); if(!b) return; const d=b.dataset;
  if(d.doccat){ e.stopImmediatePropagation(); S.docCat=d.doccat; return render(); }
  if(d.docbaixar){ e.stopImmediatePropagation(); const doc=D.docMod.find(x=>x.id===d.docbaixar); if(!doc) return;
    (async()=>{ try{ const r=await sb.storage.from('modelos').createSignedUrl(doc.path, 120, {download: doc.nome_arquivo||true}); if(r.error) throw r.error; window.open(r.data.signedUrl,'_blank','noopener'); }catch(err){ falha(err); } })(); return; }
  if(d.docdel){ e.stopImmediatePropagation(); if(S.docDel!==d.docdel){ S.docDel=d.docdel; return render(); } const doc=D.docMod.find(x=>x.id===d.docdel);
    return acao(async()=>{ await sb.storage.from('modelos').remove([doc.path]); await q(sb.from('doc_modelos').delete().eq('id',doc.id)); S.docDel=null; C().anexos=(C().anexos||[]).filter(x=>x!==doc.id); }, 'Arquivo removido'); }
  if(d.docenviar){ e.stopImmediatePropagation(); const c=lerCampos(), doc=D.docMod.find(x=>x.id===d.docenviar); if(!doc) return;
    c.anexos=[...new Set([...(c.anexos||[]), doc.id])];
    if(!(c.texto||'').trim()){ c.mod='branco'; c.base='Olá, {nome}!\n\nSegue o documento “'+doc.titulo+'”.\n\nQualquer dúvida, é só me chamar.\n\n{corretor}'; c.editado=false; c.titulo=c.titulo||doc.titulo; c.texto=preencher(c.base); }
    render(); const bx=document.getElementById('dx-compor'); if(bx) bx.scrollIntoView({behavior:'smooth', block:'start'}); const n=document.getElementById('com-n'); if(n && !c.nome) n.focus({preventScroll:true}); return; }
  if(d.commod){ e.stopImmediatePropagation(); const c=lerCampos(); c.mod=d.commod; c.editado=false; const m=D.comMod.find(x=>x.id===c.mod);
    c.base=m?m.texto:''; c.titulo=m?(m.assunto||m.titulo):''; c.texto=m?preencher(m.texto):''; render(); const x=document.getElementById(m?'com-n':'com-a'); if(x && !(m&&c.nome)) x.focus({preventScroll:true}); return; }
  if(d.cxanexo){ e.stopImmediatePropagation(); const c=lerCampos(); c.anexos=c.anexos||[]; c.anexos = c.anexos.includes(d.cxanexo) ? c.anexos.filter(x=>x!==d.cxanexo) : [...c.anexos, d.cxanexo]; return render(); }
  if(d.cxwa||d.cxmail||d.cxlink||d.cxver){ e.stopImmediatePropagation(); const c=lerCampos();
    if(!(c.texto||'').trim() && !(c.anexos||[]).length) return toast('Escolha um modelo, escreva o texto ou inclua um anexo');
    if(d.cxmail && !/.+@.+\..+/.test(c.email||'')){ const m=document.getElementById('com-e'); if(m) m.focus(); return toast('Informe o e-mail do cliente'); }
    /* a janela precisa abrir já no clique, senão o navegador bloqueia */
    const jan = (d.cxwa||d.cxver) ? window.open('about:blank','_blank') : null;
    b.disabled=true; const txtBtn=b.textContent; b.textContent='Preparando…';
    (async()=>{ try{
      const r=await criarEnvio(c), link=linkDe(r.token);
      if(d.cxver){ if(jan) jan.location.href=link+'&p=1'; else window.open(link+'&p=1','_blank'); }
      else if(d.cxlink){ copiar(link); }
      else if(d.cxwa){ const n=soNum(c.tel), tel = n ? (n.length<=11 ? '55'+n : n) : ''; const url='https://wa.me/'+tel+'?text='+encodeURIComponent(msgCurta(c,r)); if(jan) jan.location.href=url; else window.open(url,'_blank'); toast('WhatsApp aberto: é só enviar ✓'); }
      else { location.href='mailto:'+encodeURIComponent(c.email||'')+'?subject='+encodeURIComponent(r.titulo+' · Citihaus')+'&body='+encodeURIComponent(msgCurta(c,r).replace(/\*/g,'')); toast('E-mail aberto: é só enviar ✓'); }
      render();
    }catch(err){ if(jan) jan.close(); falha(err); } finally{ b.disabled=false; b.textContent=txtBtn; } })(); return; }
  if(d.envlink){ e.stopImmediatePropagation(); return copiar(linkDe(d.envlink)); }
  if(d.envdel){ e.stopImmediatePropagation(); if(S.envDel!==d.envdel){ S.envDel=d.envdel; return render(); }
    return acao(async()=>{ await q(sb.from('com_envios').delete().eq('token',d.envdel)); S.envDel=null; ultimo=null; }, 'Link cancelado: ninguém mais consegue abrir'); }
  if(d.comsalvar){ e.stopImmediatePropagation(); lerCampos(); if(!(C().texto||'').trim()) return toast('Escreva o texto antes de salvar'); C().assunto=C().titulo; S.modal={tipo:'comsalvar'}; return render(); }
  if(d.comdel){ e.stopImmediatePropagation(); if(S.comDel!==d.comdel){ S.comDel=d.comdel; return render(); }
    return acao(async()=>{ await q(sb.from('com_modelos').delete().eq('id',d.comdel)); C().mod=null; S.comDel=null; }, 'Modelo removido'); }
}, true);

/* modais: enviar arquivo e salvar modelo de comunicado */
const modalDc = modalHtml;
modalHtml = function(){
  const m=S.modal;
  if(m && m.tipo==='docup'){ const fs=S.docUp||[];
    return `<div class="ov center"><form class="modal" id="f-docup" style="max-width:520px"><div class="m-h"><h2 style="font-size:19px">📂 Adicionar ${fs.length>1?fs.length+' arquivos':'arquivo'} à biblioteca</h2></div>
     <div class="m-b">${fs.map((f,k)=>`<div class="full" style="display:grid;grid-template-columns:1fr 150px;gap:8px;padding-bottom:8px;border-bottom:1px solid var(--line)">
       <label class="f">Nome<input id="du-t${k}" required value="${esc(f.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' '))}"></label>
       <label class="f">Categoria<select id="du-c${k}">${CATS.map(c=>`<option ${/contrat/i.test(f.name)&&c==='Contratos'?'selected':''}>${c}</option>`).join('')}</select></label>
       <label class="f" style="grid-column:1/-1">Para que serve <span class="muted" style="font-weight:500">(opcional)</span><input id="du-d${k}" placeholder="Ex.: Minuta padrão de locação residencial"></label>
       <div class="muted" style="font-size:12px;grid-column:1/-1">${esc(f.name)} · ${tam(f.size)}</div></div>`).join('')}</div>
     <div class="m-f"><button type="button" class="btn" data-mclose="1">Cancelar</button><button class="btn pri" type="submit">Enviar</button></div></form></div>`; }
  if(m && m.tipo==='comsalvar'){ const c=C();
    return `<div class="ov center"><form class="modal" id="f-comsalvar" style="max-width:520px"><div class="m-h"><h2 style="font-size:19px">💾 Salvar como modelo</h2></div>
     <div class="m-b"><label class="f full">Nome do modelo<input id="cs-t" required placeholder="Ex.: Pedido de documentos · Venda"></label>
      <label class="f">Categoria<select id="cs-c">${['Documentos','Locação','Comercial','Geral'].map(x=>`<option>${x}</option>`).join('')}</select></label>
      <label class="f">Título do documento<input id="cs-a" value="${esc(c.assunto||'')}"></label>
      <div class="note full">Dica: troque o nome da pessoa por {nome} e o imóvel por {imovel}. Assim o modelo serve para qualquer cliente.</div></div>
     <div class="m-f"><button type="button" class="btn" data-mclose="1">Cancelar</button><button class="btn pri" type="submit">Salvar</button></div></form></div>`; }
  return modalDc();
};
document.addEventListener('submit', e=>{
  const f=e.target;
  if(f.id==='f-docup'){ e.preventDefault(); e.stopImmediatePropagation(); const fs=S.docUp||[];
    return acao(async()=>{ for(let k=0;k<fs.length;k++){ const fl=fs[k]; if(fl.size>25e6) throw new Error(fl.name+': arquivo maior que 25 MB');
        const path=`${Date.now()}-${k}-${fl.name.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w.-]+/g,'_')}`;
        const up=await sb.storage.from('modelos').upload(path, fl, {contentType: fl.type||'application/octet-stream'}); if(up.error) throw up.error;
        await q(sb.from('doc_modelos').insert({titulo:f.querySelector('#du-t'+k).value.trim(), categoria:f.querySelector('#du-c'+k).value, descricao:f.querySelector('#du-d'+k).value.trim()||null, path, nome_arquivo:fl.name, mime:fl.type||null, tamanho:fl.size, criado_por:S.me.nome})); }
      S.modal=null; S.docUp=null; }, fs.length>1?fs.length+' modelos enviados ✓':'Modelo enviado ✓'); }
  if(f.id==='f-comsalvar'){ e.preventDefault(); e.stopImmediatePropagation(); const c=C(); if(!(c.texto||'').trim()) return toast('Escreva a mensagem antes de salvar');
    let t=c.texto; if((c.nome||'').trim()){ const pn=c.nome.trim().split(' ')[0]; t=t.split(pn).join('{nome}'); } const im=c.imv&&D.imoveis.find(i=>i.id===c.imv); if(im) t=t.split(im.titulo).join('{imovel}');
    return acao(async()=>{ const r=await q(sb.from('com_modelos').insert({titulo:f.querySelector('#cs-t').value.trim(), categoria:f.querySelector('#cs-c').value, assunto:f.querySelector('#cs-a').value.trim()||null, texto:t, criado_por:S.me.nome}).select().single()); S.modal=null; if(r) { c.mod=r.id; c.base=r.texto; } }, 'Modelo salvo ✓'); }
}, true);
})();
