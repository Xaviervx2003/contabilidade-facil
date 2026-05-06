import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Client } from "pg";
import { questoes, materias, questoesMaterias } from "./schema";
import * as fs from "fs/promises";

puppeteer.use(StealthPlugin());

// ── Configuração ──────────────────────────────────────────────────────────────
const DB_URL = "postgres://neondb_owner:npg_am9VruRGh2jD@ep-aged-lake-ac521a8u.sa-east-1.aws.neon.tech:5432/neondb?sslmode=require";
const API_BASE = "https://rota-api.grancursosonline.com.br";
const USER_DATA_DIR = "C:\\projetos\\contabilidade facil\\chrome-perfil";
const QUESTOES_POR_PAG = 100;
const PAUSA_MIN_MS = 0;
const PAUSA_MAX_MS = 0;

// O ID EXATO DE ADMINISTRAÇÃO GERAL
const DISCIPLINA_ALVO_ID = 404571;
const DISCIPLINA_ALVO_NOME = "Administração Geral";

// ── Tipos (interfaces) ───────────────────────────────────────────────────────
interface MateriaApi {
  id: number;
  nome: string;
  pai?: number | null;
  indice?: string;
  nivel?: number;
  filhos?: number[];
  total_questoes?: number;
}

interface QuestaoApi {
  id: number;
  enunciado_clean?: string;
  enunciado?: string;
  itens?: ItemApi[];
  resposta?: number;
  assuntos?: { id: number; nome: string }[];
  bancas?: { nome: string }[];
  orgaos?: { nome: string }[];
  cargos?: { descricao: string }[];
  anos?: string[];
  provas?: { nome?: string; nivel?: string }[];
  tipo?: string;
}

interface ItemApi {
  id?: number;
  rotulo?: string;
  letra?: string;
  corpo_clean?: string;
  corpo?: string;
  texto?: string;
  correta?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const pausa = (ms: number) => new Promise(r => setTimeout(r, ms));
const pausaAleatoria = () => pausa(PAUSA_MIN_MS + Math.random() * (PAUSA_MAX_MS - PAUSA_MIN_MS));
const lerTexto = (a: ItemApi) => (a.corpo_clean || a.corpo || a.texto || "").trim();
const lerLetra = (a: ItemApi) => (a.rotulo || a.letra || "").trim().charAt(0).toLowerCase();

// ── 1. Captura headers via navegador manual ─────────────────────
async function capturarHeaders(): Promise<Record<string, string>> {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║     ETAPA 1 — CAPTURAR SESSÃO DO GRAN CURSOS        ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log("║  1. O Chrome vai abrir agora                        ║");
  console.log("║  2. Aguarde a página de questões carregar           ║");
  console.log("║  3. Quando aparecer 'Headers detectados',           ║");
  console.log("║     VOLTE AQUI e pressione ENTER                     ║");
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
      if (h["authorization"] && h["authorization"].startsWith("Bearer ")) {
        headers = { ...h };
        if (!headersCapturados) {
          headersCapturados = true;
          console.log("  ✅ Token Bearer capturado com sucesso! Pressione ENTER.");
        }
      }
    }
    req.continue();
  });

  await page.goto("https://questoes.grancursosonline.com.br", { waitUntil: "domcontentloaded" });
  
  await new Promise<void>((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => resolve());
  });

  await browser.close();
  
  // Remove headers HTTP/2 problemáticos
  ["content-length", ":method", ":path", ":scheme", ":authority"].forEach(k => delete headers[k]);

  if (!headersCapturados || Object.keys(headers).length === 0) {
    throw new Error("❌ Headers não capturados.");
  }

  return headers;
}

// ── 2. Buscar árvore de Administração Geral ────────────────
async function buscarArvoreCompleta(headers: Record<string, string>, raizId: number): Promise<MateriaApi[]> {
  let todosItens: MateriaApi[] = [];
  let pagina = 1;
  const maxPaginas = 10;

  console.log(`\nBaixando árvore da disciplina ID ${raizId}...`);

  while (pagina <= maxPaginas) {
    const params = new URLSearchParams({
      perPage: "150",
      page: String(pagina),
      sort: "indiceOrdenacao",
      materia: "0",
      comQuestoes: "1",
    });

    ["id", "nome", "assunto_raiz", "pai", "indice", "nivel", "filhos"].forEach(f =>
      params.append("_source[]", f)
    );

    params.append("raiz[]", String(raizId));

    const url = `${API_BASE}/v3/materia/arvore?${params.toString()}`;
    console.log(`📡 Página ${pagina}...`);

    const resposta = await fetch(url, { headers });

    if (resposta.status === 401 || resposta.status === 403) {
      throw new Error(`❌ Autenticação falhou (${resposta.status}). Token pode estar expirado.`);
    }

    if (!resposta.ok) break;

    const dados: any = await resposta.json();
    const itens: MateriaApi[] =
      Array.isArray(dados?.data?.rows) ? dados.data.rows :
        Array.isArray(dados?.data) ? dados.data :
          Array.isArray(dados) ? dados : [];

    if (itens.length === 0) break;
    todosItens.push(...itens);

    const totalPages = dados?.data?.pages || 1;
    console.log(`  ✅ +${itens.length} itens (pág ${pagina}/${totalPages})`);

    if (pagina >= totalPages) break;
    pagina++;
    await pausaAleatoria();
  }

  console.log(`\n✅ Total: ${todosItens.length} sub-tópicos de Administração Geral\n`);
  return todosItens;
}

// ── 3. Salvar matéria no banco (com hierarquia) ──────────────────────────────
async function salvarMateria(
  db: NodePgDatabase<Record<string, unknown>>,
  mat: MateriaApi,
  materiaIdMap: Map<number, number>
): Promise<number | undefined> {
  if (!mat.id || !mat.nome) return undefined;
  const parentId = mat.pai ? materiaIdMap.get(mat.pai) ?? null : null;

  const [salva] = await db
    .insert(materias)
    .values({
      nome: mat.nome.slice(0, 255),
      id_externo: mat.id,
      indice: mat.indice?.slice(0, 50) ?? null,
      parent_id: parentId,
    })
    .onConflictDoUpdate({
      target: materias.id_externo,
      set: {
        nome: mat.nome.slice(0, 255),
        indice: mat.indice?.slice(0, 50) ?? null,
        parent_id: parentId,
      },
    })
    .returning({ id: materias.id });
  return salva?.id;
}

// ── 4. Processar uma questão (inserir no banco) ──────────────────────────────
async function processarQuestao(
  db: NodePgDatabase<Record<string, unknown>>,
  item: QuestaoApi,
  materiaIdMap: Map<number, number>
): Promise<"inserida" | "pulada" | "repetida"> {
  const itens = item.itens || [];
  const alt = { a: "", b: "", c: "", d: "", e: null as string | null };
  let gabarito = "A";

  if (itens.length > 0) {
    const letrasMap = ["a", "b", "c", "d", "e"];
    const isCertoErrado = itens.length === 2;

    for (let index = 0; index < itens.length; index++) {
      const i = itens[index];
      const letraLida = lerLetra(i);
      
      // Se for Certo/Errado, forçamos index 0 -> a, 1 -> b.
      // Se não, usamos a letra oficial. Se for inválida, fallback pro index.
      const letraFinal = isCertoErrado ? letrasMap[index] : (letrasMap.includes(letraLida) ? letraLida : (letrasMap[index] || "e"));
      
      const texto = lerTexto(i) || (i.rotulo || i.letra || "").trim() || letraFinal.toUpperCase();

      if (letraFinal === "a") alt.a = texto;
      if (letraFinal === "b") alt.b = texto;
      if (letraFinal === "c") alt.c = texto;
      if (letraFinal === "d") alt.d = texto;
      if (letraFinal === "e") alt.e = texto;

      if (i.id === item.resposta || i.correta === true) {
        gabarito = letraFinal.toUpperCase();
      }
    }
  }

  // Agora basta ter 2 alternativas preenchidas para não ser pulada
  if (!alt.a || !alt.b) return "pulada";

  const enunciado = (item.enunciado_clean || item.enunciado || "").trim();
  if (!enunciado || !item.id) return "pulada";

  const prova = item.provas?.[0];
  const banca = (item.bancas || []).map(b => b.nome).join(" / ") || null;
  const orgao = (item.orgaos || []).map(o => o.nome).join(" / ") || null;
  const cargo = (item.cargos || []).map(c => c.descricao).join(" / ") || null;
  const ano = item.anos?.length ? Math.max(...item.anos.map(Number)) : null;
  const escolaridade = prova?.nome || prova?.nivel || null;
  const modalidade = item.tipo || null;
  const assuntoNome = (item.assuntos?.[0]?.nome || "Sem Assunto").slice(0, 255);

  const [existente] = await db.select({ id: questoes.id }).from(questoes).where(eq(questoes.id_externo, item.id));

  let questaoId: number;

  if (existente) {
    questaoId = existente.id;
    await db.update(questoes).set({
        assunto: assuntoNome,
        enunciado,
        opcao_a: alt.a || null,
        opcao_b: alt.b || null,
        opcao_c: alt.c || null,
        opcao_d: alt.d || null,
        opcao_e: alt.e || null,
        resposta_correta: gabarito,
        banca: banca?.slice(0, 255),
        orgao: orgao?.slice(0, 255),
        cargo: cargo?.slice(0, 255),
        ano,
        escolaridade: escolaridade?.slice(0, 255),
        modalidade: modalidade?.slice(0, 255),
      }).where(eq(questoes.id, existente.id));
  } else {
    const [nova] = await db
      .insert(questoes)
      .values({
        assunto: assuntoNome,
        enunciado,
        opcao_a: alt.a || null,
        opcao_b: alt.b || null,
        opcao_c: alt.c || null,
        opcao_d: alt.d || null,
        opcao_e: alt.e || null,
        resposta_correta: gabarito,
        explicacao: null,
        tentativas: 0,
        acertos: 0,
        link_video: null,
        id_externo: item.id,
        banca: banca?.slice(0, 255),
        orgao: orgao?.slice(0, 255),
        cargo: cargo?.slice(0, 255),
        ano,
        escolaridade: escolaridade?.slice(0, 255),
        modalidade: modalidade?.slice(0, 255),
      })
      .returning({ id: questoes.id });
      
    if (!nova?.id) return "pulada";
    questaoId = nova.id;
  }

  for (const assunto of item.assuntos || []) {
    let mid = materiaIdMap.get(assunto.id);
    if (!mid) {
      const [nova] = await db
        .insert(materias)
        .values({ nome: assunto.nome.slice(0, 255), id_externo: assunto.id })
        .onConflictDoUpdate({
          target: materias.id_externo,
          set: { nome: assunto.nome.slice(0, 255) },
        })
        .returning({ id: materias.id });
      mid = nova?.id;
      if (mid) materiaIdMap.set(assunto.id, mid);
    }
    if (mid) {
      await db.insert(questoesMaterias).values({ questao_id: questaoId, materia_id: mid }).onConflictDoNothing();
    }
  }
  return existente ? "repetida" : "inserida";
}

// ── 5. Extrair questões de uma matéria folha ─────────────────────────────────
async function extrairQuestoesDaMateria(
  db: NodePgDatabase<Record<string, unknown>>,
  headers: Record<string, string>,
  materiaId: number,
  materiaNome: string,
  materiaIdMap: Map<number, number>
): Promise<{ inseridas: number; repetidas: number; puladas: number; expirado: boolean }> {
  let inseridas = 0, repetidas = 0, puladas = 0, pagina = 1;
  while (true) {
    const params = new URLSearchParams({
      perPage: String(QUESTOES_POR_PAG),
      page: String(pagina),
      resolucao: "TODAS",
      anulada: "0",
      desatualizada: "0",
    });
    params.append("assunto[]", String(materiaId));
    const url = `${API_BASE}/v1/elastic/questao?${params.toString()}`;
    const resp = await fetch(url, { headers });
    if (resp.status === 401 || resp.status === 403) {
      console.error("\n⚠️  Sessão expirada! Será necessário re-autenticar.");
      return { inseridas, repetidas, puladas, expirado: true };
    }
    if (!resp.ok) break;
    const json: any = await resp.json();
    const rows = json?.data?.rows || [];
    const totalPages = json?.data?.pages || 1;
    if (rows.length === 0) break;
    for (const q of rows) {
      const r = await processarQuestao(db, q, materiaIdMap);
      if (r === "inserida") inseridas++; 
      else if (r === "repetida") repetidas++;
      else puladas++;
    }
    console.log(`    📄 Pág ${pagina}/${totalPages} → +${rows.length} (✓${inseridas} 🔄${repetidas} ✗${puladas})`);
    if (pagina >= totalPages) break;
    pagina++;
    await pausaAleatoria();
  }
  return { inseridas, repetidas, puladas, expirado: false };
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log(`║ SCRAPER FOCADO: ${DISCIPLINA_ALVO_NOME} ║`);
  console.log("╚══════════════════════════════════════════════════════╝\n");

  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  const db = drizzle(client) as NodePgDatabase<Record<string, unknown>>;

  let headers = await capturarHeaders();

  console.log(`\n📚 Baixando árvore de ${DISCIPLINA_ALVO_NOME}...`);
  const arvore = await buscarArvoreCompleta(headers, DISCIPLINA_ALVO_ID);

  console.log("💾 Salvando hierarquia no banco...");
  const materiaIdMap = new Map<number, number>();
  
  // Salva a raiz primeiro
  materiaIdMap.set(DISCIPLINA_ALVO_ID, (await salvarMateria(db, { id: DISCIPLINA_ALVO_ID, nome: DISCIPLINA_ALVO_NOME }, materiaIdMap))!);

  // Ordena por nível para garantir que os pais sejam inseridos antes dos filhos
  const arvoreOrdenada = [...arvore].sort((a, b) => (a.nivel || 0) - (b.nivel || 0));

  for (const mat of arvoreOrdenada) {
    const idInterno = await salvarMateria(db, mat, materiaIdMap);
    if (idInterno) materiaIdMap.set(mat.id, idInterno);
  }
  console.log(`✅ ${materiaIdMap.size} nós de matéria salvos.\n`);

  const folhas = arvore.filter(m => !m.filhos || m.filhos.length === 0);

  console.log(`\n🎯 ${folhas.length} assuntos folhas encontrados para extração de questões.\n`);

  console.log(`\n🚀 Iniciando extração...\n`);
  let totalInseridas = 0, totalRepetidas = 0, totalPuladas = 0;

  let i = 0;
  while (i < folhas.length) {
    const mat = folhas[i];
    const pct = ((i + 1) / folhas.length * 100).toFixed(1);
    console.log(`\n[${i + 1}/${folhas.length}] (${pct}%) ${mat.nome}`);
    const { inseridas, repetidas, puladas, expirado } = await extrairQuestoesDaMateria(db, headers, mat.id, mat.nome, materiaIdMap);
    totalInseridas += inseridas;
    totalRepetidas += repetidas;
    totalPuladas += puladas;

    if (expirado) {
      console.log(`\n🔄 Re-autenticando... (progresso salvo)`);
      headers = await capturarHeaders();
      console.log("✅ Re-autenticado! Continuando extração...\n");
      continue; // Repete
    }

    console.log(`  ✓ +${inseridas} inseridas | 🔄 ${repetidas} atualizadas | ✗ ${puladas} puladas | Total Novas: ${totalInseridas}`);
    i++;
    await pausaAleatoria();
  }

  await client.end();
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║                 EXTRAÇÃO CONCLUÍDA                  ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log(`║  Questões inseridas: ${String(totalInseridas).padEnd(30)}║`);
  console.log(`║  Questões puladas  : ${String(totalPuladas).padEnd(30)}║`);
  console.log("╚══════════════════════════════════════════════════════╝\n");
}

main().catch(err => {
  console.error("\n💥 Erro fatal:", err);
  process.exit(1);
});
