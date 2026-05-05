// limpar-duplicadas.ts
// Resolve questões duplicadas no banco mantendo a original e unindo as matérias
// Comando: npx tsx limpar-duplicadas.ts

import { Client } from "pg";

const DB_URL = "postgres://joao_xavier:sua_senha_segura12@localhost:5433/plataforma_questoes";

async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║   Limpador de Questões Duplicadas (Clones Perfeitos) ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  console.log("🔍 Procurando clones no banco de dados...\n");

  // Busca grupos de questões com o mesmo enunciado e opções
  const query = `
    SELECT 
      ARRAY_AGG(id ORDER BY id) as ids
    FROM questoes
    GROUP BY 
      md5(enunciado), 
      md5(opcao_a), 
      md5(opcao_b), 
      md5(opcao_c), 
      md5(opcao_d), 
      md5(COALESCE(opcao_e, '')),
      resposta_correta
    HAVING COUNT(*) > 1;
  `;

  const { rows } = await client.query(query);

  if (rows.length === 0) {
    console.log("✅ Nenhuma questão duplicada encontrada!");
    await client.end();
    return;
  }

  console.log(`⚠️ Encontrados ${rows.length} grupos de questões duplicadas.\n`);

  let totalDeletadas = 0;
  let totalMateriasMovidas = 0;

  for (const row of rows) {
    const ids: number[] = row.ids;
    
    // A primeira questão (menor ID) é a original que vamos manter
    const idOriginal = ids[0];
    const idsParaDeletar = ids.slice(1);

    // 1. Mover as matérias (tags) das duplicadas para a original
    for (const idClone of idsParaDeletar) {
      const { rows: materiasClone } = await client.query(
        "SELECT materia_id FROM questoes_materias WHERE questao_id = $1",
        [idClone]
      );

      for (const m of materiasClone) {
        // Tenta inserir a matéria na questão original (ignora se já tiver)
        const res = await client.query(`
          INSERT INTO questoes_materias (questao_id, materia_id) 
          VALUES ($1, $2) 
          ON CONFLICT (questao_id, materia_id) DO NOTHING
        `, [idOriginal, m.materia_id]);
        
        if (res.rowCount && res.rowCount > 0) {
          totalMateriasMovidas++;
        }
      }
    }

    // 2. Mover feedbacks (se houver algum feedback deixado em uma questão clone)
    for (const idClone of idsParaDeletar) {
      await client.query(`
        UPDATE feedbacks_questoes 
        SET questao_id = $1 
        WHERE questao_id = $2
      `, [idOriginal, idClone]);
    }

    // 3. Deletar os clones do banco (isso apaga em cascata de questoes_materias e comentarios)
    if (idsParaDeletar.length > 0) {
      const placeholders = idsParaDeletar.map((_, i) => `$${i + 1}`).join(", ");
      await client.query(`DELETE FROM questoes WHERE id IN (${placeholders})`, idsParaDeletar);
      totalDeletadas += idsParaDeletar.length;
    }
  }

  console.log("✅ Limpeza concluída com sucesso!");
  console.log(`🗑️  Total de questões deletadas (clones removidos) : ${totalDeletadas}`);
  console.log(`🔗 Total de matérias unificadas na questão original: ${totalMateriasMovidas}\n`);

  await client.end();
}

main().catch((err) => {
  console.error("💥 Erro fatal:", err);
  process.exit(1);
});
