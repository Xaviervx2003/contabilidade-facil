# 🐳 The Twelve-Factor App (Os Doze Fatores)

## Introdução
Na era moderna, software é comumente entregue como um serviço: denominados web apps, ou software-como-serviço. A aplicação doze-fatores é uma metodologia para construir softwares-como-serviço que:

- Usam formatos declarativos para automatizar a configuração inicial, minimizar tempo e custo para novos desenvolvedores participarem do projeto;
- Tem um contrato claro com o sistema operacional que o suporta, oferecendo portabilidade máxima entre ambientes que o executem;
- São adequados para implantação em modernas plataformas em nuvem, evitando a necessidade por servidores e administração do sistema;
- Minimizam a divergência entre desenvolvimento e produção, permitindo a implantação contínua para máxima agilidade;
- E podem escalar sem significativas mudanças em ferramentas, arquiteturas, ou práticas de desenvolvimento.

A metodologia doze-fatores pode ser aplicada a aplicações escritas em qualquer linguagem de programação, e que utilizem qualquer combinação de serviços de suportes (banco de dados, filas, cache de memória, etc).

## Experiência
Os contribuidores deste documento estão diretamente envolvidos no desenvolvimento e implantação de centenas de aplicações, e indiretamente testemunhando o desenvolvimento, operação e escalada de centenas de milhares de aplicações através de seu trabalho na plataforma Heroku.

Este documento sintetiza toda nossa experiência e observação em uma variedade de aplicações que operam como software-como-serviço. Isto é a triangulação de práticas ideais ao desenvolvimento de software, com uma atenção particular a respeito das dinâmicas de crescimento orgânico de uma aplicação ao longo do tempo, a dinâmica de colaboração entre desenvolvedores trabalhando em uma base de código, e evitando os custos de erosão de software.

Nossa motivação é aumentar a consciência de alguns problemas sistêmicos que temos visto no desenvolvimento de aplicações modernas, prover um vocabulário comum para discussão destes, e oferecer um amplo conjunto de soluções conceituais para esses problemas com a terminologia que os acompanha. O formato é inspirado nos livros de Martin Fowler *Padrões de Arquitetura de Aplicações Enterprise* e *Refatorando*.

## Quem deve ler este documento?
Qualquer desenvolvedor que esta construindo aplicações que rodam como serviço. Engenheiros de Operações que implantam ou administram tais aplicações.

---

### I. Base de Código
**Uma base de código com rastreamento utilizando controle de revisão, muitos deploys**

Uma aplicação 12 fatores é sempre rastreada em um sistema de controle de versão, como Git, Mercurial, ou Subversion. Uma cópia da base de dados do rastreamento de revisões é conhecido como repositório de código, normalmente abreviado como repositório ou repo.

Uma base de código é um único repo (em um sistema de controle de versão centralizado como Subversion), ou uma série de repositórios que compartilham um registro raiz.

**Uma base de código para vários deploys**
Existe sempre uma correlação um-para-um entre a base de código e a aplicação:
- Se existem várias bases de código, isto não é uma app – é um sistema distribuído. Cada componente do sistema é uma app, e cada uma pode individualmente ser compatível com os 12 fatores.
- Múltiplas apps compartilhando uma base de código é uma violação dos 12 fatores. A solução aqui é dividir o código compartilhado entre bibliotecas que podem ser incluídas através do gerenciador de dependências.

Existe apenas uma base de código por aplicação, mas existirão vários deploys da mesma. Um deploy (ou implantação) é uma instância executando a aplicação. Isto é tipicamente um local de produção, e um ou mais locais de testes. Adicionalmente, todo desenvolvedor tem uma cópia da aplicação rodando em seu ambiente local de desenvolvimento, cada um desses pode ser qualificado como um deploy.

---

### II. Dependências
**Declare e isole explicitamente as dependências**

A maioria das linguagens de programação oferecem um sistema de pacotes para a distribuição de bibliotecas de apoio, como o CPAN para Perl ou Rubygems para Ruby. Bibliotecas instaladas por meio de um sistema de pacotes podem ser instaladas em todo o sistema (conhecidas como “site packages”) ou com escopo dentro do diretório contendo a aplicação (conhecidas como “vendoring” ou “building”).

Uma aplicação doze-fatores nunca confia na existência implícita de pacotes em todo o sistema. Ela declara todas as dependências, completa e exatamente, por meio de um manifesto de declaração de dependência. Além disso, ela usa uma ferramenta de isolamento de dependência durante a execução para garantir que não há dependências implícitas “vazamento” a partir do sistema circundante. A completa e explícita especificação de dependências é aplicada de maneira uniforme tanto para produção quanto para desenvolvimento.

---

### III. Configurações
**Armazene as configurações no ambiente**

A configuração de uma aplicação é tudo o que é provável variar entre deploys (homologação, produção, ambientes de desenvolvimento, etc). Isto inclui:
- Recursos para a base de dados, Memcached, e outros serviços de apoio
- Credenciais para serviços externos como Amazon S3 ou Twitter
- Valores por deploy como o nome canônico do host para o deploy

Aplicações às vezes armazenam as configurações no código como constantes. Isto é uma violação da doze-fatores, a qual exige uma estrita separação entre configuração e código. Configuração varia substancialmente entre deploys, código não.

---

### IV. Serviços de Apoio
**Trate serviços de apoio como recursos anexados**

Um serviço de apoio é qualquer serviço que o app consuma via rede como parte de sua operação normal. Exemplos incluem armazenamentos de dados (como MySQL ou CouchDB), sistemas de mensagens/filas (tais como RabbitMQ ou Beanstalkd), serviços SMTP para emails externos (tais como Postfix), e sistemas de cache (tais como Memcached).

O código para um app doze-fatores não faz distinção entre serviços locais e de terceiros. Para o app, ambos são recursos anexados, acessíveis via uma URL ou outro localizador/credenciais na config.

---

### V. Construa, lance, execute
**Separe estritamente os estágios de construção e execução**

Uma base de código é transformada num deploy (de não-desenvolvimento) através de três estágios:
1. **Estágio de construção**: Conversão de um repositório em um pacote executável conhecido como construção.
2. **Estágio de lançamento**: Combina a construção com a configuração atual do deploy.
3. **Estágio de execução**: Roda o app no ambiente de execução.

---

### VI. Processos
**Execute a aplicação como um ou mais processos que não armazenam estado**

Processos doze-fatores são **stateless** (não armazenam estado) e **share-nothing**. Quaisquer dados que precise persistir deve ser armazenado em um serviço de apoio stateful (que armazena o seu estado), tipicamente uma base de dados.

---

### VII. Vínculo de Portas
**Exporte serviços via vínculo de portas**

O aplicativo doze-fatores é completamente auto-contido e não depende de injeções de tempo de execução de um servidor web em um ambiente de execução para criar um serviço que defronte a web. O app web exporta o HTTP como um serviço através da vinculação a uma porta.

---

### VIII. Concorrência
**Escale através do processo modelo**

Na aplicação doze-fatores, processos são cidadãos de primeira classe. O modelo de processo brilha quando chega a hora de escalar. A adição de mais simultaneidade é uma operação simples e de confiança através da replicação de processos.

---

### IX. Descartabilidade
**Maximize robustez com inicialização rápida e desligamento gracioso**

Os processos de um app doze-fatores são descartáveis, significando que podem ser iniciados ou parados a qualquer momento. Isso facilita o escalonamento elástico, rápido deploy de código ou mudanças de configuração, e robustez de deploys de produção.

---

### X. Paridade entre desenvolvimento e produção
**Mantenha o desenvolvimento, homologação e produção o mais similares possível**

Historicamente, houveram lacunas substanciais entre desenvolvimento e produção. O App doze-fatores é projetado para implantação contínua deixando a lacuna entre desenvolvimento e produção pequena:
- **Diminua a lacuna de tempo**: um desenvolvedor pode escrever código e ter o deploy feito em horas ou minutos.
- **Diminua a lacuna de pessoal**: desenvolvedores que escrevem código estão envolvidos no deploy e acompanhamento.
- **Diminua a lacuna de ferramentas**: mantenha desenvolvimento e produção o mais similares possível, inclusive nas versões de serviços de apoio (DB, Cache, etc).

---

### XI. Logs
**Trate logs como fluxos de eventos**

Logs provém visibilidade no comportamento de um app em execução. Um app doze-fatores nunca se preocupa com o roteamento ou armazenagem do seu fluxo de saída. Ele não deve tentar escrever ou gerir arquivos de logs. No lugar, cada processo em execução escreve seu próprio fluxo de evento, sem buffer, para o **stdout**.

---

### XII. Processos administrativos
**Rode tarefas de administração/gestão em processos pontuais**

Processos administrativos pontuais (como migrações de banco de dados ou scripts de correção) devem ser executados em um ambiente idêntico aos processos regulares da app. Eles rodam a mesma versão, usando a mesma base de código e configuração.
