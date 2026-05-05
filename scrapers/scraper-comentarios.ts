// scraper-comentarios.ts
// Gran Cursos — Extrator de Comentários por Questão
// Comando: npx tsx scraper-comentarios.ts

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { eq, isNotNull, sql } from "drizzle-orm";
import { questoes, comentarios } from "./schema";

puppeteer.use(StealthPlugin());

// ── Configuração ──────────────────────────────────────────────────────────────
const DB_URL = "postgres://joao_xavier:sua_senha_segura12@localhost:5433/plataforma_questoes";
const API_BASE = "https://rota-api.grancursosonline.com.br";
const USER_DATA_DIR = "C:\\projetos\\contabilidade facil\\chrome-perfil";
const COMENTARIOS_POR_QUESTAO = 5;   // quantos comentários buscar por questão
const PAUSA_MIN_MS = 800;
const PAUSA_MAX_MS = 1800;
const QUESTOES_POR_LOTE = 500;       // processa em lotes para não sobrecarregar

// ── Helpers ───────────────────────────────────────────────────────────────────
const pausa = (ms: number) => new Promise(r => setTimeout(r, ms));
const pausaAleatoria = () => pausa(PAUSA_MIN_MS + Math.random() * (PAUSA_MAX_MS - PAUSA_MIN_MS));

// ── 1. Captura headers via navegador manual ───────────────────────────────────
async function capturarHeaders(): Promise<Record<string, string>> {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║   Gran Cursos — Extrator de Comentários             ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log("║  1. O Chrome vai abrir agora                        ║");
  console.log("║  2. Faça login no Gran Cursos (se necessário)       ║");
  console.log("║  3. Abra qualquer questão para gerar tráfego de API ║");
  console.log("║  4. VOLTE AQUI e pressione ENTER                     ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  const browser = await puppeteer.launch({
    headless: false,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    userDataDir: USER_DATA_DIR,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--start-maximized"],
    defaultViewport: null,
  });

  const page = (await browser.pages())[0] || (await browser.newPage());
  let headers: Record<string, string> = {};
  let headersCapturados = false;

  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    if (url.includes("rota-api.grancursosonline.com.br")) {
      const h = req.headers();
      if (h["authorization"] || h["cookie"]) {
        headers = { ...h };
        if (!headersCapturados) {
          headersCapturados = true;
          console.log("  ✅ Headers de autenticação detectados!");
        }
      }
    }
    req.continue();
  });

  await page.goto("https://questoes.grancursosonline.com.br", { waitUntil: "domcontentloaded" });
  console.log("⏳ Aguardando você navegar e pressionar ENTER...\n");
  console.log("  💡 DICA: Abra qualquer questão — isso garante que a API de comentários seja chamada.\n");

  await new Promise<void>((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => resolve());
  });

  // Reload forçado se não capturou ainda
  if (!headersCapturados) {
    console.log("⚡ Recarregando para capturar autenticação...");
    await page.reload({ waitUntil: "networkidle2" });
    await pausa(2000);
  }

  await browser.close();
  console.log("\n✅ Navegador fechado.\n");

  ["content-length", ":method", ":path", ":scheme", ":authority"].forEach(k => delete headers[k]);

  if (!headersCapturados || Object.keys(headers).length === 0) {
    throw new Error("❌ Headers não capturados. Certifique-se de estar logado.");
  }

  return headers;
}

// ── 2. Buscar comentários de uma questão ──────────────────────────────────────
interface ComentarioApi {
  id: number;
  texto?: string;
  body?: string;
  likes?: number;
  curtidas?: number;
  created_at?: string;
  criado_em?: string;
  usuario?: { nome?: string; name?: string; foto?: string; avatar?: string };
  user?: { nome?: string; name?: string; foto?: string; avatar?: string };
  professor?: boolean;
  is_professor?: boolean;
}

async function buscarComentarios(
  headers: Record<string, string>,
  questaoIdExterno: number
): Promise<{ comentarios: ComentarioApi[]; expirado: boolean }> {
  const url = `${API_BASE}/v1/comentario/questao/${questaoIdExterno}?questao=${questaoIdExterno}&page=1&perPage=${COMENTARIOS_POR_QUESTAO}&professor=0`;
  try {
    const resp = await fetch(url, { headers });

    if (resp.status === 401 || resp.status === 403) {
      return { comentarios: [], expirado: true };
    }
    if (!resp.ok) return { comentarios: [], expirado: false };

    const json: any = await resp.json();

    // A API pode retornar em formatos diferentes — tentamos os mais comuns
    const rows: ComentarioApi[] =
      Array.isArray(json?.data?.rows) ? json.data.rows :
      Array.isArray(json?.data) ? json.data :
      Array.isArray(json?.rows) ? json.rows :
      Array.isArray(json) ? json : [];

    return { comentarios: rows, expirado: false };
  } catch {
    return { comentarios: [], expirado: false };
  }
}

// ── 3. Salvar comentários no banco ────────────────────────────────────────────
async function salvarComentarios(
  db: NodePgDatabase<Record<string, unknown>>,
  questaoIdInterno: number,
  rows: ComentarioApi[]
): Promise<number> {
  let salvos = 0;
  for (const c of rows) {
    if (!c.id) continue;
    const texto = (c.texto || c.body || "").trim();
    if (!texto) continue;

    const usuario = c.usuario || c.user || {};
    const autorNome = (usuario.nome || usuario.name || "Anônimo").slice(0, 255);
    const autorFoto = usuario.foto || usuario.avatar || null;
    const isProfessor = c.professor || c.is_professor || false;
    const curtidas = c.likes ?? c.curtidas ?? 0;
    const criadoEm = c.created_at || c.criado_em
      ? new Date(c.created_at || c.criado_em!)
      : null;

    await db
      .insert(comentarios)
      .values({
        questao_id: questaoIdInterno,
        id_externo_comentario: c.id,
        autor_nome: autorNome,
        autor_foto: autorFoto,
        texto,
        is_professor: isProfessor,
        curtidas,
        criado_em: criadoEm,
      })
      .onConflictDoUpdate({
        target: comentarios.id_externo_comentario,
        set: {
          curtidas,
          texto,
        },
      });
    salvos++;
  }
  return salvos;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║   Gran Cursos — Extrator de Comentários             ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // 1. Conectar banco
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  const db = drizzle(client) as NodePgDatabase<Record<string, unknown>>;

  // 2. Criar tabela se não existir
  await client.query(`
    CREATE TABLE IF NOT EXISTS comentarios (
      id SERIAL PRIMARY KEY,
      questao_id INTEGER NOT NULL REFERENCES questoes(id) ON DELETE CASCADE,
      id_externo_comentario INTEGER UNIQUE,
      autor_nome VARCHAR(255),
      autor_foto TEXT,
      texto TEXT NOT NULL,
      is_professor BOOLEAN DEFAULT FALSE,
      curtidas INTEGER DEFAULT 0,
      criado_em TIMESTAMP,
      coletado_em TIMESTAMP DEFAULT NOW()
    );
  `);
  console.log("✅ Tabela 'comentarios' pronta.\n");

  // 3. Buscar total de questões com id_externo
  const totalResult = await client.query(
    "SELECT COUNT(*) FROM questoes WHERE id_externo IS NOT NULL"
  );
  const total = parseInt(totalResult.rows[0].count, 10);
  console.log(`📊 Total de questões no banco: ${total}\n`);

  // 4. Capturar headers
  let currentHeaders = await capturarHeaders();

  // 5. Processar em lotes
  let offset = 0;
  let totalSalvos = 0;
  let totalProcessadas = 0;
  let totalSemComentario = 0;

  console.log(`\n🚀 Iniciando extração de comentários...\n`);

  while (offset < total) {
    // Busca lote de questões do banco
    const lote = await client.query(
      `SELECT id, id_externo FROM questoes WHERE id_externo IS NOT NULL ORDER BY id LIMIT $1 OFFSET $2`,
      [QUESTOES_POR_LOTE, offset]
    );

    if (lote.rows.length === 0) break;

    for (const questao of lote.rows) {
      totalProcessadas++;
      const pct = ((totalProcessadas / total) * 100).toFixed(1);
      process.stdout.write(`\r  [${totalProcessadas}/${total}] (${pct}%) 💬 ${totalSalvos} salvos | ⬛ ${totalSemComentario} sem comentários`);

      const { comentarios: rows, expirado } = await buscarComentarios(currentHeaders, questao.id_externo);

      if (expirado) {
        console.log(`\n\n⚠️  Sessão expirada! Re-autenticando...`);
        console.log("╔══════════════════════════════════════════════════════╗");
        console.log("║  TOKEN EXPIROU — Faça login novamente no Chrome      ║");
        console.log("║  Abra qualquer questão e pressione ENTER             ║");
        console.log("╚══════════════════════════════════════════════════════╝");
        currentHeaders = await capturarHeaders();
        console.log("✅ Re-autenticado! Continuando...\n");

        // Retry mesma questão
        const retry = await buscarComentarios(currentHeaders, questao.id_externo);
        if (!retry.expirado && retry.comentarios.length > 0) {
          const salvos = await salvarComentarios(db, questao.id, retry.comentarios);
          totalSalvos += salvos;
        }
        continue;
      }

      if (rows.length === 0) {
        totalSemComentario++;
      } else {
        const salvos = await salvarComentarios(db, questao.id, rows);
        totalSalvos += salvos;
      }

      await pausaAleatoria();
    }

    offset += QUESTOES_POR_LOTE;
  }

  await client.end();

  console.log(`\n\n╔══════════════════════════════════════════════════════╗`);
  console.log(`║           EXTRAÇÃO DE COMENTÁRIOS CONCLUÍDA         ║`);
  console.log(`╠══════════════════════════════════════════════════════╣`);
  console.log(`║  Questões processadas : ${String(totalProcessadas).padEnd(28)}║`);
  console.log(`║  Comentários salvos   : ${String(totalSalvos).padEnd(28)}║`);
  console.log(`║  Questões sem coment. : ${String(totalSemComentario).padEnd(28)}║`);
  console.log(`╚══════════════════════════════════════════════════════╝\n`);
}

main().catch(err => {
  console.error("\n💥 Erro fatal:", err);
  process.exit(1);
});
