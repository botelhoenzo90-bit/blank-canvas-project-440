# Perfil, hierarquia e vendas por equipe

## Resultado
- O avatar do topo abrirá um painel com nome, telefone, e-mail e função, sem encerrar a sessão; sair ficará como ação separada.
- A imagem anexada será usada como ícone das notificações de vendas.
- A hierarquia ficará: Presidente/Diretor → Super Master → Master → Representante → Supervisor → Vendedor.
- Somente Supervisor ou cargos acima poderão registrar vendas; Vendedor verá apenas Vendas, Metas e Notificações.

## Acessos de pessoas
- Presidente/Diretor poderá criar qualquer cargo.
- Super Master poderá criar Master, Representante, Supervisor e Vendedor.
- Master poderá criar Representante, Supervisor e Vendedor.
- Representante poderá criar Supervisor e Vendedor.
- Supervisor poderá criar somente Vendedor.
- Vendedor não poderá criar ou administrar acessos.
- Essas regras serão aplicadas na tela e validadas no servidor, incluindo a estrutura visível de cada gestor.

## Registro e exibição de vendas
- O formulário permitirá escolher o vendedor e mostrará a equipe vinculada a ele.
- “Cota” será substituída por dois campos: Empresa vendedora e Cliente comprador.
- O servidor confirmará que o vendedor escolhido pertence à estrutura permitida e preencherá vendedor, equipe e superiores pelos cadastros reais.
- Histórico, Central TV e relatórios mostrarão Empresa vendedora e Cliente comprador.

## Notificação
- Título: `Venda Aprovada! (Empresa vendedora)`.
- Corpo em linhas: nome do Vendedor e Equipe.
- A imagem anexada será o ícone visual da notificação nos aparelhos compatíveis.

## Dados e validação
- Adicionar o cargo Super Master sem perder os usuários atuais; o cargo atual `master` passará a representar Master e os antigos Super Masters serão preservados como `super_master`.
- Guardar Empresa vendedora, Cliente comprador e o nível Super Master nas vendas.
- Atualizar as regras de leitura, criação de pessoas e registro de vendas.
- Validar perfil, limites de cada cargo, bloqueio do Vendedor, formulário de venda, histórico, TV, relatório e conteúdo da notificação.
