// scraper-filtros.ts
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import fs from "fs";

puppeteer.use(StealthPlugin());

async function extrairFiltros() {
    console.log("🌐 Abrindo Chrome para espionar os filtros...\n");

    const browser = await puppeteer.launch({
        headless: false,
        userDataDir: 'C:\\projetos\\contabilidade facil\\chrome-perfil',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
    });

    const pages = await browser.pages();
    const page = pages[0] || await browser.newPage();

    // Conjunto para não salvar o mesmo filtro duas vezes
    const filtrosSalvos = new Set<string>();

    // 🔴 O SEGREDO ESTÁ AQUI: Escutamos a 'response' (resposta) em vez da 'request'
    page.on('response', async (response) => {
        const url = response.url();

        // Verifica se a resposta vem da API do Gran e se é de um filtro conhecido
        if (
            url.includes('rota-api.grancursosonline.com.br') &&
            (url.includes('/banca') || url.includes('/orgao') || url.includes('/cargo') ||
                url.includes('/ano') || url.includes('/escolaridade') || url.includes('/modalidade'))
        ) {
            try {
                // Pega o nome do filtro (ex: se a url termina em /banca?page=1, ele extrai "banca")
                const tipoFiltro = url.split('/').pop()?.split('?')[0] || "filtro_desconhecido";

                // Evita salvar arquivos duplicados
                if (!filtrosSalvos.has(tipoFiltro)) {
                    const json = await response.json();
                    fs.writeFileSync(`${tipoFiltro}.json`, JSON.stringify(json, null, 2), "utf-8");
                    console.log(`✅ DADOS CAPTURADOS: Salvou o arquivo ${tipoFiltro}.json na sua pasta!`);
                    filtrosSalvos.add(tipoFiltro);
                }
            } catch (err) {
                // Ignora erros silenciosamente caso a resposta não seja um JSON ainda
            }
        }
    });

    // Vai para a página de filtros
    await page.goto("https://questoes.grancursosonline.com.br/questoes-de-concursos/filtro", { waitUntil: "networkidle2" });

    console.log("=========================================================");
    console.log("🕵️  MODO ESPIÃO DE FILTROS ATIVADO");
    console.log("1. O Chrome está aberto na página de filtros.");
    console.log("2. Clique nos menus dropdown que você quer copiar (Banca, Órgão, Cargo...).");
    console.log("3. Role a lista no navegador para forçar a API a carregar os dados.");
    console.log("4. Veja a mágica acontecer aqui no terminal!");
    console.log("5. Pressione ENTER aqui no terminal quando terminar de capturar tudo.");
    console.log("=========================================================\n");

    await new Promise<void>((resolve) => {
        process.stdin.resume();
        process.stdin.once("data", () => {
            resolve();
        });
    });

    await browser.close();
    console.log("\n🚀 Concluído! Todos os filtros que você interagiu foram salvos na sua pasta.");
}

extrairFiltros().catch(err => {
    console.error("💥 Erro:", err.message);
    process.exit(1);
});