/* Citihaus · Meu Contrato — Esteira de Captação (atendimento → informações → imagens → descrições → publicação no Loft CRM) */
(function(){
if(TOKEN) return;
const CE = ['Atendimento','Informações','Imagens','Descrições','Publicação','Publicado'];
const CE_DESC = ['Contato com o proprietário','Ficha completa do imóvel','Fotos, ordem e capa','Título e descrição','Envio ao Loft CRM','No ar no CRM'];
const CE_IC = ['🤝','📋','📸','✍️','🚀','✅'];
const CATEG = ['Apartamento','Casa','Casa em condomínio','Cobertura','Kitnet/Studio','Terreno','Terreno em condomínio','Sala comercial','Loja','Galpão/Barracão','Chácara','Prédio comercial'];
const SEM_DORM = ['Terreno','Terreno em condomínio','Sala comercial','Loja','Galpão/Barracão','Prédio comercial'];
const CARAC = ['Varanda','Varanda gourmet','Churrasqueira','Piscina privativa','Ar-condicionado','Armários planejados','Closet','Escritório','Quintal','Área de serviço','Aquecimento solar','Energia solar','Portão eletrônico','Câmeras/alarme'];
const LAZER = ['Piscina','Academia','Salão de festas','Espaço gourmet','Churrasqueira coletiva','Playground','Quadra','Portaria 24h','Elevador','Pet place','Sauna','Brinquedoteca'];
const ORIGENS = ['Indicação','Instagram','Placa','Portal (ZAP/OLX)','Prospecção ativa','WhatsApp','Site','Outro'];
const FINS = ['Venda','Locação','Venda e locação'];
const MIN_FOTOS = 5;

D.captacoes = D.captacoes || []; D.capFotos = D.capFotos || {}; D.capHist = D.capHist || {}; D.integ = D.integ || null;
S.capOpen = S.capOpen || null; S.capModal = S.capModal || null;

const carregarOrig = carregar;
carregar = async function(){
  await carregarOrig();
  try{
    const [cs, fs, hs, ig] = await Promise.all([
      q(sb.from('captacoes').select('*').order('numero')),
      q(sb.from('captacao_fotos').select('*').order('ordem')),
      q(sb.from('captacao_hist').select('*').order('created_at')),
      q(sb.rpc('equipe_integracoes')).catch(()=>null)
    ]);
    D.captacoes = cs; D.capFotos = {}; fs.forEach(f=>(D.capFotos[f.captacao_id]=D.capFotos[f.captacao_id]||[]).push(f));
    D.capHist = {}; hs.forEach(h=>(D.capHist[h.captacao_id]=D.capHist[h.captacao_id]||[]).push(h)); D.integ = ig;
  }catch(e){ console.warn('captacoes', e); }
};

const fotoUrl = p => sb.storage.from('fotos').getPublicUrl(p).data.publicUrl;
const fotosDe = c => (D.capFotos[c.id]||[]).slice().sort((a,b)=>(b.capa-a.capa)||(a.ordem-b.ordem));
const fic = c => c.ficha||{};
const ate = c => c.atendimento||{};
const capCod = c => 'CAP-' + String(c.numero).padStart(3,'0');
const capTitulo = c => { const f=fic(c); return [f.categoria, f.condominio||f.bairro].filter(Boolean).join(' · ') || (P(c.proprietario_id).nome ? 'Imóvel de '+P(c.proprietario_id).nome.split(' ')[0] : 'Nova captação'); };
const capLog = (id, texto) => q(sb.from('captacao_hist').insert({captacao_id:id, texto}));

function capGate(c, et){
  et = et===undefined ? c.etapa : et; const f=fic(c), p=P(c.proprietario_id), out=[];
  if(et===0){ if(!p.nome) out.push('Nome do proprietário'); if(!p.telefone) out.push('Celular do proprietário'); if(!ate(c).origem) out.push('Origem do contato'); if(!f.bairro && !f.endereco) out.push('Endereço ou bairro do imóvel'); }
  if(et===1){
    if(!f.categoria) out.push('Tipo do imóvel');
    if(!f.endereco) out.push('Endereço'); if(!f.bairro) out.push('Bairro');
    if(!f.area_util && !f.area_total) out.push('Área (útil ou total)');
    if(!SEM_DORM.includes(f.categoria) && (f.dormitorios===undefined || f.dormitorios==='')) out.push('Dormitórios');
    if(c.finalidade!=='Locação' && !f.valor_venda) out.push('Valor de venda');
    if(c.finalidade!=='Venda' && !f.valor_locacao) out.push('Valor de locação');
  }
  if(et===2){ const n=fotosDe(c).length; if(n<MIN_FOTOS) out.push(`Pelo menos ${MIN_FOTOS} fotos (tem ${n})`); }
  if(et===3){ if(!c.titulo) out.push('Título'); if(!c.descricao) out.push('Descrição'); if(c.titulo&&c.descricao&&!c.texto_aprovado) out.push('Aprovar o texto'); }
  if(et===4){ if(!c.loft_codigo) out.push('Publicar no Loft CRM'); }
  return [...new Set(out)];
}
const capPendHerd = c => { const out=[]; for(let e=0;e<Math.min(c.etapa,5);e++) capGate(c,e).forEach(x=>out.push(CE[e]+': '+x)); return out; };

/* ---------- lista / kanban ---------- */
function capCard(c){
  const p=P(c.proprietario_id), fs=fotosDe(c), g=capGate(c), herd=capPendHerd(c), capa=fs[0];
  let flag = c.etapa===5 ? `<span class="pill p-ok">No Loft · ${esc(c.loft_codigo||'')}</span>`
    : c.loft_status==='erro' ? '<span class="pill p-bad">Erro ao publicar</span>'
    : c.ia_status==='gerando' ? '<span class="pill p-info">IA escrevendo…</span>'
    : !g.length ? '<span class="pill p-ok">Pronto para avançar</span>' : `<span class="pill p-mute">${g.length} pendente${g.length>1?'s':''}</span>`;
  return `<button class="card" data-capopen="${c.id}" style="${herd.length?'border-color:var(--bad);box-shadow:inset 3px 0 0 var(--bad)':''}">
    ${capa?`<div style="height:96px;border-radius:8px;background:#ddd center/cover url('${esc(fotoUrl(capa.path))}')"></div>`:''}
    <span class="code">${capCod(c)} · ${esc(c.finalidade)}</span>
    <h4>${esc(capTitulo(c))}</h4>
    <span class="meta">${esc(p.nome||'Proprietário a cadastrar')}${c.corretor?' · '+esc(c.corretor):''}</span>
    <div class="row">${flag}${fs.length?`<span class="pill p-acc">${fs.length} foto${fs.length>1?'s':''}</span>`:''}${herd.length?`<span class="pill p-bad">${herd.length} de etapas anteriores</span>`:''}</div>
  </button>`;
}
function captacoesHtml(){
  const L=D.captacoes, and=L.filter(c=>c.etapa<5).length, semana=L.filter(c=>Date.now()-new Date(c.created_at)<7*864e5).length,
    pub=L.filter(c=>c.etapa===5).length, prontos=L.filter(c=>c.etapa<5&&!capGate(c).length).length, ig=D.integ||{};
  return `<div class="head"><div><h1>Captações</h1><p>Do primeiro contato com o proprietário até o imóvel no ar no Loft CRM.</p></div>
    <div class="row">${S.me.papel==='admin'?'<button class="btn" data-capinteg="1">⚙ Integrações</button>':''}<button class="btn pri" data-capnew="1">+ Nova captação</button></div></div>
  <div class="stats">
    <div class="stat hl"><b>${semana}<span style="font-size:13px;color:var(--muted)"> / 3</span></b><span>captações nesta semana (meta 3)</span></div>
    <div class="stat"><b>${and}</b><span>em andamento</span></div>
    <div class="stat"><b>${prontos}</b><span>prontas para avançar</span></div>
    <div class="stat"><b>${pub}</b><span>publicadas no Loft</span></div>
  </div>
  ${(!ig.ia||!ig.loft)?`<div class="gate no" style="margin-top:12px"><div class="gt"><b>Integrações pendentes:</b> ${[!ig.ia?'IA para descrições (chave Anthropic)':'', !ig.loft?'Loft CRM (endereço + chave da API)':''].filter(Boolean).join(' · ')}.${S.me.papel==='admin'?' Configure em ⚙ Integrações.':' Peça ao administrador.'}</div></div>`:''}
  <div class="board-scroll"><div class="board">
  ${CE.map((e,i)=>{ const cs=L.filter(c=>c.etapa===i).slice().reverse();
    return `<section class="col"><div class="col-h"><div><h3>${CE_IC[i]} ${e}</h3><small>${CE_DESC[i]}</small></div><span class="count">${cs.length}</span></div>
    ${cs.length?cs.map(capCard).join(''):'<div class="empty">Nenhuma captação aqui</div>'}</section>`; }).join('')}
  </div></div>`;
}

/* ---------- ficha (drawer) ---------- */
const inp = (c, k, rot, o={}) => { const v=(o.src||fic(c))[k]??''; const attr=o.src===ate(c)?'data-ate':'data-fic';
  return `<label class="f ${o.full?'full':''}"><span>${rot}${o.req?' <span style="color:var(--bad)">*</span>':''}</span><input ${attr}="${k}" data-c="${c.id}" value="${esc(v)}" ${o.type?`type="${o.type}"`:''} ${o.mode?`inputmode="${o.mode}"`:''} placeholder="${esc(o.ph||'')}"></label>`; };
const sel = (c, k, rot, ops, o={}) => { const v=(o.src||fic(c))[k]??''; const attr=o.src===ate(c)?'data-ate':'data-fic';
  return `<label class="f ${o.full?'full':''}"><span>${rot}${o.req?' <span style="color:var(--bad)">*</span>':''}</span><select ${attr}="${k}" data-c="${c.id}"><option value="">—</option>${ops.map(x=>`<option ${String(v)===x?'selected':''}>${esc(x)}</option>`).join('')}</select></label>`; };
const chips = (c, k, ops) => { const v=fic(c)[k]||[];
  return `<div class="full" style="display:flex;flex-wrap:wrap;gap:6px">${ops.map(x=>`<label style="display:inline-flex;gap:6px;align-items:center;padding:6px 10px;border-radius:99px;border:1px solid ${v.includes(x)?'var(--accent)':'var(--line)'};background:${v.includes(x)?'var(--accent-soft)':'var(--surface)'};font-size:12.5px;font-weight:600;cursor:pointer"><input type="checkbox" data-ficarr="${k}" data-c="${c.id}" value="${esc(x)}" ${v.includes(x)?'checked':''} style="accent-color:var(--accent)">${esc(x)}</label>`).join('')}</div>`; };
const secH = (i, c) => { const g=capGate(c,i), feito=c.etapa>i, atual=c.etapa===i;
  return `<div class="row between" style="margin-bottom:10px"><h3 style="margin:0">${CE_IC[i]} ${i+1}. ${CE[i]}</h3>${feito?(g.length?`<span class="pill p-bad">${g.length} pendente${g.length>1?'s':''}</span>`:'<span class="pill p-ok">Concluída</span>'):atual?'<span class="pill p-acc">Etapa atual</span>':'<span class="pill p-mute">Próxima</span>'}</div>`; };

function secAtend(c){
  const p=P(c.proprietario_id), a=ate(c);
  return `<div class="sec box" id="cap-s0">${secH(0,c)}<div class="fgrid">
    <label class="f"><span>Proprietário <span style="color:var(--bad)">*</span></span><input data-prop="nome" data-c="${c.id}" value="${esc(p.nome)}" placeholder="Nome completo"></label>
    <label class="f"><span>Celular <span style="color:var(--bad)">*</span></span><input data-prop="telefone" data-c="${c.id}" value="${esc(p.telefone)}" inputmode="tel" placeholder="(17) 9…"></label>
    <label class="f">E-mail<input data-prop="email" data-c="${c.id}" value="${esc(p.email)}" type="email"></label>
    <label class="f">Finalidade<select data-col="finalidade" data-c="${c.id}">${FINS.map(x=>`<option ${c.finalidade===x?'selected':''}>${x}</option>`).join('')}</select></label>
    ${sel(c,'origem','Origem do contato',ORIGENS,{src:a,req:true})}
    <label class="f">Corretor captador<input data-col="corretor" data-c="${c.id}" value="${esc(c.corretor||'')}"></label>
    ${inp(c,'visita','Visita / fotos agendada',{src:a,type:'datetime-local'})}
    ${sel(c,'exclusividade','Exclusividade',['Sim','Não'])}
    ${inp(c,'obs','Observações do atendimento',{src:a,full:true,ph:'Ex.: quer vender em até 3 meses, aceita permuta por apto menor'})}
    ${p.telefone?`<div class="full"><a class="btn sm" target="_blank" rel="noopener" href="https://wa.me/55${String(p.telefone).replace(/\D/g,'').replace(/^55/,'')}">💬 Abrir conversa no WhatsApp</a></div>`:''}
  </div></div>`;
}
function secInfo(c){
  const f=fic(c), semD=SEM_DORM.includes(f.categoria);
  return `<div class="sec box" id="cap-s1">${secH(1,c)}<div class="fgrid">
    ${sel(c,'categoria','Tipo do imóvel',CATEG,{req:true})}
    ${sel(c,'uso','Uso',['Residencial','Comercial'])}
    ${inp(c,'condominio','Condomínio / empreendimento',{full:true})}
    ${inp(c,'cep','CEP',{mode:'numeric',ph:'15000-000'})}
    ${inp(c,'numero','Número')}
    ${inp(c,'endereco','Endereço',{req:true,full:true})}
    ${inp(c,'complemento','Complemento',{ph:'Apto, bloco, lote'})}
    ${inp(c,'bairro','Bairro',{req:true})}
    ${inp(c,'cidade','Cidade',{ph:'São José do Rio Preto'})}
    ${inp(c,'uf','UF',{ph:'SP'})}
    ${inp(c,'area_util','Área útil (m²)',{mode:'decimal',req:!f.area_total})}
    ${inp(c,'area_total','Área total / terreno (m²)',{mode:'decimal'})}
    ${semD?'':inp(c,'dormitorios','Dormitórios',{mode:'numeric',req:true})}
    ${semD?'':inp(c,'suites','Suítes',{mode:'numeric'})}
    ${inp(c,'banheiros','Banheiros',{mode:'numeric'})}
    ${inp(c,'vagas','Vagas',{mode:'numeric'})}
    ${inp(c,'andar','Andar',{mode:'numeric'})}
    ${inp(c,'ano','Ano de construção',{mode:'numeric'})}
    ${c.finalidade!=='Locação'?inp(c,'valor_venda','Valor de venda (R$)',{mode:'decimal',req:true}):''}
    ${c.finalidade!=='Venda'?inp(c,'valor_locacao','Valor de locação (R$)',{mode:'decimal',req:true}):''}
    ${inp(c,'valor_condominio','Condomínio (R$/mês)',{mode:'decimal'})}
    ${inp(c,'valor_iptu','IPTU (R$/ano)',{mode:'decimal'})}
    ${sel(c,'mobiliado','Mobiliado',['Não','Semi','Sim'])}
    ${sel(c,'ocupacao','Ocupação',['Desocupado','Ocupado pelo proprietário','Alugado'])}
    ${c.finalidade!=='Locação'?sel(c,'financiamento','Aceita financiamento',['Sim','Não']):''}
    ${c.finalidade!=='Locação'?sel(c,'permuta','Aceita permuta',['Sim','Não']):''}
    ${sel(c,'chaves','Chaves',['Com a Citihaus','Com o proprietário','Portaria','Inquilino'])}
    ${sel(c,'placa','Placa autorizada',['Sim','Não'])}
    ${inp(c,'matricula','Matrícula')}
    ${inp(c,'inscricao_iptu','Inscrição do IPTU')}
    ${inp(c,'comissao','Comissão combinada (%)',{mode:'decimal'})}
    <div class="full" style="font-size:12.5px;font-weight:600;color:var(--muted);margin-top:4px">Características do imóvel</div>
    ${chips(c,'caracteristicas',CARAC)}
    <div class="full" style="font-size:12.5px;font-weight:600;color:var(--muted);margin-top:4px">Lazer e condomínio</div>
    ${chips(c,'lazer',LAZER)}
    ${inp(c,'diferenciais','Diferenciais em poucas palavras (ajuda a IA)',{full:true,ph:'Ex.: vista livre, sol da manhã, reformado em 2025, rua tranquila'})}
    ${inp(c,'obs_internas','Observações internas (não vão para o anúncio)',{full:true})}
  </div><div class="muted" style="font-size:12px;margin-top:8px">Salva sozinho a cada campo. Campos no padrão dos portais (ZAP, VivaReal, OLX) e do Loft CRM.</div></div>`;
}
function secFotos(c){
  const fs=fotosDe(c);
  return `<div class="sec box" id="cap-s2">${secH(2,c)}
    <div class="row" style="margin-bottom:10px;gap:8px"><label class="btn pri sm" style="cursor:pointer">+ Adicionar fotos<input type="file" hidden multiple accept="image/*" data-capfotos="${c.id}"></label>
    ${fs.length?`<button class="btn sm" data-capzip="${c.id}">⬇ Baixar todas (.zip)</button>`:''}<span class="muted" style="font-size:12.5px">${fs.length} foto${fs.length===1?'':'s'} · mínimo ${MIN_FOTOS}. A primeira é a capa.</span></div>
    ${fs.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px">${fs.map((f,i)=>`<div style="position:relative;border-radius:10px;overflow:hidden;border:2px solid ${f.capa?'var(--accent)':'var(--line)'}">
      <img src="${esc(fotoUrl(f.path))}" loading="lazy" style="width:100%;height:100px;object-fit:cover;display:block" alt="Foto ${i+1}">
      ${f.capa?'<span style="position:absolute;top:6px;left:6px;background:var(--accent);color:#fff;font-size:11px;font-weight:700;padding:2px 7px;border-radius:99px">CAPA</span>':''}
      <div style="display:flex;justify-content:space-between;background:var(--surface);padding:4px">
        <button class="btn sm" style="padding:3px 7px" data-capmov="${f.id}|-1" ${i===0?'disabled':''} aria-label="Mover para a esquerda">◀</button>
        <button class="btn sm" style="padding:3px 7px" data-capcapa="${f.id}" ${f.capa?'disabled':''} aria-label="Definir como capa">★</button>
        <button class="btn sm" style="padding:3px 7px" data-capmov="${f.id}|1" ${i===fs.length-1?'disabled':''} aria-label="Mover para a direita">▶</button>
        <button class="btn sm" style="padding:3px 7px;color:var(--bad)" data-capdelf="${f.id}" aria-label="Excluir foto">${S.capDelF===f.id?'?':'🗑'}</button></div></div>`).join('')}</div>`
      :'<div class="empty">Nenhuma foto ainda. Pode subir direto do celular: elas são reduzidas automaticamente para o padrão dos portais.</div>'}
  </div>`;
}
function secTexto(c){
  const ig=D.integ||{}, gerando=c.ia_status==='gerando', n=(c.titulo||'').length;
  return `<div class="sec box" id="cap-s3">${secH(3,c)}
    <div class="row" style="gap:8px;margin-bottom:10px"><button class="btn pri sm" data-capia="${c.id}" ${gerando||!ig.ia?'disabled':''}>${gerando?'✨ Escrevendo…':c.titulo?'✨ Gerar de novo com IA':'✨ Gerar título e descrição com IA'}</button>
      <span class="muted" style="font-size:12.5px">${ig.ia?`A IA lê a ficha${fotosDe(c).length?' e as fotos':''} e escreve no padrão Citihaus.`:'Configure a chave da IA em ⚙ Integrações.'}</span></div>
    ${c.ia_status==='erro'&&c.ia_erro?`<div class="gate no" style="margin-bottom:10px"><div class="gt" style="color:var(--bad)"><b>A IA não conseguiu gerar:</b> ${esc(c.ia_erro.slice(0,220))}</div></div>`:''}
    <form id="f-captexto" data-c="${c.id}" class="fgrid">
      <label class="f full"><span>Título <span class="muted" style="font-weight:500">(${n}/70)</span></span><input id="ct-tit" maxlength="120" value="${esc(c.titulo||'')}" placeholder="Ex.: Apartamento 2 quartos com varanda gourmet no Green Home"></label>
      <label class="f full">Descrição<textarea class="ta" id="ct-desc" rows="10" placeholder="Descrição do anúncio">${esc(c.descricao||'')}</textarea></label>
      <div class="full row between"><span class="pill ${c.texto_aprovado?'p-ok':'p-warn'}">${c.texto_aprovado?'Texto aprovado':'Aguardando aprovação'}</span>
        <div class="row"><button class="btn sm" type="submit">Salvar texto</button><button class="btn sm pri" type="button" data-capaprova="${c.id}" ${c.titulo&&c.descricao?'':'disabled'}>${c.texto_aprovado?'Aprovado ✓':'Aprovar texto'}</button></div></div>
    </form></div>`;
}
function secPub(c){
  const ig=D.integ||{}, st=c.loft_status, env=st==='enviando'||st==='fotos';
  return `<div class="sec box" id="cap-s4">${secH(4,c)}
    ${c.loft_codigo?`<div class="gate yes" style="margin-bottom:10px"><div class="gt"><b>No Loft CRM · código ${esc(c.loft_codigo)}</b>${c.loft_erro?`<div style="color:var(--bad);font-size:12.5px">${esc(c.loft_erro)}</div>`:''}</div></div>`:''}
    ${st==='erro'?`<div class="gate no" style="margin-bottom:10px"><div class="gt" style="color:var(--bad)"><b>O Loft recusou o envio:</b> ${esc((c.loft_erro||'').slice(0,300))}</div></div>`:''}
    <div class="row" style="gap:8px"><button class="btn pri" data-cappub="${c.id}" ${env||!ig.loft||!c.texto_aprovado?'disabled':''}>${env?'🚀 Enviando…':c.loft_codigo?'🔄 Atualizar no Loft':'🚀 Publicar no Loft CRM'}</button>
      <button class="btn" data-capcopia="${c.id}">📋 Copiar ficha completa</button></div>
    ${!c.loft_codigo?`<div class="row" style="gap:8px;margin-top:10px"><input id="cp-cod" placeholder="Código no Loft (se publicou à mão)" style="flex:1;min-width:160px;border:1px solid var(--line);border-radius:9px;padding:7px 10px;background:var(--bg)"><button class="btn sm" data-capmanual="${c.id}">Marcar como publicado</button></div>`:''}
    <div class="muted" style="font-size:12.5px;margin-top:8px">${!ig.loft?'Integração com o Loft ainda não configurada. Enquanto isso, use "Copiar ficha" para colar no CRM.':!c.texto_aprovado?'Aprove o texto da etapa Descrições para liberar a publicação.':'Envia ficha, proprietário, título, descrição e fotos (na ordem, com capa).'}</div>
    ${c.loft_resposta?`<details style="margin-top:8px"><summary class="muted" style="cursor:pointer;font-size:12.5px">Resposta técnica do Loft</summary><pre style="white-space:pre-wrap;font-size:11.5px;background:var(--surface-2);padding:8px;border-radius:8px;max-height:180px;overflow:auto">${esc(c.loft_resposta)}</pre></details>`:''}
  </div>`;
}
function capDrawer(c){
  const g=capGate(c), herd=capPendHerd(c), adm=S.me.papel==='admin', hs=(D.capHist[c.id]||[]).slice().reverse();
  const passos = CE.map((e,i)=>`<div style="flex:1;height:6px;border-radius:99px;background:${c.etapa>i?'var(--ok)':c.etapa===i?'var(--accent)':'var(--line)'}" title="${e}"></div>`).join('');
  const avancar = c.etapa>=5 ? '' : c.etapa===4 ? '' : `<div class="gate ${g.length?'no':'yes'}"><div class="gt">${g.length?`<b>Para sair de “${CE[c.etapa]}”, falta:</b><ul>${g.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:`<b>Tudo certo em “${CE[c.etapa]}”.</b>`}</div>
    ${g.length?(adm?`<button class="btn" style="border-color:var(--bad);color:var(--bad)" data-capadv="${c.id}|1">${S.capForce===c.id?'Confirmar: avançar com pendências':'Avançar mesmo assim'}</button>`:''):`<button class="btn pri" data-capadv="${c.id}|0">Avançar para ${CE[c.etapa+1]} →</button>`}</div>`;
  const ordem=[secAtend,secInfo,secFotos,secTexto,secPub], cur=Math.min(c.etapa,4);
  const secs=[cur, ...[0,1,2,3,4].filter(i=>i!==cur)].map(i=>ordem[i](c)).join('');
  return `<div class="ov" data-capclose="1"><aside class="drawer" role="dialog" aria-label="Captação ${capCod(c)}" id="cap-drawer">
  <div class="d-head"><div class="row between" style="align-items:flex-start;flex-wrap:nowrap"><div style="min-width:0"><span class="mono" style="color:var(--accent-ink)">${capCod(c)} · ${esc(c.finalidade)}</span><h2>${esc(capTitulo(c))}</h2>
    <div class="muted" style="font-size:12.5px">${esc(P(c.proprietario_id).nome||'')}${c.corretor?' · captador '+esc(c.corretor):''} · ${CE_IC[c.etapa]} ${CE[c.etapa]}</div></div>
    <button class="x" data-capclose="1" aria-label="Fechar">×</button></div>
    <div style="display:flex;gap:4px;margin-top:12px">${passos}</div></div>
  <div class="d-body">
    ${herd.length?`<div class="gate" style="background:var(--bad-soft);color:var(--bad)"><div class="gt"><b>Avançou com pendências de etapas anteriores:</b><ul>${herd.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div></div>`:''}
    ${avancar}
    ${secs}
    <div class="sec"><h3>Histórico</h3>${hs.length?hs.map(h=>`<div style="font-size:13px;padding:6px 0;border-bottom:1px solid var(--line)"><span class="muted" style="font-size:12px">${dataBR(h.created_at)} ${new Date(h.created_at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span> · ${esc(h.texto)}</div>`).join(''):'<p class="muted" style="margin:0">Sem registros.</p>'}</div>
    ${adm?`<div class="row" style="justify-content:flex-end"><button class="btn sm" style="color:var(--bad)" data-capdel="${c.id}">${S.capDel===c.id?'Confirmar exclusão da captação':'Excluir captação'}</button></div>`:''}
  </div></aside></div>`;
}

/* ---------- modais ---------- */
function capModalHtml(){
  const m=S.capModal;
  if(m.tipo==='nova'){ return `<div class="ov center"><form class="modal" id="f-capnova">
    <div class="m-h"><span class="mono" style="color:var(--accent-ink)">Nova captação</span><h2 style="font-size:19px;margin-top:4px">🤝 Atendimento ao proprietário</h2></div>
    <div class="m-b">
      <label class="f full">Nome do proprietário<input id="cn-nome" required placeholder="Nome completo"></label>
      <label class="f">Celular<input id="cn-tel" required inputmode="tel" placeholder="(17) 9…"></label>
      <label class="f">Finalidade<select id="cn-fin">${FINS.map(x=>`<option>${x}</option>`).join('')}</select></label>
      <label class="f">Origem<select id="cn-ori">${ORIGENS.map(x=>`<option>${x}</option>`).join('')}</select></label>
      <label class="f">Corretor captador<input id="cn-cor" value="${esc(S.me.nome||'')}"></label>
      <label class="f full">Bairro ou endereço do imóvel<input id="cn-bai" placeholder="Ex.: Jd. Maracanã"></label>
      <div class="note full">Se o celular já existir no cadastro, a captação é ligada à mesma pessoa.</div>
    </div>
    <div class="m-f"><button type="button" class="btn" data-capmclose="1">Cancelar</button><button class="btn pri" type="submit">Criar captação</button></div></form></div>`; }
  if(m.tipo==='integ'){ const ig=D.integ||{};
    return `<div class="ov center"><form class="modal" id="f-capinteg" style="width:min(600px,calc(100% - 32px))">
    <div class="m-h"><span class="mono" style="color:var(--accent-ink)">Administrador</span><h2 style="font-size:19px;margin-top:4px">⚙ Integrações da captação</h2></div>
    <div class="m-b">
      <div class="full" style="font-weight:700">✨ IA para títulos e descrições ${ig.ia?'<span class="pill p-ok">Configurada</span>':'<span class="pill p-warn">Pendente</span>'}</div>
      <label class="f full">Chave da API da Anthropic<input id="ig-ant" type="password" autocomplete="off" placeholder="${ig.ia?'Deixe vazio para manter':'sk-ant-…'}"></label>
      <div class="note full">Crie em console.anthropic.com → API Keys. A chave fica guardada cifrada no banco e nunca aparece no site.</div>
      <div class="full" style="font-weight:700;margin-top:6px">🚀 Loft CRM ${ig.loft?'<span class="pill p-ok">Configurado</span>':'<span class="pill p-warn">Pendente</span>'}</div>
      <label class="f full">Endereço da API<input id="ig-url" value="${esc(ig.loft_url||'')}" placeholder="https://suaimobiliaria-rest.vistahost.com.br"></label>
      <label class="f full">Chave da API do Loft<input id="ig-key" type="password" autocomplete="off" placeholder="${ig.loft?'Deixe vazio para manter':'chave fornecida pelo suporte Loft'}"></label>
      <div class="note full">O endereço e a chave da API são liberados pelo suporte do Loft (CRM ex-Vista). Depois de salvar, clique em “Testar conexão”.</div>
      ${m.teste?`<pre class="full" style="white-space:pre-wrap;font-size:11.5px;background:var(--surface-2);padding:8px;border-radius:8px;max-height:200px;overflow:auto">${esc(m.teste)}</pre>`:''}
    </div>
    <div class="m-f"><button type="button" class="btn" data-capmclose="1">Fechar</button><button type="button" class="btn" data-caplofttest="1" ${ig.loft?'':'disabled'}>Testar conexão</button><button class="btn pri" type="submit">Salvar</button></div></form></div>`; }
  return '';
}

/* ---------- render ---------- */
const renderOrig = render;
render = function(){
  const dr=document.getElementById('cap-drawer'), st=dr?dr.scrollTop:0;
  renderOrig();
  if(!S.me || TOKEN) return;
  const nav=document.querySelector('nav.sub'); if(!nav) return;
  if(!nav.querySelector('[data-tab="captacoes"]')){
    const n=D.captacoes.filter(c=>c.etapa<5).length;
    const ref=nav.querySelector('[data-tab="ativos"]')||nav.querySelector('[data-tab="contratos"]');
    ref.insertAdjacentHTML('afterend', `<button data-tab="captacoes" aria-pressed="${S.tab==='captacoes'}">Captações${n?`<span class="tabn">${n}</span>`:''}</button>`);
  }
  if(S.tab==='captacoes'){
    nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.tab==='captacoes'));
    const w=document.querySelector('#app .wrap'); [...w.children].forEach(ch=>{ if(ch!==nav) ch.remove(); });
    w.insertAdjacentHTML('beforeend', captacoesHtml());
  }
  const c=S.capOpen && D.captacoes.find(k=>k.id===S.capOpen);
  if(c) layer.insertAdjacentHTML('beforeend', capDrawer(c));
  if(S.capModal) layer.insertAdjacentHTML('beforeend', capModalHtml());
  const nd=document.getElementById('cap-drawer'); if(nd && st) nd.scrollTop=st;
};

/* ---------- salvamento automático ---------- */
const capById = id => D.captacoes.find(k=>k.id===id);
const filas = {};
function salvarCampo(c, patch, msg){
  clearTimeout(filas[c.id]); Object.assign(c, patch);
  filas[c.id] = setTimeout(async()=>{ try{ await q(sb.from('captacoes').update(Object.assign({}, patch, {updated_at:new Date().toISOString()})).eq('id',c.id)); toast(msg||'Salvo ✓'); }catch(e){ falha(e); } }, 350);
}
const filaF = {};
function salvarFicha(c){ clearTimeout(filaF[c.id]); filaF[c.id]=setTimeout(async()=>{ try{ await q(sb.from('captacoes').update({ficha:c.ficha, atendimento:c.atendimento, updated_at:new Date().toISOString()}).eq('id',c.id)); toast('Salvo ✓'); refrescarGate(c); }catch(e){ falha(e); } }, 400); }
function refrescarGate(c){ if(document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && document.activeElement.type!=='checkbox') return; render(); }

async function buscaCep(c, cep){
  const d=String(cep).replace(/\D/g,''); if(d.length!==8) return;
  try{ const r=await (await fetch('https://viacep.com.br/ws/'+d+'/json/')).json(); if(r.erro) return toast('CEP não encontrado');
    c.ficha=Object.assign({}, c.ficha, {cep:r.cep, endereco:c.ficha.endereco||r.logradouro, bairro:c.ficha.bairro||r.bairro, cidade:r.localidade, uf:r.uf});
    salvarFicha(c); render(); toast('Endereço preenchido pelo CEP'); }catch(_){}
}

document.addEventListener('change', e=>{
  const el=e.target, cid=el.dataset && (el.dataset.c || el.dataset.capfotos), c=cid && capById(cid); if(!c) return;
  if(el.dataset.fic!==undefined){ e.stopImmediatePropagation(); c.ficha=Object.assign({}, c.ficha, {[el.dataset.fic]:el.value.trim()}); salvarFicha(c); if(el.dataset.fic==='cep') buscaCep(c, el.value); if(el.tagName==='SELECT') render(); return; }
  if(el.dataset.ate!==undefined){ e.stopImmediatePropagation(); c.atendimento=Object.assign({}, c.atendimento, {[el.dataset.ate]:el.value.trim()}); salvarFicha(c); return; }
  if(el.dataset.ficarr!==undefined){ e.stopImmediatePropagation(); const k=el.dataset.ficarr, v=new Set(c.ficha[k]||[]); el.checked?v.add(el.value):v.delete(el.value); c.ficha=Object.assign({}, c.ficha, {[k]:[...v]}); salvarFicha(c); render(); return; }
  if(el.dataset.col){ e.stopImmediatePropagation(); salvarCampo(c, {[el.dataset.col]:el.value.trim()}); if(el.dataset.col==='finalidade') render(); return; }
  if(el.dataset.prop){ e.stopImmediatePropagation(); const k=el.dataset.prop, v=el.value.trim();
    (async()=>{ try{ let pid=c.proprietario_id;
      if(!pid){ const np=await q(sb.from('pessoas').insert({[k]:v}).select().single()); pid=np.id; D.pessoas[pid]=np; await q(sb.from('captacoes').update({proprietario_id:pid}).eq('id',c.id)); c.proprietario_id=pid; }
      else { await q(sb.from('pessoas').update({[k]:v}).eq('id',pid)); D.pessoas[pid]=Object.assign({}, D.pessoas[pid], {[k]:v}); }
      toast('Salvo ✓'); refrescarGate(c); }catch(err){ falha(err); } })(); return; }
  if(el.dataset.capfotos && el.files && el.files.length){ e.stopImmediatePropagation(); subirFotos(c, [...el.files]); }
}, true);

/* ---------- fotos ---------- */
function reduzir(file){ return new Promise(ok=>{ const img=new Image(), url=URL.createObjectURL(file);
  img.onload=()=>{ const M=2000, s=Math.min(1, M/Math.max(img.width,img.height)), cv=document.createElement('canvas'); cv.width=Math.round(img.width*s); cv.height=Math.round(img.height*s);
    cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height); cv.toBlob(b=>{ URL.revokeObjectURL(url); ok(b||file); }, 'image/jpeg', 0.85); };
  img.onerror=()=>{ URL.revokeObjectURL(url); ok(file); }; img.src=url; }); }
function subirFotos(c, files){
  acao(async()=>{
    let ordem=Math.max(0,...fotosDe(c).map(f=>f.ordem))+1, temCapa=fotosDe(c).some(f=>f.capa), i=0;
    for(const file of files){ i++; toast(`Enviando foto ${i} de ${files.length}…`);
      const blob=await reduzir(file), path=`cap/${c.id}/${Date.now()}-${i}.jpg`;
      const up=await sb.storage.from('fotos').upload(path, blob, {contentType:'image/jpeg', upsert:false}); if(up.error) throw up.error;
      await q(sb.from('captacao_fotos').insert({captacao_id:c.id, path, ordem:ordem++, capa:!temCapa})); temCapa=true; }
    await capLog(c.id, files.length+' foto(s) adicionada(s) por '+S.me.nome);
  }, files.length+' foto(s) adicionada(s)');
}
async function baixarFotosZip(c){
  const fs=fotosDe(c); if(!fs.length) return; toast('Montando o .zip…');
  try{ const z=new JSZip(); let i=0; for(const f of fs){ i++; const b=await (await fetch(fotoUrl(f.path))).blob(); z.file(String(i).padStart(2,'0')+(f.capa?'_capa':'')+'.jpg', b); }
    const blob=await z.generateAsync({type:'blob'}), a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=capCod(c)+'_fotos.zip'; a.click(); }catch(e){ falha(e); }
}

/* ---------- espera de respostas (IA e Loft) ---------- */
async function esperar(fn, ok, max=45){ for(let i=0;i<max;i++){ await new Promise(r=>setTimeout(r,2500)); const r=await q(fn()); if(ok(r)) return r; } return null; }

function fichaTexto(c){
  const f=fic(c), p=P(c.proprietario_id), L=[];
  const add=(r,v)=>{ if(v!==undefined && v!=='' && !(Array.isArray(v)&&!v.length)) L.push(r+': '+(Array.isArray(v)?v.join(', '):v)); };
  add('Código interno', capCod(c)); add('Finalidade', c.finalidade); add('Tipo', f.categoria); add('Condomínio', f.condominio);
  add('Endereço', [f.endereco, f.numero, f.complemento].filter(Boolean).join(', ')); add('Bairro', f.bairro); add('Cidade', (f.cidade||'São José do Rio Preto')+'/'+(f.uf||'SP')); add('CEP', f.cep);
  add('Área útil (m²)', f.area_util); add('Área total (m²)', f.area_total); add('Dormitórios', f.dormitorios); add('Suítes', f.suites); add('Banheiros', f.banheiros); add('Vagas', f.vagas); add('Andar', f.andar); add('Ano', f.ano);
  if(f.valor_venda) add('Valor de venda', brl(num(f.valor_venda))); if(f.valor_locacao) add('Valor de locação', brl(num(f.valor_locacao)));
  if(f.valor_condominio) add('Condomínio', brl(num(f.valor_condominio))); if(f.valor_iptu) add('IPTU', brl(num(f.valor_iptu)));
  add('Mobiliado', f.mobiliado); add('Aceita financiamento', f.financiamento); add('Aceita permuta', f.permuta); add('Exclusividade', f.exclusividade);
  add('Características', f.caracteristicas); add('Lazer', f.lazer); add('Matrícula', f.matricula); add('Inscrição IPTU', f.inscricao_iptu);
  add('Proprietário', [p.nome, p.telefone, p.email].filter(Boolean).join(' · ')); add('Corretor captador', c.corretor);
  return (c.titulo?c.titulo+'\n\n':'')+(c.descricao?c.descricao+'\n\n':'')+'— FICHA —\n'+L.join('\n')+'\n\nFotos:\n'+fotosDe(c).map((x,i)=>(i+1)+'. '+fotoUrl(x.path)).join('\n');
}

document.addEventListener('click', e=>{
  const b=e.target.closest('button,[data-capclose]'); if(!b) return; const d=b.dataset;
  if(d.tab==='captacoes'){ e.stopImmediatePropagation(); S.tab='captacoes'; S.open=null; S.chTeam=null; try{history.replaceState(null,'','#captacoes');}catch(_){} return render(); }
  if(d.capclose!==undefined){ if(e.target!==b && !b.matches('button')) return; e.stopImmediatePropagation(); S.capOpen=null; S.capForce=null; S.capDel=null; return render(); }
  if(d.capopen){ e.stopImmediatePropagation(); S.capOpen=d.capopen; S.capForce=null; S.capDel=null; return render(); }
  if(d.capnew){ e.stopImmediatePropagation(); S.capModal={tipo:'nova'}; return render(); }
  if(d.capinteg){ e.stopImmediatePropagation(); S.capModal={tipo:'integ'}; return render(); }
  if(d.capmclose){ e.stopImmediatePropagation(); S.capModal=null; return render(); }
  if(d.caplofttest){ e.stopImmediatePropagation(); return (async()=>{ try{ toast('Testando o Loft…'); const id=await q(sb.rpc('admin_loft_testar'));
      const r=await esperar(()=>sb.rpc('admin_loft_teste_resultado',{p_req:id}), x=>x.status!=='aguardando', 16);
      S.capModal.teste = !r ? 'Sem resposta do Loft em 40 s.' : (r.status==='ok'?'✅ Conexão OK. Campos aceitos pela conta:\n':'❌ HTTP '+r.http+':\n')+r.conteudo; render(); }catch(err){ falha(err); } })(); }
  const c = (d.capadv||d.capia||d.cappub||d.capaprova||d.capcopia||d.capzip||d.capdel||'') && capById((d.capadv||d.capia||d.cappub||d.capaprova||d.capcopia||d.capzip||d.capdel).split('|')[0]);
  if(d.capadv){ e.stopImmediatePropagation(); const forca=d.capadv.split('|')[1]==='1', g=capGate(c);
    if(forca && S.capForce!==c.id){ S.capForce=c.id; return render(); }
    S.capForce=null; const nova=c.etapa+1;
    return acao(async()=>{ await q(sb.from('captacoes').update({etapa:nova, updated_at:new Date().toISOString()}).eq('id',c.id));
      await capLog(c.id, 'Avançou para '+CE[nova]+' ('+S.me.nome+')'+(forca&&g.length?' com pendências: '+g.join('; '):'')); }, capCod(c)+' em '+CE[nova]); }
  if(d.capia){ e.stopImmediatePropagation();
    return (async()=>{ try{ await q(sb.rpc('captacao_ia_pedir',{p_id:c.id})); c.ia_status='gerando'; render(); toast('A IA está escrevendo o anúncio…');
      const r=await esperar(()=>sb.rpc('captacao_ia_resultado',{p_id:c.id}), x=>x.status!=='gerando', 40);
      await carregar(); render(); toast(!r?'A IA está demorando. Atualize em instantes.':r.status==='ok'?'Título e descrição prontos ✨ Revise e aprove.':'A IA não conseguiu gerar. Veja o aviso.'); }catch(err){ falha(err); await carregar(); render(); } })(); }
  if(d.capaprova){ e.stopImmediatePropagation(); const t=document.getElementById('ct-tit'), ds=document.getElementById('ct-desc');
    return acao(async()=>{ await q(sb.from('captacoes').update({titulo:t?t.value.trim():c.titulo, descricao:ds?ds.value.trim():c.descricao, texto_aprovado:true, updated_at:new Date().toISOString()}).eq('id',c.id));
      await capLog(c.id, 'Texto aprovado por '+S.me.nome); }, 'Texto aprovado'); }
  if(d.cappub){ e.stopImmediatePropagation();
    return (async()=>{ try{ await q(sb.rpc('captacao_loft_publicar',{p_id:c.id})); c.loft_status='enviando'; render(); toast('Enviando ao Loft CRM…');
      const r=await esperar(()=>sb.rpc('captacao_loft_resultado',{p_id:c.id}), x=>!['enviando','fotos'].includes(x.status), 40);
      await carregar(); render(); toast(!r?'O Loft está demorando. Atualize em instantes.':r.status==='publicado'?'Publicado no Loft · código '+r.codigo+' 🚀':'O Loft recusou. Veja o aviso.'); }catch(err){ falha(err); await carregar(); render(); } })(); }
  if(d.capmanual){ e.stopImmediatePropagation(); const cc=capById(d.capmanual), cod=(document.getElementById('cp-cod')||{}).value||''; if(!cod.trim()) return toast('Informe o código do imóvel no Loft');
    return acao(async()=>{ await q(sb.from('captacoes').update({loft_codigo:cod.trim(), loft_status:'publicado', etapa:5, updated_at:new Date().toISOString()}).eq('id',cc.id)); await capLog(cc.id,'Marcado como publicado no Loft (código '+cod.trim()+') por '+S.me.nome); }, 'Captação publicada'); }
  if(d.capcopia){ e.stopImmediatePropagation(); return copiar(fichaTexto(c)); }
  if(d.capzip){ e.stopImmediatePropagation(); return baixarFotosZip(c); }
  if(d.capdel){ e.stopImmediatePropagation(); if(S.capDel!==c.id){ S.capDel=c.id; return render(); }
    S.capDel=null; return acao(async()=>{ const fs=fotosDe(c); if(fs.length) await sb.storage.from('fotos').remove(fs.map(f=>f.path)); await q(sb.from('captacoes').delete().eq('id',c.id)); S.capOpen=null; }, 'Captação excluída'); }
  if(d.capmov){ e.stopImmediatePropagation(); const [fid,dir]=d.capmov.split('|'); const f=Object.values(D.capFotos).flat().find(x=>x.id===fid), cc=capById(f.captacao_id), fs=fotosDe(cc), i=fs.findIndex(x=>x.id===fid), j=i+(+dir);
    if(j<0||j>=fs.length) return; const a=fs[i], b2=fs[j];
    return acao(async()=>{ const capaA=a.capa, capaB=b2.capa; await q(sb.from('captacao_fotos').update({ordem:b2.ordem, capa:capaB}).eq('id',a.id)); await q(sb.from('captacao_fotos').update({ordem:a.ordem, capa:capaA}).eq('id',b2.id)); }); }
  if(d.capcapa){ e.stopImmediatePropagation(); const f=Object.values(D.capFotos).flat().find(x=>x.id===d.capcapa);
    return acao(async()=>{ await q(sb.from('captacao_fotos').update({capa:false}).eq('captacao_id',f.captacao_id)); await q(sb.from('captacao_fotos').update({capa:true}).eq('id',f.id)); }, 'Capa definida'); }
  if(d.capdelf){ e.stopImmediatePropagation(); const f=Object.values(D.capFotos).flat().find(x=>x.id===d.capdelf);
    if(S.capDelF!==f.id){ S.capDelF=f.id; return render(); } S.capDelF=null;
    return acao(async()=>{ await sb.storage.from('fotos').remove([f.path]); await q(sb.from('captacao_fotos').delete().eq('id',f.id));
      if(f.capa){ const resto=fotosDe(capById(f.captacao_id)).filter(x=>x.id!==f.id); if(resto[0]) await q(sb.from('captacao_fotos').update({capa:true}).eq('id',resto[0].id)); } }, 'Foto excluída'); }
}, true);

document.addEventListener('submit', e=>{
  const f=e.target;
  if(f.id==='f-capnova'){ e.preventDefault(); e.stopImmediatePropagation(); const g=id=>f.querySelector('#'+id).value.trim();
    const tel=g('cn-tel'), dig=tel.replace(/\D/g,'').slice(-8);
    return acao(async()=>{ let p=Object.values(D.pessoas).find(x=>dig.length===8 && String(x.telefone||'').replace(/\D/g,'').slice(-8)===dig);
      if(!p) p=await q(sb.from('pessoas').insert({nome:g('cn-nome'), telefone:tel}).select().single());
      const bai=g('cn-bai');
      const nc=await q(sb.from('captacoes').insert({finalidade:g('cn-fin'), corretor:g('cn-cor'), proprietario_id:p.id, criado_por:S.me.nome,
        atendimento:{origem:g('cn-ori')}, ficha:bai?{bairro:bai}:{}}).select().single());
      await capLog(nc.id, 'Captação aberta por '+S.me.nome+' · origem: '+g('cn-ori'));
      S.capModal=null; S.capOpen=nc.id; S.tab='captacoes'; }, 'Captação criada'); }
  if(f.id==='f-capinteg'){ e.preventDefault(); e.stopImmediatePropagation(); const g=id=>f.querySelector('#'+id).value.trim();
    return acao(async()=>{ await q(sb.rpc('admin_integracoes',{p_anthropic:g('ig-ant')||null, p_loft_url:g('ig-url'), p_loft_key:g('ig-key')||null})); }, 'Integrações salvas'); }
  if(f.id==='f-captexto'){ e.preventDefault(); e.stopImmediatePropagation(); const c=capById(f.dataset.c);
    return acao(async()=>{ await q(sb.from('captacoes').update({titulo:f.querySelector('#ct-tit').value.trim(), descricao:f.querySelector('#ct-desc').value.trim(), texto_aprovado:false, updated_at:new Date().toISOString()}).eq('id',c.id)); }, 'Texto salvo'); }
}, true);
document.addEventListener('input', e=>{ if(e.target.id==='ct-tit'){ const s=e.target.closest('label'); const m=s&&s.querySelector('.muted'); if(m){ const n=e.target.value.length; m.textContent='('+n+'/70)'; m.style.color=n>70?'var(--bad)':''; } } }, true);
document.addEventListener('keydown', e=>{ if(e.key==='Escape' && (S.capOpen||S.capModal)){ S.capModal?S.capModal=null:S.capOpen=null; render(); } });

if((location.hash||'')==='#captacoes') S.tab='captacoes';
if(S.me) carregar().then(render).catch(()=>{});
})();
