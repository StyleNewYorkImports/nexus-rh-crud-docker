const API = '/api/funcionarios';
const $ = (seletor) => document.querySelector(seletor);
const elementos = {
  formulario: $('#form-funcionario'), id: $('#funcionario-id'), nome: $('#nome'), cpf: $('#cpf'),
  cargo: $('#cargo'), setor: $('#setor'), email: $('#email'), telefone: $('#telefone'),
  admissao: $('#data-admissao'), lista: $('#lista-funcionarios'),
  vazio: $('#lista-vazia'), loading: $('#loading'), modal: $('#modal'), busca: $('#busca'),
  filtroStatus: $('#filtro-status'), ordenacao: $('#ordenacao'), salvar: $('#btn-salvar'), tituloModal: $('#modal-title')
};
let funcionarios = [];
let dadosVisiveis = [];

function somenteNumeros(valor) { return String(valor || '').replace(/\D/g, ''); }
function formatarCpf(valor) { return somenteNumeros(valor).slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2'); }
function formatarTelefone(valor) { return somenteNumeros(valor).slice(0,11).replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2'); }
function cpfValido(valor) {
  const cpf = somenteNumeros(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digito = quantidade => { let soma=0; for(let i=0;i<quantidade;i++) soma += Number(cpf[i])*(quantidade+1-i); const resto=(soma*10)%11; return resto===10?0:resto; };
  return digito(9)===Number(cpf[9]) && digito(10)===Number(cpf[10]);
}
function iniciais(nome) { return nome.trim().split(/\s+/).slice(0,2).map(p=>p[0]).join('').toUpperCase(); }
function escapar(texto) { const div=document.createElement('div'); div.textContent=texto || ''; return div.innerHTML; }
function dataBr(data) { if(!data) return 'Não informada'; return new Date(`${String(data).slice(0,10)}T12:00:00`).toLocaleDateString('pt-BR'); }

function toast(titulo, texto, tipo='sucesso') {
  const item=document.createElement('div'); item.className=`toast ${tipo}`;
  item.innerHTML=`<div>${tipo==='erro'?'⚠':'✓'}</div><div><strong>${titulo}</strong><span>${texto}</span></div>`;
  $('#toast-container').appendChild(item); setTimeout(()=>item.remove(),3500);
}

function preencherFormulario(f=null) {
  elementos.formulario.reset(); elementos.id.value=''; atualizarFeedbackCpf();
  if (!f) return;
  elementos.id.value=f.id; elementos.nome.value=f.nome; elementos.cpf.value=formatarCpf(f.cpf);
  elementos.cargo.value=f.cargo || ''; elementos.setor.value=f.setor || ''; elementos.email.value=f.email || '';
  elementos.telefone.value=f.telefone || ''; elementos.admissao.value=f.data_admissao ? String(f.data_admissao).slice(0,10) : '';
  atualizarFeedbackCpf();
}
function abrirModal(f=null) {
  preencherFormulario(f); elementos.tituloModal.textContent=f?'Editar funcionário':'Novo funcionário';
  elementos.salvar.innerHTML=f?'<span>✓</span> Salvar alterações':'<span>✓</span> Cadastrar funcionário';
  elementos.modal.classList.remove('escondido'); setTimeout(()=>elementos.nome.focus(),100);
}
function fecharModal() { elementos.modal.classList.add('escondido'); }

function classeStatus(status) { return String(status || 'ATIVO').toLowerCase(); }
function proximoStatus(status) { return status==='ATIVO'?'AFASTADO':status==='AFASTADO'?'INATIVO':'ATIVO'; }

function renderizar() {
  const termo=elementos.busca.value.toLowerCase(); const numeros=somenteNumeros(termo); const filtro=elementos.filtroStatus.value;
  dadosVisiveis=funcionarios.filter(f => {
    const combina=!termo || [f.nome,f.cargo,f.setor,f.email].some(v=>String(v||'').toLowerCase().includes(termo)) || (numeros && f.cpf.includes(numeros));
    return combina && (filtro==='TODOS' || f.status===filtro);
  });
  if(elementos.ordenacao.value==='nome') dadosVisiveis.sort((a,b)=>a.nome.localeCompare(b.nome));
  if(elementos.ordenacao.value==='antigos') dadosVisiveis.sort((a,b)=>a.id-b.id);
  if(elementos.ordenacao.value==='recentes') dadosVisiveis.sort((a,b)=>b.id-a.id);

  elementos.lista.innerHTML=''; elementos.vazio.classList.toggle('escondido',dadosVisiveis.length>0);
  dadosVisiveis.forEach(f => {
    const valido=f.cpf_valido ?? cpfValido(f.cpf); const status=f.status || 'ATIVO'; const linha=document.createElement('tr');
    linha.innerHTML=`<td><div class="person-cell"><div class="person-avatar">${iniciais(f.nome)}</div><div><strong>${escapar(f.nome)}</strong><span>${escapar(f.email)||'Sem e-mail'} • admissão ${dataBr(f.data_admissao)}</span></div></div></td>
      <td><div class="job-cell"><strong>${escapar(f.cargo)||'Não informado'}</strong><span>${escapar(f.setor)||'Sem setor'}</span></div></td>
      <td><div class="cpf-cell"><span>${formatarCpf(f.cpf)}</span><small class="cpf-badge ${valido?'valido':'invalido'}">${valido?'✓ VÁLIDO':'! REVISAR'}</small></div></td>
      <td><button class="status-chip ${classeStatus(status)}" title="Clique para alterar"><i></i>${status}</button></td>
      <td class="align-right"><button class="action-btn edit" title="Editar">✎</button><button class="action-btn status-action" title="Alterar status">↻</button><button class="action-btn delete" title="Excluir">⌫</button></td>`;
    linha.querySelector('.edit').onclick=()=>abrirModal(f);
    linha.querySelector('.status-chip').onclick=()=>alterarStatus(f,proximoStatus(status));
    linha.querySelector('.status-action').onclick=()=>alterarStatus(f,proximoStatus(status));
    linha.querySelector('.delete').onclick=()=>excluir(f); elementos.lista.appendChild(linha);
  });
  const ativos=funcionarios.filter(f=>(f.status||'ATIVO')==='ATIVO').length;
  const validos=funcionarios.filter(f=>f.cpf_valido ?? cpfValido(f.cpf)).length;
  $('#stat-total').textContent=funcionarios.length; $('#stat-ativos').textContent=ativos; $('#stat-validos').textContent=validos;
  $('#stat-percentual').textContent=funcionarios.length?`${Math.round(validos/funcionarios.length*100)}%`:'100%'; $('#total').textContent=funcionarios.length;
  $('#resultado-texto').textContent=`Mostrando ${dadosVisiveis.length} de ${funcionarios.length} registro${funcionarios.length===1?'':'s'}`;
}

async function carregar() {
  elementos.loading.classList.remove('escondido'); elementos.vazio.classList.add('escondido');
  try { const r=await fetch(API); if(!r.ok) throw new Error(); funcionarios=await r.json(); renderizar(); }
  catch { toast('Falha na conexão','Confira se os containers estão em execução.','erro'); }
  finally { elementos.loading.classList.add('escondido'); }
}
async function verificarStatus() {
  try { const r=await fetch('/api/status'); if(!r.ok) throw new Error(); $('#server-status').classList.add('online'); $('#server-status span').textContent='Sistema operacional'; $('#stat-banco').textContent='Online'; }
  catch { $('#server-status span').textContent='Banco indisponível'; $('#stat-banco').textContent='Offline'; }
}

elementos.formulario.addEventListener('submit',async e => {
  e.preventDefault(); const id=elementos.id.value;
  const dados={nome:elementos.nome.value.trim(),cpf:elementos.cpf.value,cargo:elementos.cargo.value.trim(),setor:elementos.setor.value.trim(),email:elementos.email.value.trim(),telefone:elementos.telefone.value,data_admissao:elementos.admissao.value||null};
  if(dados.nome.length<3) return toast('Nome incompleto','Digite pelo menos 3 caracteres.','erro');
  if(!cpfValido(dados.cpf)) return toast('CPF inválido','Confira os números e os dois dígitos verificadores.','erro');
  elementos.salvar.disabled=true; elementos.salvar.textContent='Salvando...';
  try {
    const r=await fetch(id?`${API}/${id}`:API,{method:id?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(dados)});
    const resultado=await r.json(); if(!r.ok) throw new Error(resultado.mensagem);
    fecharModal(); toast(id?'Cadastro atualizado':'Funcionário cadastrado',`${resultado.nome} foi salvo com sucesso.`); await carregar();
  } catch(erro) { toast('Não foi possível salvar',erro.message||'Tente novamente.','erro'); }
  finally { elementos.salvar.disabled=false; elementos.salvar.innerHTML=id?'<span>✓</span> Salvar alterações':'<span>✓</span> Cadastrar funcionário'; }
});

async function alterarStatus(f,status) {
  try {
    const r=await fetch(`${API}/${f.id}/status`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
    const resultado=await r.json(); if(!r.ok) throw new Error(resultado.mensagem);
    toast('Status atualizado',`${f.nome} agora está ${status.toLowerCase()}.`); await carregar();
  } catch(erro) { toast('Erro ao alterar status',erro.message,'erro'); }
}
async function excluir(f) {
  if(!confirm(`Excluir o cadastro de ${f.nome}?\n\nEssa ação não poderá ser desfeita.`)) return;
  try { const r=await fetch(`${API}/${f.id}`,{method:'DELETE'}); const resultado=await r.json(); if(!r.ok) throw new Error(resultado.mensagem); toast('Cadastro excluído',`${f.nome} foi removido.`); await carregar(); }
  catch(erro) { toast('Erro ao excluir',erro.message,'erro'); }
}

function atualizarFeedbackCpf() {
  const cpf=somenteNumeros(elementos.cpf.value); const feedback=$('#cpf-feedback');
  if(cpf.length<11){feedback.textContent='A validação dos dígitos é automática';feedback.className='';return;}
  const valido=cpfValido(cpf); feedback.textContent=valido?'✓ CPF matematicamente válido':'✕ CPF inválido'; feedback.className=valido?'feedback-valido':'feedback-invalido';
}
function exportarCsv() {
  if(!dadosVisiveis.length) return toast('Nada para exportar','A lista filtrada está vazia.','erro');
  const seguro=v=>{let s=String(v??'');if(/^[=+\-@]/.test(s))s=`'${s}`;return `"${s.replace(/"/g,'""')}"`;};
  const linhas=[['Nome','CPF','Cargo','Setor','E-mail','Telefone','Admissão','Status'],...dadosVisiveis.map(f=>[f.nome,formatarCpf(f.cpf),f.cargo,f.setor,f.email,f.telefone,dataBr(f.data_admissao),f.status])];
  const blob=new Blob(['\ufeff'+linhas.map(l=>l.map(seguro).join(';')).join('\n')],{type:'text/csv;charset=utf-8'}); const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='funcionarios_nexus_rh.csv';a.click();URL.revokeObjectURL(url);toast('Relatório exportado','O arquivo CSV foi baixado.');
}

elementos.cpf.addEventListener('input',()=>{elementos.cpf.value=formatarCpf(elementos.cpf.value);atualizarFeedbackCpf();});
elementos.telefone.addEventListener('input',()=>elementos.telefone.value=formatarTelefone(elementos.telefone.value));
elementos.busca.addEventListener('input',renderizar); elementos.filtroStatus.addEventListener('change',renderizar); elementos.ordenacao.addEventListener('change',renderizar); $('#exportar').addEventListener('click',exportarCsv);
['#novo-funcionario','#atalho-novo'].forEach(id=>$(id).addEventListener('click',()=>abrirModal())); $('#atalho-equipe').addEventListener('click',()=>$('#painel-equipe').scrollIntoView());
$('#fechar-modal').addEventListener('click',fecharModal); $('#btn-cancelar').addEventListener('click',fecharModal); elementos.modal.addEventListener('click',e=>{if(e.target===elementos.modal)fecharModal();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')fecharModal();if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();elementos.busca.focus();}});
$('#theme-toggle').addEventListener('click',()=>{document.body.classList.toggle('dark');const escuro=document.body.classList.contains('dark');localStorage.setItem('tema',escuro?'dark':'light');$('#theme-toggle').textContent=escuro?'☀':'☾';});
if(localStorage.getItem('tema')==='dark'){document.body.classList.add('dark');$('#theme-toggle').textContent='☀';}
carregar();verificarStatus();
