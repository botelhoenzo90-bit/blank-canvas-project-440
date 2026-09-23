# Firebase Messaging com Supabase próprio

## O que será feito
- Manter a conexão já concluída com o Firebase “dabliu-consorcios”.
- Usar o projeto Supabase do usuário para guardar os aparelhos autorizados.
- Adicionar um controle de notificações no painel, com mensagens para ativado, bloqueado ou indisponível.
- Ao confirmar uma venda, enviar automaticamente uma notificação com vendedor, valor e equipe.
- Manter o destaque de 15 segundos na Central TV.
- Validar o fluxo no computador e em tela de celular.

## Próxima ação do usuário
- Abrir **Project Settings → Connectors → Supabase** e concluir a conexão pelo acesso seguro do Supabase.

## Detalhes técnicos
- Registrar o navegador com Firebase Cloud Messaging e um service worker.
- Guardar tokens de aparelhos no Supabase com políticas de acesso seguras.
- Fazer o envio apenas no servidor, sem expor as credenciais do Firebase.
- Remover tokens inválidos quando o Firebase indicar que o aparelho não está mais registrado.
