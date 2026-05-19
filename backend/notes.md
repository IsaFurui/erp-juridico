createParamDecorator() - usado para criar o decorator
- Recebe 2 parâmetros, o data, que são dados opcionais passados no decorator.
- Recebe ctx que é o contexto da execução, este pode ser um objeto do tipo ExecutionContext.

ExecutionContext
- O Nest pode carregar contextos HTTP, Websocket, Microservices e GraphQL. Então switchToHttp(), pode ser uma função usada para indicar que se deseja trabalhar com o contexto de HTTP.

getRequest()
- Pega o objeto da requisição Express/Fastify. Com isso, se tem acesso ao headers, body, user.