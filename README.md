# Rinha de backend 2025

Projeto desenvolvido para a [Rinha de backend 2025](https://github.com/zanfranceschi/rinha-de-backend-2025)

- **Linguagem:** Bun e typescript
- **Armazenamento:**: PostgreSQL
- **Fila:** Redis
- **Balanceador:** Nginx
- **Orquestração:** Docker Compose

## Como rodar

1. Clone o projeto da rinha

```
  git clone https://github.com/zanfranceschi/rinha-de-backend-2025
```

2. Entre na pasta payment-processor e suba o docker-compose.

_Sempre suba primeiro o payment-processor para configurar corretamente a rede local._

```
  cd payment-processor
  docker-compose up -d
```

3. Na pasta raiz do projeto suba o backend local.

```
  docker-compose up -d
```

O backend vai rodar na posta **9999**

### Execução dos testes local

Para executar os testes local no projeto da rinha, entre na pasta rinha-test e rode o script k6 para testar o backend.

```
  cd rinha-test
  k6 run .\rinha.js
```

### Tecnologias utilizadas

- **Linguagem**:
  **Bun** foi utilizado como o runtime JavaScript para executar o backend, que foi desenvolvido em **TypeScript**.

- **Armazenamento**:
  **Redis** é utilizado como armazenamento para pagamentos recebidos, salvando os dados e indexando-os cronologicamente em um sorted set para facilitar a recuperação ordenada por data de requisição.

- **Fila**:
  **BullMQ** é utilizado, em conjunto com o Redis, para gerenciar filas de processamento, desacoplando a recepção de pagamentos da API do processamento assíncrono executado pelo worker.

- **Balanceador**:
  **Nginx** funciona como um load balancer como o ponto de entrada único da aplicação e distribuindo as requisições entre as instâncias da API.

- **Orquestração**:
  **Docker Compose** para orquestrar todos os serviços, definindo os contêineres, redes, e limites de recursos no ambiente.
