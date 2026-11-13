/* Citihaus · Esteira de Contratos — app (equipe + portal do cliente) */
'use strict';
const CFG = window.CFG;
const sb = supabase.createClient(CFG.SUPABASE_URL, CFG.SUPABASE_ANON_KEY);
const TOKEN = new URLSearchParams(location.search).get('c');

/* ---------- regras fixas ---------- */
const ETAPAS = ['Cadastro','Análise de fichas','Aprovação','Vistoria','Seguro','Chaves','Ativo'];
const ETAPA_DESC = ['Partes enviando dados e documentos','Equipe confere cada ficha','Contrato gerado e assinado','Vistoria e laudo','Cotação e apólice','Entrega das chaves','Contrato em vigor'];
const CLIENTE_ETAPAS = [
  ['Envio de documentos','Você envia seus dados e documentos por aqui'],
  ['Análise da ficha','A Citihaus confere a documentação'],
  ['Contrato para assinatura','Você recebe o contrato para assinar'],
  ['Vistoria do imóvel','Laudo enviado após a vistoria'],
  ['Seguro incêndio','Contratação da apólice do imóvel'],
  ['Entrega das chaves','Chaves entregues e contrato ativo'],
];
const TAREFAS = {
  2:['Contrato gerado pela minuta Citihaus','Contrato assinado por todas as partes'],
  3:['Vistoria realizada','Laudo enviado ao inquilino'],
  4:['Cotação feita no Madaseg','Apólice emitida'],
  5:['Termo de entrega de chaves assinado'],
};
const PAPEL = {proprietario:'Proprietário',inquilino:'Inquilino',fiador:'Fiador'};
const ORDEM = {proprietario:0,inquilino:1,fiador:2};
const DOC = {
  cnh:'CNH', resid:'Comprovante de residência', cert:'Certidão de nascimento ou casamento', cnhc:'CNH do cônjuge',
  mat:'Matrícula do imóvel (atualizada)', iptu:'Capa do IPTU do imóvel', contas:'Contas de consumo (energia, água, gás, condomínio)'
};
const ESTADOS = ['Solteiro(a)','Casado(a)','União estável','Divorciado(a)','Viúvo(a)'];
const TIPOS = {
  inquilino:['Manutenção','Segunda via de boleto','Dúvida sobre o contrato','Renovação ou rescisão','Reclamação'],
  proprietario:['Extrato e repasse','Aprovação de manutenção','Dúvida sobre o contrato','Reajuste ou renovação','Venda do imóvel'],
  fiador:['Dúvida sobre a fiança']
};
function reqDocs(papel, estado){
  let l=['cnh','resid','cert'];
  if(estado==='Casado(a)'||estado==='União estável') l.push('cnhc');
  if(papel==='fiador') l.push('mat');
  if(papel==='proprietario') l.push('iptu','contas');
  return l;
}
const sla = t => t==='Segunda via de boleto'?'2h':t==='Manutenção'?'48h':'24h';
function chSt(st,lado){ return ({aberto:['p-warn','Aberto'],atendimento:['p-info','Em atendimento'],aguardando:['p-acc',lado==='cliente'?'Aguardando você':'Aguardando cliente'],resolvido:['p-ok','Resolvido']})[st]; }

/* ---------- utilidades ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl = v => 'R$ ' + Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const dataBR = d => { if(!d) return '—'; const [y,m,dd]=String(d).slice(0,10).split('-'); return `${dd}/${m}/${y}`; };
const dtBR = d => { if(!d) return ''; const x=new Date(d); return x.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'})+' '+x.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}); };
const num = v => Number(String(v||'').replace(/[^\d,.-]/g,'').replace(/\./g,'').replace(',','.')) || 0;
const brDateToIso = s => { const m=String(s||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/); return m?`${m[3]}-${m[2]}-${m[1]}`:(s||null); };
function toast(t){ const el=$('#toast'); el.textContent=t; el.hidden=false; clearTimeout(toast.h); toast.h=setTimeout(()=>el.hidden=true,3200); }
function falha(e){ console.error(e); toast('Erro: ' + (e && (e.message||e.error_description||e.erro) || e)); }
async function q(p){ const {data,error}=await p; if(error) throw error; return data; }
function linkPortal(token){ return location.origin + location.pathname + '?c=' + token; }
async function copiar(t){ try{ await navigator.clipboard.writeText(t); toast('Copiado! Cole no WhatsApp do cliente.'); }catch(e){ window.prompt('Copie a mensagem:', t); } }

/* arquivos: reduz foto grande e envia pela ponte do Drive */
function lerArquivo(file){
  return new Promise((res,rej)=>{
    const isImg = /^image\/(jpeg|png|webp|heic)/.test(file.type) && file.size > 1.5e6;
    const fr = new FileReader();
    fr.onerror = () => rej(new Error('Não deu para ler o arquivo'));
    fr.onload = () => {
      if(!isImg) return res({data: fr.result.split(',')[1], mime: file.type||'application/octet-stream', name: file.name});
      const img = new Image();
      img.onload = () => { const k=Math.min(1, 2000/Math.max(img.width,img.height)); const c=document.createElement('canvas');
        c.width=Math.round(img.width*k); c.height=Math.round(img.height*k); c.getContext('2d').drawImage(img,0,0,c.width,c.height);
        res({data:c.toDataURL('image/jpeg',0.85).split(',')[1], mime:'image/jpeg', name:file.name.replace(/\.\w+$/,'')+'.jpg'}); };
      img.onerror = () => res({data: fr.result.split(',')[1], mime: file.type, name: file.name});
      img.src = fr.result;
    };
    fr.readAsDataURL(file);
  });
}
async function enviarPonte(ticket, file){
  if(file.size > 25e6) throw new Error('Arquivo maior que 25 MB. Envie uma versão menor.');
  const f = await lerArquivo(file);
  const r = await fetch(CFG.BRIDGE_URL, {method:'POST', body: JSON.stringify({ticket, filename:f.name, mime:f.mime, data:f.data})});
  const j = await r.json().catch(()=>({ok:false, erro:'Resposta inválida da ponte do Drive'}));
  if(!j.ok) throw new Error(j.erro||'Falha ao salvar no Drive');
  return j;
}

const app=$('#app'), layer=$('#layer'), topEl=$('#top');
const LOGO = document.querySelector('link[rel=icon]').href;

/* =====================================================================
   PORTAL DO CLIENTE  (?c=token)
   ===================================================================== */
const PS = {d:null, chNew:false, chOpen:null, busy:false};
async function portalLoad(){
  try{ PS.d = await q(sb.rpc('portal_dados',{p_token:TOKEN})); portalRender(); }
  catch(e){ topEl.hidden=true; app.innerHTML=`<div class="wrap"><div class="login"><img src="${LOGO}" alt="Citihaus"><h1>Link não encontrado</h1><p class="muted" style="margin:0">Este link não é válido ou foi substituído. Fale com a Citihaus pelo WhatsApp ${esc(CFG.WHATSAPP)}.</p></div></div>`; }
}
function portalPend(d){
  const p=d.pessoa, out=[];
  if(!p.nome) out.push('Nome completo'); if(!p.telefone) out.push('WhatsApp'); if(!p.email) out.push('E-mail'); if(!p.estado_civil) out.push('Estado civil');
  if(d.papel==='proprietario' && !p.banco) out.push('Conta para repasse');
  const st = docStatusMap(d.documentos);
  reqDocs(d.papel,p.estado_civil).forEach(t=>{ const s=st[t]?.status||'pendente'; if(s==='pendente'||s==='refazer') out.push(DOC[t]); });
  return out;
}
function docStatusMap(list){ const m={}; (list||[]).forEach(x=>m[x.tipo]=x); return m; }
function portalRender(){
  const d=PS.d, c=d.contrato, p=d.pessoa, papel=d.papel, pe=portalPend(d), etapa=c.etapa;
  topEl.hidden=false; topEl.className='top top-portal';
  topEl.innerHTML=`<div class="wrap top-in"><div class="brand"><img src="${LOGO}" alt="Citihaus"><span>Portal do ${PAPEL[papel].toLowerCase()}</span></div><span class="proto">Contrato ${c.numero}</span></div>`;
  const tl=CLIENTE_ETAPAS.map(([t,s],i)=>{const st=etapa>i||etapa===6?'done':etapa===i?'now':''; return `<div class="tl-i ${st}"><div class="dot">${st==='done'?'✓':i+1}</div><div><b>${t}</b><span>${st==='now'?(i===0&&pe.length?'Faltam '+pe.length+' itens seus':'Em andamento'):s}</span></div></div>`}).join('');
  const st=docStatusMap(d.documentos);
  const ds=reqDocs(papel,p.estado_civil).map(t=>{const o=st[t]||{status:'pendente'};
    const tag={pendente:'<span class="pill p-warn">Falta enviar</span>',enviado:'<span class="pill p-info">Recebido · em conferência</span>',ok:'<span class="pill p-ok">Aprovado</span>',refazer:'<span class="pill p-bad">Enviar de novo</span>'}[o.status];
    const can=o.status!=='ok';
    return `<div class="updoc"><div style="min-width:0;flex:1 1 200px"><div style="font-weight:500">${esc(DOC[t])}</div>${o.obs&&o.status==='refazer'?`<div style="font-size:12.5px;color:var(--bad)">${esc(o.obs)}</div>`:''}</div>
     <div class="row">${tag}${can?`<label class="btn sm ${o.status==='enviado'?'':'pri'} up">${o.status==='enviado'?'Trocar arquivo':'Enviar arquivo'}<input type="file" id="up-${t}" data-pup="${t}" accept="image/*,.pdf"></label>`:''}</div></div>`}).join('');
  let fiadorBox='';
  if(papel==='inquilino' && d.fiador){
    const msg=`Olá! Você foi indicado(a) como fiador(a) na minha locação com a Citihaus. Por este link você envia seus dados e documentos direto para eles: ${linkPortal(d.fiador.token)}`;
    fiadorBox=`<div class="box"><h2>Seu fiador</h2>${d.fiador.nome?`<p style="margin:0 0 10px"><b>${esc(d.fiador.nome)}</b> já começou o cadastro.</p>`:'<p class="muted" style="margin:0 0 10px">Envie este link para o seu fiador. Ele preenche os dados e manda os documentos direto para a Citihaus.</p>'}
    <div class="linkbox" style="border-radius:10px"><code>${esc(linkPortal(d.fiador.token))}</code><button class="btn sm" data-copytxt="${esc(msg)}">Copiar mensagem</button></div></div>`;
  }
  const box = chBoxPortal();
  app.innerHTML=`<div class="wrap"><div class="portal">
   <section class="hello"><small>${PAPEL[papel]} · Contrato ${c.numero}</small><h1>Olá${p.nome?', '+esc(p.nome.split(' ')[0]):''}</h1>
   <p>${etapa===6?'Seu contrato do '+esc(c.imovel)+' está ativo. Precisa de algo? Abra um chamado aqui.':'Acompanhe aqui a locação do '+esc(c.imovel)+'.'}</p>
   <div class="kv"><span>Aluguel <b>${brl(c.aluguel)}</b></span><span>Entrada <b>${dataBR(c.entrada)}</b></span><span>Garantia <b>${esc(c.garantia)}</b></span></div></section>
   ${etapa===6?box:''}
   ${pe.length?`<div class="miss-c">Faltam ${pe.length} ${pe.length>1?'itens':'item'} seus: ${esc(pe.slice(0,3).join(', '))}${pe.length>3?'…':''}</div>`:`<div class="ok-c">Sua parte está completa. Acompanhe as próximas etapas por aqui.</div>`}
   <div class="box"><h2>Andamento do contrato</h2><div class="tl">${tl}</div></div>
   ${etapa<6?box:''}
   <form class="box" id="dados"><h2>Seus dados</h2><div class="fgrid">
     <label class="f full">Nome completo<input id="d-nome" value="${esc(p.nome)}" placeholder="Como está na CNH" autocomplete="name"></label>
     <label class="f">WhatsApp<input id="d-tel" value="${esc(p.telefone)}" inputmode="tel" autocomplete="tel"></label>
     <label class="f">E-mail<input id="d-email" type="email" value="${esc(p.email)}" placeholder="seu@email.com" autocomplete="email"></label>
     <label class="f ${papel==='proprietario'?'':'full'}">Estado civil<select id="d-est"><option value="">Selecione</option>${ESTADOS.map(o=>`<option ${p.estado_civil===o?'selected':''}>${o}</option>`).join('')}</select></label>
     ${papel==='proprietario'?`<label class="f">Conta para repasse<input id="d-banco" value="${esc(p.banco)}" placeholder="Banco · Agência · Conta · PIX"></label>`:''}
     <div class="full row" style="justify-content:flex-end"><button class="btn pri" type="submit">Salvar dados</button></div></div></form>
   <div class="box"><h2>Seus documentos</h2>${ds}<p class="muted" style="font-size:12.5px;margin:10px 0 0">Foto legível ou PDF. Casado(a) ou em união estável: pedimos também a CNH do cônjuge.${papel==='fiador'?' A matrícula precisa estar atualizada; se vier desatualizada, é cobrada a taxa de R$ 70,00 para emitir uma nova.':''}</p></div>
   ${fiadorBox}
   <div class="lgpd"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2"/></svg>
   <span>Você vê apenas os seus documentos. Eles ficam guardados na pasta do contrato e só a equipe Citihaus tem acesso. Dúvidas: WhatsApp ${esc(CFG.WHATSAPP)}.</span></div>
  </div></div>`;
}
function threadHtml(h, lado, msgs, nomeCliente){
  const meu = lado==='cliente'?'cliente':'equipe';
  let s=`<div class="thread">${msgs.map(m=>`<div class="msg ${m.autor===meu?'eu':'eles'}"><small>${m.autor==='equipe'?'Citihaus':esc(m.autor_nome||nomeCliente||'Cliente')} · ${dtBR(m.created_at)}</small>${esc(m.texto)}${m.anexo?`<span class="mono" style="display:block;margin-top:4px;color:var(--accent-ink)">${m.anexo_url&&lado!=='cliente'?`<a class="doclink" href="${esc(m.anexo_url)}" target="_blank" rel="noopener">📎 ${esc(m.anexo)}</a>`:'📎 '+esc(m.anexo)}</span>`:''}</div>`).join('')}`;
  if(h.orc_status) s+=`<div class="note">Orçamento ${brl(h.orc_valor)} · ${esc(h.orc_desc)} · ${h.orc_status==='pendente'?'aguardando aprovação do proprietário':h.orc_status==='aprovado'?'aprovado pelo proprietário':'recusado pelo proprietário'}</div>`;
  if(h.status==='resolvido'){
    if(lado==='cliente'){
      s+= h.avaliacao?`<div class="ok-c">Você avaliou o atendimento com ${'★'.repeat(h.avaliacao)}</div>`
        :`<div><b style="font-size:13.5px">Como foi o atendimento?</b><div class="stars" style="margin-top:6px">${[1,2,3,4,5].map(n=>`<button data-aval="${h.id}|${n}" aria-label="${n} de 5">★</button>`).join('')}</div></div>`;
      s+=`<div><button class="btn sm ghost" data-reopen="${h.id}">O problema continua? Reabrir chamado</button></div>`;
    } else s+= h.avaliacao?`<div class="ok-c">Avaliação do cliente: ${'★'.repeat(h.avaliacao)}</div>`:'<div class="note">Aguardando a avaliação do cliente</div>';
  } else {
    s+=`<form class="reply" data-reply="${h.id}|${lado}"><textarea id="r-${h.id}-${lado}" placeholder="${lado==='cliente'?'Escreva uma mensagem para a Citihaus':'Responder ao cliente'}" required></textarea><button class="btn pri" type="submit">Enviar</button></form>`;
    if(lado==='cliente') s+=`<div class="row"><label class="btn sm up">Anexar foto<input type="file" data-chup="${h.id}" accept="image/*,.pdf"></label><button class="btn sm ghost" data-resolve="${h.id}">Já foi resolvido, pode encerrar</button></div>`;
  }
  return s+'</div>';
}
function chBoxPortal(){
  const d=PS.d, papel=d.papel;
  const meus=(d.chamados||[]).slice().sort((a,b)=>(a.status==='resolvido')-(b.status==='resolvido'));
  const aprov=d.aprovacoes||[];
  const ab=meus.filter(h=>h.status!=='resolvido').length;
  return `<div class="box" id="chamados"><div class="row between" style="margin-bottom:12px"><h2 style="margin:0">Chamados ${ab?`<span class="pill p-warn" style="vertical-align:middle">${ab} em aberto</span>`:''}</h2>${PS.chNew?'':'<button class="btn sm pri" data-chnew="1">Abrir chamado</button>'}</div>
  ${PS.chNew?`<form class="newch" id="chform">
    <label class="f">Assunto<select id="ch-tipo">${TIPOS[papel].map(t=>`<option>${t}</option>`).join('')}</select></label>
    <label class="f">O que aconteceu?<textarea class="ta" id="ch-desc" rows="3" required placeholder="Conte com detalhes. Se for manutenção, diga em qual cômodo."></textarea></label>
    <div class="row"><label class="btn sm up">Anexar foto ou arquivo<input type="file" id="ch-file" accept="image/*,.pdf"></label><span class="muted" id="ch-fname" style="font-size:12px"></span></div>
    <div class="row" style="justify-content:flex-end"><button type="button" class="btn sm" data-chnew="0">Cancelar</button><button class="btn sm pri" type="submit">Abrir chamado</button></div></form>`:''}
  ${aprov.map(h=>`<div class="orc"><div style="min-width:0;flex:1 1 220px"><b>Sua aprovação: ${esc(h.orc_desc)}</b><br><span class="muted">${esc(h.titulo)} · orçamento ${brl(h.orc_valor)} · ${esc(h.protocolo)}</span></div><div class="row"><button class="btn sm pri" data-orc="${h.id}|1">Aprovar</button><button class="btn sm" data-orc="${h.id}|0">Recusar</button></div></div>`).join('')}
  ${meus.map(h=>{const [cl,lb]=chSt(h.status,'cliente'); const ms=h.mensagens||[]; const last=ms[ms.length-1]||{};
    return `<div class="ch"><button class="ch-h" data-chopen="${h.id}" aria-expanded="${PS.chOpen===h.id}"><div class="row between"><span class="mono">${esc(h.protocolo)}</span><span class="pill ${cl}">${lb}</span></div><b>${esc(h.titulo)}</b>
    <span class="muted" style="font-size:12.5px">${esc(h.tipo)} · aberto em ${dataBR(h.created_at)} · ${h.status==='resolvido'?'encerrado':last.autor==='equipe'?'Citihaus respondeu':'aguardando a Citihaus (até '+sla(h.tipo)+')'}</span></button>${PS.chOpen===h.id?threadHtml(h,'cliente',ms,d.pessoa.nome):''}</div>`}).join('')}
  ${!meus.length&&!aprov.length&&!PS.chNew?'<p class="muted" style="margin:0">Nenhum chamado. Precisa de algo? Abra por aqui e acompanhe a resposta sem depender do WhatsApp.</p>':''}
  </div>`;
}
async function portalAcao(fn){ if(PS.busy) return; PS.busy=true; document.body.classList.add('sending'); try{ await fn(); await portalLoad(); }catch(e){ falha(e); } finally{ PS.busy=false; document.body.classList.remove('sending'); } }
function portalEventos(){
  document.addEventListener('click', e=>{
    const t=e.target.closest('button'); if(!t) return; const d=t.dataset;
    if(d.copytxt) return copiar(d.copytxt);
    if(d.chnew){ PS.chNew=d.chnew==='1'; return portalRender(); }
    if(d.chopen){ PS.chOpen=PS.chOpen===d.chopen?null:d.chopen; return portalRender(); }
    if(d.aval){ const [id,n]=d.aval.split('|'); return portalAcao(async()=>{ await q(sb.rpc('portal_chamado_acao',{p_token:TOKEN,p_chamado:id,p_acao:'avaliar',p_nota:+n})); toast('Obrigado pela avaliação!'); }); }
    if(d.reopen) return portalAcao(async()=>{ await q(sb.rpc('portal_chamado_acao',{p_token:TOKEN,p_chamado:d.reopen,p_acao:'reabrir'})); toast('Chamado reaberto'); });
    if(d.resolve) return portalAcao(async()=>{ await q(sb.rpc('portal_chamado_acao',{p_token:TOKEN,p_chamado:d.resolve,p_acao:'resolver'})); toast('Chamado encerrado'); });
    if(d.orc){ const [id,ok]=d.orc.split('|'); return portalAcao(async()=>{ await q(sb.rpc('portal_orcamento',{p_token:TOKEN,p_chamado:id,p_aprovar:ok==='1'})); toast(ok==='1'?'Orçamento aprovado. Vamos agendar o serviço.':'Orçamento recusado. Vamos buscar outra opção.'); }); }
  });
  document.addEventListener('change', e=>{
    const el=e.target;
    if(el.id==='ch-file'){ const f=el.files&&el.files[0]; $('#ch-fname').textContent=f?f.name:''; return; }
    if(el.dataset.pup && el.files[0]){ const tipo=el.dataset.pup, file=el.files[0];
      return portalAcao(async()=>{ toast('Enviando '+DOC[tipo]+'…'); const tk=await q(sb.rpc('portal_upload',{p_token:TOKEN,p_doc_tipo:tipo})); const r=await enviarPonte(tk,file); toast('Recebido! '+r.arquivo); }); }
    if(el.dataset.chup && el.files[0]){ const id=el.dataset.chup, file=el.files[0];
      return portalAcao(async()=>{ toast('Enviando anexo…'); const tk=await q(sb.rpc('portal_upload',{p_token:TOKEN,p_doc_tipo:null,p_chamado:id})); await enviarPonte(tk,file); toast('Anexo enviado'); }); }
  });
  document.addEventListener('submit', e=>{
    e.preventDefault(); const f=e.target;
    if(f.id==='dados') return portalAcao(async()=>{
      const b=f.querySelector('#d-banco');
      await q(sb.rpc('portal_salvar',{p_token:TOKEN,p_nome:f.querySelector('#d-nome').value,p_telefone:f.querySelector('#d-tel').value,p_email:f.querySelector('#d-email').value,p_estado:f.querySelector('#d-est').value,p_banco:b?b.value:null}));
      toast('Dados salvos'); });
    if(f.id==='chform') return portalAcao(async()=>{
      const desc=f.querySelector('#ch-desc').value.trim(); if(!desc) throw new Error('Descreva o chamado');
      const file=f.querySelector('#ch-file').files[0];
      const r=await q(sb.rpc('portal_abrir_chamado',{p_token:TOKEN,p_tipo:f.querySelector('#ch-tipo').value,p_texto:desc}));
      if(file){ const tk=await q(sb.rpc('portal_upload',{p_token:TOKEN,p_doc_tipo:null,p_chamado:r.id})); await enviarPonte(tk,file); }
      PS.chNew=false; PS.chOpen=r.id; toast('Chamado aberto · protocolo '+r.protocolo); });
    if(f.dataset.reply){ const [id]=f.dataset.reply.split('|'); const txt=f.querySelector('textarea').value.trim(); if(!txt) return;
      return portalAcao(async()=>{ await q(sb.rpc('portal_mensagem',{p_token:TOKEN,p_chamado:id,p_texto:txt})); toast('Mensagem enviada'); }); }
  });
}

/* =====================================================================
   EQUIPE (login)
   ===================================================================== */
const S = {tab:'contratos', open:null, chTeam:null, modal:null, busca:'', me:null};
const D = {imoveis:[], pessoas:{}, contratos:[], partes:[], docs:{}, chamados:[], msgs:{}, hist:{}, equipe:[]};

async function equipeInit(){
  const {data:{session}} = await sb.auth.getSession();
  if(!session) return loginRender();
  const eq = await sb.from('equipe').select('*').eq('user_id', session.user.id).maybeSingle();
  if(!eq.data){ return loginRender('Seu usuário entrou, mas ainda não foi liberado na equipe. Peça ao Caio para liberar o e-mail '+session.user.email+'.'); }
  S.me = eq.data;
  try{ S.tab = (location.hash||'').slice(1) || 'contratos'; if(!['contratos','chamados','imoveis','pessoas'].includes(S.tab)) S.tab='contratos'; }catch(_){}
  await carregar(); render();
  setInterval(()=>{ if(!S.modal && !S.open && !S.chTeam && !document.querySelector('textarea:focus,input:focus')) carregar().then(render).catch(()=>{}); }, 60000);
}
function loginRender(msg){
  topEl.hidden=true;
  app.innerHTML=`<div class="wrap"><form class="login" id="login"><img src="${LOGO}" alt="Citihaus"><h1>Esteira de Contratos</h1>
   ${msg?`<div class="err">${esc(msg)}</div>`:''}
   <label class="f">E-mail<input id="l-email" type="email" autocomplete="username" required></label>
   <button class="btn pri" type="submit">Receber link de acesso</button>
   ${msg?'<button class="btn ghost" type="button" data-sair="1">Entrar com outro e-mail</button>':''}
   <p class="muted" style="margin:0;font-size:12.5px">Acesso da equipe Citihaus. Clientes entram pelo link recebido no WhatsApp.</p></form></div>`;
}
async function carregar(){
  const [im,pe,co,pa,dc,ch,ms,hi,eq] = await Promise.all([
    q(sb.from('imoveis').select('*').order('titulo')),
    q(sb.from('pessoas').select('*')),
    q(sb.from('contratos').select('*').order('numero')),
    q(sb.from('partes').select('*')),
    q(sb.from('documentos').select('*')),
    q(sb.from('chamados').select('*').order('created_at')),
    q(sb.from('mensagens').select('*').order('created_at')),
    q(sb.from('historico').select('*').order('created_at')),
    q(sb.from('equipe').select('nome,papel')),
  ]);
  D.imoveis=im; D.pessoas={}; pe.forEach(p=>D.pessoas[p.id]=p); D.contratos=co; D.partes=pa;
  D.docs={}; dc.forEach(d=>{ (D.docs[d.pessoa_id]=D.docs[d.pessoa_id]||{})[d.tipo]=d; });
  D.chamados=ch; D.msgs={}; ms.forEach(m=>(D.msgs[m.chamado_id]=D.msgs[m.chamado_id]||[]).push(m));
  D.hist={}; hi.forEach(h=>(D.hist[h.contrato_id]=D.hist[h.contrato_id]||[]).push(h));
  D.equipe=eq;
}
/* regras sobre os dados */
const imvDe = c => D.imoveis.find(i=>i.id===c.imovel_id) || {titulo:'(imóvel removido)',bairro:''};
const partesDe = c => D.partes.filter(x=>x.contrato_id===c.id).sort((a,b)=>ORDEM[a.papel]-ORDEM[b.papel]);
const P = id => D.pessoas[id] || {nome:'',telefone:'',email:'',estado_civil:'',banco:''};
const nomeP = (p,papel) => p.nome || (PAPEL[papel]+' a cadastrar');
const pastaC = c => c.numero+'-'+imvDe(c).titulo.replace(/ · /g,' ');
const docSt = (pid,t) => (D.docs[pid]&&D.docs[pid][t]) ? D.docs[pid][t].status : 'pendente';
function pend(pid,papel){
  const p=P(pid), out=[];
  if(!p.nome) out.push('Nome completo'); if(!p.telefone) out.push('WhatsApp'); if(!p.email) out.push('E-mail'); if(!p.estado_civil) out.push('Estado civil');
  if(papel==='proprietario' && !p.banco) out.push('Conta para repasse');
  reqDocs(papel,p.estado_civil).forEach(t=>{const s=docSt(pid,t); if(s==='pendente'||s==='refazer') out.push(DOC[t]);});
  return out;
}
function docCount(c){ let t=0,ok=0; partesDe(c).forEach(x=>{ reqDocs(x.papel,P(x.pessoa_id).estado_civil).forEach(d=>{t++; if(docSt(x.pessoa_id,d)==='ok') ok++;}); }); return [ok,t]; }
function aConferir(c){ let n=0; partesDe(c).forEach(x=>reqDocs(x.papel,P(x.pessoa_id).estado_civil).forEach(d=>{ if(docSt(x.pessoa_id,d)==='enviado') n++; })); return n; }
function gate(c){
  const ps=partesDe(c);
  if(c.etapa===0){ const f=[]; ps.forEach(x=>{const l=pend(x.pessoa_id,x.papel); if(l.length) f.push(nomeP(P(x.pessoa_id),x.papel)+': '+l.length+' pendência'+(l.length>1?'s':'')+' ('+l.slice(0,3).join(', ')+(l.length>3?'…':'')+')');}); return f; }
  if(c.etapa===1){ const f=[]; ps.forEach(x=>{ const p=P(x.pessoa_id); const nc=reqDocs(x.papel,p.estado_civil).filter(d=>docSt(x.pessoa_id,d)!=='ok').length;
      if(nc) f.push(nomeP(p,x.papel)+': '+nc+' documento'+(nc>1?'s':'')+' sem conferência'); else if(!x.aprovado) f.push(nomeP(p,x.papel)+': ficha ainda não aprovada'); }); return f; }
  if(TAREFAS[c.etapa]) return TAREFAS[c.etapa].filter((t,i)=>!(c.tarefas||{})[c.etapa+'-'+i]);
  return [];
}
function msgWhats(c,x){
  const im=imvDe(c), link=linkPortal(x.token);
  if(x.papel==='fiador') return `Olá! Você foi indicado(a) como fiador(a) na locação do ${im.titulo}. Por este link você envia seus dados e documentos direto para a Citihaus: ${link}`;
  if(x.papel==='proprietario') return `Olá! Aqui é da Citihaus. Pelo link abaixo você acompanha a locação do seu imóvel ${im.titulo}, envia documentos e dados para repasse e abre chamados: ${link}`;
  return `Olá! Aqui é da Citihaus. Pelo link abaixo você envia seus dados e documentos da locação do ${im.titulo} e acompanha cada etapa até a entrega das chaves: ${link}`;
}
async function log(cid, texto){ await q(sb.from('historico').insert({contrato_id:cid, texto})); }

/* render equipe */
function render(){
  if(TOKEN) return;
  topEl.hidden=false; topEl.className='top';
  topEl.innerHTML=`<div class="wrap top-in"><div class="brand"><img src="${LOGO}" alt="Citihaus"><span>Citihaus+ · Equipe</span></div>
   <div class="seg"><span class="me">${esc(S.me.nome)}</span><button class="btn sm" data-reload="1">Atualizar</button><button class="btn sm ghost" data-sair="1">Sair</button></div></div>`;
  const nab=D.chamados.filter(h=>h.status!=='resolvido').length;
  const tabs=[['contratos','Contratos'],['chamados','Chamados'+(nab?`<span class="tabn">${nab}</span>`:'')],['imoveis','Imóveis'],['pessoas','Pessoas']];
  app.innerHTML=`<div class="wrap"><nav class="sub">${tabs.map(([k,n])=>`<button data-tab="${k}" aria-pressed="${S.tab===k}">${n}</button>`).join('')}</nav>
   ${S.tab==='contratos'?kanban():S.tab==='chamados'?chamadosEquipe():S.tab==='imoveis'?imoveis():pessoas()}</div>`;
  const c = S.open && D.contratos.find(x=>x.id===S.open);
  const h = S.chTeam && D.chamados.find(x=>x.id===S.chTeam);
  layer.innerHTML=(c?drawer(c):'')+(h?chDrawer(h):'')+(S.modal?modalHtml():'');
}
function kanban(){
  const lista=D.contratos;
  const andamento=lista.filter(c=>c.etapa<6).length;
  const conferir=lista.reduce((a,c)=>a+aConferir(c),0);
  const cliente=lista.filter(c=>c.etapa===0).reduce((a,c)=>a+partesDe(c).reduce((b,x)=>b+pend(x.pessoa_id,x.papel).length,0),0);
  const prontos=lista.filter(c=>c.etapa<6 && !gate(c).length).length;
  return `<div class="head"><div><h1>Contratos de locação</h1><p>Cada card é um contrato. Clique para ver partes, documentos e a pasta no Drive.</p></div>
    <button class="btn pri" data-tab="imoveis">+ Iniciar contrato</button></div>
  <div class="stats">
    <div class="stat"><b>${andamento}</b><span>contratos em andamento</span></div>
    <div class="stat hl"><b>${conferir}</b><span>documentos aguardando conferência</span></div>
    <div class="stat"><b>${cliente}</b><span>pendências com o cliente</span></div>
    <div class="stat"><b>${prontos}</b><span>prontos para avançar</span></div>
  </div>
  <div class="board-scroll"><div class="board">
  ${ETAPAS.map((e,i)=>{const cs=lista.filter(c=>c.etapa===i);
    return `<section class="col"><div class="col-h"><div><h3>${e}</h3><small>${ETAPA_DESC[i]}</small></div><span class="count">${cs.length}</span></div>
    ${cs.length?cs.map(card).join(''):'<div class="empty">Nenhum contrato aqui</div>'}</section>`}).join('')}
  </div></div>`;
}
function card(c){
  const [ok,t]=docCount(c), g=gate(c), conf=aConferir(c), im=imvDe(c), ps=partesDe(c);
  const inq=ps.find(x=>x.papel==='inquilino');
  let flag='';
  if(c.etapa===6) flag='<span class="pill p-ok">Ativo</span>';
  else if(!g.length) flag='<span class="pill p-ok">Pronto para avançar</span>';
  else if(conf) flag=`<span class="pill p-info">${conf} para conferir</span>`;
  else if(c.etapa===0) flag='<span class="pill p-warn">Aguardando cliente</span>';
  else flag=`<span class="pill p-mute">${g.length} pendente${g.length>1?'s':''}</span>`;
  const semEmail=ps.some(x=>!P(x.pessoa_id).email);
  return `<button class="card" data-open="${c.id}">
    <span class="code">${esc(pastaC(c))}</span>
    <h4>${esc(im.titulo)}</h4>
    <div class="meta">${esc(inq?nomeP(P(inq.pessoa_id),'inquilino'):'—')} · ${brl(c.aluguel)}</div>
    <div class="row between"><span class="meta">Docs conferidos</span><span class="meta num">${ok}/${t}</span></div>
    <div class="bar ${ok===t&&t?'full':''}"><i style="width:${t?Math.round(ok/t*100):0}%"></i></div>
    <div class="row between"><span class="who">${esc(c.corretor||'—')}</span>${flag}</div>
    ${semEmail&&c.etapa<6?'<span class="pill p-bad">Falta e-mail</span>':''}
  </button>`;
}
function drawer(c){
  const im=imvDe(c), g=gate(c), tar=c.tarefas||{};
  const steps=ETAPAS.slice(0,6).map((e,i)=>`<div class="${c.etapa>i?'done':c.etapa===i?'now':''}"></div>`).join('');
  let gateHtml='';
  if(c.etapa<6){
    gateHtml = g.length
      ? `<div class="gate no"><div class="gt"><b>Para sair de “${ETAPAS[c.etapa]}”, falta:</b><ul>${g.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div><button class="btn pri" disabled>Avançar etapa</button></div>`
      : `<div class="gate yes"><div class="gt"><b>Tudo certo em “${ETAPAS[c.etapa]}”.</b><br>Pode seguir para ${ETAPAS[c.etapa+1]}.</div><button class="btn pri" data-adv="${c.id}">Avançar para ${ETAPAS[c.etapa+1]}</button></div>`;
  } else gateHtml = `<div class="gate yes"><div class="gt"><b>Contrato ativo desde ${dataBR(c.entrada)}.</b><br>Os chamados deste contrato aparecem na aba Chamados.</div></div>`;
  const tarefas = TAREFAS[c.etapa] ? `<div class="sec"><h3>Tarefas da etapa</h3><div class="row" style="flex-direction:column;align-items:stretch;gap:8px">
    ${TAREFAS[c.etapa].map((t,i)=>`<label class="task"><input type="checkbox" id="t-${c.id}-${i}" data-task="${c.id}|${c.etapa}-${i}" ${tar[c.etapa+'-'+i]?'checked':''}> ${esc(t)}</label>`).join('')}
    </div></div>`:'';
  const volta = c.etapa>0 ? `<button class="btn sm ghost" data-back="${c.id}">Voltar para ${ETAPAS[c.etapa-1]}</button>` : '';
  return `<div class="ov" data-close="1"><aside class="drawer" role="dialog" aria-label="Contrato ${c.numero}">
  <div class="d-head"><div class="row between" style="align-items:flex-start;flex-wrap:nowrap">
    <div style="min-width:0"><span class="mono" style="color:var(--accent-ink)">LOCACOES/${esc(pastaC(c))}</span>
    <h2>${esc(im.titulo)}</h2>
    <div class="contact"><span>${esc(im.bairro)}</span><span>${brl(c.aluguel)}/mês</span><span>Entrada ${dataBR(c.entrada)}</span><span>Garantia: ${esc(c.garantia)}</span><span>Corretor: ${esc(c.corretor)}</span></div>
    ${c.drive_folder_id?`<a class="drive-link" href="https://drive.google.com/drive/folders/${esc(c.drive_folder_id)}" target="_blank" rel="noopener">Abrir pasta no Drive ↗</a>`:'<span class="muted" style="font-size:12.5px">A pasta no Drive é criada no primeiro envio de documento.</span>'}</div>
    <button class="x" data-close="1" aria-label="Fechar">×</button></div>
    <div style="margin-top:14px"><div class="steps">${steps}</div>
    <div class="steps-l"><span>${c.etapa===6?'Todas as etapas concluídas':'Etapa '+(c.etapa+1)+' de 6 · '+ETAPAS[c.etapa]}</span><span>Chaves</span></div></div>
  </div>
  <div class="d-body">
    ${gateHtml}
    ${tarefas}
    <div class="sec"><h3>Partes do contrato</h3><div style="display:flex;flex-direction:column;gap:12px">${partesDe(c).map(x=>parteHtml(c,x)).join('')}</div></div>
    <div class="sec"><h3>Histórico</h3><div class="hist">${(D.hist[c.id]||[]).slice().reverse().map(h=>`<div><small>${dtBR(h.created_at)}</small>${esc(h.texto)}</div>`).join('')||'<div>Sem registros</div>'}</div></div>
    <div class="row">${volta}</div>
  </div></aside></div>`;
}
function parteHtml(c,x){
  const p=P(x.pessoa_id), ds=reqDocs(x.papel,p.estado_civil);
  const tagSt={pendente:['p-mute','Pendente'],enviado:['p-info','Enviado · conferir'],ok:['p-ok','Conferido'],refazer:['p-bad','Pedido de novo']};
  return `<div class="party">
   <div class="party-h"><div style="min-width:0"><span class="who">${PAPEL[x.papel]}</span>
     <h4 style="margin-top:6px">${esc(nomeP(p,x.papel))}</h4>
     <div class="contact">${p.telefone?`<span>${esc(p.telefone)}</span>`:'<span class="miss">Sem WhatsApp</span>'}${p.email?`<span>${esc(p.email)}</span>`:'<span class="miss">Sem e-mail</span>'}${p.estado_civil?`<span>${esc(p.estado_civil)}</span>`:''}${x.papel==='proprietario'&&p.banco?`<span>${esc(p.banco)}</span>`:''}</div></div>
     <div class="row">${x.aprovado?'<span class="pill p-ok">Ficha aprovada</span>':(c.etapa===1&&ds.every(d=>docSt(x.pessoa_id,d)==='ok')?`<button class="btn sm pri" data-aprov="${x.id}">Aprovar ficha</button>`:'')}
     <button class="btn sm ghost" data-editp="${p.id}">Editar dados</button>${window.anexosBtn?window.anexosBtn(x):''}</div>
   </div>
   ${(window.docsLista?window.docsLista(x,ds):ds).map(t=>{const o=(D.docs[x.pessoa_id]||{})[t]||{status:'pendente'}; const [cl,lb]=tagSt[o.status];
     return `<div class="doc"><div class="doc-n"><div>${esc(window.docRotulo?window.docRotulo(t):DOC[t])}</div>${o.arquivo?(o.drive_url?`<small><a class="doclink" href="${esc(o.drive_url)}" target="_blank" rel="noopener">${esc(o.arquivo)} ↗</a></small>`:`<small>${esc(o.arquivo)}</small>`):''}${o.obs?`<small style="color:var(--bad);font-family:var(--f-body)">${esc(o.obs)}</small>`:''}</div>
     <div class="row"><span class="pill ${cl}">${lb}</span>
     ${o.status==='enviado'?`<button class="btn sm" data-conf="${o.id}|${c.id}">Conferir</button><button class="btn sm ghost" data-redo="${o.id}|${c.id}">Pedir de novo</button>`:''}
     ${o.status!=='ok'?`<label class="btn sm ghost up">Anexar<input type="file" data-eup="${x.id}|${t}" accept="image/*,.pdf"></label>`:''}
     ${o.id&&o.arquivo?`<button class="btn sm ghost" style="color:var(--bad)" data-delarq="${o.id}" title="Excluir este arquivo" aria-label="Excluir">🗑</button>`:''}</div></div>`}).join('')}
   ${c.etapa<6||x.papel!=='fiador'?`<div class="linkbox"><code>${esc(linkPortal(x.token))}</code><button class="btn sm" data-copyp="${x.id}">Copiar mensagem</button><a class="btn sm ghost" href="${esc(linkPortal(x.token))}" target="_blank" rel="noopener">Ver portal</a></div>`:''}
  </div>`;
}
function chamadosEquipe(){
  const cols=['aberto','atendimento','aguardando','resolvido'];
  const desc={aberto:'Novo, sem resposta da equipe',atendimento:'Equipe resolvendo',aguardando:'Depende do cliente ou do proprietário',resolvido:'Encerrado'};
  return `<div class="head"><div><h1>Chamados</h1><p>Abertos pelo cliente no portal. Cada um tem protocolo e fica ligado ao contrato.</p></div></div>
  <div class="board-scroll"><div class="board" style="grid-auto-columns:minmax(250px,1fr)">${cols.map(s=>{const hs=D.chamados.filter(h=>h.status===s).slice().reverse();
   return `<section class="col"><div class="col-h"><div><h3>${chSt(s,'equipe')[1]}</h3><small>${desc[s]}</small></div><span class="count">${hs.length}</span></div>
   ${hs.length?hs.map(h=>{const c=D.contratos.find(k=>k.id===h.contrato_id); return `<button class="card" data-chteam="${h.id}"><span class="code">${esc(h.protocolo)}</span><h4>${esc(h.titulo)}</h4>
    <div class="meta">${esc(nomeP(P(h.pessoa_id),h.papel))} · ${PAPEL[h.papel]}</div><div class="meta">${c?esc(pastaC(c)):''}</div>
    <div class="row between"><span class="who">${esc(h.tipo)}</span>${h.orc_status==='pendente'?'<span class="pill p-acc">Orçamento pendente</span>':s!=='resolvido'?`<span class="pill p-mute">SLA ${sla(h.tipo)}</span>`:(h.avaliacao?`<span class="pill p-ok">${'★'.repeat(h.avaliacao)}</span>`:'<span class="pill p-mute">Sem avaliação</span>')}</div></button>`}).join(''):'<div class="empty">Nenhum chamado</div>'}</section>`}).join('')}
  </div></div>`;
}
function chDrawer(h){ const c=D.contratos.find(k=>k.id===h.contrato_id)||{numero:'?'}; const p=P(h.pessoa_id);
  return `<div class="ov" data-close="1"><aside class="drawer" role="dialog" aria-label="Chamado ${esc(h.protocolo)}">
  <div class="d-head"><div class="row between" style="align-items:flex-start;flex-wrap:nowrap"><div style="min-width:0"><span class="mono" style="color:var(--accent-ink)">${esc(h.protocolo)}</span><h2>${esc(h.titulo)}</h2>
  <div class="contact"><span>${esc(h.tipo)}</span><span>${esc(nomeP(p,h.papel))} · ${PAPEL[h.papel]}</span><span>${esc(p.telefone)}</span><span>Contrato ${c.imovel_id?esc(pastaC(c)):''}</span><span>Prazo de resposta ${sla(h.tipo)}</span></div></div>
  <button class="x" data-close="1" aria-label="Fechar">×</button></div></div>
  <div class="d-body">
   <div class="sec"><h3>Status</h3><div class="row">${['aberto','atendimento','aguardando','resolvido'].map(s=>`<button class="btn sm ${h.status===s?'pri':''}" data-chst="${h.id}|${s}">${chSt(s,'equipe')[1]}</button>`).join('')}</div></div>
   ${!h.orc_status||h.orc_status==='recusado'?`<div class="sec"><h3>Orçamento para o proprietário</h3><form class="reply" id="orcform" data-ch="${h.id}"><input id="o-desc" placeholder="Serviço" required><input id="o-val" style="flex:0 1 120px" placeholder="Valor R$" inputmode="decimal" required><button class="btn" type="submit">Pedir aprovação</button></form></div>`:''}
   <div class="sec"><h3>Conversa com o cliente</h3><div class="ch">${threadHtml(h,'equipe',D.msgs[h.id]||[],p.nome)}</div></div>
  </div></aside></div>`;
}
function imoveis(){
  return `<div class="head"><div><h1>Base de imóveis</h1><p>Qualquer corretor inicia um contrato a partir de um imóvel disponível.</p></div><button class="btn pri" data-newimv="1">+ Cadastrar imóvel</button></div>
  ${D.imoveis.length?'':'<div class="empty" style="margin-top:18px">Nenhum imóvel ainda. Cadastre o primeiro para iniciar um contrato.</div>'}
  <div class="grid">${D.imoveis.map(i=>{const p=P(i.proprietario_id); const cl=i.status==='Disponível'?'p-ok':i.status==='Locado'?'p-mute':i.status==='Inativo'?'p-mute':'p-acc';
   const c=D.contratos.filter(c=>c.imovel_id===i.id).sort((a,b)=>b.numero-a.numero)[0];
   return `<article class="imv"><div class="imv-top"><span class="tipo">${esc(i.tipo)}</span><span class="mono">${esc(i.detalhe)}</span></div>
   <div class="imv-b"><h4>${esc(i.titulo)}</h4><div class="meta muted">${esc([i.endereco,i.bairro].filter(Boolean).join(' · '))}</div>
   <div class="meta muted">Proprietário: ${esc(p.nome||'—')}</div><div class="row"><span class="pill ${cl}">${esc(i.status)}</span><button class="btn sm ghost" data-editimv="${i.id}">Editar</button></div>
   <div class="imv-f"><span class="price">${brl(i.aluguel)} <small>/mês</small></span>
   ${i.status==='Disponível'?`<button class="btn pri sm" data-new="${i.id}">Iniciar contrato</button>`:c&&i.status!=='Inativo'?`<button class="btn sm" data-open="${c.id}" data-go="1">Ver contrato</button>`:''}</div></div></article>`}).join('')}</div>`;
}
function pessoas(){
  const rows={};
  D.partes.forEach(x=>{const r=rows[x.pessoa_id]||(rows[x.pessoa_id]={p:P(x.pessoa_id),papeis:new Set(),cs:[],pend:0}); r.papeis.add(PAPEL[x.papel]); const c=D.contratos.find(k=>k.id===x.contrato_id); if(c) r.cs.push(c.numero); r.pend=Math.max(r.pend,pend(x.pessoa_id,x.papel).length);});
  D.imoveis.forEach(i=>{ if(!i.proprietario_id) return; const r=rows[i.proprietario_id]||(rows[i.proprietario_id]={p:P(i.proprietario_id),papeis:new Set(),cs:[],pend:0}); r.papeis.add('Proprietário');});
  const qq=S.busca.toLowerCase();
  const list=Object.values(rows).filter(r=>!qq||(r.p.nome+' '+r.p.telefone+' '+r.p.email).toLowerCase().includes(qq)).sort((a,b)=>(a.p.nome||'zz').localeCompare(b.p.nome||'zz'));
  return `<div class="head"><div><h1>Pessoas</h1><p>Cadastro único: quem envia dados pelo link já entra aqui, com contato e documentos.</p></div>
  <input class="search" id="busca" placeholder="Buscar nome, telefone ou e-mail" value="${esc(S.busca)}"></div>
  <div class="tbl-wrap"><table><thead><tr><th>Nome</th><th>Papel</th><th>WhatsApp</th><th>E-mail</th><th>Contratos</th><th>Cadastro</th><th></th></tr></thead><tbody>
  ${list.map(r=>{const n=D.imoveis.filter(i=>i.proprietario_id===r.p.id).length;
    return `<tr><td><b>${esc(r.p.nome||'A cadastrar')}</b>${n>1?`<br><span class="muted" style="font-size:12px">${n} imóveis na carteira</span>`:''}</td><td>${[...r.papeis].join(', ')}</td>
    <td class="num">${r.p.telefone?esc(r.p.telefone):'<span class="pill p-bad">Falta</span>'}</td><td>${r.p.email?esc(r.p.email):'<span class="pill p-bad">Falta</span>'}</td>
    <td class="mono">${r.cs.length?r.cs.join(', '):'—'}</td><td>${r.pend?`<span class="pill p-warn">${r.pend} pendência${r.pend>1?'s':''}</span>`:'<span class="pill p-ok">Completo</span>'}</td>
    <td><button class="btn sm ghost" data-editp="${r.p.id}">Editar</button></td></tr>`}).join('')||'<tr><td colspan="7" class="muted">Ninguém cadastrado ainda.</td></tr>'}
  </tbody></table></div>`;
}
/* modais */
function modalHtml(){
  const m=S.modal;
  if(m.tipo==='contrato'){ const i=D.imoveis.find(x=>x.id===m.id), p=P(i.proprietario_id);
    return `<div class="ov center"><form class="modal" id="f-contrato">
     <div class="m-h"><span class="mono" style="color:var(--accent-ink)">Novo contrato · ${esc(i.titulo)}</span><h2 style="font-size:19px;margin-top:4px">Iniciar contrato de locação</h2></div>
     <div class="m-b">
      <label class="f">Corretor<input id="n-cor" value="${esc(S.me.nome)}" list="corretores"><datalist id="corretores">${D.equipe.map(e=>`<option>${esc(e.nome)}</option>`).join('')}</datalist></label>
      <label class="f">Aluguel (R$)<input id="n-alu" inputmode="decimal" value="${String(i.aluguel).replace('.',',')}"></label>
      <label class="f">Entrada prevista<input id="n-ent" type="date"></label>
      <label class="f">Garantia<select id="n-gar"><option>Fiador</option><option>Caução</option><option>Caucionador</option><option>Seguro fiança</option></select></label>
      <label class="f full">Nome do inquilino<input id="n-nome" placeholder="Como está na CNH" required></label>
      <label class="f full">WhatsApp do inquilino<input id="n-tel" placeholder="(17) 9____-____" inputmode="tel" required></label>
      <div class="note full">${p.nome?`Proprietário <b>${esc(p.nome)}</b> já está na base. Documentos já conferidos dele são reaproveitados.`:'Este imóvel ainda não tem proprietário. Edite o imóvel antes.'} Com garantia por fiador, o inquilino recebe um link para encaminhar ao fiador.</div>
     </div>
     <div class="m-f"><button type="button" class="btn" data-mclose="1">Cancelar</button><button class="btn pri" type="submit" ${p.nome||i.proprietario_id?'':'disabled'}>Criar contrato e gerar links</button></div>
    </form></div>`; }
  if(m.tipo==='imovel'){ const i=m.id?D.imoveis.find(x=>x.id===m.id):{titulo:'',endereco:'',bairro:'',tipo:'Apartamento',detalhe:'',aluguel:0,status:'Disponível',proprietario_id:''};
    const donos=Object.values(D.pessoas).filter(p=>p.nome).sort((a,b)=>a.nome.localeCompare(b.nome));
    return `<div class="ov center"><form class="modal" id="f-imovel" data-id="${m.id||''}">
     <div class="m-h"><h2 style="font-size:19px">${m.id?'Editar imóvel':'Cadastrar imóvel'}</h2></div>
     <div class="m-b">
      <label class="f full">Nome do imóvel<input id="i-tit" value="${esc(i.titulo)}" placeholder="Ap 23 · Residencial Aurora" required></label>
      <label class="f full">Endereço<input id="i-end" value="${esc(i.endereco)}" placeholder="Rua, número, complemento"></label>
      <label class="f">Bairro<input id="i-bai" value="${esc(i.bairro)}"></label>
      <label class="f">Tipo<select id="i-tipo">${['Apartamento','Casa','Studio','Sala','Salão','Galpão','Terreno'].map(t=>`<option ${i.tipo===t?'selected':''}>${t}</option>`).join('')}</select></label>
      <label class="f">Detalhe<input id="i-det" value="${esc(i.detalhe)}" placeholder="2 dorm. / 38 m²"></label>
      <label class="f">Aluguel (R$)<input id="i-alu" inputmode="decimal" value="${String(i.aluguel).replace('.',',')}"></label>
      <label class="f full">Proprietário<select id="i-dono"><option value="">Selecione</option><option value="novo">+ Novo proprietário</option>${donos.map(p=>`<option value="${p.id}" ${i.proprietario_id===p.id?'selected':''}>${esc(p.nome)}</option>`).join('')}</select></label>
      <label class="f" data-novo hidden>Nome do proprietário<input id="i-dnome"></label>
      <label class="f" data-novo hidden>WhatsApp do proprietário<input id="i-dtel" inputmode="tel"></label>
      ${m.id?`<label class="f full">Situação<select id="i-st">${['Disponível','Em contrato','Locado','Inativo'].map(s=>`<option ${i.status===s?'selected':''}>${s}</option>`).join('')}</select></label>`:''}
     </div>
     <div class="m-f"><button type="button" class="btn" data-mclose="1">Cancelar</button><button class="btn pri" type="submit">Salvar imóvel</button></div></form></div>`; }
  if(m.tipo==='pessoa'){ const p=P(m.id);
    return `<div class="ov center"><form class="modal" id="f-pessoa" data-id="${m.id}">
     <div class="m-h"><h2 style="font-size:19px">Editar dados</h2></div>
     <div class="m-b">
      <label class="f full">Nome completo<input id="p-nome" value="${esc(p.nome)}"></label>
      <label class="f">WhatsApp<input id="p-tel" value="${esc(p.telefone)}"></label>
      <label class="f">E-mail<input id="p-email" type="email" value="${esc(p.email)}"></label>
      <label class="f">Estado civil<select id="p-est"><option value="">Selecione</option>${ESTADOS.map(o=>`<option ${p.estado_civil===o?'selected':''}>${o}</option>`).join('')}</select></label>
      <label class="f">Conta para repasse<input id="p-banco" value="${esc(p.banco)}" placeholder="Só para proprietário"></label>
     </div>
     <div class="m-f"><button type="button" class="btn" data-mclose="1">Cancelar</button><button class="btn pri" type="submit">Salvar</button></div></form></div>`; }
  return '';
}
/* ações da equipe */
async function acao(fn, msg){ document.body.classList.add('sending'); try{ await fn(); await carregar(); if(msg) toast(msg); }catch(e){ falha(e); } finally{ document.body.classList.remove('sending'); render(); } }
function equipeEventos(){
  document.addEventListener('click', e=>{
    const t=e.target.closest('button,[data-close],label.task'); if(!t) return; const d=t.dataset;
    if(d.sair){ sb.auth.signOut().then(()=>location.reload()); return; }
    if(d.reload) return acao(async()=>{}, 'Atualizado');
    if(d.tab){ S.tab=d.tab; S.open=null; S.chTeam=null; try{history.replaceState(null,'','#'+d.tab);}catch(_){} return render(); }
    if(d.open){ S.open=d.open; if(d.go){ S.tab='contratos'; } return render(); }
    if(d.close!==undefined && e.target===t){ S.open=null; S.chTeam=null; return render(); }
    if(d.chteam){ S.chTeam=d.chteam; return render(); }
    if(d.new){ S.modal={tipo:'contrato',id:d.new}; return render(); }
    if(d.newimv){ S.modal={tipo:'imovel'}; return render(); }
    if(d.editimv){ S.modal={tipo:'imovel',id:d.editimv}; return render(); }
    if(d.editp){ S.modal={tipo:'pessoa',id:d.editp}; return render(); }
    if(d.mclose){ S.modal=null; return render(); }
    if(d.copyp){ const x=D.partes.find(k=>k.id===d.copyp), c=D.contratos.find(k=>k.id===x.contrato_id); return copiar(msgWhats(c,x)); }
    if(d.conf){ const [id,cid]=d.conf.split('|'); return acao(async()=>{ const doc=Object.values(D.docs).flatMap(o=>Object.values(o)).find(o=>o.id===id);
      await q(sb.from('documentos').update({status:'ok',obs:'',updated_at:new Date().toISOString()}).eq('id',id)); await log(cid, DOC[doc.tipo]+' de '+(P(doc.pessoa_id).nome||'cliente')+' conferido por '+S.me.nome); }, 'Documento conferido'); }
    if(d.redo){ const [id,cid]=d.redo.split('|'); return acao(async()=>{ const doc=Object.values(D.docs).flatMap(o=>Object.values(o)).find(o=>o.id===id);
      await q(sb.from('documentos').update({status:'refazer',obs:'Arquivo ilegível ou incorreto. Envie novamente.',updated_at:new Date().toISOString()}).eq('id',id)); await log(cid,'Pedido reenvio de '+DOC[doc.tipo]+' para '+(P(doc.pessoa_id).nome||'cliente')); }, 'Cliente vai ver o pedido no portal'); }
    if(d.aprov){ const x=D.partes.find(k=>k.id===d.aprov); return acao(async()=>{ await q(sb.from('partes').update({aprovado:true}).eq('id',x.id)); await log(x.contrato_id,'Ficha de '+(P(x.pessoa_id).nome||PAPEL[x.papel])+' aprovada por '+S.me.nome); }, 'Ficha aprovada'); }
    if(d.adv||d.back){ const c=D.contratos.find(k=>k.id===(d.adv||d.back)); const nova=c.etapa+(d.adv?1:-1);
      return acao(async()=>{ await q(sb.from('contratos').update({etapa:nova}).eq('id',c.id));
        if(nova===6) await q(sb.from('imoveis').update({status:'Locado'}).eq('id',c.imovel_id));
        if(c.etapa===6&&nova<6) await q(sb.from('imoveis').update({status:'Em contrato'}).eq('id',c.imovel_id));
        await log(c.id,(d.adv?'Avançou':'Voltou')+' para '+ETAPAS[nova]+' ('+S.me.nome+')'); }, 'Contrato '+c.numero+' em '+ETAPAS[nova]); }
    if(d.chst){ const [id,st]=d.chst.split('|'); return acao(async()=>{ await q(sb.from('chamados').update({status:st,updated_at:new Date().toISOString()}).eq('id',id));
      if(st==='resolvido') await q(sb.from('mensagens').insert({chamado_id:id,autor:'equipe',autor_nome:S.me.nome,texto:'Chamado encerrado pela equipe. Se algo continuar, é só reabrir.'})); }, 'Status atualizado'); }
  });
  document.addEventListener('change', e=>{
    const el=e.target;
    if(el.dataset.task){ const [cid,k]=el.dataset.task.split('|'); const c=D.contratos.find(x=>x.id===cid); const tar=Object.assign({},c.tarefas||{}); tar[k]=el.checked;
      return acao(async()=>{ await q(sb.from('contratos').update({tarefas:tar}).eq('id',cid)); if(el.checked) await log(cid, TAREFAS[c.etapa][+k.split('-')[1]]+' ('+S.me.nome+')'); }); }
    if(el.dataset.eup && el.files[0]){ const [pid,tipo]=el.dataset.eup.split('|'); const file=el.files[0];
      return acao(async()=>{ toast('Enviando para o Drive…'); const tk=await q(sb.rpc('equipe_upload',{p_parte:pid,p_doc_tipo:tipo})); await enviarPonte(tk,file); }, 'Arquivo salvo no Drive'); }
    if(el.id==='i-dono'){ document.querySelectorAll('[data-novo]').forEach(x=>x.hidden=el.value!=='novo'); }
  });
  document.addEventListener('input', e=>{ if(e.target.id==='busca'){ S.busca=e.target.value; const pos=e.target.selectionStart; render(); const b=$('#busca'); b.focus(); try{b.setSelectionRange(pos,pos);}catch(_){} } });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape'&&(S.open||S.modal||S.chTeam)){ S.open=null; S.modal=null; S.chTeam=null; render(); } });
  document.addEventListener('submit', async e=>{
    e.preventDefault(); const f=e.target, v=id=>{const x=f.querySelector('#'+id); return x?x.value.trim():'';};
    if(f.id==='login'){ const email=v('l-email'); const {error}=await sb.auth.signInWithOtp({email, options:{emailRedirectTo: location.origin+location.pathname}});
      if(error) return loginRender('Não deu para enviar o link: '+error.message);
      app.innerHTML=`<div class="wrap"><div class="login"><img src="${LOGO}" alt="Citihaus"><h1>Confira seu e-mail</h1><p class="muted" style="margin:0">Enviamos um link de acesso para <b>${esc(email)}</b>. Abra o e-mail neste mesmo aparelho e clique no link.</p></div></div>`; return; }
    if(f.id==='f-contrato'){ const i=D.imoveis.find(x=>x.id===S.modal.id);
      return acao(async()=>{ const cid=await q(sb.rpc('equipe_novo_contrato',{p_imovel:i.id,p_corretor:v('n-cor'),p_aluguel:num(v('n-alu'))||i.aluguel,p_entrada:v('n-ent')||null,p_garantia:v('n-gar'),p_inq_nome:v('n-nome'),p_inq_tel:v('n-tel')}));
        S.modal=null; S.tab='contratos'; S.open=cid; }, 'Contrato criado. Copie os links e mande no WhatsApp.'); }
    if(f.id==='f-imovel'){ return acao(async()=>{ let dono=v('i-dono');
        if(dono==='novo'){ if(!v('i-dnome')) throw new Error('Informe o nome do proprietário'); const np=await q(sb.from('pessoas').insert({nome:v('i-dnome'),telefone:v('i-dtel')}).select().single()); dono=np.id; }
        const row={titulo:v('i-tit'),endereco:v('i-end'),bairro:v('i-bai'),tipo:v('i-tipo'),detalhe:v('i-det'),aluguel:num(v('i-alu')),proprietario_id:dono||null};
        if(f.dataset.id){ row.status=v('i-st')||undefined; await q(sb.from('imoveis').update(row).eq('id',f.dataset.id)); } else await q(sb.from('imoveis').insert(row));
        S.modal=null; }, 'Imóvel salvo'); }
    if(f.id==='f-pessoa'){ return acao(async()=>{ await q(sb.from('pessoas').update({nome:v('p-nome'),telefone:v('p-tel'),email:v('p-email').toLowerCase(),estado_civil:v('p-est'),banco:v('p-banco')}).eq('id',f.dataset.id)); S.modal=null; }, 'Dados salvos'); }
    if(f.id==='orcform'){ const id=f.dataset.ch; return acao(async()=>{ await q(sb.from('chamados').update({orc_desc:v('o-desc'),orc_valor:num(v('o-val')),orc_status:'pendente',updated_at:new Date().toISOString()}).eq('id',id));
        await q(sb.from('mensagens').insert({chamado_id:id,autor:'equipe',autor_nome:S.me.nome,texto:'Enviamos o orçamento para aprovação do proprietário. Assim que ele aprovar, agendamos o serviço.'})); }, 'Pedido de aprovação enviado ao portal do proprietário'); }
    if(f.dataset.reply){ const [id]=f.dataset.reply.split('|'); const txt=f.querySelector('textarea').value.trim(); if(!txt) return; const h=D.chamados.find(k=>k.id===id);
      return acao(async()=>{ await q(sb.from('mensagens').insert({chamado_id:id,autor:'equipe',autor_nome:S.me.nome,texto:txt}));
        if(h.status==='aberto') await q(sb.from('chamados').update({status:'atendimento',updated_at:new Date().toISOString()}).eq('id',id)); }, 'Resposta enviada'); }
  });
}

/* ---------- início ---------- */
if(TOKEN){ portalEventos(); portalLoad(); }
else { equipeEventos(); equipeInit().catch(falha); }
