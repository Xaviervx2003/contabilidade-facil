// scraper.ts
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { Client } from "pg";
import { questoes, materias, questoesMaterias } from "./schema";

puppeteer.use(StealthPlugin());

const PAGINAS_PARA_RASPAR = 20; // 16.642 questões ÷ 20 = 832 páginas

async function rodarExtrator() {
  console.log("Conectando ao banco...");
  const client = new Client({
    connectionString: "postgres://joao_xavier:sua_senha_segura12@localhost:5433/plataforma_questoes",
  });
  await client.connect();
  const db = drizzle(client);
  console.log("Banco conectado.\n");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    userDataDir: "C:\\Users\\direcao\\Documents\\contabilidade-facil\\chrome-perfil",
    args: ["--start-maximized"],
  });

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  let headersCapturados: Record<string, string> = {};
  let urlFiltradaBase = "";

  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
    // Só captura se tiver "assunto" na URL — ou seja, filtro aplicado
    if (
      url.includes("rota-api.grancursosonline.com.br/v1/elastic/questao") &&
      url.includes("assunto")
    ) {
      headersCapturados = { ...req.headers() };
      urlFiltradaBase = url.replace(/[&?]page=\d+/, "");
      console.log("\n✅ FILTRO DETECTADO! Pode pressionar ENTER no terminal agora.");
      console.log("   Questões no filtro serão exibidas na 1ª página da extração.");
    }
    req.continue();
  });

  await page.goto(
    "https://questoes.grancursosonline.com.br/questoes-de-concursos/filtro?page=1",
    { waitUntil: "networkidle2" }
  );

  console.log("========================================");
  console.log("INSTRUÇÕES:");
  console.log("1. No Chrome, clique em 'Disciplina' → Administração Geral");
  console.log("2. Clique em 'Assunto' → Introdução à Administração");
  console.log("                       → Teorias da Administração");
  console.log("3. Clique em 'Filtrar questões'");
  console.log("4. AGUARDE aparecer '✅ FILTRO DETECTADO!' acima");
  console.log("5. Só então pressione ENTER");
  console.log("========================================\n");

  // Trava de segurança: só aceita o ENTER se o filtro foi pego
  await new Promise<void>((resolve) => {
    process.stdin.resume();
    
    const onData = () => {
      if (urlFiltradaBase) {
        process.stdin.off("data", onData); // Remove o ouvinte para não ficar duplicando
        process.stdin.pause();
        resolve();
      } else {
        console.log("\n⚠️ CALMA! O filtro ainda não foi detectado.");
        console.log("Aplique o filtro no Chrome e espere a mensagem de sucesso antes de apertar ENTER.");
      }
    };
    
    process.stdin.on("data", onData);
  });

  await browser.close();
  console.log(`\nChrome fechado. Iniciando extração de ${PAGINAS_PARA_RASPAR} páginas...\n`);

  let totalInseridas = 0;
  let totalPuladas   = 0;

  for (let pagina = 1; pagina <= PAGINAS_PARA_RASPAR; pagina++) {
    const separator = urlFiltradaBase.includes("?") ? "&" : "?";
    const url = `${urlFiltradaBase}${separator}page=${pagina}`;
    console.log(`[Página ${pagina}/${PAGINAS_PARA_RASPAR}] Buscando...`);

    let dados: any;
    try {
      const resposta = await fetch(url, { headers: headersCapturados });
      if (!resposta.ok) {
        console.log(`  Erro HTTP ${resposta.status} — encerrando.`);
        break;
      }
      dados = await resposta.json();
    } catch (err) {
      console.error("  Erro:", err);
      continue;
    }

    const rows: any[] = dados?.data?.rows || [];
    const totalGeral  = dados?.data?.total || 0;
    const totalPags   = dados?.data?.pages || 0;

    if (pagina === 1) {
      console.log(`  ✅ Total com este filtro: ${totalGeral} questões (${totalPags} páginas)`);
      if (totalGeral > 100000) {
        console.log("  ⚠️  AVISO: Mais de 100k questões. Filtro pode não ter sido aplicado!");
      }
    }

    if (rows.length === 0) { console.log("  Sem mais questões."); break; }
    console.log(`  ${rows.length} questões. Inserindo...`);

    for (const item of rows) {
      const alternativas = { a: "", b: "", c: "", d: "", e: null as string | null };
      const itens: any[] = item.itens || [];

      itens.forEach((alt: any) => {
        const letra = (alt.rotulo || alt.letra || "").trim().charAt(0).toLowerCase();
        const texto = alt.corpo_clean || alt.corpo || alt.texto || "";
        if (letra === "a") alternativas.a = texto;
        if (letra === "b") alternativas.b = texto;
        if (letra === "c") alternativas.c = texto;
        if (letra === "d") alternativas.d = texto;
        if (letra === "e") alternativas.e = texto;
      });

      if (!alternativas.a || !alternativas.b || !alternativas.c || !alternativas.d) {
        totalPuladas++; continue;
      }

      const itemCorreto = itens.find((alt: any) => alt.id === item.resposta || alt.correta === true);
      const gabaritoLetra = itemCorreto
        ? (itemCorreto.rotulo || itemCorreto.letra || "A").trim().charAt(0).toUpperCase()
        : "A";

      const nomeMateria = item.assuntos?.[0]?.nome || "Administração Geral";
      const enunciado   = item.enunciado_clean || item.enunciado || "";
      if (!enunciado) { totalPuladas++; continue; }

      try {
        // 🆕 Inserir com id_externo para evitar duplicação
        await db.insert(questoes).values({
          assunto: nomeMateria,
          enunciado,
          opcao_a: alternativas.a,
          opcao_b: alternativas.b,
          opcao_c: alternativas.c,
          opcao_d: alternativas.d,
          opcao_e: alternativas.e,
          resposta_correta: gabaritoLetra,
          criado_por: 1,
          id_externo: item.id,              // 🆕 ID original da questão
        }).onConflictDoNothing({ target: questoes.id_externo });

        // Buscar o ID real da questão (pode já existir)
        const existente = await db.select({ id: questoes.id }).from(questoes)
          .where(eq(questoes.id_externo, item.id));
        const questaoId = existente[0]?.id;
        if (!questaoId) { totalPuladas++; continue; }

        // Vincular à matéria
        let materiaId: number;
        const mat = await db.select().from(materias).where(eq(materias.nome, nomeMateria));
        if (mat.length > 0) {
          materiaId = mat[0].id;
        } else {
          const [nm] = await db.insert(materias).values({ nome: nomeMateria }).returning({ id: materias.id });
          materiaId = nm.id;
        }

        await db.insert(questoesMaterias).values({
          questao_id: questaoId,
          materia_id: materiaId
        }).onConflictDoNothing();

        totalInseridas++;
        console.log(`  [OK] ID externo ${item.id} | ${gabaritoLetra} | ${nomeMateria}`);
      } catch (err: any) {
        if (err?.code === "23505") { totalPuladas++; }
        else { console.error(`  [ERRO]`, err?.message); }
      }
    }

    const pausa = 2000 + Math.random() * 2000;
    console.log(`  Pausando ${(pausa/1000).toFixed(1)}s...\n`);
    await new Promise(r => setTimeout(r, pausa));
  }

  await client.end();
  console.log(`\n✅ Concluído! Inseridas: ${totalInseridas} | Puladas: ${totalPuladas}`);
}

rodarExtrator();