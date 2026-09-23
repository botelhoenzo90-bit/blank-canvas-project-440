# Notificações de novas vendas

## O que será feito
- Ativar o Lovable Cloud para guardar com segurança os celulares e navegadores autorizados.
- Adicionar um controle de notificações no painel, com mensagens claras para ativado, bloqueado, indisponível ou necessidade de abrir em nova aba.
- Registrar cada aparelho autorizado usando o Firebase Messaging conectado.
- Ao confirmar uma venda, enviar automaticamente uma notificação com vendedor, valor e equipe para os aparelhos cadastrados.
- Manter o destaque de 15 segundos na Central TV já existente.
- Validar o funcionamento no computador e em tela de celular.

## Detalhes técnicos
- Usar Firebase Cloud Messaging no navegador e um service worker para receber notificações com o sistema fechado.
- Guardar tokens de aparelhos no Lovable Cloud com acesso protegido.
- Fazer o envio somente no servidor, sem expor credenciais do Firebase.
- Remover tokens inválidos quando o Firebase indicar que o aparelho não está mais registrado.
