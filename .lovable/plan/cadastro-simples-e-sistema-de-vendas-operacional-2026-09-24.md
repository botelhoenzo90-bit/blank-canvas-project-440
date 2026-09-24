# Cadastro simples e sistema de vendas operacional

## Resultado
- Cadastro em uma única tela com nome, telefone, e-mail, senha e função.
- Conta salva e liberada imediatamente, sem confirmação por e-mail e sem aprovação do Director.
- Presidente/Diretor e Super Master exigem código de convite; os demais cargos podem ser escolhidos livremente.
- A pessoa entra inicialmente sem superior e poderá ser vinculada à estrutura depois por quem administra a equipe.
- Login permanece somente com e-mail e senha.

## Acesso e segurança
- Manter os cargos separados dos dados pessoais e validar o código de convite somente no servidor.
- Criar o perfil e o cargo junto com a conta, evitando conta incompleta em caso de erro.
- Impedir que códigos de convite apareçam no navegador, nos registros ou no banco em texto aberto.
- Manter páginas, vendas, relatórios e notificações acessíveis apenas para pessoas autenticadas e ativas.

## Perfil e hierarquia
- Guardar somente nome completo, telefone, e-mail de acesso e função.
- Exibir os cargos como Presidente/Diretor, Super Master, Representante, Supervisor e Vendedor.
- Manter a organização posterior de equipe e superior na área de pessoas.

## Vendas em tempo real
- Revisar cadastro e leitura de vendas para usar a pessoa conectada e sua hierarquia real.
- Manter atualização em tempo real, destaque de nova venda por 15 segundos, relatórios e notificações.
- Validar estados vazios, filtros e permissões sem inserir dados de demonstração.

## Validação
- Testar cadastro comum, cadastro administrativo com código válido e rejeição de código inválido.
- Testar login imediato, gravação do perfil, acesso ao painel e registro de venda.
- Conferir atualização da Central TV e funcionamento no computador e celular.
