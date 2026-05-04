// schema.ts
import {
  pgTable,
  serial,
  text,
  varchar,
  char,
  integer,
  primaryKey,
  AnyPgColumn,
  boolean,
  timestamp,
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
  id_externo: integer("id_externo").unique(),
  banca: varchar("banca", { length: 255 }),
  orgao: varchar("orgao", { length: 255 }),
  cargo: varchar("cargo", { length: 255 }),
  ano: integer("ano"),
  escolaridade: varchar("escolaridade", { length: 255 }),
  modalidade: varchar("modalidade", { length: 255 }),
});

export const materias = pgTable("materias", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  indice: varchar("indice", { length: 50 }),
  id_externo: integer("id_externo").unique(),
  parent_id: integer("parent_id").references(
    (): AnyPgColumn => materias.id,
    { onDelete: "cascade" }
  ),
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
  })
);

export const comentarios = pgTable("comentarios", {
  id: serial("id").primaryKey(),
  questao_id: integer("questao_id")
    .notNull()
    .references(() => questoes.id, { onDelete: "cascade" }),
  id_externo_comentario: integer("id_externo_comentario").unique(),
  autor_nome: varchar("autor_nome", { length: 255 }),
  autor_foto: text("autor_foto"),
  texto: text("texto").notNull(),
  is_professor: boolean("is_professor").default(false),
  curtidas: integer("curtidas").default(0),
  criado_em: timestamp("criado_em"),
  coletado_em: timestamp("coletado_em").defaultNow(),
});