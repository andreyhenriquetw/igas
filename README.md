# Agenda do Espaço

Aplicação mobile-first para administrar reservas, bloqueios, pagamentos e contratos de um único espaço.

## Requisitos

- Node.js 20.19+ (ou 22.12+)
- Banco PostgreSQL no Neon

## Configuração local

1. Copie `.env.example` para `.env.local`. Use a URL **pooled** do Neon em `DATABASE_URL` (aplicação), a URL direta em `DIRECT_URL` (migrações) e gere um valor aleatório para `AUTH_SECRET`.
2. Instale as dependências com `npm install`.
3. Aplique a migração inicial com `npm run db:migrate`.
4. Inicie o projeto com `npm run dev`.
5. No primeiro acesso, crie a conta proprietária. Depois, use **Equipe** para cadastrar a conta individual da segunda pessoa.

O arquivo `.env.local` não deve ser compartilhado nem enviado ao Git.

## Banco e regras

- `prisma/schema.prisma` define usuários, modalidades e entradas da agenda.
- `prisma/migrations` guarda o histórico SQL. A migração inicial cria as modalidades day-use (8h–20h) e day-use com pernoite (8h–20h do dia seguinte).
- Horários e durações padrão podem ser editados em **Modalidades**; cada reserva também guarda seus próprios horários.
- Uma restrição PostgreSQL impede sobreposição de reservas pendentes/confirmadas e bloqueios, inclusive em transações simultâneas. Cancelamentos liberam o horário.
- Clientes podem solicitar reservas em `/cliente`; o calendário público mostra disponibilidade por modalidade. Pedidos chegam pendentes ao proprietário e ficam sem valores até que ele combine o preço.
- Valores são armazenados em BRL. A situação do pagamento é derivada do valor pago e total.
- Cada reserva pode ter um contrato próprio, editável e baixado em PDF. O modelo de locação inclui as condições do espaço e atualiza automaticamente nome, CPF, modalidade, datas, horários e valores com os dados da reserva; o texto e o status de geração ficam salvos nela.
- O sistema também pode gerar um link de aceite do contrato, válido por sete dias. O cliente confirma o nome, CPF e concordância com o contrato; esse registro é interno ao ÍGAS e não equivale a uma assinatura gov.br ou certificado digital. O PDF registra automaticamente o aceite do locador no horário de criação da reserva; o aceite do locatário só aparece após a confirmação pelo link. O PDF posiciona cada registro acima da assinatura correspondente. Após o aceite do locatário, a agenda permite baixar o PDF e abrir uma conversa no WhatsApp do contato cadastrado; é necessário anexar o PDF e enviar manualmente. A migração correspondente precisa estar aplicada para habilitar o recurso.
- Instantes são persistidos em UTC e apresentados no fuso `America/Sao_Paulo`.

## Sincronização

Os navegadores consultam a agenda e a quantidade de agendamentos pendentes a cada seis segundos e ao voltar a ficar visíveis. Assim, mudanças aparecem sem recarregar a página e sem depender de uma função de tempo real do Neon. O limite é um atraso de até alguns segundos; não há envio instantâneo por WebSocket.
