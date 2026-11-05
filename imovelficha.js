/* Citihaus · ficha completa do imóvel (aba Imóveis): clicar no card abre tudo do imóvel num só lugar */
(function(){
if(TOKEN) return;
S.imvOpen = S.imvOpen || null;
const fotoUrl = p => sb.storage.from('fotos').getPublicUrl(p).data.publicUrl;
const capCod = c => 'CAP-' + String(c.numero).padStart(3,'0');
const valorN = v => { if(v==null||v==='') return 0; const s=String(v).replace(/[^\d,.]/g,''); return Number(s.includes(',')?s.replace(/\./g,'').replace(',','.'):(/\.\d{3}$/.test(s)?s.replace(/\./g,''):s))||0; };
const dinheiro = v => valorN(v) ? brl(valorN(v)) : '';
const hora = d => new Date(d).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',year:'2-digit',hour:'2-digit',minute:'2-digit'});
const linha = (rot, val) => val===undefined||val===null||val==='' ? '' : `<div style="padding:7px 0;border-bottom:1px solid var(--line)"><div class="muted" style="font-size:11.5px">${rot}</div><div style="font-weight:600;font-size:14px">${val}</div></div>`;
const grade = itens => { const h = itens.map(([r,v])=>linha(r,v)).join(''); return h ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));column-gap:16px">${h}</div>` : ''; };
const chips = arr => (arr||[]).length ? `<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px">${arr.map(x=>`<span class="pill p-mute">${esc(x)}</span>`).join('')}</div>` : '';
const sec = (titulo, corpo, extra='') => corpo ? `<div class="sec box"><h3>${titulo}${extra}</h3>${corpo}</div>` : '';
const ST_V = {agendada:'Agendada', realizada:'Realizada', cancelada:'Cancelada', nao_compareceu:'Não compareceu'};
const ST_P = {em_analise:'Em análise', aceita:'Aceita', recusada:'Recusada', contraproposta:'Contraproposta', cancelada:'Cancelada'};

function fichaHtml(i){
  const p = P(i.proprietario_id), cap = i.captacao_id && (D.captacoes||[]).find(k=>k.id===i.captacao_id);
  const f = cap ? (cap.ficha||{}) : {}, at = cap ? (cap.atendimento||{}) : {};
  const fotos = cap ? (D.capFotos[cap.id]||[]).slice().sort((a,b)=>(b.capa-a.capa)||(a.ordem-b.ordem)) : [];
  const cts = D.contratos.filter(c=>c.imovel_id===i.id).sort((a,b)=>b.numero-a.numero);
  const vs = cap ? (D.visitas||[]).filter(v=>v.captacao_id===cap.id || v.imovel_id===i.id) : (D.visitas||[]).filter(v=>v.imovel_id===i.id);
  const ps = cap ? (D.propostas||[]).filter(x=>x.captacao_id===cap.id || x.imovel_id===i.id) : (D.propostas||[]).filter(x=>x.imovel_id===i.id);
  const chs = cap ? (D.capch||[]).filter(h=>h.captacao_id===cap.id) : [];
  const hist = cap ? (D.capHist[cap.id]||[]).slice().reverse() : [];
  const loc = i.finalidade!=='Venda', ven = i.finalidade!=='Locação';
  const cl = i.status==='Disponível'?'p-ok':i.status==='Vendido'?'p-info':['Locado','Inativo'].includes(i.status)?'p-mute':'p-acc';
  const end = [f.endereco||i.endereco, f.numero, f.complemento, f.bairro||i.bairro, f.cidade&&(f.cidade+(f.uf?'/'+f.uf:'')), f.cep].filter(Boolean).join(' · ');
  const ativo = cts.find(c=>{ const ds=(c.situacao||{}).desocupacao; return !(ds && ds.etapa>=4); });

  const galeria = fotos.length ? `<div style="display:grid;grid-template-columns:2fr 1fr 1fr;grid-auto-rows:92px;gap:6px">${fotos.slice(0,5).map((x,k)=>`<a href="${esc(fotoUrl(x.path))}" target="_blank" rel="noopener" style="${k===0?'grid-row:span 2':''};border-radius:10px;overflow:hidden;background:#eee url('${esc(fotoUrl(x.path))}') center/cover;position:relative">${k===4&&fotos.length>5?`<span style="position:absolute;inset:0;background:rgba(0,0,0,.45);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700">+${fotos.length-5}</span>`:''}</a>`).join('')}</div>
    ${fotos.length>5?`<details style="margin-top:8px"><summary class="muted" style="cursor:pointer;font-size:13px">Ver todas as ${fotos.length} fotos</summary><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px;margin-top:8px">${fotos.map(x=>`<a href="${esc(fotoUrl(x.path))}" target="_blank" rel="noopener"><img src="${esc(fotoUrl(x.path))}" loading="lazy" alt="" style="width:100%;height:80px;object-fit:cover;border-radius:8px;display:block"></a>`).join('')}</div></details>`:''}` : '';

  const kpis = `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">${[
      ['🗓️','Visitas',vs.length,vs.filter(v=>v.status==='agendada'&&new Date(v.quando)>new Date()).length+' agendada(s)'],
      ['💬','Propostas',ps.length,ps.filter(x=>x.status==='em_analise').length+' em análise'],
      ['🎫','Chamados',chs.length,chs.filter(h=>h.status!=='resolvido').length+' aberto(s)'],
      ['📄','Contratos',cts.length,ativo?'nº '+ativo.numero+' em andamento':'nenhum ativo']]
    .map(([ic,n,v,s])=>`<div style="background:var(--bg);border-radius:12px;padding:10px"><div style="font-size:12px" class="muted">${ic} ${n}</div><div style="font-family:var(--f-display);font-size:22px;font-weight:700">${v}</div><div class="muted" style="font-size:11px">${s}</div></div>`).join('')}</div>`;

  const valores = grade([
    ['Venda', ven ? (dinheiro(f.valor_venda) || (i.valor_venda?brl(i.valor_venda):'')) : ''],
    ['Aluguel', loc ? (dinheiro(f.valor_locacao) || (Number(i.aluguel)?brl(i.aluguel):'')) : ''],
    ['Condomínio', dinheiro(f.valor_condominio)], ['IPTU (ano)', dinheiro(f.valor_iptu)],
    ['Aceita financiamento', esc(f.financiamento||'')], ['Aceita permuta', esc(f.permuta||'')], ['Comissão', esc(f.comissao||'')]]);
  const ficha = grade([
    ['Tipo', esc(f.categoria||i.tipo||'')], ['Uso', esc(f.uso||'')], ['Condomínio / prédio', esc(f.condominio||'')],
    ['Área útil', f.area_util?esc(f.area_util)+' m²':''], ['Área total', f.area_total?esc(f.area_total)+' m²':''],
    ['Quartos', esc(f.dormitorios??'')], ['Suítes', esc(f.suites??'')], ['Banheiros', esc(f.banheiros??'')], ['Vagas', esc(f.vagas??'')],
    ['Andar', esc(f.andar||'')], ['Ano', esc(f.ano||'')], ['Mobiliado', esc(f.mobiliado||'')], ['Ocupação', esc(f.ocupacao||'')],
    ['Chaves', esc(f.chaves||'')], ['Matrícula', esc(f.matricula||'')], ['Inscrição IPTU', esc(f.inscricao_iptu||'')],
    ['Detalhe', esc(i.detalhe||'')]]);
  const extras = `${(f.caracteristicas||[]).length?'<div class="muted" style="font-size:11.5px;margin-top:10px">O imóvel tem</div>'+chips(f.caracteristicas):''}
    ${(f.lazer||[]).length?'<div class="muted" style="font-size:11.5px;margin-top:10px">O condomínio tem</div>'+chips(f.lazer):''}
    ${f.diferenciais?`<div class="muted" style="font-size:11.5px;margin-top:10px">Diferenciais</div><div style="white-space:pre-line;font-size:14px">${esc(f.diferenciais)}</div>`:''}
    ${f.obs_internas?`<div class="note" style="margin-top:10px">🔒 <b>Obs. internas:</b> ${esc(f.obs_internas)}</div>`:''}`;

  const anuncio = cap && (cap.titulo||cap.descricao) ? `<h4 style="margin:0 0 6px;font-size:16px">${esc(cap.titulo||'')}</h4><p style="white-space:pre-line;margin:0;font-size:14px">${esc(cap.descricao||'')}</p>
    <div class="row" style="gap:6px;margin-top:10px;flex-wrap:wrap">${cap.texto_aprovado?'<span class="pill p-ok">Texto aprovado</span>':'<span class="pill p-warn">Texto não aprovado</span>'}<button class="btn sm" data-imvcopiar="${cap.id}">📋 Copiar texto</button></div>` : '';

  const prop = p.nome || p.telefone ? `${grade([['Nome',esc(p.nome||'')],['WhatsApp',esc(p.telefone||'')],['E-mail',esc(p.email||'')],['Estado civil',esc(p.estado_civil||'')],['Conta para repasse',esc(p.banco||'')],['Origem do contato',esc(at.origem||'')],['Captador',esc(cap&&cap.corretor||'')]])}
    <div class="row" style="gap:6px;margin-top:10px;flex-wrap:wrap">${p.telefone&&window.waBtn?window.waBtn(p.telefone,`Olá${p.nome?', '+p.nome.split(' ')[0]:''}! Aqui é da Citihaus 🧡 Sobre o seu imóvel ${i.titulo}: `,'WhatsApp'):''}<button class="btn sm ghost" data-editp="${p.id||''}" ${p.id?'':'disabled'}>✏️ Editar contato</button></div>` : '<p class="muted" style="margin:0">Sem proprietário ligado.</p>';

  const comercial = vs.length||ps.length||chs.length ? `
    ${chs.filter(h=>h.status!=='resolvido').map(h=>`<div class="note" style="margin-bottom:6px">🎫 <b>${esc(h.tipo)}</b>${h.valor_sugerido?' · '+brl(h.valor_sugerido):''} · ${esc(h.protocolo)} · ${h.status==='aberto'?'aguardando resposta':'em atendimento'}</div>`).join('')}
    ${ps.slice(0,5).map(x=>`<div class="row between" style="padding:7px 0;border-bottom:1px solid var(--line);gap:8px"><span><b>${brl(x.valor)}</b>${x.tipo==='Locação'?'/mês':''} <span class="muted" style="font-size:12.5px">· ${esc(x.proponente||'Proponente')} · ${dataBR(x.data)}</span></span><span class="pill ${x.status==='aceita'?'p-ok':x.status==='em_analise'?'p-info':'p-mute'}">${ST_P[x.status]||x.status}${x.status_prop?' · prop.: '+esc(x.status_prop):''}</span></div>`).join('')}
    ${vs.slice(0,5).map(v=>`<div class="row between" style="padding:7px 0;border-bottom:1px solid var(--line);gap:8px"><span>🗓️ ${hora(v.quando)} <span class="muted" style="font-size:12.5px">· ${esc(v.visitante||'Visitante')}${v.feedback?' · “'+esc(v.feedback)+'”':''}</span></span><span class="pill p-mute">${ST_V[v.status]||v.status}</span></div>`).join('')}
    ${cap?`<button class="btn sm" style="margin-top:10px" data-capopen2="${cap.id}">Gerenciar visitas, propostas e chamados →</button>`:''}` : '';

  const contratos = cts.length ? cts.map(c=>{ const ds=(c.situacao||{}).desocupacao, enc=ds&&ds.etapa>=4;
    return `<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line);gap:8px"><span><b>Contrato ${esc(c.numero)}</b> <span class="muted" style="font-size:12.5px">· ${brl(c.aluguel)}/mês${c.entrada?' · desde '+dataBR(c.entrada):''}</span></span>
      <span class="row" style="gap:6px"><span class="pill ${enc?'p-mute':c.etapa===6?'p-ok':'p-info'}">${enc?'Encerrado':ds?'Desocupação':c.etapa===6?'Ativo':(window.ETAPAS||ETAPAS)[c.etapa]}</span><button class="btn sm" data-open="${c.id}" data-go="1" data-imvclose2="1">Abrir</button></span></div>`; }).join('') : '';

  return `<div class="ov" data-imvclose="1"><aside class="drawer" role="dialog" aria-label="Imóvel ${esc(i.titulo)}" id="imv-drawer">
  <div class="d-head"><div class="row between" style="align-items:flex-start;flex-wrap:nowrap"><div style="min-width:0">
    <span class="mono" style="color:var(--accent-ink)">${cap?capCod(cap)+' · ':''}${esc(i.tipo||'Imóvel')}${i.loft_codigo?' · Loft '+esc(i.loft_codigo):''}</span><h2>${esc(i.titulo)}</h2>
    <div class="muted" style="font-size:12.5px">${esc(end)}</div>
    <div class="row" style="gap:6px;flex-wrap:wrap;margin-top:8px"><span class="pill ${cl}">${esc(i.status)}</span><span class="pill p-mute">${loc&&ven?'Venda e locação':ven?'Venda':'Locação'}</span></div></div>
    <button class="x" data-imvclose="1" aria-label="Fechar">×</button></div></div>
  <div class="d-body">
    ${galeria?`<div class="sec">${galeria}</div>`:''}
    <div class="sec">${kpis}</div>
    <div class="row" style="gap:8px;flex-wrap:wrap;margin:0 0 12px"><button class="btn sm" data-editimv="${i.id}">✏️ Editar imóvel</button>${cap?`<button class="btn sm" data-capopen2="${cap.id}">📋 Abrir captação</button>`:''}${i.status==='Disponível'&&loc&&!ativo?`<button class="btn sm pri" data-new="${i.id}" data-imvclose2="1">Iniciar contrato</button>`:''}</div>
    ${sec('💰 Valores', valores)}
    ${sec('📐 Ficha do imóvel', ficha+extras)}
    ${sec('📝 Anúncio', anuncio)}
    ${sec('👤 Proprietário', prop)}
    ${sec('📈 Comercial', comercial)}
    ${sec('📄 Contratos', contratos)}
    ${hist.length?`<div class="sec"><h3>Histórico</h3>${hist.slice(0,15).map(h=>`<div style="font-size:13px;padding:6px 0;border-bottom:1px solid var(--line)"><span class="muted" style="font-size:12px">${hora(h.created_at)}</span> · ${esc(h.texto)}</div>`).join('')}</div>`:''}
  </div></aside></div>`;
}

const renderIF = render;
render = function(){
  renderIF.apply(this, arguments);
  if(!S.me) return;
  if(S.tab==='imoveis') document.querySelectorAll('#app article.imv').forEach(a=>{ a.style.cursor='pointer'; a.title='Abrir a ficha completa'; });
  const i = S.imvOpen && S.tab==='imoveis' && D.imoveis.find(x=>x.id===S.imvOpen);
  if(i && !S.modal && !document.getElementById('imv-drawer')) layer.insertAdjacentHTML('beforeend', fichaHtml(i));
};

document.addEventListener('click', e=>{
  if(!S.me) return;
  const b = e.target.closest('button,a');
  const ov = e.target.closest('[data-imvclose]');
  if(ov && (e.target===ov || (b && b.dataset.imvclose!==undefined))){ e.stopImmediatePropagation(); S.imvOpen=null; return render(); }
  if(b && b.dataset.imvcopiar){ e.stopImmediatePropagation(); const c=(D.captacoes||[]).find(k=>k.id===b.dataset.imvcopiar); if(c) copiar((c.titulo||'')+'\n\n'+(c.descricao||'')); return; }
  if(b && (b.dataset.imvclose2!==undefined || b.dataset.capopen2)) S.imvOpen=null; /* deixa a ação original seguir */
  if(b) return;
  const card = S.tab==='imoveis' && e.target.closest('#app article.imv');
  if(!card) return;
  const ed = card.querySelector('[data-editimv]'); if(!ed) return;
  e.stopImmediatePropagation(); S.imvOpen = ed.dataset.editimv; render();
}, true);
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && S.imvOpen && !S.modal){ S.imvOpen=null; render(); } });
})();
