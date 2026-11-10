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
    <div class="muted" style="font-size:12px;margin:12px 0 6px">4. Anexos <span style="font-weight:500">(vão junto com o PDF)</span></div>
    ${D.docMod.length?`<div style="display:grid;gap:4px;max-height:150px;overflow:auto;border:1px solid var(--line);border-radius:10px;padding:8px 10px">${D.docMod.map(d=>`<label style="display:flex;gap:8px;align-items:center;font-size:13px;cursor:pointer"><input type="checkbox" data-cxanexo="${d.id}" ${(c.anexos||[]).includes(d.id)?'checked':''} style="accent-color:var(--accent)"> ${CAT_IC[d.categoria]||'📎'} ${esc(d.titulo)} <span class="muted" style="font-size:11px">${esc(ext(d.nome_arquivo))}</span></label>`).join('')}</div>`:'<div class="muted" style="font-size:12.5px">Nenhum modelo enviado ainda.</div>'}
    <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:12px">
      <button class="btn pri" data-cxwa="1" style="background:#25D366;border-color:#25D366">💬 Enviar no WhatsApp</button>
      <button class="btn" data-cxmail="1">✉️ Enviar por e-mail</button>
      <button class="btn ghost" data-cxpdf="1">⬇ Baixar PDF</button>
      <button class="btn ghost" data-cxcopy="1">📋 Copiar texto</button>
      <span style="flex:1"></span>
      <button class="btn sm ghost" data-comsalvar="1">💾 Salvar como modelo</button>${m&&adm()?`<button class="btn sm ghost" style="color:var(--bad)" data-comdel="${m.id}">${S.comDel===m.id?'Confirmar':'🗑 Modelo'}</button>`:''}
    </div>
    <p class="muted" style="font-size:12px;margin:10px 0 0">O comunicado vira um <b>PDF com a marca da Citihaus</b>. No celular, o WhatsApp abre já com o PDF e os anexos. No computador, os arquivos são baixados e a conversa abre: é só arrastar os arquivos para ela. Os campos {nome}, {imovel}, {corretor} e {data} são preenchidos sozinhos.</p>
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
document.addEventListener('change', e=>{ const id=e.target.dataset && e.target.dataset.cxanexo; if(!id) return; const c=C(); c.anexos=c.anexos||[]; c.anexos = e.target.checked ? [...new Set([...c.anexos,id])] : c.anexos.filter(x=>x!==id); });
const assuntoDe = c => { const m=c.mod && D.comMod.find(x=>x.id===c.mod); return (m&&m.assunto) || 'Comunicado Citihaus'; };
const podeCompartilhar = fs => { try{ return !!(navigator.canShare && navigator.share && (!fs || navigator.canShare({files:fs}))); }catch(_){ return false; } };
function salvar(f){ const a=document.createElement('a'); a.href=URL.createObjectURL(f); a.download=f.name; document.body.appendChild(a); a.click(); setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 4000); }
async function baixarAnexos(ids){ const out=[]; for(const id of ids){ const d=D.docMod.find(x=>x.id===id); if(!d) continue; const r=await sb.storage.from('modelos').download(d.path); if(r.error) throw r.error; out.push(new File([r.data], d.nome_arquivo||d.titulo, {type:d.mime||r.data.type||'application/octet-stream'})); } return out; }
let jsPdfP=null;
const carregaJsPDF = () => jsPdfP || (jsPdfP = new Promise((ok,nok)=>{ if(window.jspdf) return ok(window.jspdf); const sc=document.createElement('script'); sc.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'; sc.onload=()=>ok(window.jspdf); sc.onerror=()=>{ jsPdfP=null; nok(new Error('Não foi possível carregar o gerador de PDF')); }; document.head.appendChild(sc); }));
const latin = t => String(t||'').replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,'-').replace(/[^\x00-\xFF•]/gu,'').replace(/[ \t]+\n/g,'\n');
async function gerarPDF(c, texto){
  const {jsPDF}=await carregaJsPDF(); const doc=new jsPDF({unit:'mm', format:'a4'}); const W=210, H=297, M=20;
  const laranja=[232,93,36], escuro=[184,65,15];
  doc.setFillColor(...laranja); doc.rect(0,0,W,30,'F'); doc.setFillColor(233,146,32); doc.rect(0,30,W,1.4,'F');
  doc.setTextColor(255,255,255); doc.setFont('helvetica','bold'); doc.setFontSize(24); doc.text('Citihaus', M, 19);
  doc.setFont('helvetica','normal'); doc.setFontSize(9.5); doc.text('Negócios Imobiliários', M+44, 19);
  doc.setFontSize(9); doc.text(new Date().toLocaleDateString('pt-BR',{day:'2-digit',month:'long',year:'numeric'}), W-M, 19, {align:'right'});
  let y=46; doc.setTextColor(...escuro); doc.setFont('helvetica','bold'); doc.setFontSize(15); doc.text(latin(assuntoDe(c)), M, y); y+=8;
  const im=c.imv && D.imoveis.find(i=>i.id===c.imv);
  doc.setFont('helvetica','normal'); doc.setFontSize(10); doc.setTextColor(110,110,110);
  if(c.nome){ doc.text(latin('Para: '+c.nome), M, y); y+=5; } if(im){ doc.text(latin('Imóvel: '+im.titulo), M, y); y+=5; }
  y+=4; doc.setDrawColor(235,225,215); doc.line(M,y,W-M,y); y+=9;
  doc.setTextColor(40,40,40); doc.setFontSize(11.5);
  const linhas=doc.splitTextToSize(latin(texto), W-2*M);
  linhas.forEach(l=>{ if(y>H-28){ rodape(doc,W,H,M); doc.addPage(); y=24; doc.setTextColor(40,40,40); doc.setFontSize(11.5); doc.setFont('helvetica','normal'); }
    const bullet=/^\s*•/.test(l); doc.setFont('helvetica', bullet?'normal':'normal'); doc.text(l, M+(bullet?2:0), y); y+=6.2; });
  y+=6; doc.setFont('helvetica','bold'); doc.setTextColor(...escuro); doc.text(latin(S.me.nome), M, y); doc.setFont('helvetica','normal'); doc.setTextColor(110,110,110); doc.setFontSize(10); doc.text('Citihaus Negócios Imobiliários', M, y+5);
  const total=doc.getNumberOfPages(); for(let k=1;k<=total;k++){ doc.setPage(k); rodape(doc,W,H,M); }
  const nomeArq=(assuntoDe(c)+(c.nome?' - '+c.nome.split(' ')[0]:'')).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w -]+/g,'').trim()+'.pdf';
  return new File([doc.output('blob')], nomeArq, {type:'application/pdf'});
}
function rodape(doc,W,H,M){ doc.setDrawColor(232,93,36); doc.setLineWidth(.6); doc.line(M,H-16,W-M,H-16); doc.setFontSize(8.5); doc.setTextColor(120,120,120); doc.setFont('helvetica','normal');
  doc.text('Citihaus Imobiliária  ·  CRECI 047221-J  ·  WhatsApp (17) 93634-8613', W/2, H-10, {align:'center'}); }

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
  if(d.cxwa||d.cxmail||d.cxcopy||d.cxpdf){ e.stopImmediatePropagation(); const c=lerCampos(), t=(c.texto||'').trim(); if(!t) return toast('Escolha um modelo ou escreva a mensagem');
    if(d.cxcopy) return copiar(t);
    const canal = d.cxwa ? 'wa' : d.cxmail ? 'mail' : 'pdf';
    const n=soNum(c.tel), tel = n ? (n.length<=11 ? '55'+n : n) : '';
    /* abre a janela já no clique (navegador bloqueia janela aberta depois de esperar) */
    const jan = canal==='wa' && !podeCompartilhar() ? window.open('about:blank','_blank') : null;
    b.disabled=true; const txtBtn=b.textContent; b.textContent='Gerando PDF…';
    (async()=>{ try{
      const arquivos=[await gerarPDF(c,t), ...await baixarAnexos(c.anexos||[])];
      const curto=`Olá${c.nome?', '+c.nome.split(' ')[0]:''}! Segue em anexo ${arquivos.length>1?'os documentos':'o documento'} da Citihaus 🧡`;
      if(canal==='pdf'){ arquivos.forEach(salvar); toast(arquivos.length>1?arquivos.length+' arquivos baixados':'PDF baixado'); return; }
      if(podeCompartilhar(arquivos)){ try{ await navigator.share({files:arquivos, title:assuntoDe(c), text:curto}); toast('Enviado ✓'); return; }catch(err){ if(err && err.name==='AbortError') return; } }
      arquivos.forEach(salvar);
      if(canal==='wa'){ const url='https://wa.me/'+tel+'?text='+encodeURIComponent(curto); if(jan) jan.location.href=url; else window.open(url,'_blank'); toast('Arquivos baixados: arraste para a conversa do WhatsApp'); }
      else { location.href='mailto:'+encodeURIComponent(c.email||'')+'?subject='+encodeURIComponent(assuntoDe(c))+'&body='+encodeURIComponent(curto+'\n\n'+t); toast('Arquivos baixados: anexe no e-mail que abriu'); }
    }catch(err){ if(jan) jan.close(); falha(err); } finally{ b.disabled=false; b.textContent=txtBtn; } })(); return; }
  if(d.cxanexo!==undefined){ return; }
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
