/* Citihaus · anexos: enviar vários documentos de uma vez (com reconhecimento do tipo) e excluir anexo */
(function(){
if(TOKEN) return;

/* tipos extras, além dos obrigatórios da esteira */
const EXTRA = {rg:'RG', cpf:'CPF', renda:'Comprovante de renda', ir:'Imposto de renda', social:'Contrato social',
  cnpj:'Cartão CNPJ', procuracao:'Procuração', estadocivil:'Comprovante de estado civil', outro:'Outro documento'};
const raiz = t => String(t||'').replace(/-\d{6,}$/,'');
const rotulo = t => DOC[raiz(t)] || EXTRA[raiz(t)] || raiz(t);
const semAcento = s => String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const kb = b => !b ? '' : b>1e6 ? (b/1e6).toFixed(1).replace('.',',')+' MB' : Math.max(1,Math.round(b/1e3))+' KB';
const ext = n => (String(n||'').split('.').pop()||'').toUpperCase().slice(0,4);
window.docRotulo = rotulo;
/* a ficha mostra os obrigatórios e também o que foi anexado a mais */
window.docsLista = (x, obrig) => obrig.concat(Object.keys(D.docs[x.pessoa_id]||{}).filter(k=>!obrig.includes(k)));
window.anexosBtn = x => `<button class="btn sm" data-anexos="${x.id}">📎 Anexar vários</button>`;

/* ---------- reconhecer o que é cada arquivo ---------- */
/* tudo sem acento e em minúsculas: o nome do arquivo quase nunca vem acentuado */
const PISTAS = [
  ['cnh',        /\bcnh\b|habilitac|detran|condutor|carteira.?nacional/,            /carteira nacional de habilitac|permissao para dirigir|detran|registro nacional de condutores/],
  ['rg',         /\brg\b|identidade|registro.?geral/,                               /registro geral|carteira de identidade|secretaria de seguranca/],
  ['cpf',        /\bcpf\b/,                                                         /cadastro de pessoas? fisicas?/],
  ['resid',      /comprov.{0,12}(resid|endere)|residencia|endereco|conta.{0,4}(de)?.{0,4}(luz|agua|energia)|fatura|cpfl|enel|energisa|sabesp|semae|comgas/, /unidade consumidora|energia eletrica|conta de agua|total a pagar|data de vencimento|fatura/],
  ['cert',       /certid|casamento|nascimento|uniao.?estavel/,                      /certidao de (casamento|nascimento)|registro civil das pessoas naturais|livro.{0,20}folha/],
  ['mat',        /matric|registro.?de.?imovel|cartorio/,                            /matricula n|registro de imoveis|oficial de registro|livro n.{0,4}2/],
  ['iptu',       /iptu|predial|carne/,                                              /imposto predial|iptu|inscricao cadastral|valor venal/],
  ['contas',     /conta.?de.?consumo|condominio|condom/,                            /condominio|taxa condominial|rateio/],
  ['renda',      /renda|holerite|contracheque|salario|extrato/,                     /demonstrativo de pagamento|holerite|salario liquido|rendimentos/],
  ['ir',         /imposto.?de.?renda|irpf|declaracao/,                              /declaracao de ajuste anual|imposto sobre a renda|receita federal/],
  ['social',     /contrato.?social|estatuto|alteracao.?contratual/,                 /contrato social|junta comercial|clausula primeira/],
  ['cnpj',       /cnpj/,                                                            /comprovante de inscricao e de situacao cadastral|numero de inscricao.{0,30}matriz/],
  ['procuracao', /procurac/,                                                        /procuracao|outorgante|outorgado/]];

function adivinhar(nome, texto){
  const n = semAcento(nome), t = semAcento(texto||'');
  let melhor = '', pontos = 0;
  PISTAS.forEach(([tipo, reN, reT])=>{
    const p = (reN.test(n) ? 2 : 0) + (reT.test(t) ? 3 : 0);
    if(p > pontos){ pontos = p; melhor = tipo; }
  });
  if(melhor === 'cnh' && /conjuge|esposa|marido/.test(n + ' ' + t)) melhor = 'cnhc';
  return pontos >= 2 ? melhor : '';
}

/* lê o texto da primeira página do PDF; foto não dá para ler, aí o tipo fica para você apontar */
let pdfP = null;
const carregaPDF = () => pdfP || (pdfP = new Promise((ok,nok)=>{ if(window.pdfjsLib) return ok(window.pdfjsLib);
  const s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
  s.onload=()=>{ try{ window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; }catch(_){ } ok(window.pdfjsLib); };
  s.onerror=()=>{ pdfP=null; nok(new Error('sem pdf.js')); }; document.head.appendChild(s); }));
async function textoPDF(file){
  try{
    const lib=await carregaPDF(), doc=await lib.getDocument({data:await file.arrayBuffer()}).promise;
    let t='';
    for(let p=1;p<=Math.min(doc.numPages,2);p++){ const tc=await (await doc.getPage(p)).getTextContent(); t += ' ' + tc.items.map(i=>i.str).join(' '); }
    return t.slice(0,6000);
  }catch(_){ return ''; }
}

/* ---------- modal ---------- */
const modalAx = modalHtml;
modalHtml = function(){
  const m = S.modal;
  if(!(m && m.tipo==='anexos')) return modalAx();
  const A = S.anexos || {itens:[]}, x = D.partes.find(k=>k.id===m.parte); if(!x) return modalAx();
  const p = P(x.pessoa_id), obrig = reqDocs(x.papel, p.estado_civil), jaTem = D.docs[x.pessoa_id] || {};
  const opcoes = t => `<option value="">— escolha o tipo —</option>`
    + `<optgroup label="Desta locação">${obrig.map(k=>`<option value="${k}" ${t===k?'selected':''}>${esc(DOC[k])}${jaTem[k]&&jaTem[k].arquivo?' (substitui o atual)':''}</option>`).join('')}</optgroup>`
    + `<optgroup label="Outros">${Object.keys(EXTRA).map(k=>`<option value="${k}" ${t===k?'selected':''}>${esc(EXTRA[k])}</option>`).join('')}</optgroup>`;
  const faltam = A.itens.filter(i=>!i.tipo && !i.ok).length, enviando = A.enviando;
  return `<div class="ov center"><form class="modal" id="f-anexos" data-parte="${x.id}" style="width:min(680px,calc(100% - 24px));max-width:none">
   <div class="m-h"><span class="mono" style="color:var(--accent-ink)">${esc(PAPEL[x.papel])}</span>
     <h2 style="font-size:19px;margin-top:4px">📎 Anexar documentos de ${esc((p.nome||'').split(' ')[0]||'cliente')}</h2></div>
   <div class="m-b">
    ${!A.itens.length?`<div class="full" style="text-align:center;padding:18px 0">
       <label class="btn pri" style="cursor:pointer">📂 Escolher os arquivos<input type="file" id="ax-file" hidden multiple accept="image/*,.pdf"></label>
       <p class="muted" style="font-size:13px;margin:12px 0 0">Pode escolher todos de uma vez. Eu tento reconhecer o que é cada um pelo nome do arquivo e, nos PDFs, pelo conteúdo. O que eu não reconhecer, você aponta aqui mesmo.</p></div>`
     :`<div class="full">
       <div class="row between" style="gap:8px;flex-wrap:wrap;margin-bottom:10px">
         <span class="muted" style="font-size:12.5px">${A.itens.length} arquivo${A.itens.length>1?'s':''}${A.lendo?' · lendo…':faltam?` · <b style="color:var(--bad)">${faltam} sem tipo</b>`:' · tudo pronto'}</span>
         <label class="btn sm ghost" style="cursor:pointer">+ Mais arquivos<input type="file" id="ax-file" hidden multiple accept="image/*,.pdf"></label></div>
       ${A.itens.map((i,k)=>`<div style="display:flex;gap:10px;align-items:center;padding:9px 10px;border:1px solid ${i.erro?'var(--bad)':i.ok?'var(--ok)':'var(--line)'};border-radius:12px;margin-bottom:8px">
         <div style="flex:none;width:38px;height:38px;border-radius:9px;background:var(--accent-soft);display:flex;align-items:center;justify-content:center;font:800 10.5px var(--f-body);color:var(--accent-ink)">${esc(ext(i.nome))||'DOC'}</div>
         <div style="flex:1;min-width:0">
           <div style="font-size:13px;font-weight:600;overflow-wrap:anywhere">${esc(i.nome)}</div>
           <div class="muted" style="font-size:11.5px">${kb(i.tam)}${i.auto?' · <span style="color:var(--ok)">reconhecido</span>':''}${i.erro?' · <span style="color:var(--bad)">'+esc(i.erro)+'</span>':''}${i.ok?' · <span style="color:var(--ok)">anexado ✓</span>':''}</div>
         </div>
         ${i.ok?'':`<select data-axtipo="${k}" style="flex:none;max-width:210px;border:1px solid var(--line);border-radius:9px;padding:7px 8px;background:var(--bg);color:inherit;font:inherit;font-size:12.5px">${opcoes(i.tipo)}</select>
         <button type="button" class="btn sm ghost" data-axtira="${k}" aria-label="Tirar da lista">✕</button>`}
       </div>`).join('')}
       <div class="note full">Os arquivos ficam guardados no contrato, visíveis só para a equipe. Quem enviar um tipo que já existe substitui o anterior.</div></div>`}
   </div>
   <div class="m-f"><button type="button" class="btn" data-mclose="1">${A.itens.some(i=>i.ok)?'Fechar':'Cancelar'}</button>
     ${A.itens.length?`<button class="btn pri" type="submit" ${faltam||enviando||A.lendo?'disabled':''}>${enviando?'Enviando…':'Anexar '+A.itens.filter(i=>!i.ok).length+' arquivo'+(A.itens.filter(i=>!i.ok).length>1?'s':'')}</button>`:''}</div>
  </form></div>`;
};

/* ---------- eventos ---------- */
document.addEventListener('click', e=>{
  if(!S.me) return; const b=e.target.closest('button'); if(!b) return; const d=b.dataset;
  if(d.anexos){ e.stopImmediatePropagation(); S.anexos={itens:[]}; S.modal={tipo:'anexos', parte:d.anexos}; return render(); }
  if(d.axtira!==undefined){ e.stopImmediatePropagation(); S.anexos.itens.splice(+d.axtira,1); return render(); }
  if(d.delarq){ e.stopImmediatePropagation();
    if(b.dataset.ok!=='1'){ b.dataset.ok='1'; b.textContent='Excluir mesmo?'; b.style.color='var(--bad)'; return; }
    const doc=Object.values(D.docs).flatMap(o=>Object.values(o)).find(o=>o.id===d.delarq); if(!doc) return;
    const parte=D.partes.find(k=>k.pessoa_id===doc.pessoa_id);
    return acao(async()=>{
      const url=String(doc.drive_url||'');
      if(url.startsWith('storage:')){ try{ await sb.storage.from('documentos').remove([url.slice(8)]); }catch(_){ } }
      await q(sb.from('documentos').delete().eq('id', doc.id));
      if(parte) await log(parte.contrato_id, rotulo(doc.tipo)+' de '+(P(doc.pessoa_id).nome||'cliente')+' excluído por '+S.me.nome);
    }, 'Documento excluído'); }
}, true);

document.addEventListener('change', e=>{
  const el=e.target; if(!S.me) return;
  if(el.dataset && el.dataset.axtipo!==undefined){ e.stopImmediatePropagation(); const i=S.anexos.itens[+el.dataset.axtipo]; i.tipo=el.value; i.auto=false; return render(); }
  if(el.id!=='ax-file' || !el.files || !el.files.length) return;
  e.stopImmediatePropagation();
  const novos=[...el.files].map(f=>({file:f, nome:f.name, tam:f.size, tipo:'', auto:false}));
  const A=S.anexos; A.itens=A.itens.concat(novos); A.lendo=true; render();
  (async()=>{
    for(const i of novos){
      const texto = /\.pdf$/i.test(i.nome) ? await textoPDF(i.file) : '';
      const t = adivinhar(i.nome, texto);
      if(t){ i.tipo=t; i.auto=true; }
    }
    A.lendo=false; render();
  })();
}, true);

document.addEventListener('submit', e=>{
  const f=e.target; if(f.id!=='f-anexos') return; e.preventDefault(); e.stopImmediatePropagation();
  const A=S.anexos, parte=f.dataset.parte, x=D.partes.find(k=>k.id===parte); if(!x||A.enviando) return;
  const pend=A.itens.filter(i=>!i.ok);
  if(pend.some(i=>!i.tipo)) return toast('Escolha o tipo de cada arquivo');
  A.enviando=true; render();
  (async()=>{
    const usados=Object.assign({}, D.docs[x.pessoa_id]||{});
    let n=0;
    for(const i of pend){
      try{
        let tipo=i.tipo;
        if(EXTRA[tipo] && usados[tipo]) tipo = tipo+'-'+Date.now();   /* extra repetido vira um novo documento */
        const tk=await q(sb.rpc('equipe_upload',{p_parte:parte, p_doc_tipo:tipo}));
        await enviarPonte(tk, i.file);
        usados[tipo]={}; i.ok=true; i.erro=null; n++;
      }catch(err){ i.erro=(err&&err.message||String(err)).slice(0,80); }
      render();
    }
    A.enviando=false;
    await carregar();
    if(A.itens.every(i=>i.ok)){ S.modal=null; S.anexos=null; }
    render();
    toast(n ? n+' documento'+(n>1?'s':'')+' anexado'+(n>1?'s':'')+' ✓' : 'Nenhum arquivo foi anexado');
  })();
}, true);
})();
