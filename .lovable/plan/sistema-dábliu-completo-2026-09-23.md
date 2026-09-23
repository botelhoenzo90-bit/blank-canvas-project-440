# Sistema Dábliu completo

## Objetivo
Transformar o painel atual em um sistema autenticado e seguro, usando exclusivamente o Supabase Dábliu Consórcios, com controle hierárquico real, gestão de pessoas, vendas em tempo real, notificações e relatórios profissionais.

## Acesso e cadastro inicial
- Criar telas de entrar, primeiro cadastro, recuperação e redefinição de senha.
- O primeiro cadastro confirmado poderá concluir a configuração inicial como **Director**; depois disso, o cadastro público de administradores será bloqueado.
- Proteger o painel para que somente usuários autenticados tenham acesso.
- Exibir nome, foto, cargo, equipe e preferências reais do usuário, com opção de sair com segurança.

## Pessoas e hierarquia
- Criar perfis completos e papéis separados: Director, Master, Representative, Supervisor e Seller.
- Somente Director poderá criar, editar, ativar/desativar pessoas e definir seus papéis e superiores.
- Aplicar a hierarquia no servidor e no banco, não apenas na aparência:
  - Director: visão e administração total.
  - Master: sua estrutura de Representatives, Supervisors e Sellers.
  - Representative: seus Supervisors e Sellers.
  - Supervisor: seus Sellers.
  - Seller: somente seus próprios resultados.
- Registrar quem criou ou alterou cada acesso.

## Vendas e Central TV
- Remover os dados demonstrativos da interface; preservar qualquer venda real já gravada.
- Vincular cada venda ao usuário e à estrutura comercial correspondente.
- Restringir leitura e registro de vendas conforme a hierarquia.
- Manter a atualização em tempo real na Central TV e o destaque da nova venda por 15 segundos.
- Manter notificações Firebase e proteger o cadastro de aparelhos e o envio contra chamadas anônimas.

## Relatórios
- Fazer filtros reais por período, status e níveis da hierarquia permitidos ao usuário.
- Exportar planilha com os dados filtrados.
- Criar relatório PDF profissional com logomarca, período, totais, filtros e tabela, sem depender da aparência normal do painel.

## Marca
- Usar a logomarca enviada na entrada, menu, Central TV e relatório.
- Criar favicon e ícone do aplicativo a partir da marca.
- Ajustar a identidade visual para os tons oficiais azul e verde da logomarca.

## Banco e segurança
- Criar `profiles`, `user_roles` e estrutura hierárquica com RLS no Supabase.
- Remover o acesso público atual às vendas e exigir autenticação nas operações sensíveis.
- Usar validação no navegador e no servidor, além de funções seguras para administração de usuários.
- Manter papéis fora da tabela de perfis e validar permissões no servidor.

## Validação
- Testar primeiro cadastro, login, recuperação de senha, logout e bloqueio de páginas.
- Testar permissões de cada nível e tentativas de acesso indevido.
- Testar criação de pessoas, venda, atualização da TV, notificação e remoção de token inválido.
- Testar exportações, desktop e celular; corrigir erros de compilação e execução encontrados.

## Observação
A confirmação de e-mail continuará seguindo a configuração atual do Supabase. Se estiver ativa, o usuário confirma o e-mail antes de entrar. A remoção será apenas dos exemplos visuais; dados reais existentes serão preservados.
