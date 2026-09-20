# Plano: Correções visuais do fluxo Passageiro

## Objetivo
Uniformizar todas as telas acessíveis pela navegação inferior no padrão visual já aplicado à home, corrigir a hierarquia da home e adicionar a experiência visual de agendamento, sem alterar regras, dados ou operações existentes.

## Implementação

1. **Cabeçalho único do passageiro**
   - Criar um cabeçalho compartilhado com o wordmark canônico da home e avatar do servidor.
   - Aplicar em home, escolha de mobilidade, mapas de automóvel/moto, logística, perfil, viagens e demais telas ligadas à navegação inferior.
   - Preservar ações de voltar quando necessárias, sem trocar destinos existentes.

2. **Home reorganizada**
   - Manter cabeçalho, busca e abas no topo.
   - Dar maior espaço visual aos quatro atalhos circulares.
   - Inserir chips horizontais de destinos frequentes logo após os atalhos.
   - Substituir o cartão grande de cota por uma faixa compacta de 48px, usando tokens semânticos verdes, ícone, saldo e link de histórico.
   - Manter o texto legal integral no rodapé, apenas reduzindo sua presença visual.

3. **Agendamento**
   - Fazer “Mais tarde” abrir uma folha inferior com três opções: Automóvel, Moto Táxi e Envio.
   - Criar `/passageiro/agendar` como alternativa direta com as mesmas opções.
   - Ao selecionar uma opção, mostrar seletor de data e hora e abrir o fluxo escolhido em estado visual agendado.
   - Transportar apenas parâmetros de apresentação entre telas; não criar ou alterar gravações, RPCs ou regras no backend.

4. **Padronização das telas**
   - Escolha de mobilidade: cabeçalho comum, cartões grandes arredondados, faixa de cota e aviso existentes.
   - Automóvel/Moto: preservar mapa e toda lógica; sobrepor cabeçalho comum e adaptar painel, chips e pill de horário ao modo imediato/agendado.
   - Logística: trocar somente o cabeçalho/logo e consolidar cartões, chips e superfícies com os tokens atuais; preservar integralmente os passos e regras existentes.
   - Perfil, viagens e telas auxiliares: aplicar cabeçalho, fundo, largura, cartões e navegação inferior compartilhados.

5. **Validação**
   - Verificar rotas principais em viewport móvel e desktop.
   - Confirmar abertura/fechamento da folha, escolha de data/hora, navegação e preservação do mapa e formulários.
   - Confirmar ausência de erros no navegador e metadados completos nas rotas alteradas/criadas.

## Limites
- Nenhuma alteração em tabelas, cadastros, RPCs, auditoria, cotas, restrição geográfica ou lógica de solicitação.
- Nenhuma mudança na paleta, tipografia ou conteúdo do aviso legal.
