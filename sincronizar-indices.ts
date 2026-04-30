
import { Client } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { materias } from "./schema";

async function sincronizarIndices() {
  console.log("🔌 Conectando ao banco para sincronizar índices...");
  const client = new Client({
    connectionString: "postgres://joao_xavier:sua_senha_segura12@localhost:5433/plataforma_questoes",
  });
  await client.connect();
  const db = drizzle(client);

  const estrutura = [
    { nome: "Administração Geral", indice: "0", pai: null },
    { nome: "Introdução à Administração", indice: "1", pai: "Administração Geral" },
    { nome: "Conceitos introdutórios de Administração", indice: "1.1", pai: "Introdução à Administração" },
    { nome: "Conceitos de administração/organização", indice: "1.1.1", pai: "Conceitos introdutórios de Administração" },
    { nome: "Eficiência, eficácia e efetividade", indice: "1.1.2", pai: "Conceitos introdutórios de Administração" },
    { nome: "Ambiente organizacional", indice: "1.2", pai: "Introdução à Administração" },
    { nome: "Papéis dos administradores", indice: "1.3", pai: "Introdução à Administração" },
    { nome: "Níveis organizacionais", indice: "1.4", pai: "Introdução à Administração" },
    { nome: "Habilidades do Administrador", indice: "1.5", pai: "Introdução à Administração" },
    { nome: "Processo organizacional (PODC)", indice: "1.6", pai: "Introdução à Administração" },
    { nome: "Planejamento", indice: "1.6.1", pai: "Processo organizacional (PODC)" },
    { nome: "Organização", indice: "1.6.2", pai: "Processo organizacional (PODC)" },
    { nome: "Direção", indice: "1.6.3", pai: "Processo organizacional (PODC)" },
    { nome: "Controle", indice: "1.6.4", pai: "Processo organizacional (PODC)" },
    { nome: "Teorias da Administração", indice: "2", pai: "Administração Geral" },
    { nome: "Abordagem clássica", indice: "2.1", pai: "Teorias da Administração" },
    { nome: "Teoria da administração científica", indice: "2.1.1", pai: "Abordagem clássica" },
    { nome: "Teoria clássica", indice: "2.1.2", pai: "Abordagem clássica" },
    { nome: "Princípios gerais da administração segundo Fayol", indice: "2.1.2.1", pai: "Teoria clássica" },
    { nome: "Abordagem humanística", indice: "2.2", pai: "Teorias da Administração" },
    { nome: "Teoria das relações humanas", indice: "2.2.1", pai: "Abordagem humanística" },
    { nome: "Abordagem neoclássica", indice: "2.3", pai: "Teorias da Administração" },
    { nome: "Teoria Neoclássica da Administração", indice: "2.3.1", pai: "Abordagem neoclássica" },
    { nome: "Administração por objetivos (APO)", indice: "2.3.2", pai: "Abordagem neoclássica" },
    { nome: "Abordagem Estruturalista", indice: "2.4", pai: "Teorias da Administração" },
    { nome: "Teoria da burocracia", indice: "2.4.1", pai: "Abordagem Estruturalista" },
    { nome: "Teoria estruturalista", indice: "2.4.2", pai: "Abordagem Estruturalista" },
    { nome: "Abordagem Comportamental", indice: "2.5", pai: "Teorias da Administração" },
    { nome: "Teoria comportamental ou behaviorista da Administração", indice: "2.5.1", pai: "Abordagem Comportamental" },
    { nome: "Comportamento organizacional", indice: "2.5.2", pai: "Abordagem Comportamental" },
    { nome: "Teoria do Desenvolvimento Organizacional", indice: "2.5.3", pai: "Abordagem Comportamental" },
    { nome: "Abordagem Sistêmica", indice: "2.6", pai: "Teorias da Administração" },
    { nome: "Teoria Geral dos Sistemas", indice: "2.6.1", pai: "Abordagem Sistêmica" },
    { nome: "Abordagem Contingencial", indice: "2.7", pai: "Teorias da Administração" },
    { nome: "Teoria contingencial", indice: "2.7.1", pai: "Abordagem Contingencial" },
  ];

  console.log(`🚀 Sincronizando ${estrutura.length} tópicos...`);

  for (const item of estrutura) {
    try {
      // 1. Busca o ID do item atual
      const [dbItem] = await db.select({ id: materias.id })
        .from(materias)
        .where(eq(materias.nome, item.nome))
        .limit(1);

      if (dbItem) {
        let parentId = null;

        // 2. Se tiver pai, busca o ID do pai
        if (item.pai) {
          const [dbPai] = await db.select({ id: materias.id })
            .from(materias)
            .where(eq(materias.nome, item.pai))
            .limit(1);
          if (dbPai) parentId = dbPai.id;
        }

        // 3. Atualiza índice e pai
        await db.update(materias)
          .set({ 
            indice: item.indice,
            parent_id: parentId 
          })
          .where(eq(materias.id, dbItem.id));
        
        console.log(`✅ Atualizado: ${item.indice} - ${item.nome}`);
      } else {
        console.warn(`⚠️ Matéria não encontrada no banco: ${item.nome}`);
      }
    } catch (err: any) {
      console.error(`❌ Erro ao atualizar ${item.nome}:`, err.message);
    }
  }

  await client.end();
  console.log("\n🏁 Sincronização concluída!");
}

sincronizarIndices().catch(console.error);
