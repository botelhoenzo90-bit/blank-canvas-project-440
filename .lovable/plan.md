# Ajustar destaque de vendas, equipe e metas

## O que será feito
- Aumentar e colocar em negrito as informações exibidas abaixo do valor na venda confirmada da Central TV: cidade, supervisor e equipe.
- Manter a logomarca cadastrada do Representante em destaque acima de “Nova venda confirmada”, usando a identificação da hierarquia da venda.
- Remover os quatro cards informativos de cargos da tela Equipe e acessos, preservando a lista e o cadastro de pessoas.
- Adicionar ações de editar e cancelar em cada meta.
- Permitir editar responsável, mês e valor da meta, respeitando as mesmas permissões hierárquicas usadas na criação.
- Tratar “cancelar meta” como exclusão da meta, com confirmação antes da ação.

## Segurança e dados
- Validar edição e exclusão no Supabase pelas permissões atuais: criador da meta ou Presidente/Diretor.
- Manter vendas e progresso já realizados sem alterações ao editar uma meta.

## Validação
- Conferir a Central TV com e sem logomarca do Representante.
- Conferir edição e exclusão de metas e a atualização imediata da lista.
- Confirmar telas menores e compilação sem erros.
