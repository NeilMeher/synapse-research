import assert from "node:assert/strict";
import {createServer} from "node:http";
import {createRequire} from "node:module";
import {existsSync, mkdirSync, readFileSync, statSync} from "node:fs";
import {resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";

const require = createRequire(import.meta.url);
const {chromium} = require(process.env.PLAYWRIGHT_MODULE ?? "playwright");
const dist = fileURLToPath(new URL("../dist", import.meta.url));
const mime = new Map([["html", "text/html"], ["mjs", "text/javascript"], ["css", "text/css"], ["json", "application/json"], ["md", "text/plain"]]);
const server = createServer((request, response) => {
  const pathname = new URL(request.url, "http://localhost").pathname;
  const file = resolve(dist, "." + (pathname === "/" ? "/index.html" : pathname));
  if (!file.startsWith(dist + sep) || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, {"content-type": mime.get(file.split(".").at(-1)) ?? "text/plain"}).end(readFileSync(file));
});
if (!process.env.SYNAPSE_URL) {
  await new Promise((accept, reject) => {
    server.on("error", reject);
    server.listen(0, "127.0.0.1", accept);
  });
}
const base = process.env.SYNAPSE_URL ?? "http://127.0.0.1:" + server.address().port + "/";
const screenshots = new URL("../.browser-qa/", import.meta.url);
mkdirSync(screenshots, {recursive: true});

try {
  const browser = await chromium.launch(process.env.CHROME_PATH ? {executablePath: process.env.CHROME_PATH} : {});
  console.log("Browser", browser.version());
  try {
    for (const width of [360, 390, 768, 1440]) {
      const page = await browser.newPage({viewport: {width, height: 920}, reducedMotion: "reduce"});
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      page.on("requestfailed", request => errors.push(request.url() + " " + request.failure()?.errorText));
      const response = await page.goto(base);
      assert.equal(response.status(), 200);
      await page.getByText(/8,000 independent synthetic tasks/).waitFor();
      assert.equal(await page.locator("#findings article").count(), 3);
      assert.equal(await page.locator("#lab-list li").count(), 12);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth), width);
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(() => document.activeElement.textContent.trim()), "Skip to main content");
      const screenshot = fileURLToPath(new URL("home-" + width + ".png", screenshots));
      await page.keyboard.press("Tab");
      await page.locator(".brand").first().blur();
      await page.screenshot({path: screenshot});
      let labChoice;
      if (width > 650) {
        await page.getByRole("button", {name:"Zoom in"}).click();
        assert.ok(await page.locator("#map-view").evaluate(element => element.scrollWidth > element.clientWidth));
        await page.getByRole("button", {name:"Reset view"}).click();
        labChoice = page.locator("#map-nodes").getByRole("button", {name:"MIRAGE", exact:true});
      } else {
        assert.equal(await page.locator(".list-view").evaluate(element => element.open), true);
        labChoice = page.locator("#lab-list").getByRole("button", {name:"MIRAGE", exact:true});
      }
      await page.getByRole("searchbox", {name:"Search laboratories"}).fill("no-such-lab");
      assert.equal(await page.getByText("No laboratories match your filters.").isVisible(), true);
      await page.getByRole("searchbox", {name:"Search laboratories"}).fill("self-monitoring");
      await labChoice.click();
      assert.match(page.url(), /#lab-mirage$/);
      assert.equal(await page.locator("#lab-detail h3").textContent(), "MIRAGE");
      const summary = page.locator("#network-summary");
      const initialText = await summary.textContent();
      await page.getByRole("button", {name:"Next", exact:true}).click();
      assert.notEqual(await summary.textContent(), initialText);
      await page.getByRole("button", {name:"Play", exact:true}).click();
      await page.getByRole("button", {name:"Pause", exact:true}).click();
      await page.getByRole("button", {name:"Reset", exact:true}).click();
      assert.equal(await page.locator("#round").inputValue(), "0");
      await page.getByLabel("Archived replay").selectOption("trial-one-verified");
      assert.match(await page.locator("#scenario-tag").textContent(), /ARCHIVED/);
      await page.getByLabel("Agents", {exact:true}).fill("9");
      await page.getByRole("button", {name:"Run scenario"}).click();
      assert.equal(await page.locator("#agent option").count(), 9);
      assert.match(await page.locator("#scenario-tag").textContent(), /BROWSER/);
      const [download] = await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("button", {name:"Download replay"}).click(),
      ]);
      const exported = JSON.parse(readFileSync(await download.path()));
      assert.equal(exported.scenario.settings.agents, 9);
      assert.deepEqual(exported.scenario.task, exported.comparison.task);
      await page.getByRole("button", {name:"Light theme"}).click();
      assert.equal(await page.locator("html").getAttribute("data-theme"), "light");
      await page.getByRole("link", {name:"ECHO lab", exact:true}).click();
      await page.locator("#replay-bar, .replay-bar").scrollIntoViewIfNeeded();
      await page.screenshot({path:fileURLToPath(new URL("echo-" + width + ".png", screenshots))});
      await page.getByRole("link", {name:"Dependence", exact:true}).click();
      await page.getByText(/echo2-confirmatory-001 · 16,000/).waitFor();
      assert.match(await page.locator("#robust-gap").textContent(), /-13\.75 pp/);
      assert.match(await page.locator("#robust-bounds").textContent(), /36\.0% to 94\.0%/);
      assert.equal(await page.locator("#robust-grid tr").count(),6);
      await page.getByLabel("Pairwise correlation").fill("0");
      await page.getByRole("button",{name:"Compare dependence laws"}).click();
      assert.equal(await page.locator("#robust-gap").textContent(),"0.00 pp");
      assert.equal(await page.locator("#robust-summary tr").count(),2);
      await page.getByLabel("Replay round").press("End");
      assert.equal(await page.locator("#robust-round").textContent(),"4");
      await page.getByLabel("Replay agent").selectOption("2");
      assert.equal(await page.locator("#robust-agent-data tr").count(),2);
      const [robustExport]=await Promise.all([
        page.waitForEvent("download"),
        page.getByRole("button",{name:"Download exact values and replay"}).click(),
      ]);
      const scenario=JSON.parse(readFileSync(await robustExport.path())).scenario;
      assert.equal(scenario.rho,0);
      assert.deepEqual(scenario.models[0].correctness,scenario.models[1].correctness);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth),width);
      await page.locator("#robust-title").scrollIntoViewIfNeeded();
      await page.screenshot({path:fileURLToPath(new URL("echo2-" + width + ".png",screenshots))});
      const robustArtifact=await page.request.get(new URL("data/echo2-confirmatory.manifest.json",base).href);
      assert.equal((await robustArtifact.json()).id,"echo2-confirmatory-001");

      assert.deepEqual(errors, []);
      const evidence = await page.request.get(new URL("data/confirmatory.manifest.json", base).href);
      assert.equal(evidence.ok(), true);
      assert.equal((await evidence.json()).status, "completed");
      console.log(width + "px: map, keyboard, layout, replay, export, theme and provenance passed");
      await page.close();
    }
    const fallback = await browser.newPage();
    await fallback.route("**/data/confirmatory.json", route => route.fulfill({status:503, body:"unavailable"}));
    await fallback.goto(base);
    await fallback.getByText(/Experiment artifact unavailable/).waitFor();
    assert.equal(await fallback.getByRole("button", {name:"Run scenario"}).isEnabled(), true);
    console.log("503 artifact fallback passed");
  } finally {
    await browser.close();
  }
} finally {
  if (server.listening) server.close();
}
