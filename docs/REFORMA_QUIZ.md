# Reforma do Quiz: Acesso Público & Inteligência Educacional

Este documento detalha as mudanças arquiteturais e de interface realizadas para tornar o Quiz acessível ao público geral, mantendo a proteção de dados estratégicos.

## 🔓 Acesso Público (Modo Visitante)
O Quiz agora permite que qualquer usuário realize questões sem a necessidade de login imediato.
- **Rota Liberada**: `/quiz` foi adicionada à lista de rotas públicas no `DefaultLayout`.
- **Identificação Visual**: Usuários não logados visualizam um alerta de "Modo Visitante" no topo do Quiz.
- **Barra Lateral Inteligente**: Quando deslogado, a barra lateral oculta todas as métricas e áreas administrativas, exibindo apenas "Quiz", "Vídeos" e "Entrar / Cadastrar".

## 🛡️ Proteção de Métricas (Área Privada)
O acesso a dados de performance e BI continua estritamente protegido.
- **Relatórios & Dashboards**: Exigem autenticação obrigatória.
- **Incentivo ao Cadastro (Conversion Loop)**: Ao finalizar um quiz como visitante, o sistema exibe um CTA (Call to Action) premium incentivando o cadastro para salvar o progresso e ver o Mapa de Calor de Atividade.

## 📋 Itens Auditados
- [x] **DefaultLayout**: Bypass de redirecionamento para `/quiz`.
- [x] **_nav.jsx**: Filtro de visibilidade baseado em `isLogado`.
- [x] **AppHeader**: Ocultação de notificações e perfil para visitantes.
- [x] **Quiz.jsx**: Implementação do `GuestAlert` e bloqueio de salvamento de sessão para visitantes.

## 🚀 Próximos Passos
- Implementar salvamento temporário (Local Storage) para visitantes que decidirem logar após o quiz.
- Criar landing page específica para converter visitantes do quiz em alunos matriculados.
