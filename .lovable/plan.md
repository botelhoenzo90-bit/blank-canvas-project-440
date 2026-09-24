# Acesso Director e tema claro/escuro

## Resultado
- Remover a opção e a tela de “Configurar primeiro Director”.
- Deixar novos cadastros sempre aguardando aprovação do Director.
- Criar o acesso de teste informado como Director, já ativo e sem confirmação por e-mail.
- Usar branco como tema padrão em todas as telas.
- Adicionar um botão para alternar entre tema claro e escuro, mantendo a escolha no aparelho.

## Implementação
- Simplificar o fluxo público para apenas entrar, solicitar acesso e recuperar senha.
- Retirar o fluxo automático de primeiro Director do painel e do servidor.
- Criar o usuário inicial de forma administrativa no Supabase, com perfil e papel de Director.
- Aplicar tokens de cores para os dois temas e incluir o seletor no login e no painel.
- Validar entrada do Director, troca de tema e cadastro pendente para aprovação.
