/* Citihaus+ · portal único do cliente: todos os imóveis da pessoa, linha do tempo, anúncio, visitas, propostas, chamados e dados */
(function(){
const KEY = 'citihaus_plus';
window.citihausChime = function(){ try{
  const A=window.AudioContext||window.webkitAudioContext; if(!A) return; const ac=new A(), t0=ac.currentTime;
  [[659.25,0],[880,0.12],[1318.5,0.24]].forEach(([f,dt])=>{ const o=ac.createOscillator(), g=ac.createGain(); o.type='sine'; o.frequency.value=f;
    g.gain.setValueAtTime(0.0001,t0+dt); g.gain.exponentialRampToValueAtTime(0.18,t0+dt+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t0+dt+0.55);
    o.connect(g); g.connect(ac.destination); o.start(t0+dt); o.stop(t0+dt+0.6); });
  setTimeout(()=>{ try{ ac.close(); }catch(_){} }, 1400);
}catch(_){} };
function boasVindas(nome){
  let ok=false; try{ ok=sessionStorage.getItem('citihaus_plus_boasvindas')==='1'; sessionStorage.removeItem('citihaus_plus_boasvindas'); }catch(_){}
  if(!ok) return;
  const calmo = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ov=document.createElement('div'); ov.setAttribute('aria-hidden','true');
  ov.style.cssText='position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;background:radial-gradient(circle at 50% 45%,rgba(255,255,255,.97),rgba(253,242,235,.96));transition:opacity .5s';
  ov.innerHTML=`<div style="position:relative;width:120px;height:120px;display:flex;align-items:center;justify-content:center">
      <div class="cp-ring" style="position:absolute;inset:0;border-radius:50%;border:3px solid var(--accent);opacity:.0"></div>
      <img src="${LOGO}" alt="" style="height:44px;width:auto;transform:scale(.6);opacity:0;transition:all .55s cubic-bezier(.2,1.4,.4,1)"></div>
    <div style="font-family:var(--f-display);font-size:26px;font-weight:700;color:var(--accent-ink);opacity:0;transform:translateY(8px);transition:all .45s .25s">Citihaus<span style="color:var(--accent)">+</span></div>
    <div class="muted" style="opacity:0;transition:opacity .4s .45s">Bem-vindo(a)${nome?', '+esc(nome.split(' ')[0]):''} 🧡</div>`;
  document.body.appendChild(ov);
  const st=document.createElement('style'); st.textContent='@keyframes cpRing{0%{transform:scale(.6);opacity:.9}100%{transform:scale(1.6);opacity:0}}@keyframes cpSpark{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--x),var(--y)) scale(.3);opacity:0}}';
  ov.appendChild(st);
  requestAnimationFrame(()=>{ const [img]=ov.getElementsByTagName('img'); img.style.transform='scale(1)'; img.style.opacity='1';
    ov.children[1].style.opacity='1'; ov.children[1].style.transform='none'; ov.children[2].style.opacity='1';
    if(!calmo){ ov.querySelector('.cp-ring').style.animation='cpRing 1s ease-out 2';
      for(let i=0;i<18;i++){ const sp=document.createElement('i'), a=Math.PI*2*i/18, r=90+Math.random()*60;
        sp.style.cssText=`position:absolute;left:50%;top:45%;width:8px;height:8px;border-radius:50%;background:${i%3?'var(--accent)':'var(--amber)'};--x:${Math.cos(a)*r}px;--y:${Math.sin(a)*r}px;animation:cpSpark .9s ${0.15+Math.random()*.2}s ease-out forwards`;
        ov.appendChild(sp); } } });
  setTimeout(()=>{ ov.style.opacity='0'; setTimeout(()=>ov.remove(), 550); }, calmo?900:1700);
}
const ses = () => { try{ return localStorage.getItem(KEY); }catch(_){ return null; } };
const setSes = v => { try{ v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); }catch(_){} };
const base = () => location.origin + location.pathname;
const fotoPub = p => sb.storage.from('fotos').getPublicUrl(p).data.publicUrl;
const brlK = v => { v=Number(v)||0; return v>=1e6 ? 'R$ '+(v/1e6).toLocaleString('pt-BR',{maximumFractionDigits:2})+' mi' : brl(v); };
const numBR = v => { if(v==null||v==='') return 0; const s=String(v).replace(/[^\d,.-]/g,''); return Number(s.includes(',')?s.replace(/\./g,'').replace(',','.'):s)||0; };
const quando = d => { const t=new Date(d); return t.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+' às '+t.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); };
const CAP_ET = ['Atendimento','Informações','Imagens','Descrições','Publicação','Publicado'];
const ST_CH = {aberto:['p-warn','Aberto'], atendimento:['p-info','Em atendimento'], aguardando:['p-acc','Aguardando você'], resolvido:['p-ok','Resolvido']};
const ST_V = {agendada:['p-info','Agendada'], realizada:['p-ok','Realizada'], cancelada:['p-mute','Cancelada'], nao_compareceu:['p-mute','Não compareceu']};
const ST_P = {em_analise:['p-warn','Em análise'], aceita:['p-ok','Aceita'], recusada:['p-mute','Recusada'], contraproposta:['p-info','Contraproposta'], cancelada:['p-mute','Cancelada']};

/* ===================== dentro do link de um contrato (?c=) ===================== */
if(TOKEN){
  let temSenha = null, criada = false;
  (async()=>{ try{ const r=await sb.rpc('portal_tem_senha',{p_token:TOKEN}); temSenha = !!r.data; }catch(_){ temSenha = true; } if(PS.d) portalRender(); })();
  const prOrig = portalRender;
  portalRender = function(){
    prOrig();
    if(ses() && topEl && !topEl.querySelector('[data-plusvoltar]')){
      const b=topEl.querySelector('.brand'); if(b) b.insertAdjacentHTML('afterend', `<a class="btn sm" data-plusvoltar="1" href="${base()}?plus=1" style="text-decoration:none">← Citihaus+</a>`);
    }
    const portal=document.querySelector('.portal'); if(!portal) return;
    if(temSenha===false && !portal.querySelector('#plus-convite')){
      const ref=portal.querySelector('.status-imv')||portal.querySelector('.hello');
      const html = criada
        ? `<div class="box" id="plus-convite" style="border-color:var(--accent);background:var(--accent-soft)"><b>✨ Senha criada!</b> Agora você entra no <b>Citihaus+</b> com seu celular e essa senha. <a class="btn pri sm" style="margin-left:6px;text-decoration:none" href="${base()}?plus=1">Abrir Citihaus+</a></div>`
        : `<form class="box" id="plus-convite" style="border-color:var(--accent);background:var(--accent-soft)">
            <div style="display:flex;gap:10px;align-items:flex-start"><div style="font-size:26px">✨</div><div style="flex:1;min-width:0">
            <b>Crie sua senha do Citihaus+</b><div class="muted" style="font-size:13px;margin:2px 0 10px">Com ela você entra pelo celular e vê todos os seus imóveis com a Citihaus num lugar só, sem precisar deste link.</div>
            <div class="fgrid"><label class="f">Senha (mínimo 6)<input id="pc-s1" type="password" minlength="6" autocomplete="new-password" required></label>
            <label class="f">Repita a senha<input id="pc-s2" type="password" minlength="6" autocomplete="new-password" required></label></div>
            <button class="btn pri" type="submit" style="margin-top:10px">Criar senha</button></div></div></form>`;
      if(ref) ref.insertAdjacentHTML('afterend', html); else portal.insertAdjacentHTML('afterbegin', html);
    }
  };
  document.addEventListener('submit', e=>{
    if(e.target.id!=='plus-convite') return; e.preventDefault(); e.stopImmediatePropagation();
    const a=document.getElementById('pc-s1').value, b=document.getElementById('pc-s2').value;
    if(a.length<6) return toast('A senha precisa ter pelo menos 6 caracteres'); if(a!==b) return toast('As duas senhas não são iguais');
    (async()=>{ try{ const r=await q(sb.rpc('portal_criar_senha',{p_token:TOKEN, p_senha:a})); setSes(r.sessao); criada=true; temSenha=false; document.getElementById('plus-convite').remove(); portalRender(); toast('Senha criada ✨'); }catch(err){ toast(err.message||String(err)); } })();
  }, true);
  return;
}

/* ===================== Citihaus+ (sem token na URL) ===================== */
const X = { d:null, view:'home', capId:null, editar:false, senha:false, carregando:false };
const loginOrig = loginRender;
loginRender = function(msg){
  if(!msg && ses()) return plusInit();
  return loginOrig.apply(this, arguments);
};
async function plusInit(){
  topEl.hidden=true; app.innerHTML='<div class="loading">Abrindo o Citihaus+…</div>';
  try{ X.d = await q(sb.rpc('plus_home',{p_sessao:ses()})); plusRender(); boasVindas((X.d.pessoa||{}).nome); }
  catch(err){ setSes(null); loginOrig(String(err.message||err).includes('Sessão')?'Sua sessão expirou. Entre de novo com seu celular e senha.':'Não conseguimos abrir o Citihaus+. Tente de novo.'); }
}
async function recarregar(){ try{ X.d = await q(sb.rpc('plus_home',{p_sessao:ses()})); plusRender(); }catch(err){ toast(err.message||String(err)); } }

/* ---------- monta os imóveis da pessoa ---------- */
/* etapas reais do sistema (as mesmas da equipe) */
const DES_ET = ['Aviso de saída','Vistoria de saída','Reparos e acerto','Entrega das chaves','Encerrado'];
function etapasDe(it){
  const c=it.contratos[0];
  if(c){ const ds=(c.situacao||{}).desocupacao;
    if(ds) return {nome:'Desocupação', lista:DES_ET, atual:Math.min(ds.etapa,4)};
    return {nome:'Locação', lista:ETAPAS, atual:c.etapa}; }
  if(it.cap) return {nome:'Captação', lista:CAP_ET, atual:it.cap.etapa};
  return null;
}
function itens(){
  const d=X.d, map={}, out=[];
  const pega = k => map[k] || (map[k] = (out.push({k, papeis:new Set(), contratos:[], cap:null, imv:null}), out[out.length-1]));
  d.imoveis.forEach(i=>{ const it=pega('i:'+i.id); it.imv=i; it.papeis.add('proprietario'); });
  d.contratos.forEach(c=>{ const it=pega('i:'+c.imovel_id); it.contratos.push(c); it.papeis.add(c.papel);
    if(!it.imv) it.imv={id:c.imovel_id, titulo:c.imovel, endereco:c.endereco, bairro:c.bairro, tipo:c.tipo, captacao_id:c.captacao_id}; });
  d.captacoes.forEach(cp=>{ const dono=out.find(x=>x.imv && x.imv.captacao_id===cp.id); const it = dono || pega('c:'+cp.id); it.cap=cp; it.papeis.add('proprietario'); });
  out.forEach(it=>{
    const c=it.contratos[0];
    it.et = etapasDe(it);
    it.ordem = c ? (c.etapa===6 ? 3 : 2) : it.cap ? 1 : 0;
    it.titulo = (it.imv&&it.imv.titulo) || [it.cap&&it.cap.ficha.categoria, it.cap&&(it.cap.ficha.condominio||it.cap.ficha.bairro)].filter(Boolean).join(' · ') || 'Seu imóvel';
    it.end = it.imv ? [it.imv.endereco, it.imv.bairro].filter(Boolean).join(' · ') : [it.cap&&it.cap.ficha.endereco, it.cap&&it.cap.ficha.bairro].filter(Boolean).join(' · ');
    it.tipo = (it.imv&&it.imv.tipo) || (it.cap&&it.cap.ficha.categoria) || 'Imóvel';
    it.capa = it.cap && it.cap.fotos[0];
    it.visitas = d.visitas.filter(v=>(it.cap&&v.captacao_id===it.cap.id)||(it.imv&&v.imovel_id===it.imv.id));
    it.propostas = d.propostas.filter(p=>(it.cap&&p.captacao_id===it.cap.id)||(it.imv&&p.imovel_id===it.imv.id));
  });
  return out.sort((a,b)=>b.ordem-a.ordem);
}
function vidaHtml(it){
  const e=it.et; if(!e) return '';
  return `<div style="font-size:11px;font-weight:700;color:var(--muted);margin-top:10px;text-transform:uppercase;letter-spacing:.05em">${esc(e.nome)}</div>
  <div style="display:grid;grid-template-columns:repeat(${e.lista.length},1fr);gap:4px;margin-top:4px">${e.lista.map((n,i)=>{ const done=i<e.atual, now=i===e.atual;
    return `<div title="${esc(n)}"><div style="height:6px;border-radius:99px;background:${done?'var(--ok)':now?'var(--accent)':'var(--line)'}"></div><div style="font-size:10px;margin-top:4px;line-height:1.2;color:${now?'var(--fg)':'var(--muted)'};font-weight:${now?700:500}">${esc(n)}</div></div>`; }).join('')}</div>`;
}
const stTxt = it => { const e=it.et; if(e) return e.lista[e.atual]; return it.imv ? it.imv.status : ''; };
function cardImovel(it){
  const c=it.contratos[0], cp=it.cap, pend=it.propostas.filter(p=>p.status==='em_analise'&&!p.status_prop).length;
  const prox=it.visitas.filter(v=>v.status==='agendada' && new Date(v.quando)>new Date()).length;
  const abertos=it.contratos.reduce((s,x)=>s+(+x.abertos||0),0);
  const valor = c ? brl(c.aluguel)+' <small>/mês</small>' : cp ? (numBR(cp.ficha.valor_venda)?brlK(numBR(cp.ficha.valor_venda)):numBR(cp.ficha.valor_locacao)?brl(numBR(cp.ficha.valor_locacao))+' <small>/mês</small>':'') : it.imv&&it.imv.valor_venda ? brlK(it.imv.valor_venda) : it.imv&&Number(it.imv.aluguel) ? brl(it.imv.aluguel)+' <small>/mês</small>' : '';
  return `<article class="box" style="padding:0;overflow:hidden">
    ${it.capa?`<div style="height:150px;background:#eee url('${esc(fotoPub(it.capa))}') center/cover"></div>`:`<div style="height:64px;background:linear-gradient(120deg,var(--accent),var(--amber))"></div>`}
    <div style="padding:14px 16px">
      <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:6px">${[...it.papeis].map(p=>`<span class="pill p-acc">${esc(PAPEL[p])}</span>`).join('')}<span class="pill p-mute">${esc(it.tipo)}</span>${c?`<span class="pill p-mute">Contrato ${esc(c.numero)}</span>`:''}${cp&&cp.loft_codigo?`<span class="pill p-mute">Anúncio ${esc(cp.loft_codigo)}</span>`:''}</div>
      <h3 style="margin:0;font-size:17px">${esc(it.titulo)}</h3>
      ${it.end?`<div class="muted" style="font-size:13px">${esc(it.end)}</div>`:''}
      <div class="row between" style="margin-top:8px"><b style="font-family:var(--f-display);font-size:17px">${valor}</b><span class="pill ${stTxt(it)==='Ativo'?'p-ok':it.et&&it.et.nome==='Desocupação'?'p-warn':'p-info'}">${esc(stTxt(it))}</span></div>
      ${vidaHtml(it)}
      ${pend||prox||abertos?`<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:10px">${pend?`<span class="pill p-bad">💬 ${pend} proposta${pend>1?'s':''} para responder</span>`:''}${prox?`<span class="pill p-info">🗓️ ${prox} visita${prox>1?'s':''} agendada${prox>1?'s':''}</span>`:''}${abertos?`<span class="pill p-warn">🎫 ${abertos} chamado${abertos>1?'s':''} aberto${abertos>1?'s':''}</span>`:''}</div>`:''}
      <div class="row" style="gap:8px;flex-wrap:wrap;margin-top:12px">
        ${it.contratos.map(x=>`<a class="btn ${it.contratos.length===1?'pri':''} sm" style="text-decoration:none" href="${base()}?c=${esc(x.token)}">${x.etapa===6&&!(x.situacao||{}).desocupacao?'Abrir contrato':'Acompanhar contrato'}${it.contratos.length>1?' '+esc(x.numero):''} →</a>`).join('')}
        ${cp||it.visitas.length||it.propostas.length?`<button class="btn sm ${c?'':'pri'}" data-pcap="${esc(it.k)}">${cp&&cp.etapa<5?'Acompanhar captação':'Anúncio, visitas e propostas'}</button>`:''}
      </div>
    </div></article>`;
}
function homeHtml(){
  const d=X.d, p=d.pessoa||{}, L=itens(), ch=d.chamados||[], abertos=ch.filter(h=>h.status!=='resolvido');
  const docs=d.documentos||[], pendP=d.propostas.filter(x=>x.status==='em_analise'&&!x.status_prop).length;
  return `<section class="hello"><small>Citihaus+</small><h1>Olá${p.nome?', '+esc(p.nome.split(' ')[0]):''} 🧡</h1><p>Tudo dos seus imóveis com a Citihaus, num lugar só.</p>
    <div class="kv"><span>Imóveis <b>${L.length}</b></span><span>Chamados abertos <b>${abertos.length}</b></span>${p.dono?`<span>Propostas para responder <b>${pendP}</b></span>`:''}</div></section>
  <h2 style="font-size:16px;margin:18px 0 10px">🏠 Meus imóveis</h2>
  ${L.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px">${L.map(cardImovel).join('')}</div>`:'<div class="empty">Ainda não há imóveis ligados ao seu cadastro. Fale com a Citihaus.</div>'}
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:14px;margin-top:18px;align-items:start">
    <div class="box"><h2>🎫 Meus chamados</h2>
      ${ch.length?ch.slice(0,8).map(h=>{ const s=ST_CH[h.status]||ST_CH.aberto; return `<a href="${base()}?c=${esc(h.token)}" style="display:flex;justify-content:space-between;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid var(--line);text-decoration:none;color:inherit">
        <div style="min-width:0"><div class="mono" style="font-size:11px;color:var(--muted)">${esc(h.protocolo)} · ${esc(h.imovel)}</div><div style="font-weight:600">${esc(h.titulo)}</div></div><span class="pill ${s[0]}">${s[1]}</span></a>`; }).join('')
        :'<p class="muted" style="margin:0">Nenhum chamado. Para abrir um, entre no contrato do imóvel.</p>'}</div>
    <div class="box"><h2>📂 Meus documentos</h2>
      ${docs.length?docs.map(o=>`<div class="row between" style="padding:7px 0;border-bottom:1px solid var(--line)"><span>${esc(DOC[o.tipo]||o.tipo)}</span><span class="pill ${o.status==='ok'?'p-ok':o.status==='refazer'?'p-bad':'p-info'}">${o.status==='ok'?'Aprovado':o.status==='refazer'?'Enviar de novo':'Em conferência'}</span></div>`).join('')
        :'<p class="muted" style="margin:0">Seus documentos aparecem aqui depois de enviados. Eles valem para todos os seus contratos.</p>'}
      <p class="muted" style="font-size:12px;margin:10px 0 0">Você envia uma vez e a Citihaus reaproveita nos próximos contratos.</p></div>
  </div>`;
}
function capHtml(){
  const it=itens().find(x=>x.k===X.capId); if(!it){ X.view='home'; return homeHtml(); }
  const cp=it.cap, f=cp?cp.ficha:{}, et=cp?cp.etapa:5;
  const ficha=[['Área',f.area_util?f.area_util+' m²':''],['Quartos',f.dormitorios],['Suítes',f.suites],['Vagas',f.vagas],['Venda',numBR(f.valor_venda)?brl(numBR(f.valor_venda)):''],['Aluguel',numBR(f.valor_locacao)?brl(numBR(f.valor_locacao)):'']].filter(x=>x[1]);
  return `<button class="btn sm ghost" data-phome="1" style="margin-bottom:10px">← Meus imóveis</button>
  <section class="hello"><small>${cp?'Captação CAP-'+String(cp.numero).padStart(3,'0'):'Seu imóvel'}${cp&&cp.corretor?' · corretor '+esc(cp.corretor):''}</small><h1 style="font-size:22px">${esc(it.titulo)}</h1><p>${esc(it.end||'')}</p></section>
  ${cp?`<div class="box"><h2>Etapas do seu imóvel</h2><div class="tl">${CAP_ET.map((n,i)=>{ const st=et>i?'done':et===i?'now':''; return `<div class="tl-i ${st}"><div class="dot">${st==='done'?'✓':i+1}</div><div><b>${n}</b><span>${['Primeiro contato com a Citihaus','Ficha completa do imóvel','Fotos profissionais','Texto do anúncio','Envio aos portais','Anúncio publicado'][i]}</span></div></div>`; }).join('')}</div>
    ${cp.link?`<div class="note" style="margin-top:10px">Quer ajudar? <a href="${base().replace(/[^/]*$/,'')}imovel.html?t=${esc(cp.link)}" target="_blank" rel="noopener"><b>Complete a ficha e envie fotos do imóvel</b></a>.</div>`:''}</div>`:''}
  ${cp&&cp.fotos.length?`<div class="box"><h2>📸 Fotos <span class="pill p-acc">${cp.fotos.length}</span></h2><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px">${cp.fotos.slice(0,24).map(p=>`<a href="${esc(fotoPub(p))}" target="_blank" rel="noopener"><img src="${esc(fotoPub(p))}" loading="lazy" alt="" style="width:100%;height:96px;object-fit:cover;border-radius:10px;display:block"></a>`).join('')}</div></div>`:''}
  ${cp&&(cp.titulo||ficha.length)?`<div class="box"><h2>📝 Anúncio</h2>${ficha.length?`<div class="kv" style="margin-bottom:10px;display:flex;flex-wrap:wrap;gap:6px 16px">${ficha.map(x=>`<span>${x[0]} <b>${esc(x[1])}</b></span>`).join('')}</div>`:''}
    ${cp.titulo?`<h3 style="margin:0 0 6px;font-size:16px">${esc(cp.titulo)}</h3><p style="white-space:pre-line;margin:0;font-size:14px">${esc(cp.descricao||'')}</p>`:'<p class="muted" style="margin:0">O texto do anúncio aparece aqui quando estiver aprovado.</p>'}</div>`:''}
  <div class="box"><h2>🗓️ Visitas <span class="pill p-acc">${it.visitas.length}</span></h2>
    ${it.visitas.length?it.visitas.map(v=>{ const s=ST_V[v.status]||ST_V.agendada; return `<div style="padding:9px 0;border-bottom:1px solid var(--line)"><div class="row between"><b>${quando(v.quando)}</b><span class="pill ${s[0]}">${s[1]}</span></div>
      <div class="muted" style="font-size:12.5px">${[v.corretor?'com '+esc(v.corretor):'', v.interesse?'interesse '+'★'.repeat(v.interesse)+'☆'.repeat(5-v.interesse):''].filter(Boolean).join(' · ')}</div>
      ${v.feedback?`<div style="font-size:13.5px;margin-top:4px">“${esc(v.feedback)}”</div>`:''}</div>`; }).join('')
      :'<p class="muted" style="margin:0">Quando a Citihaus agendar visitas, elas aparecem aqui com o retorno de cada uma.</p>'}</div>
  <div class="box"><h2>💬 Propostas <span class="pill p-acc">${it.propostas.length}</span></h2>
    ${it.propostas.length?it.propostas.map(p=>{ const s=ST_P[p.status]||ST_P.em_analise, aberta=p.status==='em_analise'&&!p.status_prop;
      return `<div style="padding:10px 0;border-bottom:1px solid var(--line)"><div class="row between"><b style="font-family:var(--f-display);font-size:17px">${brl(p.valor)}${p.tipo==='Locação'?' <small>/mês</small>':''}</b><span class="pill ${s[0]}">${s[1]}</span></div>
        <div class="muted" style="font-size:12.5px">${esc(p.tipo)} · ${dataBR(p.data)}</div>
        ${p.condicoes?`<div style="font-size:13.5px;margin-top:4px">${esc(p.condicoes)}</div>`:''}
        ${p.status_prop?`<div class="ok-c" style="margin-top:8px">Sua resposta: <b>${esc(p.status_prop)}</b>${p.resposta_prop?' · “'+esc(p.resposta_prop)+'”':''}</div>`:''}
        ${aberta?`<form class="pprop" data-id="${p.id}" style="margin-top:8px;display:grid;gap:8px"><input name="obs" placeholder="Comentário para a Citihaus (opcional)" style="border:1px solid var(--line);border-radius:10px;padding:9px 12px;background:var(--bg);font:inherit">
          <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn pri sm" name="st" value="Quero aceitar">👍 Quero aceitar</button><button class="btn sm" name="st" value="Quero conversar">💬 Quero conversar</button><button class="btn sm ghost" name="st" value="Não aceito">✋ Não aceito</button></div></form>`:''}
      </div>`; }).join('')
      :'<p class="muted" style="margin:0">As propostas recebidas pelo seu imóvel aparecem aqui para você responder.</p>'}</div>`;
}
function dadosModal(){
  const p=X.d.pessoa||{};
  return `<div class="ov center" data-pxfechar="1" style="position:fixed;inset:0;background:rgba(30,20,15,.45);display:flex;align-items:center;justify-content:center;z-index:40;padding:16px">
   <form class="modal" id="${X.senha?'px-senha':'px-dados'}" style="width:min(520px,100%)">
    <div class="m-h"><span class="mono" style="color:var(--accent-ink)">Citihaus+</span><h2 style="font-size:19px;margin-top:4px">${X.senha?'🔒 Trocar senha':'✏️ Meus dados'}</h2></div>
    <div class="m-b"><div class="fgrid">${X.senha?`
      <label class="f full">Senha atual<input id="px-a" type="password" autocomplete="current-password" required></label>
      <label class="f">Nova senha<input id="px-n1" type="password" minlength="6" autocomplete="new-password" required></label>
      <label class="f">Repita<input id="px-n2" type="password" minlength="6" autocomplete="new-password" required></label>`:`
      <label class="f full">Nome completo<input id="px-nome" value="${esc(p.nome)}" autocomplete="name"></label>
      <label class="f">WhatsApp<input id="px-tel" value="${esc(p.telefone)}" inputmode="tel" autocomplete="tel"></label>
      <label class="f">E-mail<input id="px-email" type="email" value="${esc(p.email)}" autocomplete="email"></label>
      <label class="f ${p.dono?'':'full'}">Estado civil<select id="px-est"><option value="">Selecione</option>${ESTADOS.map(o=>`<option ${p.estado_civil===o?'selected':''}>${o}</option>`).join('')}</select></label>
      ${p.dono?`<label class="f">Conta para repasse<input id="px-banco" value="${esc(p.banco||'')}" placeholder="Banco · Agência · Conta · PIX"></label>`:''}`}
    </div>${X.senha?'':'<button type="button" class="btn sm ghost" data-pxsenha="1" style="margin-top:10px">🔒 Trocar senha</button>'}</div>
    <div class="m-f"><button type="button" class="btn" data-pxfechar="1">Cancelar</button><button class="btn pri" type="submit">Salvar</button></div></form></div>`;
}
function plusRender(){
  const p=(X.d&&X.d.pessoa)||{};
  topEl.hidden=false; topEl.className='top top-portal';
  topEl.innerHTML=`<div class="wrap top-in"><div class="brand"><img src="${LOGO}" alt="Citihaus"><span style="font-family:var(--f-display);font-weight:700;color:var(--accent-ink)">+</span></div>
    <div class="row" style="gap:6px"><button class="btn sm" data-pxdados="1" title="Meus dados" style="max-width:45vw"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">👤 ${esc(p.nome?p.nome.split(' ')[0]:'Meus dados')}</span> ✏️</button><button class="btn sm ghost" data-pxsair="1">Sair</button></div></div>`;
  app.innerHTML=`<div class="wrap"><div class="portal" style="max-width:1040px">${X.view==='cap'?capHtml():homeHtml()}
    <div class="lgpd"><span>Você vê apenas os seus imóveis, dados e documentos. Dúvidas: WhatsApp ${esc(CFG.WHATSAPP)}.</span></div></div>${X.editar?dadosModal():''}</div>`;
  try{ history.replaceState(null,'', base()+'?plus=1'); }catch(_){}
}

/* ---------- eventos ---------- */
document.addEventListener('click', e=>{
  if(TOKEN || !X.d) return;
  const b=e.target.closest('button,[data-pxfechar]'); if(!b) return; const d=b.dataset;
  if(d.pcap){ e.stopImmediatePropagation(); X.view='cap'; X.capId=d.pcap; plusRender(); window.scrollTo(0,0); return; }
  if(d.phome){ e.stopImmediatePropagation(); X.view='home'; plusRender(); return; }
  if(d.pxdados){ e.stopImmediatePropagation(); X.editar=true; X.senha=false; plusRender(); return; }
  if(d.pxsenha){ e.stopImmediatePropagation(); X.senha=true; plusRender(); return; }
  if(d.pxfechar!==undefined && (e.target===b || b.tagName==='BUTTON')){ e.stopImmediatePropagation(); X.editar=false; X.senha=false; plusRender(); return; }
  if(d.pxsair){ e.stopImmediatePropagation(); const s=ses(); setSes(null); try{ localStorage.removeItem('citihaus_cli'); }catch(_){} sb.rpc('plus_sair',{p_sessao:s}).then(()=>{},()=>{}); X.d=null; loginOrig(); return; }
}, true);
let ultimoBotao=null;
document.addEventListener('click', e=>{ const b=e.target.closest('form.pprop button[name=st]'); if(b) ultimoBotao=b.value; }, true);
document.addEventListener('submit', e=>{
  if(TOKEN || !X.d) return; const f=e.target, g=id=>{ const x=f.querySelector('#'+id); return x?x.value.trim():''; };
  if(f.classList.contains('pprop')){ e.preventDefault(); e.stopImmediatePropagation(); const st=(e.submitter&&e.submitter.value)||ultimoBotao; if(!st) return;
    (async()=>{ try{ await q(sb.rpc('plus_proposta_resp',{p_sessao:ses(), p_id:f.dataset.id, p_status:st, p_obs:f.querySelector('[name=obs]').value})); toast('Resposta enviada à Citihaus ✓'); await recarregar(); }catch(err){ toast(err.message||String(err)); } })(); return; }
  if(f.id==='px-dados'){ e.preventDefault(); e.stopImmediatePropagation();
    (async()=>{ try{ await q(sb.rpc('plus_salvar',{p_sessao:ses(), p_nome:g('px-nome'), p_telefone:g('px-tel'), p_email:g('px-email'), p_estado:g('px-est')||null, p_banco:f.querySelector('#px-banco')?g('px-banco'):null})); X.editar=false; toast('Dados salvos ✓'); await recarregar(); }catch(err){ toast(err.message||String(err)); } })(); return; }
  if(f.id==='px-senha'){ e.preventDefault(); e.stopImmediatePropagation(); if(g('px-n1')!==g('px-n2')) return toast('As duas senhas não são iguais');
    (async()=>{ try{ await q(sb.rpc('plus_trocar_senha',{p_sessao:ses(), p_atual:g('px-a'), p_nova:g('px-n1')})); X.editar=false; X.senha=false; toast('Senha trocada ✓'); plusRender(); }catch(err){ toast(err.message||String(err)); } })(); return; }
}, true);
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && X.editar && !TOKEN){ X.editar=false; X.senha=false; plusRender(); } });
/* se a tela de login já foi desenhada antes deste arquivo carregar, abre o Citihaus+ direto */
if(ses() && !S.me && document.getElementById('login')) plusInit();
})();
