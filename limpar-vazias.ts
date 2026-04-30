
import { Client } from "pg";

async function limparMateriasVazias() {
  console.log("🔌 Conectando ao banco para limpeza...");
  const client = new Client({
    connectionString: "postgres://joao_xavier:sua_senha_segura12@localhost:5433/plataforma_questoes",
  });
  await client.connect();

  try {
    console.log("🔍 Identificando matérias que não possuem questões e nem filhos com questões...");

    // Esta query deleta matérias que:
    // 1. Não possuem questões vinculadas (questoes_materias)
    // 2. Não possuem matérias filhas (que poderiam ter questões)
    // É um processo recursivo seguro: primeiro deletamos os netos vazios, depois os pais que ficaram vazios.
    
    let deletadasTotal = 0;
    let rodadas = 0;
    let continuar = true;

    while (continuar && rodadas < 5) { // Rodamos algumas vezes para limpar a árvore de baixo para cima
      const query = `
        DELETE FROM materias 
        WHERE id NOT IN (SELECT DISTINCT materia_id FROM questoes_materias)
        AND id NOT IN (SELECT DISTINCT parent_id FROM materias WHERE parent_id IS NOT NULL)
        RETURNING id;
      `;

      const res = await client.query(query);
      const deletadasNestaRodada = res.rowCount || 0;
      deletadasTotal += deletadasNestaRodada;
      rodadas++;
      
      console.log(`🧹 Rodada ${rodadas}: ${deletadasNestaRodada} matérias removidas.`);
      
      if (deletadasNestaRodada === 0) {
        continuar = false;
      }
    }

    console.log(`\n✅ Limpeza concluída! Total de matérias vazias apagadas: ${deletadasTotal}`);
    
  } catch (err: any) {
    console.error("❌ Erro durante a limpeza:", err.message);
  } finally {
    await client.end();
  }
}

limparMateriasVazias().catch(console.error);
