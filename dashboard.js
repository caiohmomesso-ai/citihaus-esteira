/* Citihaus · Meu Contrato — Dashboard (VGV/VGL, metas, tempos), Contratos reorganizado, ordem das abas e acessos por pessoa */
(function(){
if(TOKEN) return;
const ABAS = [['dashboard','📊 Dashboard'],['contratos','Contratos'],['captacoes','Captações'],['imoveis','Imóveis'],['pessoas','Pessoas'],['whatsapp','WhatsApp'],['acessos','⚙ Configuração'],['mensagens','Mensagens']];
const ABA_NOME = {dashboard:'Dashboard',contratos:'Contratos',captacoes:'Captações',imoveis:'Imóveis',pessoas:'Pessoas',whatsapp:'WhatsApp',mensagens:'Mensagens'};
const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const MESES_L = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const hoje = new Date();
D.vendas = D.vendas || []; D.metas = D.metas || []; D.etLog = D.etLog || []; D.eqAll = D.eqAll || [];
S.dAno = S.dAno || hoje.getFullYear(); S.dMes = S.dMes || (hoje.getMonth()+1);

const isAdm = () => S.me && S.me.papel === 'admin';
const pode = t => isAdm() || (t !== 'acessos' && ((S.me && S.me.acessos) || {})[t] !== false);
const kBRL = v => { v=Number(v)||0; if(Math.abs(v)>=1e6) return 'R$ '+(v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:2})+' mi'; if(Math.abs(v)>=1e3) return 'R$ '+(v/1e3).toLocaleString('pt-BR',{maximumFractionDigits:1})+' mil'; return brl(v); };
const noMes = (d, a, m) => { if(!d) return false; const x=new Date(String(d).length===10?d+'T12:00:00':d); return x.getFullYear()===a && (!m || x.getMonth()+1===m); };
const horas = ms => ms/36e5;
const fmtH = h => h==null||isNaN(h) ? '—' : h<1 ? Math.round(h*60)+' min' : h<48 ? h.toLocaleString('pt-BR',{maximumFractionDigits:1})+' h' : (h/24).toLocaleString('pt-BR',{maximumFractionDigits:1})+' dias';
const fmtD = d => d==null||isNaN(d) ? '—' : d.toLocaleString('pt-BR',{maximumFractionDigits:1})+' dia'+(Math.round(d*10)===10?'':'s');
const media = a => a.length ? a.reduce((s,x)=>s+x,0)/a.length : null;
const slaH = t => parseFloat(String(sla(t)))||24;
const meta = (tipo, mes, cor='') => { const m=D.metas.find(x=>x.ano===S.dAno && x.mes===mes && x.tipo===tipo && (x.corretor||'')===cor); return m ? Number(m.valor) : 0; };
const vendidas = () => new Set(D.vendas.filter(v=>v.captacao_id).map(v=>v.captacao_id));
const corretores = () => [...new Set([...(D.eqAll||[]).map(e=>e.nome), ...(D.captacoes||[]).map(c=>c.corretor), ...D.vendas.map(v=>v.corretor)].filter(Boolean))].sort((a,b)=>a.localeCompare(b));

/* ---------- dados ---------- */
let primeira = true;
const carregarOrig = carregar;
carregar = async function(){
  if(primeira){ primeira=false; const h=(location.hash||'').slice(1); S.tab = (h==='ativos'||h==='chamados') ? 'contratos' : (ABAS.some(a=>a[0]===h) ? h : 'dashboard'); }
  await carregarOrig();
  try{
    const [vs, ms, el, eq] = await Promise.all([
      q(sb.from('vendas').select('*').order('data',{ascending:false})),
      q(sb.from('metas').select('*')),
      q(sb.from('contrato_etapas').select('*').order('em')),
      q(sb.from('equipe').select('user_id,nome,papel,telefone,acessos').order('nome'))
    ]);
    D.vendas=vs; D.metas=ms; D.etLog=el; D.eqAll=eq;
    const eu = eq.find(x=>x.user_id===S.me.user_id); if(eu) S.me.acessos = eu.acessos||{};
  }catch(e){ console.warn('dashboard', e); }
};

/* ---------- métricas ---------- */
function carteira(){
  const vend=vendidas(), C=(D.captacoes||[]);
  const venda=C.filter(c=>c.finalidade!=='Locação' && !vend.has(c.id) && num(c.ficha&&c.ficha.valor_venda));
  const loc=C.filter(c=>c.finalidade!=='Venda' && num(c.ficha&&c.ficha.valor_locacao));
  const imv=D.imoveis.filter(i=>i.status==='Disponível' && Number(i.aluguel));
  const ativos=D.contratos.filter(c=>c.etapa===6 && !encerrado(c));
  return {
    vgv: venda.reduce((s,c)=>s+num(c.ficha.valor_venda),0), nVgv: venda.length,
    vgvPub: venda.filter(c=>c.etapa===5).reduce((s,c)=>s+num(c.ficha.valor_venda),0),
    vgl: loc.reduce((s,c)=>s+num(c.ficha.valor_locacao),0) + imv.reduce((s,i)=>s+Number(i.aluguel),0), nVgl: loc.length+imv.length,
    adm: ativos.reduce((s,c)=>s+Number(c.aluguel||0),0), nAdm: ativos.length
  };
}
function tempoChamados(){
  const desde=Date.now()-90*864e5, resp=[], resol=[]; let noSla=0, comResp=0;
  const acao=[];
  D.chamados.forEach(h=>{
    const ms=(D.msgs[h.id]||[]).slice().sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
    const ini=new Date(h.created_at).getTime(), lim=slaH(h.tipo);
    const r=ms.find(m=>m.autor==='equipe' && new Date(m.created_at)>=ini-1000);
    if(ini>=desde){
      if(r){ const hh=horas(new Date(r.created_at)-ini); resp.push(hh); comResp++; if(hh<=lim) noSla++; }
      if(h.status==='resolvido') resol.push(horas(new Date(h.updated_at)-ini));
    }
    if(h.status!=='resolvido'){
      const ult=ms[ms.length-1], ultEq=ult && ult.autor==='equipe';
      if(!ultEq){ const desdeCli=ult?new Date(ult.created_at).getTime():ini, pass=horas(Date.now()-desdeCli);
        acao.push({h, tipo: pass>lim?'atrasado':'responder', horas:pass, lim, txt: pass>lim?`Responder: ${fmtH(pass-lim)} além do prazo de ${sla(h.tipo)}`:`Responder em até ${fmtH(lim-pass)}`}); }
      else { const pass=horas(Date.now()-new Date(ult.created_at));
        if(pass>=48) acao.push({h, tipo:'followup', horas:pass, txt:`Follow-up: cliente sem retorno há ${fmtH(pass)}`}); }
    }
  });
  const ordem={atrasado:0,followup:1,responder:2};
  acao.sort((a,b)=>(ordem[a.tipo]-ordem[b.tipo])||(b.horas-a.horas));
  return {resp:media(resp), resol:media(resol), sla: comResp?Math.round(noSla/comResp*100):null, n:resp.length, acao};
}
function tempoContratos(){
  const porC={}; D.etLog.forEach(l=>(porC[l.contrato_id]=porC[l.contrato_id]||[]).push(l));
  const ass=[], atv=[], dur=[0,1,2,3,4,5].map(()=>[]), parados=[];
  D.contratos.filter(c=>!(c.situacao||{}).importado).forEach(c=>{
    const ini=new Date(c.created_at).getTime(), L=(porC[c.id]||[]), entrou={0:ini};
    L.forEach(l=>{ const t=new Date(l.em).getTime(); if(entrou[l.etapa]==null || l.etapa===0) entrou[l.etapa]= l.etapa===0?Math.min(ini,t):t; });
    const pri = e => { let m=null; Object.keys(entrou).forEach(k=>{ if(+k>=e && (m==null||entrou[k]<m)) m=entrou[k]; }); return m; };
    const a=pri(3); if(a && c.etapa>=3) ass.push((a-ini)/864e5);
    const f=entrou[6]; if(f && c.etapa===6) atv.push((f-ini)/864e5);
    for(let e=0;e<6;e++){ if(entrou[e]!=null && entrou[e+1]!=null && entrou[e+1]>=entrou[e]) dur[e].push((entrou[e+1]-entrou[e])/864e5); }
    if(c.etapa<6){ const desde=entrou[c.etapa]!=null?entrou[c.etapa]:ini, dd=(Date.now()-desde)/864e5; if(dd>=7) parados.push({c, dias:dd}); }
  });
  return {ass:media(ass), nAss:ass.length, atv:media(atv), nAtv:atv.length, etapas:dur.map(media), parados:parados.sort((a,b)=>b.dias-a.dias)};
}

/* ---------- peças visuais ---------- */
const barra = (feito, alvo, cor='var(--accent)') => { const p=alvo?Math.min(100,Math.round(feito/alvo*100)):0;
  return `<div style="height:10px;border-radius:99px;background:var(--surface-2);overflow:hidden"><i style="display:block;height:100%;width:${p}%;background:${p>=100?'var(--ok)':cor};border-radius:99px"></i></div>`; };
function cardMeta(ic, titulo, feito, alvo, fmt){
  const p=alvo?Math.round(feito/alvo*100):null;
  return `<div class="box" style="padding:14px"><div class="row between"><span style="font-size:12.5px;color:var(--muted);font-weight:600">${ic} ${titulo}</span>${p==null?'<span class="pill p-mute">Sem meta</span>':`<span class="pill ${p>=100?'p-ok':p>=60?'p-info':'p-warn'}">${p}%</span>`}</div>
    <div style="font-family:var(--f-display);font-size:22px;font-weight:700;margin:6px 0 8px">${fmt(feito)}<span style="font-size:13px;color:var(--muted);font-weight:500"> / ${alvo?fmt(alvo):'—'}</span></div>${barra(feito,alvo)}</div>`;
}
const kpi = (ic, valor, rot, sub, hl) => `<div class="stat ${hl?'hl':''}"><span style="font-size:18px">${ic}</span><b>${valor}</b><span>${rot}</span>${sub?`<div style="font-size:11.5px;color:var(--muted);margin-top:2px">${sub}</div>`:''}</div>`;
function graficoAno(){
  const vals=MESES.map((_,i)=>D.vendas.filter(v=>noMes(v.data,S.dAno,i+1)).reduce((s,v)=>s+Number(v.valor),0));
  const metas=MESES.map((_,i)=>meta('vendas_valor',i+1));
  const caps=MESES.map((_,i)=>(D.captacoes||[]).filter(c=>noMes(c.created_at,S.dAno,i+1)).length);
  const mx=Math.max(1,...vals,...metas);
  return `<div style="display:grid;grid-template-columns:repeat(12,1fr);gap:6px;align-items:end;height:170px;margin-top:6px">${MESES.map((m,i)=>{
    const h=Math.round(vals[i]/mx*140), hm=Math.round(metas[i]/mx*140), atual=i+1===S.dMes;
    return `<div style="display:flex;flex-direction:column;align-items:center;gap:4px;height:100%;justify-content:flex-end" title="${m}: ${brl(vals[i])}${metas[i]?' · meta '+brl(metas[i]):''} · ${caps[i]} captações">
      <div style="position:relative;width:100%;max-width:34px;height:140px;display:flex;align-items:flex-end">
        ${hm?`<div style="position:absolute;left:-3px;right:-3px;bottom:${hm}px;border-top:2px dashed var(--muted)"></div>`:''}
        <div style="width:100%;height:${Math.max(h,vals[i]?3:0)}px;background:${metas[i]&&vals[i]>=metas[i]?'var(--ok)':'var(--accent)'};border-radius:6px 6px 2px 2px;opacity:${atual?1:.75}"></div></div>
      <span style="font-size:10.5px;font-weight:${atual?700:500};color:${atual?'var(--accent-ink)':'var(--muted)'}">${m}</span>
      <span style="font-size:10px;color:var(--muted);min-height:14px">${caps[i]?caps[i]+'🏠':'&nbsp;'}</span></div>`; }).join('')}</div>
    <div class="muted" style="font-size:11.5px;margin-top:8px">Barras: vendas (R$) por mês · linha tracejada: meta · 🏠 captações abertas no mês</div>`;
}

/* ---------- aba Dashboard ---------- */
function dashHtml(){
  const A=S.dAno, M=S.dMes, cart=carteira(), tc=tempoChamados(), tk=tempoContratos();
  const vMes=D.vendas.filter(v=>noMes(v.data,A,M)), vAno=D.vendas.filter(v=>noMes(v.data,A));
  const capMes=(D.captacoes||[]).filter(c=>noMes(c.created_at,A,M)), locMes=D.contratos.filter(c=>!(c.situacao||{}).importado && noMes(c.created_at,A,M));
  const soma=l=>l.reduce((s,v)=>s+Number(v.valor),0);
  const cors=corretores();
  const rank=cors.map(n=>({n, cap:capMes.filter(c=>c.corretor===n).length, meta:meta('captacoes',M,n), vend:soma(vMes.filter(v=>v.corretor===n))})).filter(r=>r.cap||r.meta||r.vend).sort((a,b)=>b.cap-a.cap||b.vend-a.vend);
  const mxCap=Math.max(1,...rank.map(r=>Math.max(r.cap,r.meta)));
  const ETN=ETAPAS.slice(0,6), mxEt=Math.max(1,...tk.etapas.map(x=>x||0));
  const selAno=[A-1,A,A+1].map(y=>`<option ${y===A?'selected':''}>${y}</option>`).join('');
  return `<div class="head"><div><h1>Dashboard</h1><p>Carteira, metas e tempos de atendimento da Citihaus em ${MESES_L[M-1]} de ${A}.</p></div>
    <div class="row" style="gap:8px"><select id="d-mes" style="border:1px solid var(--line);border-radius:9px;padding:7px 10px;background:var(--surface)">${MESES_L.map((m,i)=>`<option value="${i+1}" ${i+1===M?'selected':''}>${m[0].toUpperCase()+m.slice(1)}</option>`).join('')}</select>
    <select id="d-ano" style="border:1px solid var(--line);border-radius:9px;padding:7px 10px;background:var(--surface)">${selAno}</select>
    ${isAdm()?'<button class="btn" data-dmetas="1">🎯 Definir metas</button>':''}<button class="btn pri" data-dvenda="1">+ Registrar venda</button></div></div>

  <div class="stats">
    ${kpi('🏷️', kBRL(cart.vgv), 'VGV disponível (venda)', `${cart.nVgv} imóve${cart.nVgv===1?'l':'is'} · ${kBRL(cart.vgvPub)} publicado`, true)}
    ${kpi('🔑', kBRL(cart.vgl)+'<span style="font-size:13px;color:var(--muted)">/mês</span>', 'VGL disponível (locação)', `${cart.nVgl} imóve${cart.nVgl===1?'l':'is'} para alugar`)}
    ${kpi('🏢', kBRL(cart.adm)+'<span style="font-size:13px;color:var(--muted)">/mês</span>', 'Carteira administrada', `${cart.nAdm} contrato${cart.nAdm===1?'':'s'} ativo${cart.nAdm===1?'':'s'}`)}
    ${kpi('💰', kBRL(soma(vAno)), 'VGV vendido no ano', `${vAno.length} venda${vAno.length===1?'':'s'} em ${A}`)}
  </div>

  <h2 style="font-size:16px;margin:22px 0 10px">🎯 Metas de ${MESES_L[M-1]}</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
    ${cardMeta('🏠','Captações no mês', capMes.length, meta('captacoes',M), n=>String(n))}
    ${cardMeta('💰','Vendas no mês (R$)', soma(vMes), meta('vendas_valor',M), kBRL)}
    ${cardMeta('🤝','Vendas no mês (qtd)', vMes.length, meta('vendas_qtd',M), n=>String(n))}
    ${cardMeta('🔑','Locações no mês', locMes.length, meta('locacoes',M), n=>String(n))}
  </div>
  <h2 style="font-size:16px;margin:18px 0 10px">📅 Metas de ${A}</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px">
    ${cardMeta('💰','Vendas no ano (R$)', soma(vAno), meta('vendas_valor',0), kBRL)}
    ${cardMeta('🤝','Vendas no ano (qtd)', vAno.length, meta('vendas_qtd',0), n=>String(n))}
    ${cardMeta('🏠','Captações no ano', (D.captacoes||[]).filter(c=>noMes(c.created_at,A)).length, meta('captacoes',0), n=>String(n))}
  </div>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px;margin-top:18px;align-items:start">
    <div class="box"><h2>📈 Vendas e captações em ${A}</h2>${graficoAno()}</div>
    <div class="box"><h2>🏆 Captações por corretor · ${MESES[M-1]}</h2>
      ${rank.length?rank.map(r=>`<div style="margin-bottom:10px"><div class="row between" style="font-size:13px"><b>${esc(r.n)}</b><span class="muted">${r.cap}${r.meta?' / '+r.meta:''} captaç${r.cap===1?'ão':'ões'}${r.vend?' · '+kBRL(r.vend)+' vendido':''}</span></div>
        <div style="height:10px;border-radius:99px;background:var(--surface-2);overflow:hidden;position:relative"><i style="display:block;height:100%;width:${Math.round(r.cap/mxCap*100)}%;background:${r.meta&&r.cap>=r.meta?'var(--ok)':'var(--accent)'};border-radius:99px"></i>${r.meta?`<span style="position:absolute;top:0;bottom:0;left:${Math.round(r.meta/mxCap*100)}%;border-left:2px dashed var(--fg);opacity:.5"></span>`:''}</div></div>`).join(''):'<div class="empty">Nenhuma captação neste mês.</div>'}</div>
  </div>

  <h2 style="font-size:16px;margin:22px 0 10px">⏱️ Tempo de atendimento dos chamados <span class="muted" style="font-size:12.5px;font-weight:500">· últimos 90 dias</span></h2>
  <div class="stats" style="margin-top:0">
    ${kpi('💬', fmtH(tc.resp), 'Tempo médio da 1ª resposta', tc.n?tc.n+' chamado'+(tc.n>1?'s':'')+' respondido'+(tc.n>1?'s':''):'sem chamados no período', true)}
    ${kpi('✅', fmtH(tc.resol), 'Tempo médio até resolver')}
    ${kpi('🎯', tc.sla==null?'—':tc.sla+'%', 'Respondidos dentro do prazo', 'Prazo: 2h boleto · 24h geral · 48h manutenção')}
    ${kpi('🔔', String(tc.acao.length), 'Chamados pedindo ação agora', tc.acao.filter(a=>a.tipo==='atrasado').length+' atrasado(s)')}
  </div>
  <div class="box" style="margin-top:10px"><h2>🔔 Follow-up · o que fazer agora</h2>
    ${tc.acao.length?`<div style="display:grid;gap:8px">${tc.acao.map(a=>{ const p=P(a.h.pessoa_id), cl=a.tipo==='atrasado'?'p-bad':a.tipo==='followup'?'p-acc':'p-warn';
      const xp=parteDe(a.h.contrato_id,a.h.pessoa_id), wmsg=`Olá${p.nome?', '+primeiro(p.nome):''}! Aqui é da Citihaus 🧡\n`+(a.tipo==='followup'?`Passando para saber sobre o seu chamado ${a.h.protocolo} (${a.h.titulo}). Conseguiu ver a nossa última mensagem?`:`Recebemos o seu chamado ${a.h.protocolo} (${a.h.titulo}) e já estamos cuidando.`)+(xp?`\n\nAcompanhe por aqui: ${linkPortal(xp.token)}`:'');
      return `<div style="display:flex;gap:8px;align-items:stretch;flex-wrap:wrap"><button class="card" data-chteam="${a.h.id}" style="flex:1;min-width:240px;flex-direction:row;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <div style="min-width:0"><span class="code">${esc(a.h.protocolo)}</span><h4>${esc(a.h.titulo)}</h4><span class="meta">${esc(nomeP(p,a.h.papel))} · ${esc(a.h.tipo)}</span></div>
        <span class="pill ${cl}">${esc(a.txt)}</span></button><div style="display:flex;align-items:center">${waBtn(p.telefone, wmsg, a.tipo==='followup'?'Cobrar retorno':'Avisar cliente')}</div></div>`; }).join('')}</div>`:'<div class="empty">Tudo respondido. Nenhum chamado esperando a equipe ou parado com o cliente. 👏</div>'}</div>

  <h2 style="font-size:16px;margin:22px 0 10px">📝 Tempo dos contratos de locação</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:14px;align-items:start">
    <div class="box"><div class="stats" style="margin-top:0;grid-template-columns:1fr 1fr">
      ${kpi('✍️', fmtD(tk.ass), 'Do início até a assinatura', tk.nAss?'média de '+tk.nAss+' contrato'+(tk.nAss>1?'s':''):'ainda sem contratos assinados', true)}
      ${kpi('🔑', fmtD(tk.atv), 'Do início até as chaves', tk.nAtv?'média de '+tk.nAtv+' contrato'+(tk.nAtv>1?'s':''):'ainda sem contratos ativos')}</div>
      <div style="font-size:12.5px;font-weight:600;color:var(--muted);margin:14px 0 8px">Tempo médio em cada etapa (onde trava)</div>
      ${ETN.map((e,i)=>{ const v=tk.etapas[i]; return `<div style="display:grid;grid-template-columns:120px 1fr 70px;gap:8px;align-items:center;font-size:12.5px;margin-bottom:6px"><span>${esc(e)}</span>
        <div style="height:10px;border-radius:99px;background:var(--surface-2);overflow:hidden"><i style="display:block;height:100%;width:${v?Math.max(4,Math.round(v/mxEt*100)):0}%;background:${v&&v===Math.max(...tk.etapas.map(x=>x||0))?'var(--bad)':'var(--info)'};border-radius:99px"></i></div><span class="num" style="text-align:right">${fmtD(v)}</span></div>`; }).join('')}
      <div class="muted" style="font-size:11.5px;margin-top:6px">A assinatura conta quando o contrato sai de “Aprovação”. Os tempos são medidos a partir de hoje para os contratos novos.</div></div>
    <div class="box"><h2>🐢 Contratos parados há 7 dias ou mais</h2>
      ${tk.parados.length?tk.parados.map(x=>`<button class="card" data-open="${x.c.id}" data-go="1" style="flex-direction:row;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px">
        <div style="min-width:0"><span class="code">${esc(pastaC(x.c))}</span><h4>${esc(imvDe(x.c).titulo)}</h4><span class="meta">${esc(ETAPAS[x.c.etapa])} · ${esc(x.c.corretor||'')}</span></div>
        <span class="pill ${x.dias>=14?'p-bad':'p-warn'}">${Math.floor(x.dias)} dias</span></button>`).join(''):'<div class="empty">Nenhum contrato parado. 🚀</div>'}</div>
  </div>

  <div class="head" style="margin-top:26px"><div><h2 style="font-size:16px;margin:0">💰 Vendas de ${A}</h2></div></div>
  <div class="tbl-wrap"><table><thead><tr><th>Data</th><th>Imóvel</th><th>Corretor</th><th>Valor</th><th>Comissão</th><th></th></tr></thead><tbody>
  ${vAno.length?vAno.map(v=>{ const c=v.captacao_id&&(D.captacoes||[]).find(k=>k.id===v.captacao_id);
    return `<tr><td class="num">${dataBR(v.data)}</td><td><b>${esc(v.imovel||'')}</b>${c?` <span class="pill p-acc">CAP-${String(c.numero).padStart(3,'0')}</span>`:''}${v.obs?`<div class="muted" style="font-size:12px">${esc(v.obs)}</div>`:''}</td><td>${esc(v.corretor)}</td>
    <td class="num"><b>${brl(v.valor)}</b></td><td class="num">${v.comissao?brl(v.comissao):'—'}</td><td style="text-align:right">${isAdm()?`<button class="btn sm ghost" style="color:var(--bad)" data-dvdel="${v.id}">${S.dvDel===v.id?'Confirmar exclusão':'Excluir'}</button>`:''}</td></tr>`; }).join('')
    :'<tr><td colspan="6" class="muted">Nenhuma venda registrada em '+A+'. Use “+ Registrar venda”.</td></tr>'}
  </tbody></table></div>`;
}

/* ---------- modais ---------- */
function dModalHtml(){
  const m=S.dModal, cors=corretores();
  if(m.tipo==='venda'){
    const caps=(D.captacoes||[]).filter(c=>c.finalidade!=='Locação' && !vendidas().has(c.id));
    return `<div class="ov center"><form class="modal" id="f-dvenda">
    <div class="m-h"><span class="mono" style="color:var(--accent-ink)">Dashboard</span><h2 style="font-size:19px;margin-top:4px">💰 Registrar venda</h2></div>
    <div class="m-b">
      <label class="f full">Captação (opcional)<select id="dv-cap"><option value="">Imóvel fora da esteira de captação</option>${caps.map(c=>`<option value="${c.id}">CAP-${String(c.numero).padStart(3,'0')} · ${esc([c.ficha.categoria,c.ficha.condominio||c.ficha.bairro].filter(Boolean).join(' · ')||'Captação')}${c.ficha.valor_venda?' · '+esc(brl(num(c.ficha.valor_venda))):''}</option>`).join('')}</select></label>
      <label class="f full">Imóvel<input id="dv-imv" required placeholder="Ex.: Casa 3 dorm. · Jd. Maracanã"></label>
      <label class="f">Valor da venda (R$)<input id="dv-val" required inputmode="decimal" placeholder="450.000,00"></label>
      <label class="f">Data<input id="dv-data" type="date" value="${new Date().toISOString().slice(0,10)}" required></label>
      <label class="f">Corretor<select id="dv-cor">${cors.map(n=>`<option ${n===S.me.nome?'selected':''}>${esc(n)}</option>`).join('')}</select></label>
      <label class="f">Comissão (R$)<input id="dv-com" inputmode="decimal" placeholder="Opcional"></label>
      <label class="f full">Observação<input id="dv-obs" placeholder="Ex.: financiamento Caixa, permuta parcial"></label>
      <div class="note full">Se escolher a captação, o imóvel sai do VGV disponível e passa para o vendido.</div>
    </div>
    <div class="m-f"><button type="button" class="btn" data-dmclose="1">Cancelar</button><button class="btn pri" type="submit">Registrar venda</button></div></form></div>`;
  }
  if(m.tipo==='metas'){ const M=S.dMes, A=S.dAno, eq=(D.eqAll||[]).map(e=>e.nome);
    const campo=(id,rot,v,ph)=>`<label class="f"><span>${rot}</span><input id="${id}" inputmode="decimal" value="${v?String(v).replace('.',','):''}" placeholder="${ph||'0'}"></label>`;
    return `<div class="ov center"><form class="modal" id="f-dmetas" style="width:min(620px,calc(100% - 32px))">
    <div class="m-h"><span class="mono" style="color:var(--accent-ink)">Administrador</span><h2 style="font-size:19px;margin-top:4px">🎯 Metas de ${MESES_L[M-1]} e de ${A}</h2></div>
    <div class="m-b">
      <div class="full" style="font-weight:700">Mês de ${MESES_L[M-1]}</div>
      ${campo('mt-cap','Captações da equipe',meta('captacoes',M))}
      ${campo('mt-loc','Locações (novos contratos)',meta('locacoes',M))}
      ${campo('mt-vv','Vendas (R$)',meta('vendas_valor',M),'500.000')}
      ${campo('mt-vq','Vendas (quantidade)',meta('vendas_qtd',M))}
      <div class="full" style="font-weight:700;margin-top:6px">Captações por corretor no mês</div>
      ${eq.map((n,i)=>campo('mt-c'+i, esc(n), meta('captacoes',M,n))).join('')}
      <div class="full" style="font-weight:700;margin-top:6px">Ano de ${A}</div>
      ${campo('mt-avv','Vendas no ano (R$)',meta('vendas_valor',0),'6.000.000')}
      ${campo('mt-avq','Vendas no ano (quantidade)',meta('vendas_qtd',0))}
      ${campo('mt-acap','Captações no ano',meta('captacoes',0))}
      <label class="f full" style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="mt-rep" style="width:18px;height:18px;accent-color:var(--accent)"> Repetir as metas do mês para todos os meses de ${A}</label>
    </div>
    <div class="m-f"><button type="button" class="btn" data-dmclose="1">Cancelar</button><button class="btn pri" type="submit">Salvar metas</button></div></form></div>`;
  }

  if(m.tipo==='desoc') return desocModal();
  if(m.tipo==='comwa') return comWaModal();
  if(m.tipo==='ativo'){ const livres=D.imoveis.slice().sort((a,b)=>a.titulo.localeCompare(b.titulo)), im=m.imv&&D.imoveis.find(i=>i.id===m.imv), dono=im?P(im.proprietario_id):{};
    const pf=(pre,rot,o={})=>`<label class="f"><span>Nome ${o.req?'<span style="color:var(--bad)">*</span>':''}</span><input id="${pre}-nome" value="${esc(o.v&&o.v.nome||'')}" ${o.req?'required':''}></label>
      <label class="f">Celular (WhatsApp)<input id="${pre}-tel" inputmode="tel" value="${esc(o.v&&o.v.telefone||'')}" placeholder="(17) 9…"></label>
      <label class="f full">E-mail<input id="${pre}-email" type="email" value="${esc(o.v&&o.v.email||'')}"></label>`;
    return `<div class="ov center"><form class="modal" id="f-dativo" style="width:min(640px,calc(100% - 32px))">
    <div class="m-h"><span class="mono" style="color:var(--accent-ink)">Contrato em vigor</span><h2 style="font-size:19px;margin-top:4px">🏢 Incluir contrato já ativo</h2>
      <p class="muted" style="margin:4px 0 0;font-size:12.5px">Para locações que já estão rodando. O contrato entra direto em “Ativos”, sem passar pela esteira, e os clientes já podem usar o portal para chamados.</p></div>
    <div class="m-b">
      <div class="full" style="font-weight:700">🏠 Imóvel</div>
      <label class="f full">Imóvel<select id="da-imv"><option value="">+ Cadastrar imóvel novo</option>${livres.map(i=>`<option value="${i.id}" ${m.imv===i.id?'selected':''}>${esc(i.titulo)}${i.bairro?' · '+esc(i.bairro):''}${i.status&&i.status!=='Disponível'?' ('+esc(i.status)+')':''}</option>`).join('')}</select></label>
      ${im?'':`<label class="f full"><span>Nome do imóvel <span style="color:var(--bad)">*</span></span><input id="da-tit" required placeholder="Ex.: Casa Rua das Flores, 120"></label>
      <label class="f">Endereço<input id="da-end"></label><label class="f">Bairro<input id="da-bai"></label>
      <label class="f">Tipo<select id="da-tipo">${['Apartamento','Casa','Studio','Sala','Salão','Galpão','Terreno'].map(t=>`<option>${t}</option>`).join('')}</select></label>`}
      <div class="full" style="font-weight:700;margin-top:6px">👤 Proprietário</div>
      ${pf('da-pro','Proprietário',{req:!im, v:dono})}
      <div class="full" style="font-weight:700;margin-top:6px">🔑 Inquilino</div>
      ${pf('da-inq','Inquilino',{req:true})}
      <div class="full" style="font-weight:700;margin-top:6px">📄 Contrato</div>
      <label class="f"><span>Aluguel (R$/mês) <span style="color:var(--bad)">*</span></span><input id="da-alu" inputmode="decimal" required value="${im&&im.aluguel?String(im.aluguel).replace('.',','):''}"></label>
      <label class="f">Garantia<select id="da-gar">${['Fiador','Caução','Caucionador','Seguro fiança','Título de capitalização','Sem garantia'].map(g=>`<option ${m.gar===g?'selected':''}>${g}</option>`).join('')}</select></label>
      <label class="f">Início do contrato<input id="da-ent" type="date"></label>
      <label class="f">Término do contrato<input id="da-fim" type="date"></label>
      <label class="f">Seguro incêndio vence em<input id="da-seg" type="date"></label>
      <label class="f">Corretor<select id="da-cor">${corretores().map(n=>`<option ${n===S.me.nome?'selected':''}>${esc(n)}</option>`).join('')}</select></label>
      <label class="f">Nº do contrato (opcional)<input id="da-num" inputmode="numeric" placeholder="Automático"></label>
      ${(m.gar||'Fiador')==='Fiador'||m.gar==='Caucionador'?`<div class="full" style="font-weight:700;margin-top:6px">🤝 ${m.gar==='Caucionador'?'Caucionador':'Fiador'} (opcional)</div>${pf('da-fia','Fiador')}`:''}
      <div class="note full">Se o celular já estiver no cadastro, o sistema usa a mesma pessoa. Depois de salvar, você pode anexar o contrato e os documentos dentro do contrato e mandar o link do portal para os clientes.</div>
    </div>
    <div class="m-f"><button type="button" class="btn" data-dmclose="1">Cancelar</button><button class="btn pri" type="submit">Incluir contrato ativo</button></div></form></div>`;
  }
  return '';
}

/* ---------- aba Contratos: kanban (a iniciar) + ativos + chamados ---------- */
kanban = function(){
  const lista=D.contratos.filter(c=>c.etapa<6);
  const conferir=lista.reduce((a,c)=>a+aConferir(c),0);
  const cliente=lista.filter(c=>c.etapa===0).reduce((a,c)=>a+partesDe(c).reduce((b,x)=>b+pend(x.pessoa_id,x.papel).length,0),0);
  const prontos=lista.filter(c=>!gate(c).length).length, nAt=D.contratos.filter(c=>c.etapa===6&&!emDesoc(c)&&!encerrado(c)).length, nCh=D.chamados.filter(h=>h.status!=='resolvido').length;
  return `<div class="head"><div><h1>Contratos de locação</h1><p>Em cima, os contratos que vão iniciar. Embaixo, os ativos e os chamados de cada contrato.</p></div>
    <div class="row" style="gap:8px"><button class="btn sm" data-dscroll="sec-ativos">🏢 Ativos (${nAt})</button><button class="btn sm" data-dscroll="sec-desoc">🚚 Desocupação (${D.contratos.filter(emDesoc).length})</button><button class="btn sm" data-dscroll="sec-chamados">🎫 Chamados (${nCh})</button><button class="btn" data-dativo="1">+ Contrato já ativo</button><button class="btn pri" data-tab="imoveis">+ Iniciar contrato</button></div></div>
  <div class="stats">
    <div class="stat"><b>${lista.length}</b><span>contratos para iniciar</span></div>
    <div class="stat hl"><b>${conferir}</b><span>documentos aguardando conferência</span></div>
    <div class="stat"><b>${cliente}</b><span>pendências com o cliente</span></div>
    <div class="stat"><b>${prontos}</b><span>prontos para avançar</span></div>
  </div>
  <div class="board-scroll"><div class="board">
  ${ETAPAS.slice(0,6).map((e,i)=>{const cs=lista.filter(c=>c.etapa===i);
    return `<section class="col"><div class="col-h"><div><h3>${e}</h3><small>${ETAPA_DESC[i]}</small></div><span class="count">${cs.length}</span></div>
    ${cs.length?cs.map(card).join(''):'<div class="empty">Nenhum contrato aqui</div>'}</section>`}).join('')}
  </div></div>
  <div id="sec-ativos" style="border-top:2px solid var(--line);margin-top:8px;scroll-margin-top:80px">${ativosSemDesoc()}</div>
  <div id="sec-desoc" style="border-top:2px solid var(--line);scroll-margin-top:80px">${desocHtml()}</div>
  <div id="sec-chamados" style="border-top:2px solid var(--line);scroll-margin-top:80px">${chamadosEquipe().replace('<h1>Chamados</h1><p>Abertos pelo cliente no portal. Cada um tem protocolo e fica ligado ao contrato.</p>','<h1>Chamados dos contratos</h1><p>Abertos pelo portal ou pelo WhatsApp. Os que pedem ação aparecem no Dashboard.</p>')}</div>`;
};


/* contratos incluídos como já ativos não cobram documentos/dados da esteira */
const pendOrig = pend;
pend = function(pid, papel){
  const ps=D.partes.filter(x=>x.pessoa_id===pid);
  if(ps.length && ps.every(x=>{ const c=D.contratos.find(k=>k.id===x.contrato_id); return c && (c.situacao||{}).importado; })) return [];
  return pendOrig(pid, papel);
};


/* ---------- WhatsApp: toda notificação abre a conversa já com a mensagem ---------- */
const waNum = tel => { let d=String(tel||'').replace(/\D/g,''); if(d.length>=12 && d.startsWith('55')) return d; if(d.length===10||d.length===11) return '55'+d; return null; };
const waUrl = (tel, msg) => { const n=waNum(tel); return n ? `https://wa.me/${n}?text=${encodeURIComponent(msg||'')}` : null; };
const waBtn = (tel, msg, rot='WhatsApp', cls='btn sm') => { const u=waUrl(tel,msg);
  return u ? `<a class="${cls}" style="text-decoration:none;color:#fff;background:#25D366;border-color:#25D366" target="_blank" rel="noopener" href="${esc(u)}">💬 ${esc(rot)}</a>`
           : `<span class="pill p-mute" title="Cadastre o celular para enviar pelo WhatsApp">💬 sem celular</span>`; };
window.waBtn = waBtn; window.waUrl = waUrl;
const primeiro = n => String(n||'').trim().split(' ')[0];
const parteDe = (cid, pid) => D.partes.find(x=>x.contrato_id===cid && x.pessoa_id===pid);
function msgParte(c, x){
  const p=P(x.pessoa_id), im=imvDe(c), link=linkPortal(x.token), oi=`Olá${p.nome?', '+primeiro(p.nome):''}! Aqui é da Citihaus 🧡`;
  const falta=pend(x.pessoa_id,x.papel), redo=Object.values(D.docs[x.pessoa_id]||{}).filter(o=>o.status==='refazer');
  const ped = (falta.length?`\n\nFalta enviar: ${falta.join(', ')}.`:'') + (redo.length?`\nPrecisamos que reenvie: ${redo.map(o=>(DOC[o.tipo]||o.tipo)+(o.obs?' ('+o.obs+')':'')).join('; ')}.`:'');
  const d=dsc(c);
  if(d && d.etapa<4) return `${oi}\nSobre a desocupação do ${im.titulo}: estamos na etapa “${DE[d.etapa]}”${d.saida_prevista?', com saída prevista para '+dataBR(d.saida_prevista):''}.${d.etapa===1&&d.vistoria?' A vistoria de saída está marcada para '+dataBR(d.vistoria)+'.':''}\nAcompanhe pelo portal: ${link}`;
  if(d) return `${oi}\nO contrato do ${im.titulo} foi encerrado em ${dataBR(d.encerrado_em)}. Obrigado pela parceria!`;
  if(c.etapa===0) return msgWhats(c,x) + ped;
  if(c.etapa===6) return `${oi}\nSeu contrato do ${im.titulo} está ativo ✅. Pelo portal você abre chamados e acompanha tudo: ${link}`;
  const ce=CLIENTE_ETAPAS[c.etapa]||[ETAPAS[c.etapa],''];
  return `${oi}\nAtualização da locação do ${im.titulo}: agora estamos em “${ce[0]}”. ${ce[1]}.${ped}\n\nAcompanhe pelo portal: ${link}`;
}
const parteWaOrig = parteHtml;
parteHtml = function(c, x){
  const h=parteWaOrig(c, x), p=P(x.pessoa_id);
  return h.replace(`<button class="btn sm" data-copyp="${x.id}">`, waBtn(p.telefone, msgParte(c,x), 'Enviar no WhatsApp') + `<button class="btn sm" data-copyp="${x.id}">`);
};
const chDrawerWaOrig = chDrawer;
chDrawer = function(h){
  const out=chDrawerWaOrig(h), p=P(h.pessoa_id), x=parteDe(h.contrato_id, h.pessoa_id);
  const msg=`Olá${p.nome?', '+primeiro(p.nome):''}! Aqui é da Citihaus 🧡\nSobre o seu chamado ${h.protocolo} (${h.titulo}): `+(x?`\n\nVocê acompanha e responde por aqui: ${linkPortal(x.token)}`:'');
  return out.replace('<div class="d-body">', `<div class="d-body"><div class="row" style="gap:8px">${waBtn(p.telefone, msg, 'Falar com '+(primeiro(p.nome)||'o cliente')+' no WhatsApp')}</div>`);
};
const modalWaOrig = modalHtml;
modalHtml = function(){
  const h=modalWaOrig(), m=S.modal;
  if(m && m.tipo==='pronto' && m.texto){ const t=(m.texto.match(/Celular:\s*([^\n]+)/)||[])[1];
    if(t) return h.replace('<button type="button" class="btn pri" data-copytxt=', waBtn(t, m.texto, 'Enviar no WhatsApp', 'btn')+'<button type="button" class="btn pri" data-copytxt='); }
  return h;
};
function msgDesoc(c, papel){
  const d=dsc(c), im=imvDe(c), x=partesDe(c).find(k=>k.papel===papel); if(!x) return null; const p=P(x.pessoa_id), oi=`Olá${p.nome?', '+primeiro(p.nome):''}! Aqui é da Citihaus 🧡\n`;
  const prev=d.saida_prevista?dataBR(d.saida_prevista):'a combinar';
  const T = papel==='inquilino' ? [
    `Recebemos seu aviso de saída do ${im.titulo}. A saída está prevista para ${prev}. Em breve vamos agendar a vistoria de saída com você.`,
    `A vistoria de saída do ${im.titulo} ${d.vistoria?'está marcada para '+dataBR(d.vistoria):'precisa ser agendada. Qual o melhor dia e horário para você?'}. O imóvel precisa estar vazio e limpo, nas mesmas condições da vistoria de entrada.`,
    `Estamos fazendo o acerto final do ${im.titulo}${d.acerto?': valor de '+brl(num(d.acerto)):''}. Lembre de enviar as contas finais quitadas de energia, água e gás.`,
    `Tudo pronto para a entrega das chaves do ${im.titulo}. Vamos combinar o dia para você devolver as chaves e assinar o termo de entrega?`,
    `As chaves do ${im.titulo} foram devolvidas e o contrato foi encerrado. Obrigado por ter sido nosso cliente!`]
  : [
    `O inquilino do ${im.titulo} avisou a saída, prevista para ${prev}. Vamos cuidar da vistoria de saída e do acerto, e mantemos você informado.`,
    `A vistoria de saída do ${im.titulo} ${d.vistoria?'está marcada para '+dataBR(d.vistoria):'será agendada nos próximos dias'}. Depois enviamos o laudo comparando com a vistoria de entrada.`,
    `Estamos no acerto final do ${im.titulo} (reparos, contas e aluguel proporcional). Assim que fechar, enviamos o resumo para você.`,
    `As chaves do ${im.titulo} estão sendo devolvidas pelo inquilino. Logo o imóvel estará liberado.`,
    `O ${im.titulo} foi desocupado e as chaves estão com a Citihaus. Já podemos anunciar para uma nova locação. Vamos conversar?`];
  return {tel:p.telefone, txt: oi+T[Math.min(d.etapa,4)], nome:primeiro(p.nome)||papel};
}

function comDest(m){ const ps=D.partes.filter(x=>m.publico==='todos'||m.publico===x.papel||(m.publico==='parte'&&x.id===m.parte_id)||(m.publico==='varios'&&(m.parte_ids||[]).includes(x.id)));
  const vistos=new Set(); return ps.filter(x=>{ if(vistos.has(x.pessoa_id)) return false; vistos.add(x.pessoa_id); return true; }); }
function comWaModal(){ const m=(D.comunicados||[]).find(k=>k.id===S.dModal.m); if(!m) return ''; const L=comDest(m);
  return `<div class="ov center"><div class="modal" style="width:min(560px,calc(100% - 32px))"><div class="m-h"><span class="mono" style="color:var(--accent-ink)">Mensagens</span><h2 style="font-size:19px;margin-top:4px">💬 Enviar “${esc(m.titulo)}” pelo WhatsApp</h2>
    <p class="muted" style="margin:4px 0 0;font-size:12.5px">Cada botão abre a conversa com a mensagem pronta. ${L.length} pessoa${L.length===1?'':'s'}.</p></div>
    <div class="m-b" style="display:block">${L.map(x=>{ const p=P(x.pessoa_id), txt=`Olá${p.nome?', '+primeiro(p.nome):''}! ${m.titulo}\n\n${m.texto}\n\nCitihaus 🧡 · ${linkPortal(x.token)}`;
      return `<div class="row between" style="padding:8px 0;border-bottom:1px solid var(--line);gap:8px"><div><b>${esc(p.nome||'Sem nome')}</b><div class="muted" style="font-size:12px">${esc(PAPEL[x.papel])}${p.telefone?' · '+esc(p.telefone):''}</div></div>${waBtn(p.telefone, txt, 'Enviar')}</div>`; }).join('')||'<div class="empty">Ninguém recebe esta mensagem.</div>'}</div>
    <div class="m-f"><button type="button" class="btn" data-dmclose="1">Fechar</button></div></div></div>`; }

/* ---------- Configuração: acessos por pessoa ---------- */
function configHtml(){
  const eq=(D.eqAll||[]).filter(e=>e.papel!=='admin'), abas=Object.keys(ABA_NOME);
  return `<div class="head" style="margin-top:30px"><div><h1 style="font-size:20px">🔐 O que cada pessoa vê</h1><p>Desmarque para esconder uma aba da pessoa. Salva na hora; ela vê a mudança ao atualizar a página. Administradores veem tudo.</p></div></div>
  <div class="tbl-wrap"><table style="min-width:${180+abas.length*96}px"><thead><tr><th>Pessoa</th>${abas.map(a=>`<th style="text-align:center">${ABA_NOME[a]}</th>`).join('')}</tr></thead><tbody>
  ${eq.length?eq.map(e=>`<tr><td><b>${esc(e.nome)}</b><div class="muted" style="font-size:12px">Corretor</div></td>${abas.map(a=>{ const on=(e.acessos||{})[a]!==false;
    return `<td style="text-align:center"><input type="checkbox" data-acesso="${e.user_id}|${a}" ${on?'checked':''} style="width:20px;height:20px;accent-color:var(--accent)" aria-label="${esc(e.nome)}: ${ABA_NOME[a]}"></td>`; }).join('')}</tr>`).join('')
    :`<tr><td colspan="${abas.length+1}" class="muted">Nenhum corretor cadastrado ainda. Crie o acesso acima em “+ Novo acesso”.</td></tr>`}
  </tbody></table></div>`;
}

/* ---------- link do proprietário dentro da captação ---------- */
const linkImovel = c => location.origin + location.pathname.replace(/[^/]*$/,'') + 'imovel.html?t=' + c.prop_token;
function boxLinkProp(c){
  const p=P(c.proprietario_id), link=linkImovel(c), nome=(p.nome||'').split(' ')[0];
  const msg=`Olá${nome?', '+nome:''}! Aqui é da Citihaus 🧡 Pelo link abaixo você mesmo preenche os dados do seu imóvel e envia as fotos, sem precisar de senha:\n${link}`;
  const tel=String(p.telefone||'').replace(/\D/g,'').replace(/^55/,'');
  return `<div class="sec box" id="cap-linkprop" style="background:var(--accent-soft);border-color:var(--accent)"><div class="row between" style="margin-bottom:6px"><h3 style="margin:0">🔗 Link do imóvel para o proprietário</h3>${c.prop_atualizado?`<span class="pill p-ok">Preenchido por ele em ${dtBR(c.prop_atualizado)}</span>`:'<span class="pill p-mute">Ainda não abriu</span>'}</div>
    <p class="muted" style="margin:0 0 8px;font-size:12.5px">O proprietário preenche a ficha e sobe as fotos por um único link, sem senha. Tudo cai aqui nesta captação. O link para de funcionar quando o imóvel é publicado.</p>
    <div class="linkbox"><code>${esc(link)}</code><button class="btn sm" data-copytxt="${esc(msg)}">Copiar mensagem</button>${tel?`<a class="btn sm" style="text-decoration:none;color:inherit" target="_blank" rel="noopener" href="https://wa.me/55${tel}?text=${encodeURIComponent(msg)}">💬 Enviar no WhatsApp</a>`:''}<a class="btn sm ghost" href="${esc(link)}" target="_blank" rel="noopener">Ver como ele vê</a></div></div>`;
}

/* ---------- render ---------- */
const renderOrig = render;
render = function(){
  if(S.me && !pode(S.tab)) S.tab = (ABAS.map(a=>a[0]).find(pode)) || 'contratos';
  if(S.tab==='ativos' || S.tab==='chamados') S.tab='contratos';
  renderOrig();
  if(!S.me) return;
  const nav=document.querySelector('nav.sub'); if(!nav) return;
  if(!nav.querySelector('[data-tab="dashboard"]')) nav.insertAdjacentHTML('afterbegin', '<button data-tab="dashboard">📊 Dashboard</button>');
  const at=nav.querySelector('[data-tab="ativos"]'); if(at) at.remove();
  const chb=nav.querySelector('[data-tab="chamados"]'); if(chb) chb.remove();
  const ctb=nav.querySelector('[data-tab="contratos"]'), nab=D.chamados.filter(h=>h.status!=='resolvido').length;
  if(ctb && nab && !ctb.querySelector('.tabn')) ctb.insertAdjacentHTML('beforeend', `<span class="tabn" title="${nab} chamado(s) em aberto">${nab}</span>`);
  const ac=nav.querySelector('[data-tab="acessos"]'); if(ac) ac.textContent='⚙ Configuração';
  ABAS.forEach(([k])=>{ const b=nav.querySelector(`[data-tab="${k}"]`); if(!b) return; if(!pode(k)) b.remove(); else nav.appendChild(b); });
  nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.tab===S.tab));
  const w=document.querySelector('#app .wrap');
  if(S.tab==='dashboard'){ [...w.children].forEach(ch=>{ if(ch!==nav) ch.remove(); }); w.insertAdjacentHTML('beforeend', dashHtml()); }
  if(S.tab==='acessos' && isAdm()){
    const h1=w.querySelector('.head h1'); if(h1 && h1.textContent==='Acessos da equipe') h1.textContent='⚙ Configuração · Acessos da equipe';
    w.insertAdjacentHTML('beforeend', configHtml()); }
  const dr=document.getElementById('cap-drawer'), c=S.capOpen && (D.captacoes||[]).find(k=>k.id===S.capOpen);
  if(dr && c && c.prop_token && c.etapa<5 && !document.getElementById('cap-linkprop')){
    const ref=dr.querySelector('.d-body > .sec.box'); if(ref) ref.insertAdjacentHTML('beforebegin', boxLinkProp(c)); }
  if(S.tab==='mensagens') document.querySelectorAll('#app [data-msgdel]').forEach(b=>{ if(!b.previousElementSibling || !b.previousElementSibling.dataset.comwa) b.insertAdjacentHTML('beforebegin', `<button class="btn sm" data-comwa="${b.dataset.msgdel}" style="margin-right:6px">💬 WhatsApp</button>`); });
  if(S.dModal) layer.insertAdjacentHTML('beforeend', dModalHtml());
};

/* ---------- eventos ---------- */
document.addEventListener('click', e=>{
  const b=e.target.closest('button'); if(!b) return; const d=b.dataset;
  if(d.tab && d.tab!=='acessos' && !pode(d.tab)){ e.stopImmediatePropagation(); return toast('Aba desligada para o seu usuário'); }
  if(d.dscroll){ e.stopImmediatePropagation(); const t=document.getElementById(d.dscroll); if(t) t.scrollIntoView({behavior:'smooth'}); return; }
  if(d.comwa){ e.stopImmediatePropagation(); S.dModal={tipo:'comwa', m:d.comwa}; return render(); }
  if(d.dativo){ e.stopImmediatePropagation(); S.open=null; S.dModal={tipo:'ativo', gar:'Fiador'}; return render(); }
  if(d.dvenda){ e.stopImmediatePropagation(); S.dModal={tipo:'venda'}; return render(); }
  if(d.dmetas){ e.stopImmediatePropagation(); S.dModal={tipo:'metas'}; return render(); }
  if(d.dmclose){ e.stopImmediatePropagation(); S.dModal=null; return render(); }
  if(d.dvdel){ e.stopImmediatePropagation(); if(S.dvDel!==d.dvdel){ S.dvDel=d.dvdel; return render(); } S.dvDel=null;
    return acao(async()=>{ await q(sb.from('vendas').delete().eq('id',d.dvdel)); }, 'Venda excluída'); }
}, true);
document.addEventListener('change', e=>{
  const el=e.target;
  if(el.id==='d-mes'||el.id==='d-ano'){ e.stopImmediatePropagation(); S.dMes=+document.getElementById('d-mes').value; S.dAno=+document.getElementById('d-ano').value; return render(); }
  if(el.id==='da-imv' || el.id==='da-gar'){ e.stopImmediatePropagation(); const f=el.form, keep={};
    f.querySelectorAll('input').forEach(i=>keep[i.id]=i.value);
    S.dModal=Object.assign({}, S.dModal, el.id==='da-imv'?{imv:el.value}:{gar:el.value}); render();
    const nf=document.getElementById('f-dativo'); if(nf) Object.entries(keep).forEach(([k,v])=>{ const i=nf.querySelector('#'+k); if(i && v && !(el.id==='da-imv' && /^da-(pro|alu)/.test(k))) i.value=v; });
    const sel=document.getElementById('da-cor'); return; }
  if(el.id==='dv-cap'){ e.stopImmediatePropagation(); const c=(D.captacoes||[]).find(k=>k.id===el.value); if(!c) return; const f=c.ficha||{};
    const im=document.getElementById('dv-imv'), v=document.getElementById('dv-val'), cor=document.getElementById('dv-cor');
    if(im) im.value=[f.categoria, f.condominio||f.bairro].filter(Boolean).join(' · ')||('CAP-'+c.numero);
    if(v && f.valor_venda) v.value=f.valor_venda; if(cor && c.corretor) [...cor.options].forEach(o=>{ if(o.value===c.corretor) o.selected=true; }); return; }
  if(el.dataset && el.dataset.acesso){ e.stopImmediatePropagation(); const [uid,aba]=el.dataset.acesso.split('|'), pe=(D.eqAll||[]).find(x=>x.user_id===uid); if(!pe) return;
    const ac=Object.assign({}, pe.acessos||{}); if(el.checked) delete ac[aba]; else ac[aba]=false;
    (async()=>{ try{ await q(sb.rpc('admin_equipe_acessos',{p_user:uid, p_acessos:ac})); pe.acessos=ac; toast(`${pe.nome}: ${ABA_NOME[aba]} ${el.checked?'liberada':'escondida'}`); }catch(err){ el.checked=!el.checked; falha(err); } })(); }
}, true);
document.addEventListener('submit', e=>{
  const f=e.target, g=id=>{ const x=f.querySelector('#'+id); return x?x.value.trim():''; };
  if(f.id==='f-dativo'){ e.preventDefault(); e.stopImmediatePropagation();
    const pes=pre=>({nome:g(pre+'-nome'), telefone:g(pre+'-tel'), email:g(pre+'-email')});
    const p={imovel_id:g('da-imv')||null, imovel:{titulo:g('da-tit'), endereco:g('da-end'), bairro:g('da-bai'), tipo:g('da-tipo')},
      proprietario:pes('da-pro'), inquilino:pes('da-inq'), fiador:f.querySelector('#da-fia-nome')?pes('da-fia'):null,
      aluguel:num(g('da-alu')), garantia:g('da-gar'), entrada:g('da-ent')||null, fim:g('da-fim')||null, seguro_venc:g('da-seg')||null, corretor:g('da-cor'), numero:g('da-num')||null};
    if(!p.aluguel) return toast('Informe o valor do aluguel');
    return acao(async()=>{ const cid=await q(sb.rpc('equipe_contrato_ativo',{p})); S.dModal=null; S.tab='contratos'; S.open=cid; }, 'Contrato ativo incluído ✅'); }
  if(f.id==='f-dvenda'){ e.preventDefault(); e.stopImmediatePropagation();
    const valor=num(g('dv-val')); if(!valor) return toast('Informe o valor da venda');
    return acao(async()=>{ await q(sb.from('vendas').insert({captacao_id:g('dv-cap')||null, imovel:g('dv-imv'), valor, data:g('dv-data'), corretor:g('dv-cor'), comissao:num(g('dv-com'))||null, obs:g('dv-obs')||null, criado_por:S.me.nome}));
      if(g('dv-cap')) await q(sb.from('captacao_hist').insert({captacao_id:g('dv-cap'), texto:'Venda registrada por '+S.me.nome+': '+brl(valor)}));
      S.dModal=null; }, 'Venda registrada 🎉'); }
  if(f.id==='f-dmetas'){ e.preventDefault(); e.stopImmediatePropagation(); const M=S.dMes, A=S.dAno, rep=f.querySelector('#mt-rep').checked;
    const rows=[]; const add=(mes,tipo,cor,id)=>rows.push({ano:A, mes, tipo, corretor:cor, valor:num(g(id))});
    const meses=rep?[1,2,3,4,5,6,7,8,9,10,11,12]:[M];
    meses.forEach(m=>{ add(m,'captacoes','','mt-cap'); add(m,'locacoes','','mt-loc'); add(m,'vendas_valor','','mt-vv'); add(m,'vendas_qtd','','mt-vq');
      (D.eqAll||[]).forEach((x,i)=>add(m,'captacoes',x.nome,'mt-c'+i)); });
    add(0,'vendas_valor','','mt-avv'); add(0,'vendas_qtd','','mt-avq'); add(0,'captacoes','','mt-acap');
    return acao(async()=>{ await q(sb.from('metas').upsert(rows,{onConflict:'ano,mes,tipo,corretor'})); S.dModal=null; }, 'Metas salvas 🎯'); }
}, true);
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && S.dModal){ S.dModal=null; render(); } });

/* ---------- Desocupação (saída do inquilino) ---------- */
const DE = ['Aviso de saída','Vistoria de saída','Reparos e acerto','Entrega das chaves','Encerrado'];
const DE_DESC = ['Aviso recebido e multa calculada','Vistoria comparada com a de entrada','Reparos, contas e acerto final','Chaves e termo de entrega','Imóvel liberado'];
const DE_IC = ['📣','🔍','🧾','🔑','✅'];
const DE_TAR = {
  0:['Aviso de saída recebido por escrito','Multa rescisória calculada (se houver)','Proprietário avisado da saída'],
  1:['Vistoria de saída agendada','Vistoria realizada e comparada com a de entrada'],
  2:['Orçamento de reparos feito ou dispensado','Contas de consumo quitadas e desligadas (energia, água, gás)','Aluguel proporcional, condomínio e IPTU acertados','Garantia liberada (caução, seguro fiança ou fiador)'],
  3:['Chaves devolvidas','Termo de entrega de chaves assinado']
};
const MOTIVOS = ['Fim do contrato','Rescisão pelo inquilino','Rescisão pelo proprietário','Inadimplência / despejo','Venda do imóvel','Outro'];
const dsc = c => (c.situacao||{}).desocupacao || null;
function emDesoc(c){ const d=dsc(c); return !!d && d.etapa<4; }
function encerrado(c){ const d=dsc(c); return !!d && d.etapa>=4; }
const desocFalta = (c, et) => { const d=dsc(c)||{}, t=d.tarefas||{}; et = et===undefined ? d.etapa : et; return (DE_TAR[et]||[]).filter((x,i)=>!t[et+'-'+i]); };
function ativosSemDesoc(){
  const all=D.contratos; let h='';
  try{ D.contratos=all.filter(c=>!emDesoc(c) && !encerrado(c)); h=window.ativosHtml?window.ativosHtml():''; } finally { D.contratos=all; }
  return h.replace('<p>Locações em vigor. Os clientes destes contratos usam o portal só para chamados.</p></div>','<p>Locações em vigor. Os clientes destes contratos usam o portal só para chamados.</p></div><button class="btn pri" data-dativo="1">+ Incluir contrato já ativo</button>')
    .replace(/<button class="btn sm" data-open="([^"]+)">Abrir<\/button>/g, (m,id)=>`<button class="btn sm ghost" data-desocini="${id}" title="Iniciar desocupação">🚚 Desocupar</button>`+m);
}
function desocCard(c){
  const d=dsc(c), im=imvDe(c), inq=partesDe(c).find(x=>x.papel==='inquilino'), f=desocFalta(c);
  const prev=d.saida_prevista, dias=prev?Math.ceil((new Date(prev+'T12:00:00')-Date.now())/864e5):null;
  return `<button class="card" data-open="${c.id}">
    <span class="code">${esc(pastaC(c))}</span><h4>${esc(im.titulo)}</h4>
    <div class="meta">${esc(inq?nomeP(P(inq.pessoa_id),'inquilino'):'—')} · ${esc(d.motivo||'')}</div>
    <div class="row between"><span class="meta">Saída prevista</span><span class="meta num">${prev?dataBR(prev):'—'}</span></div>
    <div class="row">${dias!=null?`<span class="pill ${dias<0?'p-bad':dias<=7?'p-warn':'p-mute'}">${dias<0?Math.abs(dias)+' dias atrasada':dias===0?'Sai hoje':'Faltam '+dias+' dias'}</span>`:''}${f.length?`<span class="pill p-mute">${f.length} pendente${f.length>1?'s':''}</span>`:'<span class="pill p-ok">Pronto para avançar</span>'}</div>
  </button>`;
}
function desocHtml(){
  const L=D.contratos.filter(emDesoc), enc=D.contratos.filter(encerrado).sort((a,b)=>String(dsc(b).encerrado_em||'').localeCompare(String(dsc(a).encerrado_em||'')));
  return `<div class="head"><div><h1>🚚 Desocupação</h1><p>Do aviso de saída até a entrega das chaves. Para começar, clique em “🚚 Desocupar” no contrato ativo.</p></div></div>
  <div class="board-scroll"><div class="board">
  ${DE.slice(0,4).map((e,i)=>{ const cs=L.filter(c=>dsc(c).etapa===i);
    return `<section class="col"><div class="col-h"><div><h3>${DE_IC[i]} ${e}</h3><small>${DE_DESC[i]}</small></div><span class="count">${cs.length}</span></div>
    ${cs.length?cs.map(desocCard).join(''):'<div class="empty">Nenhum contrato aqui</div>'}</section>`; }).join('')}
  </div></div>
  ${enc.length?`<details style="margin-bottom:24px"><summary style="cursor:pointer;font-weight:600">✅ Contratos encerrados (${enc.length})</summary>
    <div class="tbl-wrap" style="margin-top:10px"><table><thead><tr><th>Nº</th><th>Imóvel</th><th>Motivo</th><th>Saída</th><th>Acerto</th><th></th></tr></thead><tbody>
    ${enc.map(c=>{ const d=dsc(c); return `<tr><td class="mono">${c.numero}</td><td><b>${esc(imvDe(c).titulo)}</b></td><td>${esc(d.motivo||'')}</td><td class="num">${dataBR(d.encerrado_em||d.saida_prevista)}</td><td class="num">${d.acerto?brl(num(d.acerto)):'—'}</td><td><button class="btn sm" data-open="${c.id}">Abrir</button></td></tr>`; }).join('')}
    </tbody></table></div></details>`:''}`;
}
function desocSecao(c){
  const d=dsc(c); if(!d) return `<div class="sec"><div class="row between"><h3 style="margin:0">🚚 Desocupação</h3><button class="btn sm" data-desocini="${c.id}">Iniciar desocupação</button></div></div>`;
  const t=d.tarefas||{}, f=desocFalta(c), adm=isAdm();
  const passos=DE.map((e,i)=>`<div style="flex:1;height:6px;border-radius:99px;background:${d.etapa>i?'var(--ok)':d.etapa===i?'var(--accent)':'var(--line)'}" title="${e}"></div>`).join('');
  const gate = d.etapa>=4 ? `<div class="gate yes"><div class="gt"><b>Contrato encerrado em ${dataBR(d.encerrado_em)}.</b><br>O imóvel voltou para “Disponível”.</div></div>`
    : `<div class="gate ${f.length?'no':'yes'}"><div class="gt">${f.length?`<b>Para sair de “${DE[d.etapa]}”, falta:</b><ul>${f.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:`<b>Tudo certo em “${DE[d.etapa]}”.</b>`}</div>
      ${f.length?(adm?`<button class="btn" style="border-color:var(--bad);color:var(--bad)" data-desocadv="${c.id}|1">${S.desocForce===c.id?'Confirmar: avançar com pendências':'Avançar mesmo assim'}</button>`:''):`<button class="btn pri" data-desocadv="${c.id}|0">${d.etapa===3?'Encerrar contrato ✅':'Avançar para '+DE[d.etapa+1]+' →'}</button>`}</div>`;
  return `<div class="sec box" id="desoc-box" style="border-color:var(--amber)"><div class="row between" style="margin-bottom:8px"><h3 style="margin:0">🚚 Desocupação · ${DE_IC[Math.min(d.etapa,4)]} ${DE[Math.min(d.etapa,4)]}</h3><span class="pill p-acc">${esc(d.motivo||'')}</span></div>
    <div style="display:flex;gap:4px;margin-bottom:12px">${passos}</div>
    ${gate}
    <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><span class="muted" style="font-size:12.5px">Avisar sobre esta etapa:</span>${['inquilino','proprietario'].map(pp=>{ const mm=msgDesoc(c,pp); return mm?waBtn(mm.tel, mm.txt, (pp==='inquilino'?'Inquilino':'Proprietário')+' · '+mm.nome):''; }).join('')}</div>
    <form id="f-desoc" data-c="${c.id}" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;align-items:end;margin-top:12px">
      <label class="f">Aviso recebido em<input id="ds-aviso" type="date" value="${esc(d.aviso||'')}"></label>
      <label class="f">Saída prevista<input id="ds-saida" type="date" value="${esc(d.saida_prevista||'')}"></label>
      <label class="f">Vistoria de saída<input id="ds-vist" type="date" value="${esc(d.vistoria||'')}"></label>
      <label class="f">Multa rescisória (R$)<input id="ds-multa" inputmode="decimal" value="${esc(d.multa||'')}"></label>
      <label class="f">Valor do acerto final (R$)<input id="ds-acerto" inputmode="decimal" value="${esc(d.acerto||'')}" placeholder="+ a receber / − a devolver"></label>
      <label class="f" style="grid-column:1/-1">Observações<input id="ds-obs" value="${esc(d.obs||'')}" placeholder="Ex.: pintura por conta do inquilino, chave do portão faltando"></label>
      <button class="btn" type="submit">Salvar dados</button></form>
    ${[0,1,2,3].map(et=>`<div style="margin-top:12px"><div style="font-size:12.5px;font-weight:700;color:${et===d.etapa?'var(--accent-ink)':'var(--muted)'};margin-bottom:6px">${DE_IC[et]} ${DE[et]}</div><div style="display:grid;gap:6px">
      ${DE_TAR[et].map((x,i)=>`<label class="task"><input type="checkbox" data-desoctar="${c.id}|${et}-${i}" ${t[et+'-'+i]?'checked':''}> ${esc(x)}</label>`).join('')}</div></div>`).join('')}
    ${d.etapa<4&&adm?`<div class="row" style="justify-content:flex-end;margin-top:10px"><button class="btn sm ghost" style="color:var(--bad)" data-desoccancel="${c.id}">${S.desocCancel===c.id?'Confirmar: cancelar desocupação':'Cancelar desocupação'}</button></div>`:''}
  </div>`;
}
const drawerDesocOrig = drawer;
drawer = function(c){
  const h=drawerDesocOrig(c);
  if(c.etapa!==6) return h;
  return h.replace('<div class="d-body">', '<div class="d-body">'+desocSecao(c));
};
async function salvarDesoc(c, patch, logTxt){
  const sit=Object.assign({}, c.situacao||{}); sit.desocupacao=Object.assign({}, sit.desocupacao||{}, patch);
  await q(sb.from('contratos').update({situacao:sit}).eq('id',c.id)); c.situacao=sit;
  if(logTxt) await log(c.id, logTxt);
}
function desocModal(){ const c=D.contratos.find(k=>k.id===S.dModal.c); if(!c) return '';
  return `<div class="ov center"><form class="modal" id="f-desocini" data-c="${c.id}">
    <div class="m-h"><span class="mono" style="color:var(--accent-ink)">${esc(pastaC(c))}</span><h2 style="font-size:19px;margin-top:4px">🚚 Iniciar desocupação</h2><p class="muted" style="margin:4px 0 0;font-size:12.5px">${esc(imvDe(c).titulo)}</p></div>
    <div class="m-b">
      <label class="f full">Motivo<select id="di-mot">${MOTIVOS.map(m=>`<option>${m}</option>`).join('')}</select></label>
      <label class="f">Aviso recebido em<input id="di-aviso" type="date" value="${new Date().toISOString().slice(0,10)}"></label>
      <label class="f">Saída prevista<input id="di-saida" type="date"></label>
      <label class="f full">Observação<input id="di-obs" placeholder="Ex.: avisou por WhatsApp, vai sair no fim do mês"></label>
      <div class="note full">O contrato sai de “Ativos” e vai para o kanban de Desocupação. Ao encerrar, o imóvel volta para “Disponível”.</div>
    </div>
    <div class="m-f"><button type="button" class="btn" data-dmclose="1">Cancelar</button><button class="btn pri" type="submit">Iniciar desocupação</button></div></form></div>`;
}
document.addEventListener('click', e=>{
  const b=e.target.closest('button'); if(!b) return; const d=b.dataset;
  if(d.desocini){ e.stopImmediatePropagation(); S.open=null; S.dModal={tipo:'desoc', c:d.desocini}; return render(); }
  if(d.desocadv){ e.stopImmediatePropagation(); const [id,fz]=d.desocadv.split('|'), c=D.contratos.find(k=>k.id===id), ds=dsc(c), f=desocFalta(c);
    if(fz==='1' && S.desocForce!==id){ S.desocForce=id; return render(); } S.desocForce=null;
    const nova=ds.etapa+1, patch={etapa:nova}; if(nova===4) patch.encerrado_em=new Date().toISOString().slice(0,10);
    return acao(async()=>{ await salvarDesoc(c, patch, (nova===4?'Contrato encerrado (desocupação concluída)':'Desocupação: avançou para '+DE[nova])+' por '+S.me.nome+(f.length?' com pendências: '+f.join('; '):''));
      if(nova===4) await q(sb.from('imoveis').update({status:'Disponível'}).eq('id',c.imovel_id)); }, nova===4?'Contrato encerrado ✅ Imóvel disponível de novo':'Desocupação em '+DE[nova]); }
  if(d.desoccancel){ e.stopImmediatePropagation(); const c=D.contratos.find(k=>k.id===d.desoccancel);
    if(S.desocCancel!==c.id){ S.desocCancel=c.id; return render(); } S.desocCancel=null;
    return acao(async()=>{ const sit=Object.assign({}, c.situacao||{}); delete sit.desocupacao; await q(sb.from('contratos').update({situacao:sit}).eq('id',c.id)); await log(c.id,'Desocupação cancelada por '+S.me.nome+' (contrato segue ativo)'); }, 'Desocupação cancelada'); }
}, true);
document.addEventListener('change', e=>{
  const el=e.target; if(!el.dataset || !el.dataset.desoctar) return; e.stopImmediatePropagation();
  const [id,k]=el.dataset.desoctar.split('|'), c=D.contratos.find(x=>x.id===id), t=Object.assign({}, (dsc(c)||{}).tarefas||{}); t[k]=el.checked;
  (async()=>{ try{ await salvarDesoc(c, {tarefas:t}); toast('Salvo ✓'); render(); }catch(err){ falha(err); } })();
}, true);
document.addEventListener('submit', e=>{
  const f=e.target, g=id=>{ const x=f.querySelector('#'+id); return x?x.value.trim():''; };
  if(f.id==='f-desocini'){ e.preventDefault(); e.stopImmediatePropagation(); const c=D.contratos.find(k=>k.id===f.dataset.c);
    return acao(async()=>{ await salvarDesoc(c, {etapa:0, motivo:g('di-mot'), aviso:g('di-aviso')||null, saida_prevista:g('di-saida')||null, obs:g('di-obs'), tarefas:{}, iniciado_em:new Date().toISOString()},
      'Desocupação iniciada por '+S.me.nome+' · '+g('di-mot')+(g('di-saida')?' · saída prevista '+dataBR(g('di-saida')):''));
      S.dModal=null; S.tab='contratos'; S.open=c.id; }, 'Desocupação iniciada 🚚'); }
  if(f.id==='f-desoc'){ e.preventDefault(); e.stopImmediatePropagation(); const c=D.contratos.find(k=>k.id===f.dataset.c);
    return acao(async()=>{ await salvarDesoc(c, {aviso:g('ds-aviso')||null, saida_prevista:g('ds-saida')||null, vistoria:g('ds-vist')||null, multa:g('ds-multa'), acerto:g('ds-acerto'), obs:g('ds-obs')}); }, 'Dados da desocupação salvos'); }
}, true);

if(S.me) carregar().then(render).catch(()=>{});
})();
