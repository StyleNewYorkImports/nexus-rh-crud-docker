# Nexus RH — CRUD de Funcionários

Atividade desenvolvida por **Matheus Nicolas da Silva Soto**.

Aplicação moderna para cadastrar, listar, pesquisar, filtrar, editar e excluir funcionários. Nome e CPF continuam obrigatórios; o cadastro também aceita cargo, setor, e-mail, telefone, data de admissão e status profissional.

## Tecnologias usadas

- HTML, CSS e JavaScript
- Node.js com Express
- PostgreSQL
- Docker e Docker Compose

## Diferenciais da interface

- Dashboard com indicadores em tempo real
- Pesquisa por nome ou CPF (`Ctrl + K`)
- Ordenação por nome, mais recentes ou mais antigos
- Tema claro e escuro
- Formulário moderno em janela modal
- Formatação automática e bloqueio de CPF duplicado
- Notificações de sucesso e erro
- Layout responsivo para computador e celular
- Verificação do status da API e do PostgreSQL
- Validação matemática dos dígitos verificadores do CPF
- Status ativo, inativo ou afastado, com alteração rápida
- Todo novo funcionário entra como ativo; somente o responsável altera seu status pelo painel
- Filtro por situação profissional
- Exportação da lista filtrada em CSV
- Link para a consulta oficial de situação cadastral na Receita Federal

> A validação interna confirma a estrutura matemática do CPF. A situação cadastral real deve ser consultada no serviço oficial, pois não existe consulta automática gratuita e aberta à base da Receita dentro deste projeto escolar.

## Como executar

1. Instale e abra o Docker Desktop.
2. Abra esta pasta no Visual Studio Code.
3. Abra o terminal na pasta do projeto.
4. Execute:

```bash
docker compose up --build
```

5. Aguarde os serviços iniciarem e acesse:

```text
http://localhost:3000
```

## Conferir os containers

Em outro terminal, execute:

```bash
docker ps
```

Devem aparecer os containers `funcionarios_app` e `funcionarios_postgres`.

## Encerrar o sistema

```bash
docker compose down
```

Para também apagar os dados salvos no banco:

```bash
docker compose down -v
```

## Endpoints da API

| Método | Rota | Ação |
|---|---|---|
| GET | `/api/funcionarios` | Listar funcionários |
| GET | `/api/funcionarios/:id` | Buscar um funcionário |
| POST | `/api/funcionarios` | Cadastrar funcionário |
| PUT | `/api/funcionarios/:id` | Editar funcionário |
| DELETE | `/api/funcionarios/:id` | Excluir funcionário |
| PATCH | `/api/funcionarios/:id/status` | Alterar o status |
| GET | `/api/validar-cpf/:cpf` | Validar os dígitos do CPF |

## Como subir no GitHub

Crie um repositório vazio no GitHub. Depois execute na pasta do projeto:

```bash
git init
git add .
git commit -m "Atividade CRUD de funcionarios"
git branch -M main
git remote add origin URL_DO_SEU_REPOSITORIO
git push -u origin main
```
