# 🌿 Pai e Filho Roçadas

Site institucional + painel de gestão de pedidos para uma pequena empresa familiar de **roçada e limpeza de terrenos**.

O projeto tem duas partes:

| Parte | O que faz |
|---|---|
| **Site público** | Página inicial com carrossel, benefícios e vantagens; página de planos carregada do banco; página "Sobre nós"; botões de contato direto pelo WhatsApp com mensagem pronta. |
| **Painel administrativo** (login) | Cadastro e acompanhamento de pedidos, com busca de endereço por CEP, mapa embutido e atalhos de rota para Google Maps, Apple Maps (iPhone) e Waze. Gestão dos planos exibidos no site. |

> 📸 _Adicione aqui prints do site e do painel (computador e celular) — coloque as imagens em `docs/` e referencie com `![Home](docs/home.png)`._

---

## ✨ Funcionalidades

**Site público**
- Layout responsivo (Bootstrap 5) — funciona no computador e no celular
- Carrossel de imagens com chamadas para ação
- Planos lidos do Supabase em tempo real (com planos de exemplo caso o banco não esteja configurado)
- Botão "Quero este plano" abre o WhatsApp com o nome do plano já escrito
- Botão flutuante do WhatsApp em todas as páginas
- **Nenhuma transação financeira** acontece no site

**Painel administrativo**
- Login com e-mail e senha (Supabase Auth)
- Resumo: serviços do dia, pedidos em aberto, concluídos no mês e valor a receber
- Cadastro de pedido com: cliente, telefone, CEP (preenchimento automático via ViaCEP), endereço completo, ponto de referência, plano, área, valor combinado, recolhimento de resíduos, forma de pagamento, status de pagamento, data do pedido, data agendada, data de conclusão, status, origem do cliente e observações
- Mapa do endereço dentro do formulário + botões de rota (Google Maps / Apple Maps / Waze)
- Lista de pedidos em **tabela no computador** e **cards no celular**, com destaque para pedidos de hoje e atrasados
- Atalho para chamar o cliente no WhatsApp
- Cadastro e edição de planos (ativar/desativar no site, destaque, ordem)

## 🛠️ Tecnologias

- HTML5, CSS3 e JavaScript (sem framework, sem build)
- [Bootstrap 5](https://getbootstrap.com/) + Bootstrap Icons
- [Supabase](https://supabase.com/) — PostgreSQL, autenticação e Row Level Security
- [ViaCEP](https://viacep.com.br/) — consulta de CEP
- Google Maps embed + deep links de navegação

## 📁 Estrutura

```
pai-e-filho-rocadas/
├── index.html          # Página inicial
├── planos.html         # Planos (dados do Supabase)
├── sobre.html          # Sobre nós
├── admin/
│   ├── login.html      # Login do painel
│   └── index.html      # Painel de pedidos e planos
├── css/style.css
├── js/
│   ├── config.js       # URL/chave do Supabase e número do WhatsApp
│   └── admin.js        # Lógica do painel
├── img/                # Fotos do carrossel e do "Sobre nós"
└── supabase/schema.sql # Tabelas, regras de segurança e dados de exemplo
```

## 🚀 Como rodar

1. Crie um projeto no [Supabase](https://supabase.com/).
2. No **SQL Editor**, rode o conteúdo de `supabase/schema.sql`.
3. Em **Authentication → Users**, crie os usuários que vão acessar o painel.
4. Copie a **Project URL** e a **anon public key** e cole em `js/config.js`, junto com o número do WhatsApp.
5. Abra o projeto no VS Code e rode com a extensão **Live Server** (botão "Go Live").

## 🔒 Segurança

A chave `anon` do Supabase é pública por natureza — ela aparece no navegador de qualquer visitante. Quem protege os dados são as políticas de **Row Level Security** definidas em `schema.sql`:
- visitantes só conseguem **ler planos ativos**;
- pedidos e edição de planos são acessíveis **apenas para usuários autenticados**.

Nunca coloque a chave `service_role` no front-end.

## 🗺️ Próximos passos

- [ ] Fotos de antes/depois anexadas ao pedido (Supabase Storage)
- [ ] Cadastro de clientes separado, para clientes recorrentes
- [ ] Gerar pedidos automáticos para planos mensais
- [ ] Agenda em formato de calendário
- [ ] Relatório de faturamento por mês

---

Desenvolvido por **Mateus Antonio Courel** — estudante da Fatec Botucatu.
