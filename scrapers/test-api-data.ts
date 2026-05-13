
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import * as fs from 'fs/promises';

puppeteer.use(StealthPlugin());

const USER_DATA_DIR = "C:\\projetos\\contabilidade facil\\chrome-perfil";

async function getSampleData() {
  const browser = await puppeteer.launch({ 
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    userDataDir: USER_DATA_DIR
  });
  const page = await browser.newPage();
  
  console.log("Using existing profile...");
  
  console.log("Capturing questions...");
  let sampleQuestion: any = null;
  
  page.on('response', async (res) => {
    const url = res.url();
    if (url.includes('v3/questao/filtro') && res.status() === 200) {
      try {
        const json = await res.json();
        if (json.data && json.data.rows && json.data.rows.length > 0) {
          sampleQuestion = json.data.rows[0];
        }
      } catch (e) {}
    }
  });
  
  await page.goto('https://questoes.grancursosonline.com.br/aluno/filtro/concursos?assunto=104', { waitUntil: 'networkidle2' });
  
  if (sampleQuestion) {
    await fs.writeFile('scrapers/sample_question.json', JSON.stringify(sampleQuestion, null, 2));
    console.log("Sample question saved to scrapers/sample_question.json");
  } else {
    console.log("Could not capture question data.");
  }
  
  await browser.close();
}

getSampleData().catch(console.error);
