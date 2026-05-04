// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
    schema: "./schema.ts", // Onde estão as suas tabelas
    out: "./drizzle", // Onde ele vai salvar o histórico de migrações
    dialect: "postgresql", // Qual é o banco de dados
    dbCredentials: {
        url: "postgres://joao_xavier:sua_senha_segura12@localhost:5433/plataforma_questoes",
    },
    verbose: true,
    strict: true,
});