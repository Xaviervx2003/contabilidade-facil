// scraper-completo.ts
// Gran Cursos — Extrator com seleção manual de disciplina
// Comando: npx tsx scraper-completo.ts

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { questoes, materias, questoesMaterias } from "./schema";
import * as fs from "fs/promises";

puppeteer.use(StealthPlugin());

// ── Configuração ──────────────────────────────────────────────────────────────
const DB_URL = "postgres://joao_xavier:sua_senha_segura12@localhost:5433/plataforma_questoes";
const API_BASE = "https://rota-api.grancursosonline.com.br";
const USER_DATA_DIR = "C:\\projetos\\contabilidade facil\\chrome-perfil";
const QUESTOES_POR_PAG = 100;
const PAUSA_MIN_MS = 1500;
const PAUSA_MAX_MS = 3000;

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

// ── 1. Captura headers + disciplina via navegador manual ─────────────────────
async function capturarHeadersEDisciplina(): Promise<{
  headers: Record<string, string>;
  disciplinaId: number | null;
  disciplinaNome: string | null;
}> {
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║     ETAPA 1 — LOGIN + SELECIONE A DISCIPLINA        ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log("║  1. O Chrome vai abrir agora                        ║");
  console.log("║  2. Faça login no Gran Cursos (se necessário)       ║");
  console.log("║  3. Navegue até a página da DISCIPLINA desejada      ║");
  console.log("║     (ex: /aluno/filtro/concursos?assunto=404571)    ║");
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

  // Intercepta requisições para capturar headers de autenticação
  // Escuta apenas o domínio da API real (igual à versão que funcionava)
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
  console.log("⏳ Aguardando você navegar até a disciplina desejada e pressionar ENTER...\n");
  console.log("  💡 DICA: Aplique qualquer filtro na página para garantir que as requisições sejam feitas.\n");

  await new Promise<void>((resolve) => {
    process.stdin.resume();
    process.stdin.once("data", () => resolve());
  });

  // Se ainda não capturou, força um reload para disparar novas requisições
  if (!headersCapturados) {
    console.log("⚡ Recarregando página para capturar autenticação...");
    await page.reload({ waitUntil: "networkidle2" });
    await pausa(2000);
  }

  const urlAtual = page.url();
  console.log("🔗 URL atual:", urlAtual);

  // Corrigida a regex para extrair o ID do assunto da nova estrutura de URL
  const matchAssunto = urlAtual.match(/assunto=(\d+)/);
  let disciplinaId: number | null = null;
  let disciplinaNome: string | null = null;

  if (matchAssunto) {
    disciplinaId = parseInt(matchAssunto[1], 10);
    disciplinaNome = await page.evaluate(() => {
      const doc = (globalThis as any).document;
      // Tenta extrair o nome da disciplina de elementos comuns na página
      const h1 = doc.querySelector("h1");
      if (h1) return h1.innerText.trim();
      const titulo = doc.querySelector("title");
      if (titulo) return titulo.innerText.trim();
      return "Disciplina " + new URLSearchParams(window.location.search).get("assunto");
    });
    console.log(`\n✅ Disciplina capturada: ${disciplinaNome} (ID: ${disciplinaId})`);
  } else {
    console.log("\n⚠️  Não foi possível detectar a disciplina. Usando árvore completa.");
  }

  await browser.close();
  console.log("\n✅ Navegador fechado. Iniciando extração...\n");

  // Remove headers HTTP/2 problemáticos
  ["content-length", ":method", ":path", ":scheme", ":authority"].forEach(k => delete headers[k]);

  if (!headersCapturados || Object.keys(headers).length === 0) {
    throw new Error("❌ Headers não capturados. Certifique-se de estar logado e que o Gran Cursos fez alguma requisição à API.");
  }

  return { headers, disciplinaId, disciplinaNome };
}

// ── 2. Buscar árvore (filtrada pela disciplina, se informada) ────────────────
async function buscarArvoreCompleta(
  headers: Record<string, string>,
  raizId?: number | null
): Promise<MateriaApi[]> {
  let todosItens: MateriaApi[] = [];
  let pagina = 1;
  const maxPaginas = 10;

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

    if (raizId) {
      params.append("raiz[]", String(raizId));
    }

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

  console.log(`\n✅ Total: ${todosItens.length} matérias\n`);
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
): Promise<"inserida" | "pulada"> {
  const itens = item.itens || [];
  const alt = { a: "", b: "", c: "", d: "", e: null as string | null };
  for (const i of itens) {
    const letra = lerLetra(i);
    const texto = lerTexto(i);
    if (letra === "a") alt.a = texto;
    if (letra === "b") alt.b = texto;
    if (letra === "c") alt.c = texto;
    if (letra === "d") alt.d = texto;
    if (letra === "e") alt.e = texto;
  }
  if (!alt.a || !alt.b || !alt.c || !alt.d) return "pulada";

  const enunciado = (item.enunciado_clean || item.enunciado || "").trim();
  if (!enunciado || !item.id) return "pulada";

  const itemCorreto = itens.find(i => i.id === item.resposta || i.correta === true);
  const gabarito = itemCorreto
    ? (itemCorreto.rotulo || itemCorreto.letra || "A").charAt(0).toUpperCase()
    : "A";

  const prova = item.provas?.[0];
  const banca = (item.bancas || []).map(b => b.nome).join(" / ") || null;
  const orgao = (item.orgaos || []).map(o => o.nome).join(" / ") || null;
  const cargo = (item.cargos || []).map(c => c.descricao).join(" / ") || null;
  const ano = item.anos?.length ? Math.max(...item.anos.map(Number)) : null;
  const escolaridade = prova?.nome || prova?.nivel || null;
  const modalidade = item.tipo || null;
  const assuntoNome = (item.assuntos?.[0]?.nome || "Sem Assunto").slice(0, 255);

  const [questao] = await db
    .insert(questoes)
    .values({
      assunto: assuntoNome,
      enunciado,
      opcao_a: alt.a,
      opcao_b: alt.b,
      opcao_c: alt.c,
      opcao_d: alt.d,
      opcao_e: alt.e,
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
    .onConflictDoUpdate({
      target: questoes.id_externo,
      set: {
        assunto: assuntoNome,
        banca: banca?.slice(0, 255),
        orgao: orgao?.slice(0, 255),
        cargo: cargo?.slice(0, 255),
        ano,
        escolaridade: escolaridade?.slice(0, 255),
        modalidade: modalidade?.slice(0, 255),
      },
    })
    .returning({ id: questoes.id });

  if (!questao?.id) return "pulada";

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
      await db.insert(questoesMaterias).values({ questao_id: questao.id, materia_id: mid }).onConflictDoNothing();
    }
  }
  return "inserida";
}

// ── 5. Extrair questões de uma matéria folha ─────────────────────────────────
async function extrairQuestoesDaMateria(
  db: NodePgDatabase<Record<string, unknown>>,
  headers: Record<string, string>,
  materiaId: number,
  materiaNome: string,
  materiaIdMap: Map<number, number>
): Promise<{ inseridas: number; puladas: number; expirado: boolean }> {
  let inseridas = 0, puladas = 0, pagina = 1;
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
      return { inseridas, puladas, expirado: true };
    }
    if (!resp.ok) break;
    const json: any = await resp.json();
    const rows = json?.data?.rows || [];
    const totalPages = json?.data?.pages || 1;
    if (rows.length === 0) break;
    for (const q of rows) {
      const r = await processarQuestao(db, q, materiaIdMap);
      if (r === "inserida") inseridas++; else puladas++;
    }
    console.log(`    📄 Pág ${pagina}/${totalPages} → +${rows.length} (✓${inseridas} ✗${puladas})`);
    if (pagina >= totalPages) break;
    pagina++;
    await pausaAleatoria();
  }
  return { inseridas, puladas, expirado: false };
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║   Gran Cursos — Extrator com Seleção Manual         ║");
  console.log("╚══════════════════════════════════════════════════════╝\n");

  // 1. Conectar banco
  const client = new Client({ connectionString: DB_URL });
  await client.connect();
  const db = drizzle(client) as NodePgDatabase<Record<string, unknown>>;

  // 2. Capturar headers (manual)
  const { headers } = await capturarHeadersEDisciplina();

  // 3. Ler árvore do arquivo materias.json (pré-definido pelo usuário)
  console.log("📚 Lendo árvore de matérias de materias.json...\n");
  const jsonContent = await fs.readFile("materias.json", "utf-8");
  const arvore: MateriaApi[] = JSON.parse(jsonContent);
  console.log(`✅ ${arvore.length} matérias carregadas do arquivo.\n`);

  // 4. Salvar matérias no banco
  console.log("💾 Salvando matérias...");
  const materiaIdMap = new Map<number, number>();
  for (const mat of arvore) {
    const idInterno = await salvarMateria(db, mat, materiaIdMap);
    if (idInterno) materiaIdMap.set(mat.id, idInterno);
  }
  console.log(`✅ ${materiaIdMap.size} matérias salvas.\n`);

  // 6. Filtrar folhas e mostrar lista antes de perguntar
  const folhas = arvore.filter(m => !m.filhos || m.filhos.length === 0);

  console.log(`\n🎯 ${folhas.length} assuntos que serão extraídos:\n`);
  folhas.forEach((m, i) => {
    const pct = `(${((i + 1) / folhas.length * 100).toFixed(1)}%)`;
    const total = m.total_questoes != null ? ` [~${m.total_questoes} questões]` : "";
    console.log(`  ${String(i + 1).padStart(3)}. ${pct.padEnd(7)} ${m.nome}${total}`);
  });

  console.log(`\nDeseja extrair as questões desses ${folhas.length} assuntos? (s/n)`);
  const resposta = await new Promise<string>(resolve => process.stdin.once("data", d => resolve(d.toString().trim().toLowerCase())));
  if (resposta !== "s" && resposta !== "sim") {
    console.log("✅ Extração cancelada. Finalizado.");
    await client.end();
    return;
  }

  // 7. Extrair questões das folhas (com re-autenticação automática)
  console.log(`\n🚀 Iniciando extração...\n`);
  let totalInseridas = 0, totalPuladas = 0;
  let currentHeaders = headers;

  let i = 0;
  while (i < folhas.length) {
    const mat = folhas[i];
    const pct = ((i + 1) / folhas.length * 100).toFixed(1);
    console.log(`\n[${i + 1}/${folhas.length}] (${pct}%) ${mat.nome}`);
    const { inseridas, puladas, expirado } = await extrairQuestoesDaMateria(db, currentHeaders, mat.id, mat.nome, materiaIdMap);
    totalInseridas += inseridas;
    totalPuladas += puladas;

    if (expirado) {
      console.log(`\n🔄 Re-autenticando... (progresso salvo: ${totalInseridas} questões inseridas)`);
      console.log("\n╔══════════════════════════════════════════════════════╗");
      console.log("║  TOKEN EXPIROU — Faça login novamente no Chrome      ║");
      console.log("║  Navegue para a página de questões e pressione ENTER ║");
      console.log("╚══════════════════════════════════════════════════════╝");
      const reauth = await capturarHeadersEDisciplina();
      currentHeaders = reauth.headers;
      console.log("✅ Re-autenticado! Continuando extração...\n");
      // Repete o mesmo assunto (i não avança)
      continue;
    }

    console.log(`  ✓ +${inseridas} inseridas | ${puladas} puladas | acumulado: ${totalInseridas}`);
    i++;
    await pausaAleatoria();
  }

  await client.end();
  console.log("\n╔══════════════════════════════════════════════════════╗");
  console.log("║                 EXTRAÇÃO CONCLUÍDA                  ║");
  console.log("╠══════════════════════════════════════════════════════╣");
  console.log(`║  Matérias salvas   : ${String(materiaIdMap.size).padEnd(30)}║`);
  console.log(`║  Questões inseridas: ${String(totalInseridas).padEnd(30)}║`);
  console.log(`║  Questões puladas  : ${String(totalPuladas).padEnd(30)}║`);
  console.log("╚══════════════════════════════════════════════════════╝\n");
}

main().catch(err => {
  console.error("\n💥 Erro fatal:", err);
  process.exit(1);
});