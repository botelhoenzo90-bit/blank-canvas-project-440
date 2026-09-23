# Cadastro com aprovação do Director

## Resultado
- Remover a confirmação por e-mail do cadastro.
- Após o primeiro Director já existir, novos usuários entram como “Aguardando aprovação”.
- O Director aprova a pessoa, define perfil, cargo, equipe e superior.
- Enquanto estiver pendente, a pessoa não acessa vendas nem relatórios.
- Manter o primeiro cadastro como configuração segura do Director inicial.

## Implementação
- Criar a conta já confirmada no Supabase por uma função segura no servidor.
- Salvar novos pedidos como perfis inativos e sem permissão.
- Exibir pedidos pendentes na área de Equipe e permitir aprovação apenas pelo Director.
- Bloquear contas pendentes no painel e mostrar uma tela clara de espera.
- Validar cadastro, entrada pendente, aprovação e acesso após aprovação.
