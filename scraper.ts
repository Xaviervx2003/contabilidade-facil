// scraper.ts — v3 Final
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
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

      // Salva amostra da primeira página para inspeção
      if (pagina === 1) {
        const fs = require('fs');
        fs.writeFileSync('sample_questoes.json', JSON.stringify(dados, null, 2));
        console.log("  📄 Amostra salva em sample_questoes.json");
      }
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
    console.log(`  ${rows.length} questões recebidas. Processando...`);

    for (const item of rows) {
      // ── Alternativas ──────────────────────────────────────────────────────────
      const alternativas = { a: "", b: "", c: "", d: "", e: null as string | null };
      const itens: any[] = item.itens || [];

      itens.forEach((alt: any) => {
        const letra = (alt.rotulo || alt.letra || "").trim().charAt(0).toLowerCase();
        const texto = (alt.corpo_clean || alt.corpo || alt.texto || "").trim();
        if (letra === "a") alternativas.a = texto;
        if (letra === "b") alternativas.b = texto;
        if (letra === "c") alternativas.c = texto;
        if (letra === "d") alternativas.d = texto;
        if (letra === "e") alternativas.e = texto;
      });

      // Pula questões sem A/B/C/D (ex: formato I/II/III ou Certo/Errado)
      if (!alternativas.a || !alternativas.b || !alternativas.c || !alternativas.d) {
        console.log(
          `  ⚠️ Pulando ID ${item.id} — alternativas incompletas` +
          ` (rótulos: ${itens.map((i: any) => i.rotulo).join(", ")})`
        );
        totalPuladas++;
        continue;
      }

      // ── Gabarito ──────────────────────────────────────────────────────────────
      const itemCorreto = itens.find(
        (alt: any) => alt.id === item.resposta || alt.correta === true
      );
      const gabaritoLetra = itemCorreto
        ? (itemCorreto.rotulo || itemCorreto.letra || "A").trim().charAt(0).toUpperCase()
        : "A";

      // ── Metadados ─────────────────────────────────────────────────────────────
      const prova = item.provas?.[0];
      const nomeProva = prova?.nome || null;   // "FGV - ALE RJ - Especialista - 2024"
      const escolaridade = prova?.nivel || null;   // "Superior", "Médio", etc.

      // Concatena múltiplos valores com " / " e descarta vazios
      const banca = (item.bancas || []).map((b: any) => b.nome).filter(Boolean).join(" / ") || null;
      const orgao = (item.orgaos || []).map((o: any) => o.nome).filter(Boolean).join(" / ") || null;
      const cargo = (item.cargos || []).map((c: any) => c.descricao).filter(Boolean).join(" / ") || null;

      // Ano mais recente garantido (sem depender de campos especulativos)
      const ano = item.anos?.length ? Math.max(...item.anos.map(Number)) : null;

      const modalidade = item.tipo || null;
      const primeiroAssunto = (item.assuntos?.[0]?.nome || "Sem Assunto").slice(0, 255);
      const enunciado = (item.enunciado_clean || item.enunciado || "").trim();

      // ── Validações finais ─────────────────────────────────────────────────────
      if (!enunciado) {
        console.warn(`  ⚠️ Pulando ID ${item.id} — enunciado vazio`);
        totalPuladas++;
        continue;
      }
      if (!item.id) {
        console.warn(`  ⚠️ Questão sem id_externo, pulando...`);
        totalPuladas++;
        continue;
      }

      try {
        // ── 1. UPSERT da Questão com .returning() (zero SELECT extra) ─────────
        const [questaoSalva] = await db
          .insert(questoes)
          .values({
            assunto: primeiroAssunto,
            enunciado: enunciado,
            opcao_a: alternativas.a,
            opcao_b: alternativas.b,
            opcao_c: alternativas.c,
            opcao_d: alternativas.d,
            opcao_e: alternativas.e,
            resposta_correta: gabaritoLetra.charAt(0),
            explicacao: null,
            tentativas: 0,
            acertos: 0,
            link_video: null,
            id_externo: item.id,
            banca: banca?.slice(0, 255),
            orgao: orgao?.slice(0, 255),
            cargo: cargo?.slice(0, 255),
            ano: ano,
            escolaridade: (nomeProva || escolaridade)?.slice(0, 255),
            modalidade: modalidade?.slice(0, 255),
          })
          .onConflictDoUpdate({
            target: questoes.id_externo,
            set: {
              // Atualiza metadados E assunto principal no re-scan
              assunto: primeiroAssunto,
              banca: banca?.slice(0, 255),
              orgao: orgao?.slice(0, 255),
              cargo: cargo?.slice(0, 255),
              ano: ano,
              escolaridade: (nomeProva || escolaridade)?.slice(0, 255),
              modalidade: modalidade?.slice(0, 255),
            },
          })
          .returning({ id: questoes.id });

        if (!questaoSalva?.id) {
          console.warn(`  ⚠️ UPSERT sem retorno para ID externo ${item.id}`);
          totalPuladas++;
          continue;
        }

        // ── 2. UPSERT de TODOS os Assuntos + Vínculo ─────────────────────────
        for (const assuntoApi of (item.assuntos || [])) {
          const idExternoMat = assuntoApi.id;
          const nomeMat = (assuntoApi.nome || "").slice(0, 255);

          if (!idExternoMat || !nomeMat) continue;

          // Upsert da matéria: atualiza nome se mudou na API
          const [matSalva] = await db
            .insert(materias)
            .values({ nome: nomeMat, id_externo: idExternoMat })
            .onConflictDoUpdate({
              target: materias.id_externo,
              set: { nome: nomeMat },
            })
            .returning({ id: materias.id });

          const materiaId = matSalva?.id;

          // Vínculo questão <-> matéria (idempotente)
          if (materiaId) {
            await db
              .insert(questoesMaterias)
              .values({ questao_id: questaoSalva.id, materia_id: materiaId })
              .onConflictDoNothing();
          }
        }

        totalInseridas++;
        if (totalInseridas % 25 === 0) {
          console.log(`  [✓] ${totalInseridas} processadas... (Último ID: ${item.id})`);
        }

      } catch (err: any) {
        console.error(`\n💥 ERRO AO INSERIR ID ${item?.id}:`);
        console.error(`   📛 Message:    ${err?.message}`);
        console.error(`   🔢 Code:       ${err?.code}`);
        console.error(`   📌 Detail:     ${err?.detail}`);
        console.error(`   🔗 Hint:       ${err?.hint}`);
        console.error(`   🎯 Constraint: ${err?.constraint}`);
        console.error(`   📍 Where:      ${err?.where}`);

        const erros: Record<string, string> = {
          "23505": "Conflito de unicidade (id_externo já existe)",
          "23502": "Violação de NOT NULL — coluna obrigatória sem valor",
          "22001": "String muito longa — aumente VARCHAR ou use TEXT",
          "23514": "Violação de CHECK constraint",
          "42703": "Coluna não existe — verifique schema vs banco",
        };
        console.error(`   → ${erros[err?.code] ?? "Erro desconhecido"}`);

        totalPuladas++;
      }
    }

    // Pausa aleatória entre páginas para evitar rate limit
    const pausa = 2000 + Math.random() * 2000;
    console.log(`  Pausando ${(pausa / 1000).toFixed(1)}s...\n`);
    await new Promise(r => setTimeout(r, pausa));
  }

  await client.end();
  console.log(`\n✅ Concluído! Inseridas: ${totalInseridas} | Puladas: ${totalPuladas}`);
}

rodarExtrator().catch(console.error);