import fs from "fs";
import https from "https";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import readline from "readline";

puppeteer.use(StealthPlugin());

const BASE_API_URL = "https://rota-api.grancursosonline.com.br/v3/materia/arvore?perPage=150&sort=indiceOrdenacao&materia=0&comQuestoes=1&raiz%5B%5D=404571&raiz%5B%5D=405626&_source%5B%5D=id&_source%5B%5D=nome&_source%5B%5D=assunto_raiz&_source%5B%5D=pai&_source%5B%5D=indice&_source%5B%5D=nivel&_source%5B%5D=filhos";
const USER_DATA_DIR = "C:\\projetos\\contabilidade facil\\chrome-perfil";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

async function capturarHeaders(): Promise<Record<string, string>> {
    console.log("🌐 Abrindo Chrome...");
    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: USER_DATA_DIR,
        args: ["--no-sandbox"]
    });

    const page = await browser.newPage();
    let headersCapturados: Record<string, string> = {};

    await page.setRequestInterception(true);
    page.on("request", (req) => {
        if (req.url().includes("rota-api.grancursosonline.com.br")) {
            headersCapturados = { ...req.headers() };
        }
        req.continue();
    });

    await page.goto("https://questoes.grancursosonline.com.br/aluno/filtro/concursos", { waitUntil: "networkidle2" });

    await new Promise((resolve) => {
        rl.question("\n👉 Após carregar a página, aperte [ENTER] para iniciar a extração TOTAL...", () => {
            resolve(true);
        });
    });

    await browser.close();
    return headersCapturados;
}

function fetchPage(url: string, headers: any): Promise<any> {
    return new Promise((resolve, reject) => {
        https.get(url, { headers }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
        }).on("error", reject);
    });
}

async function extrairNomes() {
    const headersRaw = await capturarHeaders();
    
    if (Object.keys(headersRaw).length === 0) {
        console.error("❌ Nenhum header capturado.");
        process.exit(1);
    }

    const headersLimpos: any = {};
    for (const [key, value] of Object.entries(headersRaw)) {
        if (!key.startsWith(':') && key.toLowerCase() !== 'content-length') {
            headersLimpos[key] = value;
        }
    }

    let paginaAtual = 1;
    const listaFinal: any[] = [];
    let temMais = true;

    console.log("🚀 Iniciando extração multi-páginas...");

    while (temMais) {
        console.log(`📄 Buscando página ${paginaAtual}...`);
        try {
            const url = `${BASE_API_URL}&page=${paginaAtual}`;
            const response = await fetchPage(url, headersLimpos);
            
            const rows: any[] = 
                response?.materias || 
                response?.data?.rows || 
                response?.data?.items || 
                response?.data || 
                response?.rows || 
                [];

            if (rows.length === 0) {
                temMais = false;
                break;
            }

            function processarMateria(item: any) {
                const formatado = {
                    id: item.id,
                    nome: item.nome || item.name || "Sem Nome",
                    pai: item.pai ?? item.parent ?? null,
                    nivel: item.nivel ?? item.level ?? 0,
                    indice: item.indice ?? item.index ?? 0,
                    assunto_raiz: item.assunto_raiz || item.assuntoRaiz || ""
                };
                listaFinal.push(formatado);
                if (item.filhos && Array.isArray(item.filhos) && item.filhos.length > 0 && typeof item.filhos[0] === 'object') {
                    item.filhos.forEach((filho: any) => processarMateria(filho));
                }
            }

            rows.forEach((m: any) => processarMateria(m));
            
            console.log(`✅ Página ${paginaAtual} processada. Total acumulado: ${listaFinal.length}`);
            
            if (rows.length < 150) {
                temMais = false;
            } else {
                paginaAtual++;
            }
        } catch (error) {
            console.error(`❌ Erro na página ${paginaAtual}:`, error);
            temMais = false;
        }
    }

    const niveisEncontrados = listaFinal.map(m => m.nivel).filter(n => n > 0);
    const nivelMinimo = Math.min(...niveisEncontrados);
    const listaRaiz = listaFinal.filter(m => m.nivel === nivelMinimo);

    console.log(`\n🏆 EXTRAÇÃO CONCLUÍDA!`);
    console.log(`📊 Total de assuntos: ${listaFinal.length}`);
    console.log(`📂 Matérias principais (raiz): ${listaRaiz.length}`);

    fs.writeFileSync("./scrapers/materias-arvore.json", JSON.stringify({ total: listaFinal.length, materias: listaFinal }, null, 2));
    fs.writeFileSync("./scrapers/materias-raiz.json", JSON.stringify({ total: listaRaiz.length, materias: listaRaiz }, null, 2));

    console.log("\n📂 Arquivos gerados com sucesso!");
    process.exit(0);
}

extrairNomes();
