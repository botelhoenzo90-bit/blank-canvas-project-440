# Corrigir notificações no iPhone e vendas na Central TV

## O que será feito
- Salvar cada venda confirmada no Supabase Dabliu Consórcios, substituindo o armazenamento isolado de cada navegador.
- Atualizar painel e Central TV em tempo real entre celular, computador e televisão.
- Manter o destaque da venda por 15 segundos e depois retornar automaticamente à lista atualizada.
- Transformar o sino em um controle real para ativar notificações e mostrar o estado atual.
- Cadastrar cada aparelho no Firebase Messaging e guardar seu identificador com segurança no Supabase.
- Enviar uma notificação para os aparelhos cadastrados ao confirmar uma venda.
- Tratar corretamente o iPhone: orientar a adicionar o sistema à Tela de Início e abrir fora da prévia do Lovable.
- Remover aparelhos inválidos automaticamente quando o Firebase os rejeitar.
- Validar a venda em uma tela e a atualização da TV em outra tela, além dos estados de notificação em celular.

## Dados que serão criados
- **Vendas:** vendedor, supervisor, representante, master, equipe, valor, data, hora e situação.
- **Aparelhos de notificação:** identificador do Firebase, aparelho, última utilização e estado ativo.

## Acesso e segurança
- As vendas serão visíveis ao painel e à Central TV.
- Novas vendas e aparelhos serão registrados por funções protegidas no servidor, sem expor credenciais do Firebase.
- Os identificadores dos aparelhos não ficarão disponíveis para leitura pública.
- Como o sistema ainda não possui login, o acesso completo por usuário e por cargo ficará para a etapa de autenticação.

## Observação para iPhone
- Notificações web exigem iOS 16.4 ou superior.
- O usuário deve abrir o endereço publicado no Safari, usar **Compartilhar → Adicionar à Tela de Início**, abrir pelo novo ícone e então tocar em **Ativar notificações**.
