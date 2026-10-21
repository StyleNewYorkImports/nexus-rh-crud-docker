const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost', port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'postgres', password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'funcionarios_db'
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const somenteNumeros = (valor) => String(valor || '').replace(/\D/g, '');
const texto = (valor, limite) => String(valor || '').trim().slice(0, limite);
const statusPermitidos = ['ATIVO', 'INATIVO', 'AFASTADO'];

function cpfValido(valor) {
  const cpf = somenteNumeros(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calcular = (quantidade) => {
    let soma = 0;
    for (let i = 0; i < quantidade; i++) soma += Number(cpf[i]) * (quantidade + 1 - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  return calcular(9) === Number(cpf[9]) && calcular(10) === Number(cpf[10]);
}

function prepararDados(corpo) {
  const dados = {
    nome: texto(corpo.nome, 100), cpf: somenteNumeros(corpo.cpf), cargo: texto(corpo.cargo, 80),
    setor: texto(corpo.setor, 80), email: texto(corpo.email, 120).toLowerCase(),
    telefone: texto(corpo.telefone, 20), data_admissao: corpo.data_admissao || null
  };
  if (dados.nome.length < 3) return { erro: 'Informe um nome com pelo menos 3 caracteres.' };
  if (!cpfValido(dados.cpf)) return { erro: 'CPF inválido. Confira os números e os dígitos verificadores.' };
  if (dados.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) return { erro: 'Informe um e-mail válido.' };
  return { dados };
}

async function garantirEstrutura() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS funcionarios (
      id SERIAL PRIMARY KEY, nome VARCHAR(100) NOT NULL, cpf CHAR(11) UNIQUE NOT NULL,
      cargo VARCHAR(80) DEFAULT '', setor VARCHAR(80) DEFAULT '', email VARCHAR(120) DEFAULT '',
      telefone VARCHAR(20) DEFAULT '', data_admissao DATE, status VARCHAR(15) DEFAULT 'ATIVO',
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP, atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS cargo VARCHAR(80) DEFAULT '';
    ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS setor VARCHAR(80) DEFAULT '';
    ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS email VARCHAR(120) DEFAULT '';
    ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS telefone VARCHAR(20) DEFAULT '';
    ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS data_admissao DATE;
    ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS status VARCHAR(15) DEFAULT 'ATIVO';
    ALTER TABLE funcionarios ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    DELETE FROM funcionarios WHERE nome = 'Funcionário Exemplo' AND cpf = '12345678901';
  `);
}

app.get('/api/funcionarios', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM funcionarios ORDER BY id DESC');
    res.json(resultado.rows.map(f => ({ ...f, cpf_valido: cpfValido(f.cpf) })));
  } catch { res.status(500).json({ mensagem: 'Erro ao listar funcionários.' }); }
});

app.get('/api/funcionarios/:id', async (req, res) => {
  try {
    const resultado = await pool.query('SELECT * FROM funcionarios WHERE id = $1', [req.params.id]);
    if (!resultado.rows.length) return res.status(404).json({ mensagem: 'Funcionário não encontrado.' });
    res.json({ ...resultado.rows[0], cpf_valido: cpfValido(resultado.rows[0].cpf) });
  } catch { res.status(500).json({ mensagem: 'Erro ao buscar funcionário.' }); }
});

app.get('/api/validar-cpf/:cpf', (req, res) => {
  const cpf = somenteNumeros(req.params.cpf);
  res.json({ cpf, valido: cpfValido(cpf), tipo: 'validação matemática dos dígitos verificadores' });
});

app.post('/api/funcionarios', async (req, res) => {
  const preparacao = prepararDados(req.body);
  if (preparacao.erro) return res.status(400).json({ mensagem: preparacao.erro });
  const d = preparacao.dados;
  try {
    const resultado = await pool.query(
      `INSERT INTO funcionarios (nome, cpf, cargo, setor, email, telefone, data_admissao, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'ATIVO') RETURNING *`,
      [d.nome,d.cpf,d.cargo,d.setor,d.email,d.telefone,d.data_admissao]
    );
    res.status(201).json({ ...resultado.rows[0], cpf_valido: true });
  } catch (erro) {
    if (erro.code === '23505') return res.status(409).json({ mensagem: 'Este CPF já está cadastrado.' });
    res.status(500).json({ mensagem: 'Erro ao cadastrar funcionário.' });
  }
});

app.put('/api/funcionarios/:id', async (req, res) => {
  const preparacao = prepararDados(req.body);
  if (preparacao.erro) return res.status(400).json({ mensagem: preparacao.erro });
  const d = preparacao.dados;
  try {
    const resultado = await pool.query(
      `UPDATE funcionarios SET nome=$1, cpf=$2, cargo=$3, setor=$4, email=$5, telefone=$6,
       data_admissao=$7, atualizado_em=CURRENT_TIMESTAMP WHERE id=$8 RETURNING *`,
      [d.nome,d.cpf,d.cargo,d.setor,d.email,d.telefone,d.data_admissao,req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ mensagem: 'Funcionário não encontrado.' });
    res.json({ ...resultado.rows[0], cpf_valido: true });
  } catch (erro) {
    if (erro.code === '23505') return res.status(409).json({ mensagem: 'Este CPF já está cadastrado.' });
    res.status(500).json({ mensagem: 'Erro ao atualizar funcionário.' });
  }
});

app.patch('/api/funcionarios/:id/status', async (req, res) => {
  const status = req.body.status;
  if (!statusPermitidos.includes(status)) return res.status(400).json({ mensagem: 'Status inválido.' });
  try {
    const resultado = await pool.query(
      'UPDATE funcionarios SET status=$1, atualizado_em=CURRENT_TIMESTAMP WHERE id=$2 RETURNING *',
      [status, req.params.id]
    );
    if (!resultado.rows.length) return res.status(404).json({ mensagem: 'Funcionário não encontrado.' });
    res.json(resultado.rows[0]);
  } catch { res.status(500).json({ mensagem: 'Erro ao alterar status.' }); }
});

app.delete('/api/funcionarios/:id', async (req, res) => {
  try {
    const resultado = await pool.query('DELETE FROM funcionarios WHERE id=$1 RETURNING id', [req.params.id]);
    if (!resultado.rows.length) return res.status(404).json({ mensagem: 'Funcionário não encontrado.' });
    res.json({ mensagem: 'Funcionário excluído com sucesso.' });
  } catch { res.status(500).json({ mensagem: 'Erro ao excluir funcionário.' }); }
});

app.get('/api/status', async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ sistema: 'online', banco: 'conectado' }); }
  catch { res.status(503).json({ sistema: 'online', banco: 'desconectado' }); }
});

garantirEstrutura()
  .then(() => app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`)))
  .catch((erro) => { console.error('Falha ao preparar banco:', erro.message); process.exit(1); });
