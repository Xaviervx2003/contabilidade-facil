
import { Client } from "pg";

async function apagarQuestoesForaDaEstrutura() {
  console.log("🔌 Conectando ao banco para limpeza de questões...");
  const client = new Client({
    connectionString: "postgres://joao_xavier:sua_senha_segura12@localhost:5433/plataforma_questoes",
  });
  await client.connect();

  try {
    console.log("🔍 Identificando questões que não pertencem à estrutura de Administração Geral...");

    // 1. Deletar os vínculos em questoes_materias que não apontam para matérias com índice definido
    const resVinculos = await client.query(`
      DELETE FROM questoes_materias 
      WHERE materia_id NOT IN (SELECT id FROM materias WHERE indice IS NOT NULL);
    `);
    console.log(`🧹 Vínculos órfãos removidos: ${resVinculos.rowCount}`);

    // 2. Deletar as questões que não possuem MAIS NENHUM vínculo com matérias da estrutura
    // Isso garante que se uma questão pertencia a "Administração" (com índice) e "Outra Coisa" (sem índice),
    // ela só será apagada se não tiver nenhum vínculo válido restante.
    const resQuestoes = await client.query(`
      DELETE FROM questoes 
      WHERE id NOT IN (SELECT DISTINCT questao_id FROM questoes_materias);
    `);
    console.log(`🗑️ Questões fora da estrutura apagadas: ${resQuestoes.rowCount}`);

    console.log("\n✅ Limpeza de questões concluída!");
    
  } catch (err: any) {
    console.error("❌ Erro durante a limpeza:", err.message);
  } finally {
    await client.end();
  }
}

apagarQuestoesForaDaEstrutura().catch(console.error);
