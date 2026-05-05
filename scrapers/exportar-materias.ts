// exportar-materias.ts
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import * as fs from "fs/promises";

puppeteer.use(StealthPlugin());

const API_BASE = "https://rota-api.grancursosonline.com.br";
const USER_DATA_DIR = "C:\\projetos\\contabilidade facil\\chrome-perfil";

async function capturarHeaders() {
  console.log("Login manual...");
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: USER_DATA_DIR,
    args: ["--no-sandbox"]
  });
  const page = await browser.newPage();
  let headers: Record<string, string> = {};
  let capturado = false;

  await page.setRequestInterception(true);
  page.on("request", (req) => {
    if (req.url().includes("rota-api")) {
      const h = req.headers();
      if (h.authorization || h.cookie) {
        headers = { ...h };
        if (!capturado) {
          capturado = true;
          console.log("Headers capturados");
        }
      }
    }
    req.continue();
  });

  await page.goto("https://questoes.grancursosonline.com.br", {
    waitUntil: "domcontentloaded"
  });
  console.log("Pressione ENTER após login");
  await new Promise<void>((resolve) => process.stdin.once("data", () => resolve()));
  await browser.close();

  // Remove headers problemáticos
  ["content-length", ":method", ":path", ":scheme", ":authority"].forEach(k => delete headers[k]);
  return headers;
}

async function buscarArvore(headers: Record<string, string>, raizId?: number) {
  const params = new URLSearchParams({
    comQuestoes: "1",
    perPage: "150",
    sort: "indiceOrdenacao",
    materia: "0"
  });
  ["id", "nome", "pai", "indice", "filhos"].forEach(f => params.append("_source[]", f));
  if (raizId) params.append("raiz[]", String(raizId));

  const url = `${API_BASE}/v3/materia/arvore?${params.toString()}`;
  const res = await fetch(url, { headers });
  const json = await res.json();
  return json?.data?.rows || json?.data || json || [];
}

(async () => {
  try {
    const headers = await capturarHeaders();
    console.log("Buscando árvore...");
    const materias = await buscarArvore(headers, undefined);
    console.log(`${materias.length} matérias encontradas.`);
    await fs.writeFile("materias.json", JSON.stringify(materias, null, 2));
    console.log("Salvo em materias.json");
  } catch (err) {
    console.error("Erro:", err);
  }
})();