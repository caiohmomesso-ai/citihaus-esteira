/* Citihaus · Documentos e comunicados: biblioteca de modelos (contratos, fichas…) + criador de mensagens para WhatsApp / e-mail */
(function(){
if(TOKEN) return;
D.docMod = D.docMod || []; D.comMod = D.comMod || [];
const CATS = ['Contratos','Locação','Venda','Captação','Formulários','Marketing','Outros'];
const CAT_IC = {Contratos:'📄',Locação:'🔑',Venda:'🏡',Captação:'🏠',Formulários:'📝',Marketing:'🎨',Outros:'📎',Documentos:'📂',Comercial:'🤝',Geral:'📣'};
const adm = () => S.me && S.me.papel==='admin';
const tam = b => !b ? '' : b>1e6 ? (b/1e6).toFixed(1).replace('.',',')+' MB' : Math.max(1,Math.round(b/1e3))+' KB';
const ext = n => (String(n||'').split('.').pop()||'').toUpperCase().slice(0,4);
const C = () => S.com || (S.com = {mod:null, nome:'', tel:'', email:'', imv:'', data:'', texto:'', assunto:'', pessoa:''});

function preencher(t){
  const c=C(), im=c.imv && D.imoveis.find(i=>i.id===c.imv);
  return String(t||'').replace(/\{nome\}/g, c.nome ? c.nome.split(' ')[0] : '').replace(/\{imovel\}/g, im ? im.titulo : '___')
    .replace(/\{corretor\}/g, S.me.nome.split(' ')[0]).replace(/\{data\}/g, c.data ? new Date(c.data).toLocaleString('pt-BR',{weekday:'long',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}) : '___')
    .replace(/Olá, !/g,'Olá!');
}

function docsHtml(){
  const f=S.docCat||'Todos', busca=(S.docBusca||'').toLowerCase();
  const L=D.docMod.filter(d=>(f==='Todos'||d.categoria===f) && (!busca || (d.titulo+' '+(d.descricao||'')).toLowerCase().includes(busca)));
  const c=C(), mods=D.comMod.slice().sort((a,b)=>a.ordem-b.ordem||a.titulo.localeCompare(b.titulo)), m=c.mod && D.comMod.find(x=>x.id===c.mod);
  const cats=[...new Set(mods.map(x=>x.categoria))];
  const texto = c.texto || (m ? preencher(m.texto) : '');
  const pessoas=Object.values(D.pessoas||{}).filter(p=>p.nome).sort((a,b)=>a.nome.localeCompare(b.nome));
  return `<div class="head"><div><h1>📚 Documentos e comunicados</h1><p>Os modelos da Citihaus num lugar só, e mensagens prontas para mandar pelo WhatsApp ou por e-mail.</p></div></div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px;align-items:start;margin-top:8px">

  <div class="box"><div class="row between" style="gap:8px;flex-wrap:wrap;margin-bottom:10px"><h2 style="margin:0">📂 Modelos de documentos</h2><label class="btn sm pri" style="cursor:pointer">+ Enviar modelo<input type="file" id="doc-up" hidden multiple></label></div>
    <input id="doc-busca" type="search" value="${esc(S.docBusca||'')}" placeholder="🔎 Buscar modelo (ex.: contrato, vistoria, ficha)" style="width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:10px;padding:9px 12px;background:var(--bg);font:inherit;margin-bottom:8px">
    <div class="seg-b" style="flex-wrap:wrap;margin-bottom:10px">${['Todos',...CATS].map(k=>`<button data-doccat="${k}" aria-pressed="${f===k}">${k==='Todos'?'Todos':CAT_IC[k]+' '+k}</button>`).join('')}</div>
    ${L.length?L.map(d=>`<div style="display:flex;gap:10px;align-items:center;padding:10px 12px;border:1px solid var(--line);border-radius:12px;margin-bottom:8px">
      <div style="flex:none;width:42px;height:42px;border-radius:10px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;color:var(--accent-ink)">${esc(ext(d.nome_arquivo))||'DOC'}</div>
      <div style="flex:1;min-width:0"><b style="font-size:14px">${esc(d.titulo)}</b><div class="muted" style="font-size:12px">${CAT_IC[d.categoria]||'📎'} ${esc(d.categoria)}${d.tamanho?' · '+tam(d.tamanho):''}${d.descricao?' · '+esc(d.descricao):''}</div></div>
      <div class="row" style="gap:6px;flex:none"><button class="btn sm pri" data-docbaixar="${d.id}">⬇ Baixar</button>${adm()?`<button class="btn sm ghost" style="color:var(--bad)" data-docdel="${d.id}">${S.docDel===d.id?'Confirmar':'🗑'}</button>`:''}</div></div>`).join('')
      :`<div class="empty">${D.docMod.length?'Nenhum modelo nesta busca.':'Nenhum modelo ainda. Envie o contrato padrão, a ficha cadastral, o termo de vistoria… e todo corretor passa a encontrar aqui.'}</div>`}
  </div>

  <div class="box"><h2 style="margin:0 0 10px">📣 Criar comunicado</h2>
    <div class="muted" style="font-size:12px;margin-bottom:6px">1. Escolha o modelo</div>
    ${cats.map(k=>`<div style="margin-bottom:6px"><div class="muted" style="font-size:11.5px;font-weight:700;margin-bottom:4px">${CAT_IC[k]||'📣'} ${esc(k)}</div><div class="row" style="gap:6px;flex-wrap:wrap">${mods.filter(x=>x.categoria===k).map(x=>`<button class="btn sm ${c.mod===x.id?'pri':''}" data-commod="${x.id}">${esc(x.titulo.replace(/^Pedido de documentos · /,'Docs · '))}</button>`).join('')}</div></div>`).join('')}
    <div class="muted" style="font-size:12px;margin:12px 0 6px">2. Para quem</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">
      <label class="f" style="grid-column:1/-1">Buscar no cadastro <span class="muted" style="font-weight:500">(opcional)</span><select id="com-p"><option value="">— Digitar à mão —</option>${pessoas.map(p=>`<option value="${p.id}" ${c.pessoa===p.id?'selected':''}>${esc(p.nome)}</option>`).join('')}</select></label>
      <label class="f">Nome<input id="com-n" value="${esc(c.nome)}"></label>
      <label class="f">Celular<input id="com-t" value="${esc(c.tel)}" inputmode="tel"></label>
      <label class="f">E-mail<input id="com-e" value="${esc(c.email)}" inputmode="email"></label>
      <label class="f">Imóvel<select id="com-i"><option value="">—</option>${D.imoveis.slice().sort((a,b)=>String(a.titulo).localeCompare(String(b.titulo))).map(i=>`<option value="${i.id}" ${c.imv===i.id?'selected':''}>${esc(i.titulo)}</option>`).join('')}</select></label>
      ${m&&/\{data\}/.test(m.texto)?`<label class="f">Data e hora<input id="com-d" type="datetime-local" value="${esc(c.data)}"></label>`:''}
    </div>
    <div class="muted" style="font-size:12px;margin:12px 0 6px">3. Confira a mensagem <span style="font-weight:500">(pode editar à vontade)</span></div>
    <textarea id="com-x" rows="12" placeholder="Escolha um modelo acima ou escreva aqui" style="width:100%;box-sizing:border-box;border:1px solid var(--line);border-radius:12px;padding:10px 12px;background:var(--bg);font:inherit;font-size:14px;line-height:1.45">${esc(texto)}</textarea>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:10px">
      <button class="btn pri" data-comwa="1" style="background:#25D366;border-color:#25D366">💬 Abrir no WhatsApp</button>
      <button class="btn" data-commail="1">✉️ Abrir no e-mail</button>
      <button class="btn ghost" data-comcopy="1">📋 Copiar</button>
      <span style="flex:1"></span>
      <button class="btn sm ghost" data-comsalvar="1">💾 Salvar como modelo</button>${m&&adm()?`<button class="btn sm ghost" style="color:var(--bad)" data-comdel="${m.id}">${S.comDel===m.id?'Confirmar':'🗑 Modelo'}</button>`:''}
    </div>
    <p class="muted" style="font-size:12px;margin:10px 0 0">Para mandar um documento junto: baixe o modelo ao lado e anexe na conversa que abrir. Os campos {nome}, {imovel}, {corretor} e {data} são preenchidos sozinhos.</p>
  </div></div>`;
}

/* ---------- dados ---------- */
const carregarDc = carregar;
carregar = async function(){
  await carregarDc.apply(this, arguments);
  if(!S.me) return;
  try{ const [a,b]=await Promise.all([q(sb.from('doc_modelos').select('*').order('categoria').order('titulo')), q(sb.from('com_modelos').select('*').order('ordem'))]); D.docMod=a||[]; D.comMod=b||[]; }catch(_){ }
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
  ['nome:com-n','tel:com-t','email:com-e','imv:com-i','data:com-d','texto:com-x'].forEach(p=>{ const [k,id]=p.split(':'); const v=g(id); if(v!==undefined) c[k]=v; }); return c; }
function refazTexto(){ const c=C(), m=c.mod && D.comMod.find(x=>x.id===c.mod); if(!m) return; c.texto=preencher(m.texto); const x=document.getElementById('com-x'); if(x) x.value=c.texto; }
const soNum = t => String(t||'').replace(/\D/g,'');

document.addEventListener('input', e=>{
  if(S.tab!=='docs') return; const id=e.target.id;
  if(id==='doc-busca'){ S.docBusca=e.target.value; render(); return; }
  if(id==='com-x'){ C().texto=e.target.value; C().editado=true; return; }
  if(['com-n','com-t','com-e','com-d'].includes(id)){ lerCampos(); if(!C().editado && ['com-n','com-d'].includes(id)) refazTexto(); }
});
document.addEventListener('change', e=>{
  if(S.tab!=='docs') return; const id=e.target.id;
  if(id==='com-i'){ C().imv=e.target.value; if(!C().editado) refazTexto(); }
  if(id==='com-p'){ const p=(D.pessoas||{})[e.target.value]; const c=C(); c.pessoa=e.target.value; if(p){ c.nome=p.nome||''; c.tel=p.telefone||''; c.email=p.email||''; } if(!c.editado) c.texto=''; render(); if(!c.editado) refazTexto(); }
  if(id==='doc-up'){ const fs=[...e.target.files]; if(!fs.length) return; S.docUp=fs; S.modal={tipo:'docup'}; render(); }
});
document.addEventListener('click', e=>{
  if(!S.me) return; const b=e.target.closest('button'); if(!b) return; const d=b.dataset;
  if(d.doccat){ e.stopImmediatePropagation(); S.docCat=d.doccat; return render(); }
  if(d.docbaixar){ e.stopImmediatePropagation(); const doc=D.docMod.find(x=>x.id===d.docbaixar); if(!doc) return;
    (async()=>{ try{ const r=await sb.storage.from('modelos').createSignedUrl(doc.path, 120, {download: doc.nome_arquivo||true}); if(r.error) throw r.error; window.open(r.data.signedUrl,'_blank','noopener'); }catch(err){ falha(err); } })(); return; }
  if(d.docdel){ e.stopImmediatePropagation(); if(S.docDel!==d.docdel){ S.docDel=d.docdel; return render(); } const doc=D.docMod.find(x=>x.id===d.docdel);
    return acao(async()=>{ await sb.storage.from('modelos').remove([doc.path]); await q(sb.from('doc_modelos').delete().eq('id',doc.id)); S.docDel=null; }, 'Modelo removido'); }
  if(d.commod){ e.stopImmediatePropagation(); lerCampos(); const c=C(); c.mod=d.commod; c.editado=false; c.texto=''; const m=D.comMod.find(x=>x.id===c.mod); c.assunto=m&&m.assunto||''; render(); refazTexto(); return; }
  if(d.comwa||d.commail||d.comcopy){ e.stopImmediatePropagation(); const c=lerCampos(), t=(c.texto||'').trim(); if(!t) return toast('Escolha um modelo ou escreva a mensagem');
    if(d.comcopy) return copiar(t);
    if(d.comwa){ const n=soNum(c.tel); const tel = n ? (n.length<=11 ? '55'+n : n) : ''; window.open('https://wa.me/'+tel+'?text='+encodeURIComponent(t),'_blank','noopener'); if(!n) toast('Sem celular: escolha o contato no WhatsApp'); return; }
    if(d.commail){ const m=c.mod && D.comMod.find(x=>x.id===c.mod); location.href='mailto:'+encodeURIComponent(c.email||'')+'?subject='+encodeURIComponent((m&&m.assunto)||'Citihaus')+'&body='+encodeURIComponent(t); if(!c.email) toast('Sem e-mail: preencha o destinatário no e-mail que abriu'); return; } }
  if(d.comsalvar){ e.stopImmediatePropagation(); lerCampos(); S.modal={tipo:'comsalvar'}; return render(); }
  if(d.comdel){ e.stopImmediatePropagation(); if(S.comDel!==d.comdel){ S.comDel=d.comdel; return render(); }
    return acao(async()=>{ await q(sb.from('com_modelos').delete().eq('id',d.comdel)); C().mod=null; S.comDel=null; }, 'Modelo de comunicado removido'); }
}, true);

/* modais: enviar arquivo e salvar modelo de comunicado */
const modalDc = modalHtml;
modalHtml = function(){
  const m=S.modal;
  if(m && m.tipo==='docup'){ const fs=S.docUp||[];
    return `<div class="ov center"><form class="modal" id="f-docup" style="max-width:520px"><div class="m-h"><h2 style="font-size:19px">📂 Enviar ${fs.length>1?fs.length+' modelos':'modelo'}</h2></div>
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
      <label class="f">Assunto do e-mail<input id="cs-a" value="${esc(c.assunto||'')}"></label>
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
    let t=c.texto; if(c.nome){ const pn=c.nome.split(' ')[0]; t=t.split(pn).join('{nome}'); } const im=c.imv&&D.imoveis.find(i=>i.id===c.imv); if(im) t=t.split(im.titulo).join('{imovel}');
    return acao(async()=>{ const r=await q(sb.from('com_modelos').insert({titulo:f.querySelector('#cs-t').value.trim(), categoria:f.querySelector('#cs-c').value, assunto:f.querySelector('#cs-a').value.trim()||null, texto:t, criado_por:S.me.nome}).select().single()); S.modal=null; if(r) { c.mod=r.id; c.editado=true; } }, 'Modelo salvo ✓'); }
}, true);
})();
