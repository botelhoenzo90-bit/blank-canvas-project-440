# Nome completo e troca rápida de perfis

## O que será entregue
- Mostrar o nome completo junto ao cargo na saudação da Visão Geral.
- Usar um único e-mail e senha para pessoas com mais de um cargo.
- Adicionar no topo um seletor **Meu perfil** para alternar rapidamente entre os perfis autorizados, como **Master / Representante** ou **Presidente/Diretor / Master**, sem sair do sistema.
- Permitir que um Diretor adicione e remova perfis vinculados na Gestão de equipe. Cada perfil terá seu cargo, superior e os campos correspondentes: Gestão para Master, Empresa e logo para Representante, Equipe para Supervisor.
- Manter contas atuais funcionando, sem vincular pessoas automaticamente por nome ou e-mail parecido.

## Regras de acesso
- Trocar o perfil altera os dados e ações disponíveis para a gestão daquele perfil; não soma as permissões dos dois cargos.
- A pessoa só pode selecionar perfis que um Diretor vinculou ao seu login. Não haverá escolha pública de cargo.
- Vendas, metas, relatórios e equipe respeitam o perfil selecionado e sua hierarquia.
- Preservar o histórico e a atribuição das vendas, sem duplicá-las ao alternar perfis.
- Manter **Visualizar conta** como recurso separado, somente leitura para Diretores.
- A Central TV continua global e as notificações não serão ampliadas por essa mudança.

## Detalhes técnicos
- Separar a identidade de login dos perfis de atuação, com vínculos protegidos no Supabase e cargos mantidos em tabela de permissões separada.
- Validar o vínculo, o perfil ativo e seu cargo no servidor a cada leitura ou alteração; adaptar as políticas de acesso para a identidade de atuação selecionada.
- Preservar a sessão original, sem gerar sessões de outra pessoa, e registrar quem realizou as ações e sob qual perfil.
- Atualizar os caminhos de pessoas, vendas, metas, logomarcas e relatórios em conjunto, evitando que uma tela continue usando o cargo anterior.

## Verificação
- Testar troca entre os cargos solicitados, bloqueio de perfis não vinculados, isolamento por gestão e permissões de criação e edição.
- Conferir que voltar ao perfil anterior restaura os dados corretos e que a troca não duplica vendas.
- Verificar os erros disponíveis e as telas públicas; testes completos da área autenticada não estão disponíveis neste projeto externo.