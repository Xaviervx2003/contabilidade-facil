// scraper-materias.ts
// Captura a árvore completa de matérias da API do Gran Cursos
// e salva em materias-arvore.json

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";
import path from "path";

puppeteer.use(StealthPlugin());

/* ─── Configuração ───────────────────────────────────────────────────────── */

const USER_DATA_DIR = "C:\\projetos\\contabilidade facil\\chrome-perfil";

const URL_BASE_API = "https://rota-api.grancursosonline.com.br/v3/materia/arvore";
const URL_SITE = "https://questoes.grancursosonline.com.br/aluno/filtro/concursos";

const OUTPUT_JSON = path.resolve("materias-arvore.json");
const OUTPUT_CSV = path.resolve("materias-arvore.csv");

const PER_PAGE = 150;
const MAX_PAGINAS = 50; // segurança — vai parar quando a API retornar vazio

/* ─── Helpers ────────────────────────────────────────────────────────────── */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildUrl(page: number, extraParams: URLSearchParams): string {
    const params = new URLSearchParams({
        perPage: String(PER_PAGE),
        page: String(page),
        sort: "indiceOrdenacao",
        materia: "0",
        comQuestoes: "1",
    });

    // Repassa raiz[] e _source[] capturados da URL original
    extraParams.forEach((val, key) => {
        if (key.startsWith("raiz") || key.startsWith("_source")) {
            params.append(key, val);
        }
    });

    return `${URL_BASE_API}?${params.toString()}`;
}

/* ─── Captura de headers via Puppeteer ───────────────────────────────────── */

async function capturarHeaders(): Promise<{
    headers: Record<string, string>;
    extraParams: URLSearchParams;
}> {
    console.log("🌐 Abrindo Chrome para capturar headers de autenticação...\n");

    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: USER_DATA_DIR,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--start-maximized"],
        defaultViewport: null,
    });

    const pages = await browser.pages();
    const page = pages[0] || (await browser.newPage());

    let headersCapturados: Record<string, string> = {};
    let extraParams = new URLSearchParams();
    let capturado = false;

    await page.setRequestInterception(true);

    page.on("request", (req: any) => {
        const url = req.url();

        if (url.includes("rota-api.grancursosonline.com.br") && url.includes("materia")) {
            headersCapturados = { ...req.headers() };

            // Extrai raiz[] e _source[] da URL interceptada
            try {
                const parsed = new URL(url);
                extraParams = parsed.searchParams;
            } catch { }

            if (!capturado) {
                capturado = true;
                console.log("✅ Headers de autenticação capturados!");
                console.log("   Pode fechar o Chrome ou aguardar — continuando automaticamente...\n");
            }
        }

        req.continue();
    });

    // Vai direto para a página de filtros onde a API é chamada
    await page.goto(URL_SITE, { waitUntil: "networkidle2", timeout: 30000 });

    // Aguarda até 20s pela captura
    for (let i = 0; i < 40; i++) {
        if (capturado) break;
        await sleep(500);
    }

    // Se não capturou automaticamente, pede para o usuário interagir
    if (!capturado) {
        console.log("⚠️  Headers não capturados automaticamente.");
        console.log("   Clique em qualquer filtro de Disciplina/Assunto na página");
        console.log("   e aguarde aparecer '✅ Headers capturados'...\n");

        for (let i = 0; i < 120; i++) {
            if (capturado) break;
            await sleep(500);
        }
    }

    await browser.close();

    if (!capturado || Object.keys(headersCapturados).length === 0) {
        throw new Error("Não foi possível capturar os headers. Tente fazer login no Chrome primeiro.");
    }

    // Remove headers que causam erro fora do browser
    const headersLimpos = { ...headersCapturados };
    delete headersLimpos["content-length"];
    delete headersLimpos[":method"];
    delete headersLimpos[":path"];
    delete headersLimpos[":scheme"];
    delete headersLimpos[":authority"];

    return { headers: headersLimpos, extraParams };
}

/* ─── Busca paginada da API ──────────────────────────────────────────────── */

interface Materia {
    id: number;
    nome: string;
    assunto_raiz?: string;
    pai?: number | null;
    indice?: number;
    nivel?: number;
    filhos?: number[];
}

async function buscarTodasMaterias(
    headers: Record<string, string>,
    extraParams: URLSearchParams
): Promise<Materia[]> {
    const todas: Materia[] = [];
    let totalGeral = 0;

    for (let pagina = 1; pagina <= MAX_PAGINAS; pagina++) {
        const url = buildUrl(pagina, extraParams);
        console.log(`[Página ${pagina}] GET ${url.slice(0, 100)}...`);

        let dados: any;
        try {
            const res = await fetch(url, { headers });

            if (res.status === 401 || res.status === 403) {
                console.error(`\n❌ Erro ${res.status}: sem autorização. Headers expirados ou login necessário.`);
                break;
            }
            if (!res.ok) {
                console.error(`\n❌ Erro HTTP ${res.status} — encerrando.`);
                break;
            }

            dados = await res.json();
        } catch (err: any) {
            console.error(`  Erro de rede: ${err.message}`);
            await sleep(3000);
            continue;
        }

        // Normaliza resposta — o Gran Cursos usa estruturas variadas
        const rows: any[] =
            dados?.data?.rows ||
            dados?.data?.items ||
            dados?.data ||
            dados?.rows ||
            dados?.items ||
            (Array.isArray(dados) ? dados : []);

        if (pagina === 1) {
            totalGeral =
                dados?.data?.total ||
                dados?.total ||
                rows.length;
            const totalPags =
                dados?.data?.pages ||
                dados?.pages ||
                Math.ceil(totalGeral / PER_PAGE);
            console.log(`  ✅ Total: ${totalGeral} matérias | ${totalPags} páginas\n`);
        }

        if (rows.length === 0) {
            console.log("  Sem mais dados — fim.");
            break;
        }

        // Normaliza cada item
        const normalizados: Materia[] = rows.map((item: any) => ({
            id: item.id,
            nome: item.nome || item.name || "",
            assunto_raiz: item.assunto_raiz || item.assuntoRaiz || "",
            pai: item.pai ?? item.parent ?? null,
            indice: item.indice ?? item.index ?? 0,
            nivel: item.nivel ?? item.level ?? 0,
            filhos: item.filhos || item.children || [],
        }));

        todas.push(...normalizados);
        console.log(`  +${normalizados.length} itens (total acumulado: ${todas.length})`);

        // Para se já buscou tudo
        if (todas.length >= totalGeral && totalGeral > 0) {
            console.log("  ✅ Todas as matérias buscadas.");
            break;
        }

        await sleep(1000 + Math.random() * 1000);
    }

    return todas;
}

/* ─── Exporta CSV ────────────────────────────────────────────────────────── */

function exportarCsv(materias: Materia[]): void {
    const linhas = [
        "id,nome,assunto_raiz,pai,nivel,indice,qtd_filhos",
        ...materias.map((m) =>
            [
                m.id,
                `"${(m.nome || "").replace(/"/g, '""')}"`,
                `"${(m.assunto_raiz || "").replace(/"/g, '""')}"`,
                m.pai ?? "",
                m.nivel ?? "",
                m.indice ?? "",
                (m.filhos || []).length,
            ].join(",")
        ),
    ];
    fs.writeFileSync(OUTPUT_CSV, linhas.join("\n"), "utf-8");
}

/* ─── Relatório no terminal ──────────────────────────────────────────────── */

function imprimirResumo(materias: Materia[]): void {
    // Agrupa por assunto_raiz
    const grupos: Record<string, Materia[]> = {};
    for (const m of materias) {
        const raiz = m.assunto_raiz || "(sem raiz)";
        if (!grupos[raiz]) grupos[raiz] = [];
        grupos[raiz].push(m);
    }

    console.log("\n══════════════════════════════════════════════════════");
    console.log("📚 RESUMO POR DISCIPLINA / ASSUNTO RAIZ");
    console.log("══════════════════════════════════════════════════════");

    Object.entries(grupos)
        .sort((a, b) => b[1].length - a[1].length)
        .forEach(([raiz, lista]) => {
            console.log(`\n🔹 ${raiz} (${lista.length} matérias)`);
            lista
                .sort((a, b) => (a.indice ?? 0) - (b.indice ?? 0))
                .slice(0, 10) // mostra só os 10 primeiros por grupo no terminal
                .forEach((m) => {
                    const indent = "  ".repeat(Math.min(m.nivel ?? 0, 4));
                    console.log(`  ${indent}${m.id} — ${m.nome}`);
                });
            if (lista.length > 10) {
                console.log(`  ... e mais ${lista.length - 10} matérias (veja o JSON/CSV)`);
            }
        });
}

/* ─── Main ───────────────────────────────────────────────────────────────── */

async function rodar() {
    console.log("═══════════════════════════════════════════════════════");
    console.log("  Scraper de Matérias — Gran Cursos Online");
    console.log("═══════════════════════════════════════════════════════\n");

    // 1. Captura headers de autenticação
    const { headers, extraParams } = await capturarHeaders();

    // 2. Busca todas as páginas da API
    console.log("\n─── Buscando matérias via API ──────────────────────────\n");
    const materias = await buscarTodasMaterias(headers, extraParams);

    if (materias.length === 0) {
        console.error("\n❌ Nenhuma matéria retornada. Verifique os headers e tente novamente.");
        process.exit(1);
    }

    // 3. Salva JSON
    fs.writeFileSync(OUTPUT_JSON, JSON.stringify({ total: materias.length, materias }, null, 2), "utf-8");
    console.log(`\n💾 JSON salvo: ${OUTPUT_JSON} (${materias.length} matérias)`);

    // 4. Salva CSV
    exportarCsv(materias);
    console.log(`💾 CSV salvo:  ${OUTPUT_CSV}`);

    // 5. Resumo no terminal
    imprimirResumo(materias);

    console.log(`\n✅ Concluído! ${materias.length} matérias extraídas.`);
    console.log("   Arquivos gerados:");
    console.log(`   📄 ${OUTPUT_JSON}`);
    console.log(`   📊 ${OUTPUT_CSV}`);
}

rodar().catch((err) => {
    console.error("\n💥 Erro fatal:", err.message);
    process.exit(1);
});