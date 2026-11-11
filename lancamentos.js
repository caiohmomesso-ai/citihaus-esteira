/* Citihaus · Lançamentos: empreendimento, dados básicos, unidades disponíveis e tabelas de pagamento */
(function(){
if(TOKEN) return;
D.emps = D.emps || []; D.unid = D.unid || {}; D.ltab = D.ltab || {}; D.larq = D.larq || {};
const ST_E = {'Breve lançamento':'p-info','Lançamento':'p-acc','Em obras':'p-warn','Pronto para morar':'p-ok','Encerrado':'p-mute'};
const ST_U = {'Disponível':'p-ok','Reservada':'p-warn','Vendida':'p-mute','Permuta':'p-info','Bloqueada':'p-mute'};
const STATUS_E = Object.keys(ST_E), STATUS_U = Object.keys(ST_U);
const TIPOS = ['Apartamento','Casa em condomínio','Casa','Terreno','Lote','Sala comercial','Loteamento','Misto'];
const adm = () => S.me && S.me.papel==='admin';
const L = () => S.lanc || (S.lanc = {busca:'', st:'Disponível', torre:'', dorm:'', sim:{}});
const un = id => D.unid[id] || [];
const tabs = id => D.ltab[id] || [];
const arqs = id => D.larq[id] || [];
const emp = id => D.emps.find(e=>e.id===id);
const n0 = v => v==null||v===''?null:Number(v);
const pct = v => v==null||v===''?'':(Math.round(Number(v)*100)/100).toString().replace('.',',')+'%';
const m2 = v => v==null||v===''?'':(Math.round(Number(v)*100)/100).toString().replace('.',',')+' m²';
const campo = 'border:1px solid var(--line);border-radius:9px;padding:8px 10px;background:var(--bg);color:inherit;font:inherit;width:100%;box-sizing:border-box';
const mesAno = d => { if(!d) return ''; const x=new Date(d); return x.toLocaleDateString('pt-BR',{month:'short',year:'numeric'}).replace('. de',''); };

/* números como a construtora manda: "R$ 1.234,56", "1234.56", "54,32 m²" */
function numPT(v){
  if(v==null) return null; if(typeof v==='number') return isFinite(v)?v:null;
  let s=String(v).replace(/\s|R\$|m²|m2/gi,'').trim(); if(!s) return null;
  if(/,\d{1,2}$/.test(s)) s=s.replace(/\./g,'').replace(',','.');
  else if(/,\d{3}(\D|$)/.test(s)) s=s.replace(/,/g,'');
  else s=s.replace(/\.(?=\d{3}(\D|$))/g,'').replace(',','.');
  const n=Number(s.replace(/[^\d.-]/g,'')); return isFinite(n)?n:null;
}
const stUn = v => { const s=String(v||'').toLowerCase();
  if(/vend/.test(s)) return 'Vendida'; if(/reserv|proposta|negoc/.test(s)) return 'Reservada';
  if(/permut/.test(s)) return 'Permuta'; if(/bloq|indispon|retir|n[ãa]o/.test(s)) return 'Bloqueada';
  if(/dispon|livre|estoque/.test(s)) return 'Disponível'; return s?'Disponível':''; };

/* ---------- lista ---------- */
function listaHtml(){
  const l=L(), b=(l.busca||'').toLowerCase();
  const es=D.emps.filter(e=>!e.arquivado_em).filter(e=>!b || (e.nome+' '+(e.construtora||'')+' '+(e.bairro||'')).toLowerCase().includes(b));
  return `<div class="head"><div><h1>🏗️ Lançamentos</h1><p>Os empreendimentos que a Citihaus vende, com a disponibilidade e as tabelas de pagamento sempre à mão.</p></div>
    <button class="btn pri" data-lancnovo="1">+ Novo empreendimento</button></div>
  ${D.emps.length>3?`<input class="search" id="lanc-busca" placeholder="🔎 Buscar empreendimento, construtora ou bairro" value="${esc(l.busca||'')}" style="max-width:420px;margin-bottom:12px">`:''}
  ${es.length?`<div class="grid">${es.map(e=>{ const u=un(e.id), disp=u.filter(x=>x.status==='Disponível'), vs=disp.map(x=>Number(x.valor)||0).filter(Boolean);
    const faixa = vs.length ? (Math.min(...vs)===Math.max(...vs) ? brl(vs[0]) : brl(Math.min(...vs))+' a '+brl(Math.max(...vs))) : '';
    const perc = u.length ? Math.round(disp.length/u.length*100) : 0;
    return `<article class="imv" style="cursor:pointer" data-lancopen="${e.id}">
      <div class="imv-top"><span class="tipo">${esc(e.tipo||'Apartamento')}</span><span class="mono">${esc(e.entrega?'Entrega '+mesAno(e.entrega):'')}</span></div>
      <div class="imv-b"><h4>${esc(e.nome)}</h4>
        <div class="meta muted">${esc([e.construtora, e.bairro].filter(Boolean).join(' · ')||'—')}</div>
        <div class="row" style="gap:6px;flex-wrap:wrap"><span class="pill ${ST_E[e.status]||'p-acc'}">${esc(e.status)}</span>
          ${e.dormitorios?`<span class="pill p-mute">${esc(e.dormitorios)} dorm.</span>`:''}${e.areas?`<span class="pill p-mute">${esc(e.areas)}</span>`:''}</div>
        ${u.length?`<div style="margin-top:10px"><div class="row between" style="font-size:12.5px"><span class="muted">${disp.length} de ${u.length} disponíveis</span><b>${perc}%</b></div>
          <div style="height:7px;border-radius:99px;background:var(--surface-2);overflow:hidden;margin-top:4px"><div style="height:100%;width:${perc}%;background:var(--ok)"></div></div></div>`
          :'<div class="muted" style="font-size:12.5px;margin-top:10px">Tabela de disponibilidade ainda não importada</div>'}
        <div class="imv-f"><span class="price" style="font-size:15px">${faixa||'—'}</span><button class="btn sm pri" data-lancopen="${e.id}">Abrir</button></div></div></article>`; }).join('')}</div>`
    :`<div class="empty" style="margin-top:18px">${D.emps.length?'Nenhum empreendimento nesta busca.':'Nenhum lançamento ainda. Cadastre o empreendimento e depois importe a tabela de preços que a construtora mandou — em planilha ou PDF.'}</div>`}`;
}

/* ---------- ficha ---------- */
function fichaHtml(e){
  const l=L(), u=un(e.id), ts=tabs(e.id), as=arqs(e.id);
  const cont = {}; STATUS_U.forEach(s=>cont[s]=u.filter(x=>x.status===s).length);
  const disp=u.filter(x=>x.status==='Disponível'), vs=disp.map(x=>Number(x.valor)||0).filter(Boolean);
  const estoque = vs.reduce((a,b)=>a+b,0);
  const torres=[...new Set(u.map(x=>x.torre).filter(Boolean))], dorms=[...new Set(u.map(x=>x.dormitorios).filter(Boolean))].sort();
  const lista=u.filter(x=>(!l.st||x.status===l.st)&&(!l.torre||x.torre===l.torre)&&(!l.dorm||String(x.dormitorios)===l.dorm));
  const dado=(r,v)=>v?`<div><span class="muted" style="font-size:11.5px;display:block">${r}</span><b style="font-size:14.5px">${esc(v)}</b></div>`:'';
  return `<button class="btn sm ghost" data-lancvoltar="1" style="margin-bottom:12px">← Todos os lançamentos</button>
  <div class="head" style="margin-top:0"><div><div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:4px"><span class="pill ${ST_E[e.status]||'p-acc'}">${esc(e.status)}</span>${e.construtora?`<span class="pill p-mute">${esc(e.construtora)}</span>`:''}</div>
    <h1 style="margin:0">${esc(e.nome)}</h1><p>${esc([e.endereco,e.bairro,e.cidade].filter(Boolean).join(' · ')||'Endereço não informado')}</p></div>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn" data-lancedit="${e.id}">✏️ Editar dados</button>${adm()?`<button class="btn ghost" style="color:var(--bad)" data-lancarquivar="${e.id}">${S.lancDel===e.id?'Confirmar':'📦 Arquivar'}</button>`:''}</div></div>

  <div class="box"><h2 style="margin:0 0 10px">📋 Dados do empreendimento</h2>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(110px,1fr));gap:12px 16px">
      ${dado('Tipo', e.tipo)}${dado('Dormitórios', e.dormitorios)}${dado('Áreas', e.areas)}${dado('Vagas', e.vagas)}
      ${dado('Torres', e.torres)}${dado('Unidades', e.unidades_total||(u.length||''))}${dado('Entrega', e.entrega?mesAno(e.entrega):'')}
      ${dado('Comissão', e.comissao?pct(e.comissao):'')}${dado('Corretor', e.corretor)}${dado('Contato na construtora', e.contato)}</div>
    ${e.lazer?`<div style="margin-top:14px"><span class="muted" style="font-size:11.5px;display:block">Lazer</span>${esc(e.lazer)}</div>`:''}
    ${e.diferenciais?`<div style="margin-top:10px"><span class="muted" style="font-size:11.5px;display:block">Diferenciais</span>${esc(e.diferenciais)}</div>`:''}
    ${e.descricao?`<p style="white-space:pre-line;margin:12px 0 0;font-size:14px">${esc(e.descricao)}</p>`:''}
    ${e.site?`<div style="margin-top:10px"><a class="btn sm" href="${esc(e.site)}" target="_blank" rel="noopener" style="text-decoration:none">🔗 Material da construtora</a></div>`:''}</div>

  <div class="box" style="margin-top:16px"><div class="row between" style="gap:8px;flex-wrap:wrap;margin-bottom:10px"><h2 style="margin:0">🏢 Imóveis disponíveis</h2>
    <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn pri" data-lancimport="${e.id}">📊 Importar tabela</button><button class="btn" data-lancunnovo="${e.id}">+ Unidade</button></div></div>
    ${u.length?`<div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <span class="pill p-ok" style="font-size:13px">${cont['Disponível']} disponíveis</span>
      ${cont['Reservada']?`<span class="pill p-warn" style="font-size:13px">${cont['Reservada']} reservadas</span>`:''}
      ${cont['Vendida']?`<span class="pill p-mute" style="font-size:13px">${cont['Vendida']} vendidas</span>`:''}
      ${cont['Permuta']?`<span class="pill p-info" style="font-size:13px">${cont['Permuta']} permuta</span>`:''}
      ${cont['Bloqueada']?`<span class="pill p-mute" style="font-size:13px">${cont['Bloqueada']} bloqueadas</span>`:''}
      ${vs.length?`<span class="pill p-acc" style="font-size:13px">De ${brl(Math.min(...vs))} a ${brl(Math.max(...vs))}</span><span class="pill p-mute" style="font-size:13px">Em estoque ${brl(estoque)}</span>`:''}</div>
      <div class="row" style="gap:8px;flex-wrap:wrap;margin-bottom:10px">
        <select id="lanc-fst" style="${campo};width:auto"><option value="">Todas as situações</option>${STATUS_U.map(s=>`<option ${l.st===s?'selected':''}>${s}</option>`).join('')}</select>
        ${torres.length>1?`<select id="lanc-ftorre" style="${campo};width:auto"><option value="">Todas as torres</option>${torres.map(t=>`<option ${l.torre===t?'selected':''}>${esc(t)}</option>`).join('')}</select>`:''}
        ${dorms.length>1?`<select id="lanc-fdorm" style="${campo};width:auto"><option value="">Todos os dormitórios</option>${dorms.map(d=>`<option value="${d}" ${l.dorm===String(d)?'selected':''}>${d} dorm.</option>`).join('')}</select>`:''}
        <span class="muted" style="font-size:12.5px;align-self:center">${lista.length} unidade${lista.length===1?'':'s'}</span></div>
      <div class="tbl-wrap"><table><thead><tr>${torres.length?'<th>Torre</th>':''}<th>Unidade</th><th>Andar</th><th>Tipologia</th><th>Área</th><th>Dorm.</th><th>Vagas</th><th>Valor</th><th>Situação</th><th></th></tr></thead><tbody>
      ${lista.map(x=>`<tr><td>${torres.length?esc(x.torre||'—')+'</td><td>':''}<b>${esc(x.unidade||'—')}</b></td><td>${esc(x.andar||'—')}</td><td>${esc(x.tipologia||'—')}</td>
        <td class="num">${x.area?m2(x.area):'—'}</td><td class="num">${x.dormitorios||'—'}${x.suites?' ('+x.suites+' suíte'+(x.suites>1?'s':'')+')':''}</td><td class="num">${x.vagas||'—'}</td>
        <td class="num"><b>${x.valor?brl(x.valor):'—'}</b></td>
        <td><select data-lancunst="${x.id}" style="${campo};padding:5px 8px;width:auto;font-size:12.5px">${STATUS_U.map(s=>`<option ${x.status===s?'selected':''}>${s}</option>`).join('')}</select></td>
        <td style="white-space:nowrap"><button class="btn sm ghost" data-lancun="${x.id}">Editar</button></td></tr>`).join('')||`<tr><td colspan="10" class="muted">Nenhuma unidade com esses filtros.</td></tr>`}
      </tbody></table></div>`
      :`<div class="empty">Nenhuma unidade cadastrada. Use <b>📊 Importar tabela</b> para colar a planilha ou enviar o PDF que a construtora mandou.</div>`}</div>

  <div class="box" style="margin-top:16px"><div class="row between" style="gap:8px;flex-wrap:wrap;margin-bottom:10px"><h2 style="margin:0">💳 Tabelas de pagamento</h2><button class="btn pri" data-lanctabnovo="${e.id}">+ Nova tabela</button></div>
    ${ts.length?`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px">${ts.map(t=>{ const soma=(Number(t.entrada_pct)||0)+(Number(t.parcelas_pct)||0)+(Number(t.reforcos_pct)||0)+(Number(t.chaves_pct)||0);
      return `<div style="border:1px solid var(--line);border-radius:12px;padding:12px 14px"><div class="row between" style="gap:6px"><b>${esc(t.nome)}</b><button class="btn sm ghost" data-lanctab="${t.id}">✏️</button></div>
      <div style="display:grid;gap:4px;margin-top:8px;font-size:13.5px">
        ${t.entrada_pct?`<div class="row between"><span class="muted">Entrada (ato)</span><b>${pct(t.entrada_pct)}</b></div>`:''}
        ${t.parcelas?`<div class="row between"><span class="muted">${t.parcelas}x mensais</span><b>${pct(t.parcelas_pct)}</b></div>`:''}
        ${t.reforcos?`<div class="row between"><span class="muted">${t.reforcos} reforços${t.reforco_quando?' ('+esc(t.reforco_quando)+')':''}</span><b>${pct(t.reforcos_pct)}</b></div>`:''}
        ${t.chaves_pct?`<div class="row between"><span class="muted">Chaves / financiamento</span><b>${pct(t.chaves_pct)}</b></div>`:''}</div>
      ${t.indice?`<div class="muted" style="font-size:12px;margin-top:8px">Correção: ${esc(t.indice)}</div>`:''}
      ${t.obs?`<div style="font-size:12.5px;margin-top:6px">${esc(t.obs)}</div>`:''}
      ${soma&&Math.abs(soma-100)>0.6?`<div class="pill p-warn" style="margin-top:8px;font-size:11.5px">Os percentuais somam ${pct(soma)}</div>`:''}</div>`; }).join('')}</div>
      ${simuladorHtml(e)}`
      :'<div class="empty">Nenhuma tabela cadastrada. Cadastre as condições (entrada, mensais, reforços e chaves) para simular o pagamento de qualquer unidade em um clique.</div>'}</div>

  <div class="box" style="margin-top:16px"><div class="row between" style="gap:8px;flex-wrap:wrap;margin-bottom:10px"><h2 style="margin:0">📎 Arquivos da construtora</h2>
    <label class="btn sm pri" style="cursor:pointer">+ Enviar arquivo<input type="file" id="lanc-arq" data-emp="${e.id}" hidden multiple></label></div>
    ${as.length?as.map(a=>`<div style="display:flex;gap:10px;align-items:center;padding:9px 12px;border:1px solid var(--line);border-radius:12px;margin-bottom:8px">
      <div style="flex:none;width:38px;height:38px;border-radius:9px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:10.5px;color:var(--accent-ink)">${esc((String(a.nome_arquivo||'').split('.').pop()||'DOC').toUpperCase().slice(0,4))}</div>
      <div style="flex:1;min-width:0"><b style="font-size:13.5px;overflow-wrap:anywhere">${esc(a.titulo)}</b><div class="muted" style="font-size:12px">${esc(a.tipo)} · ${dataBR(a.created_at)}</div></div>
      <button class="btn sm" data-lancarqbaixar="${a.id}">⬇</button>${adm()?`<button class="btn sm ghost" style="color:var(--bad)" data-lancarqdel="${a.id}">${S.larqDel===a.id?'Confirmar':'🗑'}</button>`:''}</div>`).join('')
      :'<div class="muted" style="font-size:13px">Guarde aqui a tabela de preços original, o book de vendas e o memorial descritivo.</div>'}</div>`;
}

/* ---------- simulador ---------- */
function simuladorHtml(e){
  const l=L(), s=l.sim||{}, ts=tabs(e.id), u=un(e.id).filter(x=>x.status==='Disponível'&&x.valor);
  const t=ts.find(x=>x.id===s.tab)||ts[0], uni=u.find(x=>x.id===s.un);
  const base = uni ? Number(uni.valor) : null;
  let txt='';
  if(base && t){
    const ato=base*(Number(t.entrada_pct)||0)/100, mens=(Number(t.parcelas)||0)?base*(Number(t.parcelas_pct)||0)/100/t.parcelas:0,
          ref=(Number(t.reforcos)||0)?base*(Number(t.reforcos_pct)||0)/100/t.reforcos:0, chv=base*(Number(t.chaves_pct)||0)/100;
    txt=[`*${e.nome}* · ${[uni.torre,uni.unidade].filter(Boolean).join(' ')}${uni.area?' · '+m2(uni.area):''}${uni.dormitorios?' · '+uni.dormitorios+' dorm.':''}`,
      `Valor: *${brl(base)}*`, '', `Condição ${t.nome}:`,
      ato?`• Entrada: ${brl(ato)}`:'', mens?`• ${t.parcelas}x de ${brl(mens)} (mensais)`:'',
      ref?`• ${t.reforcos} reforços de ${brl(ref)}${t.reforco_quando?' ('+t.reforco_quando+')':''}`:'',
      chv?`• Chaves / financiamento: ${brl(chv)}`:'', t.indice?`\nValores corrigidos por ${t.indice}.`:'' ].filter(x=>x!=='').join('\n');
  }
  return `<div style="border-top:1px solid var(--line);margin-top:14px;padding-top:14px"><h3 style="margin:0 0 8px;font-size:15px">🧮 Simular pagamento</h3>
    <div class="row" style="gap:8px;flex-wrap:wrap">
      <select id="lanc-simun" style="${campo};width:auto;max-width:100%"><option value="">Escolha a unidade</option>${u.map(x=>`<option value="${x.id}" ${s.un===x.id?'selected':''}>${esc([x.torre,x.unidade].filter(Boolean).join(' '))} · ${brl(x.valor)}</option>`).join('')}</select>
      <select id="lanc-simtab" style="${campo};width:auto;max-width:100%">${ts.map(x=>`<option value="${x.id}" ${t&&t.id===x.id?'selected':''}>${esc(x.nome)}</option>`).join('')}</select></div>
    ${txt?`<pre class="tree" style="white-space:pre-wrap;margin:10px 0 0;font-size:13.5px">${esc(txt.replace(/\*/g,''))}</pre>
      <div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><a class="btn sm" style="text-decoration:none;color:#fff;background:#25D366;border-color:#25D366" target="_blank" rel="noopener" href="https://wa.me/?text=${encodeURIComponent(txt)}">💬 Enviar no WhatsApp</a><button class="btn sm" data-lancsimcopy="1">📋 Copiar proposta</button></div>`
      :`<p class="muted" style="font-size:12.5px;margin:10px 0 0">${u.length?'Escolha a unidade para ver a entrada, as parcelas e as chaves.':'Importe a tabela de disponibilidade para simular.'}</p>`}</div>`;
}
window.__lancTexto = () => { const e=emp(S.lancOpen); if(!e) return ''; const l=L(), s=l.sim||{}, ts=tabs(e.id), t=ts.find(x=>x.id===s.tab)||ts[0], uni=un(e.id).find(x=>x.id===s.un);
  if(!t||!uni) return ''; const base=Number(uni.valor), ato=base*(Number(t.entrada_pct)||0)/100, mens=(Number(t.parcelas)||0)?base*(Number(t.parcelas_pct)||0)/100/t.parcelas:0,
    ref=(Number(t.reforcos)||0)?base*(Number(t.reforcos_pct)||0)/100/t.reforcos:0, chv=base*(Number(t.chaves_pct)||0)/100;
  return [`${e.nome} · ${[uni.torre,uni.unidade].filter(Boolean).join(' ')}${uni.area?' · '+m2(uni.area):''}${uni.dormitorios?' · '+uni.dormitorios+' dorm.':''}`,
    `Valor: ${brl(base)}`,'',`Condição ${t.nome}:`, ato?`• Entrada: ${brl(ato)}`:'', mens?`• ${t.parcelas}x de ${brl(mens)} (mensais)`:'',
    ref?`• ${t.reforcos} reforços de ${brl(ref)}${t.reforco_quando?' ('+t.reforco_quando+')':''}`:'', chv?`• Chaves / financiamento: ${brl(chv)}`:'',
    t.indice?`\nValores corrigidos por ${t.indice}.`:'', `\n${S.me.nome} · Citihaus`].filter(x=>x!=='').join('\n'); };

/* ---------- dados ---------- */
const carregarLc = carregar;
carregar = async function(){
  await carregarLc.apply(this, arguments);
  if(!S.me) return;
  try{
    const [es,us,ts,as] = await Promise.all([
      q(sb.from('empreendimentos').select('*').order('created_at',{ascending:false})),
      q(sb.from('lanc_unidades').select('*').order('ordem')),
      q(sb.from('lanc_tabelas').select('*').order('ordem')),
      q(sb.from('lanc_arquivos').select('*').order('created_at',{ascending:false}))]);
    D.emps=es||[]; D.unid={}; D.ltab={}; D.larq={};
    (us||[]).forEach(x=>(D.unid[x.empreendimento_id]=D.unid[x.empreendimento_id]||[]).push(x));
    (ts||[]).forEach(x=>(D.ltab[x.empreendimento_id]=D.ltab[x.empreendimento_id]||[]).push(x));
    (as||[]).forEach(x=>(D.larq[x.empreendimento_id]=D.larq[x.empreendimento_id]||[]).push(x));
  }catch(_){ }
};
const renderLc = render;
render = function(){
  renderLc.apply(this, arguments);
  if(!S.me || S.tab!=='lancamentos') return;
  const nav=document.querySelector('nav.sub'), w=document.querySelector('#app .wrap'); if(!w) return;
  const foco=document.activeElement && document.activeElement.id, pos=foco&&document.activeElement.selectionStart;
  [...w.children].forEach(ch=>{ if(ch!==nav && !ch.classList.contains('subnav')) ch.remove(); });
  const e = S.lancOpen && emp(S.lancOpen);
  w.insertAdjacentHTML('beforeend', e ? fichaHtml(e) : listaHtml());
  if(foco){ const el=document.getElementById(foco); if(el){ el.focus(); try{ if(pos!=null) el.setSelectionRange(pos,pos); }catch(_){ } } }
};

/* ---------- leitura de planilha e PDF ---------- */
const colNum = ref => { let n=0; for(const c of ref.toUpperCase()) n=n*26+(c.charCodeAt(0)-64); return n-1; };
async function lerXLSX(file){
  if(!window.JSZip) throw new Error('Atualize a página e tente de novo.');
  const zip=await JSZip.loadAsync(file), P=new DOMParser(), ss=[];
  const sf=zip.file('xl/sharedStrings.xml');
  if(sf){ const d=P.parseFromString(await sf.async('string'),'application/xml');
    [...d.getElementsByTagName('si')].forEach(si=>ss.push([...si.getElementsByTagName('t')].map(t=>t.textContent).join(''))); }
  const nome=Object.keys(zip.files).filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0];
  if(!nome) throw new Error('Não achei nenhuma aba nessa planilha.');
  const d=P.parseFromString(await zip.file(nome).async('string'),'application/xml'), linhas=[];
  [...d.getElementsByTagName('row')].forEach(r=>{ const out=[];
    [...r.getElementsByTagName('c')].forEach(c=>{ const i=colNum((c.getAttribute('r')||'A').replace(/\d+/g,'')||'A'), t=c.getAttribute('t');
      const vN=c.getElementsByTagName('v')[0], isN=c.getElementsByTagName('is')[0]; let v='';
      if(t==='s'&&vN) v=ss[+vN.textContent]||''; else if(isN) v=[...isN.getElementsByTagName('t')].map(t=>t.textContent).join(''); else if(vN) v=vN.textContent;
      out[i]=v; });
    const arr=[]; for(let i=0;i<out.length;i++) arr.push(out[i]==null?'':String(out[i]));
    if(arr.some(x=>x.trim())) linhas.push(arr); });
  return linhas;
}
function lerCSV(txt){
  /* separador = o que mais aparece por linha (mediana), olhando as primeiras linhas */
  const amostra = txt.split(/\r?\n/).filter(l=>l.trim()).slice(0,20);
  const nota = s => { const c=amostra.map(l=>l.split(s).length-1).sort((a,b)=>b-a); return c[Math.floor(c.length/2)]||0; };
  const melhor = ['\t',';',','].map(s=>[s,nota(s)]).sort((a,b)=>b[1]-a[1])[0];
  const sep = melhor[1] ? melhor[0] : '\t';
  return txt.split(/\r?\n/).filter(l=>l.trim()).map(l=>{ const out=[]; let cur='', asp=false;
    for(let i=0;i<l.length;i++){ const c=l[i];
      if(c==='"'){ if(asp&&l[i+1]==='"'){ cur+='"'; i++; } else asp=!asp; }
      else if(c===sep && !asp){ out.push(cur); cur=''; } else cur+=c; }
    out.push(cur); return out.map(x=>x.trim()); });
}
let pdfP=null;
const carregaPDF = () => pdfP || (pdfP = new Promise((ok,nok)=>{ if(window.pdfjsLib) return ok(window.pdfjsLib);
  const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  s.onload=()=>{ try{ window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; }catch(_){ } ok(window.pdfjsLib); };
  s.onerror=()=>{ pdfP=null; nok(new Error('Não consegui carregar o leitor de PDF. Tente copiar e colar a tabela.')); }; document.head.appendChild(s); }));
async function lerPDF(file){
  const lib=await carregaPDF(), doc=await lib.getDocument({data:await file.arrayBuffer()}).promise, linhas=[];
  for(let p=1;p<=Math.min(doc.numPages,25);p++){
    const tc=await (await doc.getPage(p)).getTextContent(), ys={};
    tc.items.forEach(it=>{ if(!String(it.str).trim()) return; const k=Math.round(it.transform[5]/3)*3; (ys[k]=ys[k]||[]).push({x:it.transform[4], w:it.width||0, s:it.str}); });
    Object.keys(ys).map(Number).sort((a,b)=>b-a).forEach(k=>{ const cs=ys[k].sort((a,b)=>a.x-b.x), out=[]; let last=null;
      cs.forEach(c=>{ if(last && c.x-(last.x+last.w) < 6){ last.s+=c.s; last.w=c.x+c.w-last.x; } else { last={...c}; out.push(last); } });
      const arr=out.map(o=>o.s.trim()).filter((x,i,a)=>x!==''||i<a.length-1);
      if(arr.length>1) linhas.push(arr); });
  }
  if(!linhas.length) throw new Error('Esse PDF parece ser uma imagem escaneada. Copie a tabela da planilha ou peça o arquivo em Excel.');
  return linhas;
}

/* ---------- de-para das colunas ---------- */
const CAMPOS = [['','— ignorar —'],['torre','Torre / bloco'],['unidade','Unidade'],['andar','Andar'],['tipologia','Tipologia / planta'],
  ['area','Área (m²)'],['dormitorios','Dormitórios'],['suites','Suítes'],['vagas','Vagas'],['posicao','Posição / sol'],['valor','Valor'],['status','Situação'],['obs','Observação']];
const REGRAS = [['torre',/torre|bloco|quadra|edif/i],['unidade',/unid|apt|apart|^un\b|casa|lote|n[ºo°]/i],['andar',/andar|pavim/i],
  ['suites',/su[íi]te/i],['dormitorios',/dorm|quarto/i],['area',/[áa]rea|m²|m2|priv|[úu]til/i],['vagas',/vaga|garag/i],
  ['posicao',/posi[çc]|sol|face|frente|vista/i],['valor',/valor|pre[çc]o|tabela|r\$|venda/i],['status',/status|situa|disponib/i],
  ['tipologia',/tipo|planta|final/i],['obs',/obs|coment/i]];
function detectar(linhas){
  let hi=0, melhor=0;
  linhas.slice(0,15).forEach((l,i)=>{ const n=l.filter(c=>REGRAS.some(r=>r[1].test(c))).length; if(n>melhor){ melhor=n; hi=i; } });
  if(melhor<2) hi=-1;
  const cab = hi>=0 ? linhas[hi] : [];
  const nc = Math.max(1, ...linhas.slice(0,30).map(l=>l.length));
  const map=[], usado=new Set();
  for(let i=0;i<nc;i++){ const t=String(cab[i]||''); let f='';
    for(const [k,re] of REGRAS){ if(usado.has(k)) continue; if(re.test(t)){ f=k; break; } }
    if(f) usado.add(f); map.push(f); }
  return {hi, map, nc};
}
function montar(linhas, hi, map){
  const out=[];
  linhas.slice(hi+1).forEach(l=>{
    const o={}; map.forEach((f,i)=>{ if(f) o[f]=l[i]!=null?String(l[i]).trim():''; });
    if(!o.unidade && !o.valor) return;
    const it={ torre:o.torre||null, unidade:o.unidade||null, andar:o.andar||null, tipologia:o.tipologia||null, posicao:o.posicao||null,
      area:numPT(o.area), dormitorios:numPT(o.dormitorios)!=null?Math.round(numPT(o.dormitorios)):null,
      suites:numPT(o.suites)!=null?Math.round(numPT(o.suites)):null, vagas:numPT(o.vagas)!=null?Math.round(numPT(o.vagas)):null,
      valor:numPT(o.valor), status:stUn(o.status)||'Disponível', obs:o.obs||null };
    if(!it.unidade && !it.valor) return;
    if(it.valor!=null && it.valor<1000) it.valor=null;
    out.push(it);
  });
  return out;
}

/* ---------- modais ---------- */
const modalLc = modalHtml;
modalHtml = function(){
  const m=S.modal;
  if(m && m.tipo==='lancemp'){ const e=m.id?emp(m.id):{};
    return `<div class="ov center"><form class="modal" id="f-lancemp" data-id="${m.id||''}" style="width:min(680px,calc(100% - 24px));max-width:none">
     <div class="m-h"><h2 style="font-size:19px">${m.id?'Editar empreendimento':'🏗️ Novo empreendimento'}</h2></div>
     <div class="m-b">
      <label class="f full">Nome do empreendimento<input id="le-nome" required value="${esc(e.nome||'')}" placeholder="Ex.: Residencial Vista Bela"></label>
      <label class="f">Construtora<input id="le-constr" value="${esc(e.construtora||'')}"></label>
      <label class="f">Situação<select id="le-status">${STATUS_E.map(s=>`<option ${(e.status||'Lançamento')===s?'selected':''}>${s}</option>`).join('')}</select></label>
      <label class="f">Tipo<select id="le-tipo">${TIPOS.map(s=>`<option ${(e.tipo||'Apartamento')===s?'selected':''}>${s}</option>`).join('')}</select></label>
      <label class="f">Entrega prevista<input id="le-entrega" type="date" value="${esc(e.entrega||'')}"></label>
      <label class="f full">Endereço<input id="le-end" value="${esc(e.endereco||'')}"></label>
      <label class="f">Bairro<input id="le-bairro" value="${esc(e.bairro||'')}"></label>
      <label class="f">Cidade<input id="le-cidade" value="${esc(e.cidade||'São José do Rio Preto')}"></label>
      <label class="f">Dormitórios<input id="le-dorm" value="${esc(e.dormitorios||'')}" placeholder="Ex.: 2 e 3"></label>
      <label class="f">Áreas<input id="le-areas" value="${esc(e.areas||'')}" placeholder="Ex.: 54 a 98 m²"></label>
      <label class="f">Vagas<input id="le-vagas" value="${esc(e.vagas||'')}" placeholder="Ex.: 1 e 2"></label>
      <label class="f">Torres<input id="le-torres" inputmode="numeric" value="${esc(e.torres||'')}"></label>
      <label class="f">Total de unidades<input id="le-unid" inputmode="numeric" value="${esc(e.unidades_total||'')}"></label>
      <label class="f">Comissão (%)<input id="le-com" inputmode="decimal" value="${esc(e.comissao||'')}"></label>
      <label class="f">Corretor responsável<input id="le-corretor" list="le-eq" value="${esc(e.corretor||'')}"><datalist id="le-eq">${(D.equipe||[]).map(x=>`<option value="${esc(x.nome)}">`).join('')}</datalist></label>
      <label class="f full">Contato na construtora<input id="le-contato" value="${esc(e.contato||'')}" placeholder="Nome e telefone de quem atende a Citihaus"></label>
      <label class="f full">Lazer<input id="le-lazer" value="${esc(e.lazer||'')}" placeholder="Piscina, academia, salão de festas…"></label>
      <label class="f full">Diferenciais<input id="le-dif" value="${esc(e.diferenciais||'')}"></label>
      <label class="f full">Link do material da construtora<input id="le-site" value="${esc(e.site||'')}" placeholder="https://"></label>
      <label class="f full">Descrição<textarea id="le-desc" rows="3" style="${campo}">${esc(e.descricao||'')}</textarea></label>
     </div>
     <div class="m-f"><button type="button" class="btn" data-mclose="1">Cancelar</button><button class="btn pri" type="submit">Salvar</button></div></form></div>`; }

  if(m && m.tipo==='lancun'){ const x=m.id?(un(m.emp).find(u=>u.id===m.id)||{}):{};
    return `<div class="ov center"><form class="modal" id="f-lancun" data-id="${m.id||''}" data-emp="${m.emp}" style="width:min(600px,calc(100% - 24px));max-width:none">
     <div class="m-h"><h2 style="font-size:19px">${m.id?'Editar unidade':'+ Nova unidade'}</h2></div>
     <div class="m-b">
      <label class="f">Torre / bloco<input id="lu-torre" value="${esc(x.torre||'')}"></label>
      <label class="f">Unidade<input id="lu-unid" required value="${esc(x.unidade||'')}" placeholder="Ex.: 204"></label>
      <label class="f">Andar<input id="lu-andar" value="${esc(x.andar||'')}"></label>
      <label class="f">Tipologia<input id="lu-tipo" value="${esc(x.tipologia||'')}" placeholder="Ex.: Final 4"></label>
      <label class="f">Área (m²)<input id="lu-area" inputmode="decimal" value="${esc(x.area||'')}"></label>
      <label class="f">Dormitórios<input id="lu-dorm" inputmode="numeric" value="${esc(x.dormitorios||'')}"></label>
      <label class="f">Suítes<input id="lu-su" inputmode="numeric" value="${esc(x.suites||'')}"></label>
      <label class="f">Vagas<input id="lu-vagas" inputmode="numeric" value="${esc(x.vagas||'')}"></label>
      <label class="f">Posição / sol<input id="lu-pos" value="${esc(x.posicao||'')}"></label>
      <label class="f">Valor (R$)<input id="lu-valor" inputmode="decimal" value="${esc(x.valor||'')}"></label>
      <label class="f">Situação<select id="lu-st">${STATUS_U.map(s=>`<option ${x.status===s?'selected':''}>${s}</option>`).join('')}</select></label>
      <label class="f full">Observação<input id="lu-obs" value="${esc(x.obs||'')}"></label>
     </div>
     <div class="m-f">${m.id&&adm()?`<button type="button" class="btn ghost" style="color:var(--bad);margin-right:auto" data-lancundel="${m.id}">Excluir</button>`:''}<button type="button" class="btn" data-mclose="1">Cancelar</button><button class="btn pri" type="submit">Salvar</button></div></form></div>`; }

  if(m && m.tipo==='lanctab'){ const t=m.id?(tabs(m.emp).find(x=>x.id===m.id)||{}):{};
    return `<div class="ov center"><form class="modal" id="f-lanctab" data-id="${m.id||''}" data-emp="${m.emp}" style="max-width:560px">
     <div class="m-h"><h2 style="font-size:19px">${m.id?'Editar tabela':'💳 Nova tabela de pagamento'}</h2></div>
     <div class="m-b">
      <label class="f full">Nome da tabela<input id="lt-nome" required value="${esc(t.nome||'')}" placeholder="Ex.: Tabela 1 · 60 meses"></label>
      <label class="f">Entrada no ato (%)<input id="lt-ent" inputmode="decimal" value="${esc(t.entrada_pct||'')}" placeholder="Ex.: 20"></label>
      <label class="f">Parcelas mensais (qtd)<input id="lt-np" inputmode="numeric" value="${esc(t.parcelas||'')}" placeholder="Ex.: 60"></label>
      <label class="f">Total nas mensais (%)<input id="lt-pp" inputmode="decimal" value="${esc(t.parcelas_pct||'')}" placeholder="Ex.: 40"></label>
      <label class="f">Reforços (qtd)<input id="lt-nr" inputmode="numeric" value="${esc(t.reforcos||'')}"></label>
      <label class="f">Total nos reforços (%)<input id="lt-rp" inputmode="decimal" value="${esc(t.reforcos_pct||'')}"></label>
      <label class="f">Quando são os reforços<input id="lt-rq" value="${esc(t.reforco_quando||'')}" placeholder="Ex.: semestrais"></label>
      <label class="f">Chaves / financiamento (%)<input id="lt-ch" inputmode="decimal" value="${esc(t.chaves_pct||'')}"></label>
      <label class="f">Correção<input id="lt-ind" value="${esc(t.indice||'')}" placeholder="Ex.: INCC até as chaves"></label>
      <label class="f">Vale até<input id="lt-vig" type="date" value="${esc(t.vigencia||'')}"></label>
      <label class="f full">Observação<input id="lt-obs" value="${esc(t.obs||'')}"></label>
      <div class="note full">Os percentuais são sobre o valor da unidade e devem somar 100%. Com eles, o sistema simula qualquer unidade na hora.</div>
     </div>
     <div class="m-f">${m.id&&adm()?`<button type="button" class="btn ghost" style="color:var(--bad);margin-right:auto" data-lanctabdel="${m.id}">Excluir</button>`:''}<button type="button" class="btn" data-mclose="1">Cancelar</button><button class="btn pri" type="submit">Salvar</button></div></form></div>`; }

  if(m && m.tipo==='lancimp'){ const I=S.imp||{};
    const prev = I.itens||[];
    return `<div class="ov center"><form class="modal" id="f-lancimp" data-emp="${m.emp}" style="width:min(940px,calc(100% - 24px));max-width:none">
     <div class="m-h"><h2 style="font-size:19px">📊 Importar tabela de disponibilidade</h2></div>
     <div class="m-b">
      ${!I.linhas?`<div class="full">
        <div class="row" style="gap:10px;flex-wrap:wrap;margin-bottom:10px">
          <label class="btn pri" style="cursor:pointer">📂 Escolher planilha ou PDF<input type="file" id="li-file" accept=".xlsx,.xls,.csv,.txt,.pdf" hidden></label>
          <span class="muted" style="font-size:12.5px;align-self:center">Excel (.xlsx), CSV ou PDF com texto</span></div>
        <label class="f full">Ou cole aqui a tabela copiada do Excel
          <textarea id="li-colar" rows="8" placeholder="Selecione as células no Excel, copie (Ctrl+C) e cole aqui (Ctrl+V)" style="${campo};font-family:var(--f-mono,monospace);font-size:12.5px"></textarea></label>
        <div class="note full">Eu leio as colunas sozinho (unidade, torre, área, dormitórios, valor, situação) e mostro uma prévia antes de salvar.</div></div>`
      :`<div class="full">
        <div class="row between" style="gap:8px;flex-wrap:wrap;margin-bottom:8px"><b>${I.nome||'Tabela colada'}</b><button type="button" class="btn sm ghost" data-limpvoltar="1">Escolher outro arquivo</button></div>
        <div class="muted" style="font-size:12.5px;margin-bottom:8px">Confira de qual coluna vem cada informação. ${I.hi>=0?'Cabeçalho encontrado na linha '+(I.hi+1)+'.':'Não achei um cabeçalho: escolha as colunas abaixo.'}</div>
        <div class="tbl-wrap" style="max-height:300px;overflow:auto"><table style="font-size:12.5px"><thead><tr>${I.map.map((f,i)=>`<th style="min-width:120px"><select data-limpcol="${i}" style="${campo};padding:4px 6px;font-size:12px">${CAMPOS.map(c=>`<option value="${c[0]}" ${f===c[0]?'selected':''}>${c[1]}</option>`).join('')}</select></th>`).join('')}</tr>
          ${I.hi>=0?`<tr>${I.map.map((f,i)=>`<th class="muted" style="font-weight:600">${esc(String((I.linhas[I.hi]||[])[i]||''))}</th>`).join('')}</tr>`:''}</thead>
          <tbody>${I.linhas.slice(I.hi+1, I.hi+7).map(l=>`<tr>${I.map.map((f,i)=>`<td>${esc(String(l[i]||''))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
        <div class="row" style="gap:10px;flex-wrap:wrap;margin-top:12px;align-items:center">
          <span class="pill ${prev.length?'p-ok':'p-bad'}">${prev.length} unidade${prev.length===1?'':'s'} reconhecida${prev.length===1?'':'s'}</span>
          ${prev.length?`<span class="pill p-mute">${prev.filter(x=>x.status==='Disponível').length} disponíveis</span>${prev.filter(x=>x.valor).length?`<span class="pill p-mute">Valores de ${brl(Math.min(...prev.filter(x=>x.valor).map(x=>x.valor)))} a ${brl(Math.max(...prev.filter(x=>x.valor).map(x=>x.valor)))}</span>`:'<span class="pill p-warn">Nenhum valor reconhecido</span>'}`:''}</div>
        <label class="full" style="display:flex;gap:10px;align-items:center;cursor:pointer;margin-top:10px"><input type="checkbox" id="li-sub" ${I.sub!==false?'checked':''} style="width:20px;height:20px;accent-color:var(--accent)"> <b>Substituir a lista atual</b> <span class="muted" style="font-size:12.5px">(desmarque para só atualizar e incluir)</span></label>
        ${I.file?`<label class="full" style="display:flex;gap:10px;align-items:center;cursor:pointer;margin-top:6px"><input type="checkbox" id="li-guardar" checked style="width:20px;height:20px;accent-color:var(--accent)"> Guardar o arquivo original em Arquivos da construtora</label>`:''}</div>`}
     </div>
     <div class="m-f"><button type="button" class="btn" data-mclose="1">Cancelar</button>${I.linhas?`<button class="btn pri" type="submit" ${prev.length?'':'disabled'}>Importar ${prev.length||''} unidades</button>`:''}</div></form></div>`; }

  return modalLc();
};

/* ---------- eventos ---------- */
function reconhecer(){ const I=S.imp; if(!I||!I.linhas) return; I.itens=montar(I.linhas, I.hi, I.map); }
async function lerTabela(file){
  const n=(file.name||'').toLowerCase();
  if(/\.pdf$/.test(n)) return {linhas: await lerPDF(file), nome:file.name};
  if(/\.xlsx?$/.test(n)) return {linhas: await lerXLSX(file), nome:file.name};
  return {linhas: lerCSV(await file.text()), nome:file.name};
}

document.addEventListener('click', e=>{
  if(!S.me) return; const b=e.target.closest('button,article'); if(!b) return; const d=b.dataset;
  if(d.lancnovo){ e.stopImmediatePropagation(); S.modal={tipo:'lancemp'}; return render(); }
  if(d.lancopen){ e.stopImmediatePropagation(); S.lancOpen=d.lancopen; L().st='Disponível'; L().torre=''; L().dorm=''; L().sim={}; render(); window.scrollTo(0,0); return; }
  if(d.lancvoltar){ e.stopImmediatePropagation(); S.lancOpen=null; render(); window.scrollTo(0,0); return; }
  if(d.lancedit){ e.stopImmediatePropagation(); S.modal={tipo:'lancemp', id:d.lancedit}; return render(); }
  if(d.lancarquivar){ e.stopImmediatePropagation(); if(S.lancDel!==d.lancarquivar){ S.lancDel=d.lancarquivar; return render(); }
    return acao(async()=>{ await q(sb.from('empreendimentos').update({arquivado_em:new Date().toISOString()}).eq('id',d.lancarquivar)); S.lancDel=null; S.lancOpen=null; }, 'Empreendimento arquivado'); }
  if(d.lancunnovo){ e.stopImmediatePropagation(); S.modal={tipo:'lancun', emp:d.lancunnovo}; return render(); }
  if(d.lancun){ e.stopImmediatePropagation(); S.modal={tipo:'lancun', emp:S.lancOpen, id:d.lancun}; return render(); }
  if(d.lancundel){ e.stopImmediatePropagation(); if(b.dataset.ok!=='1'){ b.dataset.ok='1'; b.textContent='Confirmar exclusão'; return; }
    return acao(async()=>{ await q(sb.from('lanc_unidades').delete().eq('id',d.lancundel)); S.modal=null; }, 'Unidade excluída'); }
  if(d.lanctabnovo){ e.stopImmediatePropagation(); S.modal={tipo:'lanctab', emp:d.lanctabnovo}; return render(); }
  if(d.lanctab){ e.stopImmediatePropagation(); S.modal={tipo:'lanctab', emp:S.lancOpen, id:d.lanctab}; return render(); }
  if(d.lanctabdel){ e.stopImmediatePropagation(); if(b.dataset.ok!=='1'){ b.dataset.ok='1'; b.textContent='Confirmar exclusão'; return; }
    return acao(async()=>{ await q(sb.from('lanc_tabelas').delete().eq('id',d.lanctabdel)); S.modal=null; }, 'Tabela excluída'); }
  if(d.lancimport){ e.stopImmediatePropagation(); S.imp={}; S.modal={tipo:'lancimp', emp:d.lancimport}; return render(); }
  if(d.limpvoltar){ e.stopImmediatePropagation(); S.imp={}; return render(); }
  if(d.lancsimcopy){ e.stopImmediatePropagation(); const t=window.__lancTexto(); return t?copiar(t):toast('Escolha a unidade e a tabela'); }
  if(d.lancarqbaixar){ e.stopImmediatePropagation(); const a=arqs(S.lancOpen).find(x=>x.id===d.lancarqbaixar); if(!a) return;
    (async()=>{ try{ const r=await sb.storage.from('modelos').createSignedUrl(a.path, 120, {download:a.nome_arquivo||true}); if(r.error) throw r.error; window.open(r.data.signedUrl,'_blank','noopener'); }catch(err){ falha(err); } })(); return; }
  if(d.lancarqdel){ e.stopImmediatePropagation(); if(S.larqDel!==d.lancarqdel){ S.larqDel=d.lancarqdel; return render(); } const a=arqs(S.lancOpen).find(x=>x.id===d.lancarqdel);
    return acao(async()=>{ await sb.storage.from('modelos').remove([a.path]); await q(sb.from('lanc_arquivos').delete().eq('id',a.id)); S.larqDel=null; }, 'Arquivo removido'); }
}, true);

document.addEventListener('input', e=>{
  if(S.tab!=='lancamentos') return; const id=e.target.id;
  if(id==='lanc-busca'){ L().busca=e.target.value; render(); }
  if(id==='li-colar'){ const t=e.target.value; if(!t.trim() || t.split('\n').length<2) return;
    const linhas=lerCSV(t); const det=detectar(linhas); S.imp={linhas, hi:det.hi, map:det.map, nome:'Tabela colada'}; reconhecer(); render(); }
});
document.addEventListener('change', e=>{
  if(!S.me) return; const el=e.target, id=el.id, d=el.dataset;
  if(id==='lanc-fst'){ L().st=el.value; return render(); }
  if(id==='lanc-ftorre'){ L().torre=el.value; return render(); }
  if(id==='lanc-fdorm'){ L().dorm=el.value; return render(); }
  if(id==='lanc-simun'){ L().sim.un=el.value; return render(); }
  if(id==='lanc-simtab'){ L().sim.tab=el.value; return render(); }
  if(id==='li-sub'){ (S.imp||{}).sub=el.checked; return; }
  if(d && d.limpcol!==undefined){ const I=S.imp; if(!I) return; I.map[+d.limpcol]=el.value; reconhecer(); return render(); }
  if(d && d.lancunst){ const nv=el.value; e.stopImmediatePropagation();
    return acao(async()=>{ await q(sb.from('lanc_unidades').update({status:nv, atualizado_em:new Date().toISOString()}).eq('id',d.lancunst)); }, 'Unidade '+nv.toLowerCase()); }
  if(id==='li-file'){ const f=el.files[0]; if(!f) return; e.stopImmediatePropagation();
    toast('Lendo o arquivo…');
    (async()=>{ try{ const r=await lerTabela(f); const det=detectar(r.linhas); S.imp={linhas:r.linhas, hi:det.hi, map:det.map, nome:r.nome, file:f}; reconhecer();
      if(!(S.imp.itens||[]).length) toast('Li o arquivo, mas não reconheci as colunas. Ajuste o de-para abaixo.'); render(); }catch(err){ falha(err); } })(); return; }
  if(id==='lanc-arq'){ const fs=[...el.files]; if(!fs.length) return; e.stopImmediatePropagation(); const emp_id=el.dataset.emp;
    return acao(async()=>{ for(const f of fs){ if(f.size>25e6) throw new Error(f.name+': maior que 25 MB');
      const path=`lancamentos/${emp_id}/${Date.now()}-${f.name.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w.-]+/g,'_')}`;
      const up=await sb.storage.from('modelos').upload(path, f, {contentType:f.type||'application/octet-stream'}); if(up.error) throw up.error;
      await q(sb.from('lanc_arquivos').insert({empreendimento_id:emp_id, titulo:f.name.replace(/\.[^.]+$/,''), tipo:/tabela|pre[çc]o|disponib/i.test(f.name)?'Tabela de preços':/book|apresent/i.test(f.name)?'Book de vendas':'Material', path, nome_arquivo:f.name, mime:f.type||null, tamanho:f.size, criado_por:S.me.nome})); }
    }, fs.length>1?fs.length+' arquivos enviados ✓':'Arquivo enviado ✓'); }
}, true);

document.addEventListener('submit', e=>{
  const f=e.target, v=id=>{ const x=f.querySelector('#'+id); return x?x.value.trim():''; };
  if(f.id==='f-lancemp'){ e.preventDefault(); e.stopImmediatePropagation();
    const dados={nome:v('le-nome'), construtora:v('le-constr')||null, status:v('le-status'), tipo:v('le-tipo'), entrega:v('le-entrega')||null,
      endereco:v('le-end')||null, bairro:v('le-bairro')||null, cidade:v('le-cidade')||null, dormitorios:v('le-dorm')||null, areas:v('le-areas')||null,
      vagas:v('le-vagas')||null, torres:n0(v('le-torres')), unidades_total:n0(v('le-unid')), comissao:numPT(v('le-com')), corretor:v('le-corretor')||null,
      contato:v('le-contato')||null, lazer:v('le-lazer')||null, diferenciais:v('le-dif')||null, site:v('le-site')||null, descricao:v('le-desc')||null};
    const id=f.dataset.id;
    return acao(async()=>{ if(id){ await q(sb.from('empreendimentos').update(Object.assign({updated_at:new Date().toISOString()},dados)).eq('id',id)); }
      else { const r=await q(sb.from('empreendimentos').insert(Object.assign({criado_por:S.me.nome},dados)).select().single()); if(r) S.lancOpen=r.id; }
      S.modal=null; }, id?'Dados salvos ✓':'Empreendimento criado ✓'); }

  if(f.id==='f-lancun'){ e.preventDefault(); e.stopImmediatePropagation();
    const dados={torre:v('lu-torre')||null, unidade:v('lu-unid'), andar:v('lu-andar')||null, tipologia:v('lu-tipo')||null, area:numPT(v('lu-area')),
      dormitorios:n0(v('lu-dorm')), suites:n0(v('lu-su')), vagas:n0(v('lu-vagas')), posicao:v('lu-pos')||null, valor:numPT(v('lu-valor')),
      status:v('lu-st'), obs:v('lu-obs')||null, atualizado_em:new Date().toISOString()};
    const id=f.dataset.id, emp_id=f.dataset.emp;
    return acao(async()=>{ if(id) await q(sb.from('lanc_unidades').update(dados).eq('id',id));
      else await q(sb.from('lanc_unidades').insert(Object.assign({empreendimento_id:emp_id, ordem:(un(emp_id).length+1)*10},dados)));
      S.modal=null; }, id?'Unidade salva ✓':'Unidade incluída ✓'); }

  if(f.id==='f-lanctab'){ e.preventDefault(); e.stopImmediatePropagation();
    const dados={nome:v('lt-nome'), entrada_pct:numPT(v('lt-ent')), parcelas:n0(v('lt-np')), parcelas_pct:numPT(v('lt-pp')),
      reforcos:n0(v('lt-nr')), reforcos_pct:numPT(v('lt-rp')), reforco_quando:v('lt-rq')||null, chaves_pct:numPT(v('lt-ch')),
      indice:v('lt-ind')||null, vigencia:v('lt-vig')||null, obs:v('lt-obs')||null};
    const id=f.dataset.id, emp_id=f.dataset.emp;
    return acao(async()=>{ if(id) await q(sb.from('lanc_tabelas').update(dados).eq('id',id));
      else await q(sb.from('lanc_tabelas').insert(Object.assign({empreendimento_id:emp_id, ordem:(tabs(emp_id).length+1)*10},dados)));
      S.modal=null; }, 'Tabela salva ✓'); }

  if(f.id==='f-lancimp'){ e.preventDefault(); e.stopImmediatePropagation();
    const I=S.imp||{}, emp_id=f.dataset.emp, itens=I.itens||[]; if(!itens.length) return toast('Nenhuma unidade reconhecida');
    const sub=(f.querySelector('#li-sub')||{}).checked!==false, guardar=(f.querySelector('#li-guardar')||{}).checked;
    return acao(async()=>{
      const r=await q(sb.rpc('lanc_importar',{p_emp:emp_id, p_itens:itens, p_substituir:sub}));
      if(guardar && I.file){ const path=`lancamentos/${emp_id}/${Date.now()}-${I.file.name.normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^\w.-]+/g,'_')}`;
        const up=await sb.storage.from('modelos').upload(path, I.file, {contentType:I.file.type||'application/octet-stream'});
        if(!up.error) await q(sb.from('lanc_arquivos').insert({empreendimento_id:emp_id, titulo:I.file.name.replace(/\.[^.]+$/,''), tipo:'Tabela de preços', path, nome_arquivo:I.file.name, mime:I.file.type||null, tamanho:I.file.size, criado_por:S.me.nome})); }
      S.modal=null; S.imp=null;
      setTimeout(()=>toast(`${r.incluidas} incluídas${r.atualizadas?', '+r.atualizadas+' atualizadas':''}${r.removidas?', '+r.removidas+' substituídas':''}`), 1200); }, 'Tabela importada ✓'); }
}, true);
})();
