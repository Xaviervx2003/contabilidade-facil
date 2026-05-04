// exportar-materias.ts
// Extrai a árvore de matérias do Gran Cursos e salva em materias.json

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs/promises";
import * as path from "path";

puppeteer.use(StealthPlugin());

const API_BASE = "https://rota-api.grancursosonline.com.br";
const USER_DATA_DIR = "C:\\projetos\\contabilidade facil\\chrome-perfil";
const ARQUIVO_SAIDA = "materias.json";

interface MateriaApi {
    id: number;
    nome: string;
    pai?: number | null;
    indice?: string;
    nivel?: number;
    filhos?: number[];
}

async function capturarHeaders(): Promise<Record<string, string>> {
    console.log("\n╔══════════════════════════════════════════════════════╗");
    console.log("║              LOGIN MANUAL                             ║");
    console.log("╚══════════════════════════════════════════════════════╝\n");

    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: USER_DATA_DIR,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--start-maximized"],
        defaultViewport: null,
    });

    const pages = await browser.pages();
    const page = pages[0] || (await browser.newPage());

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

    await page.goto("https://questoes.grancursosonline.com.br", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
    });

    console.log("⏳ Faça login no navegador e pressione ENTER...");
    await new Promise<void>((resolve) => {
        process.stdin.resume();
        process.stdin.once("data", () => resolve());
    });

    await browser.close();
    console.log("✅ Navegador fechado.\n");

    // Remove headers problemáticos
    ["content-length", ":method", ":path", ":scheme", ":authority"].forEach(k => delete headers[k]);
    return headers;
}

async function buscarArvore(
    headers: Record<string, string>,
    paiId?: number
): Promise<MateriaApi[]> {
    const params = new URLSearchParams({
        comQuestoes: "1",
        perPage: "150",
        sort: "indiceOrdenacao",
        materia: "0",
    });

    ["id", "nome", "assunto_raiz", "pai", "indice", "nivel", "filhos"].forEach(f =>
        params.append("_source[]", f)
    );

    if (paiId) params.append("raiz[]", String(paiId));

    const url = `${API_BASE}/v3/materia/arvore?${params.toString()}`;
    const resposta = await fetch(url, { headers });

    if (!resposta.ok) {
        throw new Error(`HTTP ${resposta.status}: ${await resposta.text()}`);
    }

    const dados: any = await resposta.json();
    const itens: MateriaApi[] =
        Array.isArray(dados?.data?.rows) ? dados.data.rows :
            Array.isArray(dados?.data) ? dados.data :
                Array.isArray(dados) ? dados : [];
    return itens;
}

function exibirArvore(materias: MateriaApi[]): void {
    const porId = new Map(materias.map(m => [m.id, m]));
    const raizes = materias.filter(m => !m.pai);

    function print(mat: MateriaApi, nivel: number) {
        const indent = "  ".repeat(nivel);
        console.log(`${indent}📂 [${mat.id}] ${mat.indice || ""} ${mat.nome}`);
        if (mat.filhos && mat.filhos.length) {
            for (const fid of mat.filhos) {
                const filho = porId.get(fid);
                if (filho) print(filho, nivel + 1);
            }
        }
    }
    for (const r of raizes) print(r, 0);
}

async function rodar() {
    console.log("=== EXPORTADOR DE MATÉRIAS GRAN CURSOS ===\n");

    const headers = await capturarHeaders();

    console.log("Filtrar por disciplina?");
    console.log("1 - Sim (informar ID)");
    console.log("2 - Não (todas)");
    const op = await new Promise<string>((resolve) => {
        process.stdin.once("data", (d) => resolve(d.toString().trim()));
    });

    let raizId: number | undefined;
    if (op === "1") {
        console.log("Digite o ID da disciplina (ex: 405627):");
        const idStr = await new Promise<string>((resolve) => {
            process.stdin.once("data", (d) => resolve(d.toString().trim()));
        });
        raizId = parseInt(idStr, 10);
        if (isNaN(raizId)) raizId = undefined;
    }

    console.log("\n📚 Buscando árvore...");
    const materias = await buscarArvore(headers, raizId);
    console.log(`✅ ${materias.length} matérias encontradas.\n`);

    if (materias.length === 0) {
        console.log("Nenhuma matéria. Verifique login/permissão.");
        return;
    }

    console.log("🌳 Estrutura hierárquica:\n");
    exibirArvore(materias);

    const saida = {
        data_geracao: new Date().toISOString(),
        filtro_id: raizId || null,
        total: materias.length,
        materias: materias,
    };
    const caminho = path.resolve(process.cwd(), ARQUIVO_SAIDA);
    await fs.writeFile(caminho, JSON.stringify(saida, null, 2), "utf-8");
    console.log(`\n💾 Arquivo salvo: ${caminho}`);
    console.log("✨ Concluído.");
}

rodar().catch(err => {
    console.error("\n💥 Erro:", err);
    process.exit(1);
});