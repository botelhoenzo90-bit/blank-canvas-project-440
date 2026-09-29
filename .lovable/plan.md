# Corrigir hierarquia e logomarcas na Central TV

## Ajustes
- Validar que o superior escolhido esteja acima do cargo cadastrado, impedindo vínculos com o mesmo nível ou níveis inferiores.
- Manter a liberdade já definida: Diretor pode criar todos os níveis; Master cria Representante e Supervisor; Representante cria Supervisor.
- Corrigir “Vincular a mim” também durante a edição do perfil.
- Na coluna Empresa da Central TV, trocar as iniciais pela logomarca do Representante encontrado na cadeia da venda.
- Exibir um identificador com iniciais apenas quando esse Representante não tiver logo cadastrada ou a imagem falhar.

## Situação encontrada
- Existem quatro contas com cargo Diretor, apesar da proteção atual impedir novos Diretores adicionais.
- Não há Master cadastrado.
- Alguns Representantes e Supervisores estão sem superior; nessas vendas não existe um Representante na cadeia para fornecer uma logo.
- As vendas recentes do Supervisor Ney estão corretamente ligadas ao Representante W cons, que possui logomarca.

## Validação
- Conferir vínculos permitidos para cada cargo.
- Confirmar a logo do Representante no destaque e em cada linha da Central TV.
- Confirmar compilação sem erros.
