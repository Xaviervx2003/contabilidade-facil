// importar-arvore.ts
import fs from "fs";
import path from "path";
import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { eq } from "drizzle-orm";
import { materias } from "./schema";

async function importarArvore() {
  console.log("🔌 Conectando ao banco de dados...");
  const client = new Client({
    connectionString: "postgres://joao_xavier:sua_senha_segura12@localhost:5433/plataforma_questoes",
  });
  await client.connect();
  const db = drizzle(client);

  const arquivoPath = path.resolve("materias-arvore.json");
  if (!fs.existsSync(arquivoPath)) {
    console.error("❌ Arquivo materias-arvore.json não encontrado!");
    console.log("➡️  Rode o 'npx tsx scraper-materias.ts' primeiro.");
    process.exit(1);
  }

  console.log("📖 Lendo arquivo materias-arvore.json...");
  const dados = JSON.parse(fs.readFileSync(arquivoPath, "utf-8"));
  const listaMaterias: any[] = dados.materias;

  // Ordena por nível (0, 1, 2...) para garantir que os pais sejam criados antes dos filhos
  listaMaterias.sort((a, b) => (a.nivel || 0) - (b.nivel || 0));

  console.log(`🚀 Iniciando importação de ${listaMaterias.length} matérias...`);

  const mapIds = new Map<number, number>();
  let inseridas = 0;

  for (const item of listaMaterias) {
    let parentIdInterno = null;

    if (item.pai) {
      if (mapIds.has(item.pai)) {
        parentIdInterno = mapIds.get(item.pai)!;
      } else {
        const [dbPai] = await db.select({ id: materias.id })
          .from(materias).where(eq(materias.id_externo, item.pai)).limit(1);
        if (dbPai) parentIdInterno = dbPai.id;
      }
    }

    try {
      const [inserido] = await db.insert(materias).values({
        nome: item.nome.slice(0, 255),
        id_externo: item.id,
        parent_id: parentIdInterno,
        indice: item.indice || null,
      })
      .onConflictDoUpdate({
        target: materias.id_externo,
        set: { indice: item.indice || null }
      })
      .returning({ id: materias.id });

      if (inserido?.id) {
        mapIds.set(item.id, inserido.id);
        inseridas++;
      } else {
        const [existente] = await db.select({ id: materias.id })
          .from(materias).where(eq(materias.id_externo, item.id)).limit(1);
        if (existente) mapIds.set(item.id, existente.id);
      }
    } catch (err: any) {
      console.error(`⚠️ Erro ao inserir matéria ${item.id} - ${item.nome}:`, err.message);
    }
  }

  await client.end();
  console.log(`\n✅ Sucesso! ${inseridas} novas matérias/assuntos adicionados à árvore no banco.`);
}

importarArvore().catch(console.error);