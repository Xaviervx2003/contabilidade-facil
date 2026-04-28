// schema.ts
import {
  pgTable,
  serial,
  text,
  varchar,
  char,
  integer,
  primaryKey,
} from "drizzle-orm/pg-core";

export const questoes = pgTable("questoes", {
  id: serial("id").primaryKey(),
  assunto: varchar("assunto", { length: 255 }),
  enunciado: text("enunciado").notNull(),
  opcao_a: text("opcao_a").notNull(),
  opcao_b: text("opcao_b").notNull(),
  opcao_c: text("opcao_c").notNull(),
  opcao_d: text("opcao_d").notNull(),
  opcao_e: text("opcao_e"),
  resposta_correta: char("resposta_correta", { length: 1 }).notNull(),
  explicacao: text("explicacao"),
  tentativas: integer("tentativas").default(0),
  acertos: integer("acertos").default(0),
  link_video: text("link_video"),
  // ✅ Unique constraint — já cria índice interno automaticamente
  id_externo: integer("id_externo").unique(),
});

export const materias = pgTable("materias", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull().unique(),
});

export const questoesMaterias = pgTable(
  "questoes_materias",
  {
    questao_id: integer("questao_id")
      .notNull()
      .references(() => questoes.id, { onDelete: "cascade" }),
    materia_id: integer("materia_id")
      .notNull()
      .references(() => materias.id, { onDelete: "cascade" }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.questao_id, t.materia_id] }),
  }),
);