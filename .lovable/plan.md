# Gráficos, marca, TV e proteção

## Resultado
- Transformar o progresso das metas em gráficos visuais, mantendo realizado, falta e percentual.
- Garantir a logomarca Dábliu no alerta da Central TV e nos ícones de instalação do celular.
- Reduzir a tela preta da Central TV de 5 para 3 segundos, preservando sino e destaque.
- Fechar a criação pública de contas administrativas após existir o primeiro Director.
- Manter login, recuperação de senha e criação de pessoas pela hierarquia autorizada.
- Validar as regras do Supabase com uma nova análise de segurança.

## Detalhes técnicos
- Adicionar gráficos circulares de progresso em cada meta e um resumo comparativo das metas ativas.
- Exibir a marca também na fase preta da Central TV e ajustar a sequência para 3s de preto, 10s de sino e 15s de venda.
- Preservar o manifesto e o ícone Apple já ligados à arte Dábliu W.
- Fazer a função pública de cadastro aceitar somente a configuração inicial quando ainda não houver Director; depois disso, rejeitar chamadas diretas e retirar “Criar conta” da entrada.
- Manter dados protegidos por autenticação, hierarquia, RLS e URLs temporárias para logos de empresas.

## Validação
- Conferir metas e Central TV em computador e celular.
- Confirmar que login e recuperação continuam disponíveis e que cadastro público administrativo ficou bloqueado.
- Verificar compilação e repetir a análise de segurança.
