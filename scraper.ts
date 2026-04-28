// scraper.ts
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq, sql } from "drizzle-orm";
import { Client } from "pg";
import { questoes, materias, questoesMaterias } from "./schema";

puppeteer.use(StealthPlugin());

const PAGINAS_PARA_RASPAR = 166;

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
    userDataDir: 'C:\\projetos\\contabilidade facil\\chrome-perfil',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();

  let headersCapturados: Record<string, string> = {};
  let urlFiltradaBase = "";

  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const url = req.url();
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

  await new Promise<void>((resolve) => {
    process.stdin.resume();
    const onData = () => {
      if (urlFiltradaBase) {
        process.stdin.off("data", onData);
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
  let totalPuladas = 0;

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
      console.error("  Erro na requisição:", err);
      continue;
    }

    const rows: any[] = dados?.data?.rows || [];
    const totalGeral = dados?.data?.total || 0;
    const totalPags = dados?.data?.pages || 0;

    if (pagina === 1) {
      console.log(`  ✅ Total com este filtro: ${totalGeral} questões (${totalPags} páginas)`);
      if (totalGeral > 100000) {
        console.log("  ⚠️  AVISO: Mais de 100k questões. Filtro pode não ter sido aplicado!");
      }
    }

    if (rows.length === 0) {
      console.log("  Sem mais questões.");
      break;
    }
    console.log(`  ${rows.length} questões. Inserindo...`);

    for (const item of rows) {
      const alternativas = { a: "", b: "", c: "", d: "", e: null as string | null };
      const itens: any[] = item.itens || [];

      itens.forEach((alt: any) => {
        const letra = (alt.rotulo || alt.letra || "").trim().charAt(0).toLowerCase();
        const texto = alt.corpo_clean || alt.corpo || alt.texto || "";
        if (letra === "a") alternativas.a = texto.trim();
        if (letra === "b") alternativas.b = texto.trim();
        if (letra === "c") alternativas.c = texto.trim();
        if (letra === "d") alternativas.d = texto.trim();
        if (letra === "e") alternativas.e = texto.trim();
      });

      if (!alternativas.a || !alternativas.b || !alternativas.c || !alternativas.d) {
        totalPuladas++;
        continue;
      }

      const itemCorreto = itens.find((alt: any) => alt.id === item.resposta || alt.correta === true);
      const gabaritoLetra = itemCorreto
        ? (itemCorreto.rotulo || itemCorreto.letra || "A").trim().charAt(0).toUpperCase()
        : "A";

      const nomeMateria = item.assuntos?.[0]?.nome || "Administração Geral";
      const enunciado = (item.enunciado_clean || item.enunciado || "").trim();

      if (!enunciado) {
        totalPuladas++;
        continue;
      }

      // Validação do id_externo (obrigatório para ON CONFLICT)
      if (!item.id) {
        console.warn(`  ⚠️ Questão sem id_externo, pulando...`);
        totalPuladas++;
        continue;
      }

      try {
        // ✅ INSERT corrigido: SEM criado_por e criado_em (não existem no banco)
        await db.insert(questoes).values({
          assunto: nomeMateria.slice(0, 255),
          enunciado: enunciado,
          opcao_a: alternativas.a,
          opcao_b: alternativas.b,
          opcao_c: alternativas.c,
          opcao_d: alternativas.d,
          opcao_e: alternativas.e,
          resposta_correta: gabaritoLetra.charAt(0), // garante 1 caractere para char(1)
          explicacao: null, // usa DEFAULT do banco se quiser
          tentativas: 0,
          acertos: 0,
          link_video: null,
          id_externo: item.id, // ✅ obrigatório e único
          // ❌ criado_por e criado_em REMOVIDOS — não existem na tabela
        }).onConflictDoNothing({ target: questoes.id_externo });

        // Buscar ID real da questão (funciona mesmo se já existia)
        const [existente] = await db.select({ id: questoes.id })
          .from(questoes)
          .where(eq(questoes.id_externo, item.id))
          .limit(1);

        if (!existente?.id) {
          console.warn(`  ⚠️ Questão ID externo ${item.id} não persistida (conflito silencioso?)`);
          totalPuladas++;
          continue;
        }

        // UPSERT da matéria (insere se não existir, ou busca se já existe)
        let materiaId: number | undefined;

        const [matInserida] = await db.insert(materias)
          .values({ nome: nomeMateria.slice(0, 255) })
          .onConflictDoNothing({ target: materias.nome })
          .returning({ id: materias.id });

        if (matInserida?.id) {
          materiaId = matInserida.id;
        } else {
          const [matExistente] = await db.select({ id: materias.id })
            .from(materias)
            .where(eq(materias.nome, nomeMateria))
            .limit(1);
          materiaId = matExistente?.id;
        }

        if (materiaId) {
          await db.insert(questoesMaterias)
            .values({ questao_id: existente.id, materia_id: materiaId })
            .onConflictDoNothing();
        }

        totalInseridas++;
        if (totalInseridas % 25 === 0) {
          console.log(`  [✓] ${totalInseridas} inseridas... (último ID: ${item.id})`);
        }

      } catch (err: any) {
        // 🔹 LOG COMPLETO DO ERRO POSTGRESQL
        console.error(`\n💥 ERRO AO INSERIR ID ${item?.id}:`);
        console.error(`   📛 Message: ${err?.message}`);
        console.error(`   🔢 Code: ${err?.code}`);
        console.error(`   📌 Detail: ${err?.detail}`);
        console.error(`   🔗 Hint: ${err?.hint}`);
        console.error(`   🎯 Constraint: ${err?.constraint}`);
        console.error(`   📍 Where: ${err?.where}`);

        // Classificação rápida do erro
        switch (err?.code) {
          case "23505":
            console.error("   → Conflito de unicidade (id_externo já existe)");
            break;
          case "23502":
            console.error("   → Violação de NOT NULL — coluna obrigatória sem valor");
            break;
          case "22001":
            console.error("   → String muito longa — aumente VARCHAR ou use TEXT");
            break;
          case "23514":
            console.error("   → Violação de CHECK constraint");
            break;
          case "42703":
            console.error("   → Coluna não existe — verifique schema vs banco");
            break;
          default:
            console.error("   → Erro desconhecido");
        }

        totalPuladas++;
      }
    }

    const pausa = 2000 + Math.random() * 2000;
    console.log(`  Pausando ${(pausa / 1000).toFixed(1)}s...\n`);
    await new Promise(r => setTimeout(r, pausa));
  }

  await client.end();
  console.log(`\n✅ Concluído! Inseridas: ${totalInseridas} | Puladas: ${totalPuladas}`);
}

rodarExtrator().catch(console.error);