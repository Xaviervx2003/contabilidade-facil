
import pkg from 'pg';
const { Client } = pkg;
import 'dotenv/config';

const DB_URL = process.env.DATABASE_URL || "postgres://joao_xavier:sua_senha_segura12@localhost:5433/plataforma_questoes";

async function updateSchema() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  
  console.log("Updating schema...");
  
  try {
    // Adicionar coluna dificuldade_id se não existir
    await client.query(`
      ALTER TABLE questoes ADD COLUMN IF NOT EXISTS dificuldade_id INT;
    `);
    
    // Criar tabela de dificuldades
    await client.query(`
      CREATE TABLE IF NOT EXISTS dificuldades (
        id INT PRIMARY KEY,
        nome VARCHAR(50)
      );
    `);
    
    // Inserir valores padrão
    await client.query(`
      INSERT INTO dificuldades (id, nome) VALUES 
      (1, 'Fácil'), 
      (2, 'Médio'), 
      (3, 'Difícil'), 
      (4, 'Muito Difícil')
      ON CONFLICT (id) DO NOTHING;
    `);
    
    console.log("✅ Schema updated successfully!");
  } catch (e) {
    console.error("❌ Error updating schema:", e);
  } finally {
    await client.end();
  }
}

updateSchema();
