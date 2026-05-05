// atualizar-banco.ts
import { Client } from "pg";

async function atualizarBanco() {
    console.log("🔌 Conectando ao banco de dados...");
    const client = new Client({
        connectionString: "postgres://joao_xavier:sua_senha_segura12@localhost:5433/plataforma_questoes",
    });

    await client.connect();
    console.log("✅ Conectado! Adicionando colunas de forma segura...");

    try {
        // Roda os comandos SQL de alteração de forma direta
        await client.query(`
      ALTER TABLE materias ADD COLUMN IF NOT EXISTS id_externo INTEGER UNIQUE;
      ALTER TABLE materias ADD COLUMN IF NOT EXISTS parent_id INTEGER REFERENCES materias(id) ON DELETE CASCADE;
    `);
        console.log("✅ Sucesso! Colunas 'id_externo' e 'parent_id' adicionadas à tabela materias.");
    } catch (err: any) {
        console.error("❌ Erro ao atualizar o banco:", err.message);
    } finally {
        await client.end();
    }
}

atualizarBanco();