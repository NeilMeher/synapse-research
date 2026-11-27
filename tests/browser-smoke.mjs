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
      page.setDefaultTimeout(Number(process.env.SYNAPSE_BROWSER_TIMEOUT??30000));
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
      await page.getByText("MIRAGE evidence",{exact:true}).click();
      assert.equal(await page.locator("#lab-detail").getByRole("link",{name:"Results and dataset"}).getAttribute("href"),"./data/mirage-confirmatory.json");
      await page.getByRole("searchbox",{name:"Search laboratories"}).fill("");
      await page.getByLabel("Status",{exact:true}).selectOption("proposed");
      assert.equal(await page.locator("#lab-list li:not([hidden])").count(),3);
      await page.getByLabel("Status",{exact:true}).selectOption("all");
      await labChoice.click();
      await page.getByLabel("Focus on selected lab").check();
      assert.deepEqual(await page.locator("#lab-list li:not([hidden]) button").allTextContents(),
        ["MIRAGE","MORPHEUS","ECHO","NOESIS","REFLEX"]);
      await page.getByLabel("Focus on selected lab").uncheck();
      await page.getByText("Scientific discovery",{exact:true}).click();
      assert.equal(await page.locator("#map-journeys").getByRole("link",{name:"EPISTEME"}).getAttribute("href"),"./episteme.html");
      if (width>650){
        await page.getByRole("button",{name:"Fit graph"}).click();
        assert.ok(await page.locator("#map-view").evaluate(element=>element.scrollWidth<=element.clientWidth));
        const science=page.getByRole("button",{name:"Scientific intelligence",exact:true});
        await science.click();
        assert.equal(await science.getAttribute("aria-expanded"),"false");
        assert.equal(await page.locator("#map-nodes").getByRole("button",{name:"NOESIS"}).count(),0);
        await science.click();
      }
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

      for (const [route,status] of [["mirage","mirage-confirmatory-001"],["reflex","reflex-confirmatory-001"],
        ["convergence","convergence-confirmatory-001"],["morpheus","morpheus-confirmatory-001"],
        ["alpha-decay","alpha-decay-confirmatory-001"],["noesis","noesis-confirmatory-001"],["scientia","scientia-confirmatory-001"],["episteme","episteme-confirmatory-001"],["axiom","axiom-pilot-001"],["civilizations","civilizations-confirmatory-001"]]) {
        const studyResponse=await page.goto(new URL(route+".html",base).href);
        assert.equal(studyResponse.status(),200);
        await page.waitForFunction(({route,status})=>document.getElementById((route==="alpha-decay"?"alpha":route)+"-status")?.textContent.includes(status),{route,status});
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width,route+" viewport overflow at "+width+"px");
        if (route==="mirage"){
          assert.equal(await page.locator("#mirage-metrics tr").count(),5);
          await page.getByLabel("Hint regime").selectOption("misleading");
          assert.match(await page.locator("#mirage-metrics").textContent(),/0\.2202/);
          await page.getByLabel("Forecast to plot").selectOption("oracle");
          assert.equal(await page.locator("#mirage-risk-table tr").count(),5);
        }
        if (route==="reflex"){
          await page.getByLabel("Price impact per unit").selectOption("4");
          await page.getByLabel("Market round").press("End");
          assert.match(await page.locator("#reflex-quote").textContent(),/Round 6/);
          assert.equal(await page.locator("#reflex-ledger tr").count(),11);
          assert.equal(await page.locator("#reflex-trades tr").count(),9);
        }
        if (route==="convergence"){
          assert.equal(await page.locator("#convergence-arm option").count(),22);
          await page.getByRole("button",{name:"Market outcome"}).click();
          await page.getByLabel("Order in episode").press("End");
          assert.match(await page.locator("#convergence-stage").textContent(),/executed units.*Midpoint/);
          assert.equal(await page.locator("#convergence-trades tr").count(),15);
          assert.equal(await page.locator("#convergence-contrasts tr").count(),2);
        }
        if (route==="morpheus"){
          await page.getByLabel("Memory timeline step").press("End");
          assert.match(await page.locator("#morpheus-step-summary").textContent(),/Step 15/);
          await page.getByLabel("Architecture").selectOption("keyword");
          assert.match(await page.locator("#morpheus-step-summary").textContent(),/keyword predicted/);
          await page.getByLabel("Regime").selectOption("clean");
          const inject=page.getByRole("button",{name:"Simulate clone divergence"});
          await inject.click();
          assert.equal(await inject.getAttribute("aria-pressed"),"true");
          assert.match(await page.locator("#morpheus-clone-note").textContent(),/Original prediction.*clone prediction/);
          await page.getByRole("row",{name:/demo-injection/}).click();
          assert.match(await page.locator("#morpheus-inspector").textContent(),/verified=false/);
          await inject.click();
          assert.equal(await page.getByRole("row",{name:/demo-injection/}).count(),0);
        }
        if (route==="alpha-decay"){
          await page.getByLabel("Scenario arm").selectOption("impact4-adopters-9");
          await page.getByLabel("Episode round").press("End");
          const impacted=await page.locator("#alpha-round-summary").textContent();
          assert.match(impacted,/Round 8.*End midpoint/);
          await page.getByLabel("Scenario arm").selectOption("control0-adopters-9");
          assert.notEqual(await page.locator("#alpha-round-summary").textContent(),impacted);
          assert.equal(await page.locator("#alpha-trades tr").count(),12);
          assert.ok(await page.locator("#alpha-chart").evaluate(canvas =>
            canvas.getContext("2d").getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v>0)));
        }
        if (route==="noesis"){
          await page.locator("#noesis-arm").selectOption("uniform_grid");
          await page.getByLabel("Archived measurement step").press("End");
          assert.match(await page.locator("#noesis-step-output").textContent(),/7 \/ 7/);
          await page.locator("#noesis-toggle-truth").click();
          assert.match(await page.locator("#noesis-truth-display").textContent(),/Ground Truth Law/);
          const measure=page.getByRole("button",{name:"Measure",exact:true});
          await page.getByLabel("Measurement location").selectOption("-1.8");
          await measure.click();
          assert.match(await page.locator("#noesis-challenge-status").textContent(),/1 of 8/);
          assert.match(await page.locator("#noesis-challenge-observations").textContent(),/-1.8/);
          for(let i=1;i<8;i++)await measure.click();
          assert.equal(await measure.isDisabled(),true);
          await page.getByRole("button",{name:"Reveal practice law"}).click();
          assert.match(await page.locator("#noesis-challenge-outcome").textContent(),/RMSE on 20 never-selectable midpoints/);
          await page.getByRole("button",{name:"Start world"}).click();
          assert.equal(await measure.isEnabled(),true);
        }
        if (route==="scientia"){
          await page.getByLabel("Archived design").selectOption("1");
          assert.equal(await page.locator("#scientia-study tr").count(),8);
          assert.match(await page.locator("#scientia-contrast").textContent(),/15\.32 pp/);
          await page.getByRole("button",{name:"Replay first programme"}).click();
          assert.equal(await page.locator("#scientia-trace tr").count(),20);
          await page.getByLabel("Research procedure").selectOption("replicate");
          assert.match(await page.locator("#scientia-score").textContent(),/Independent replication/);
          await page.getByLabel("Hypotheses",{exact:true}).fill("4");
          await page.getByRole("button",{name:"Generate programme"}).click();
          assert.equal(await page.locator("#scientia-trace tr").count(),4);
          assert.match(await page.locator("#scientia-budget").textContent(),/128 observations/);
          assert.match(await page.locator("#scientia-exact").textContent(),/18\.55%/);
        }
        if (route==="episteme"){
          assert.equal(await page.locator("#episteme-observations tr").count(),1);
          assert.equal(await page.locator("#episteme-weights tr").count(),4);
          await page.getByLabel("Inquiry stage").press("End");
          assert.match(await page.locator("#episteme-decision").textContent(),/Provisionally accepted/);
          assert.equal(await page.locator("#episteme-blocks tr").count(),8);
          await page.getByLabel("Hidden-law regime").selectOption("1");
          assert.match(await page.locator("#episteme-decision").textContent(),/Unresolved/);
          await page.getByLabel("Measurement policy").selectOption("disagreement");
          await page.getByLabel("Replay example").selectOption("rejected");
          assert.match(await page.locator("#episteme-decision").textContent(),/Rejected at/);
          await page.getByRole("button",{name:"Reveal simulated truth"}).click();
          assert.match(await page.locator("#episteme-truth").textContent(),/Sine \+ quadratic.*14 disjoint/);
        }
        if (route==="axiom"){
          assert.match(await page.locator("#axiom-response").textContent(),/2\.25.*4/);
          await page.locator("#axiom-presentation").selectOption("both");
          assert.match(await page.locator("#axiom-columns").textContent(),/Opponent B.*25\.0%.*Opponent A.*75\.0%/);
          assert.match(await page.locator("#axiom-distance").textContent(),/0\.0000/);
          await page.locator("#axiom-policy").selectOption("position");
          assert.match(await page.locator("#axiom-distance").textContent(),/1\.0000/);
          await page.locator("#axiom-game").selectOption("1");
          await page.locator("#axiom-policy").selectOption("utility");
          await page.locator("#axiom-defect").check();
          assert.match(await page.locator("#axiom-equivalence").textContent(),/fault/);
          assert.match(await page.locator("#axiom-distance").textContent(),/0\.5000/);
          await page.getByRole("spinbutton",{name:"Row A, column A, player 1 payoff"}).fill("10");
          await page.getByRole("button",{name:"Restore registered payoffs"}).click();
          assert.equal(await page.getByRole("spinbutton",{name:"Row A, column A, player 1 payoff"}).inputValue(),"4");
          const evidence=await page.request.get(new URL("data/axiom-pilot.json",base).href);
          assert.equal((await evidence.json()).summary.presentations,80);
        }
        if (route==="civilizations"){
          assert.match(await page.locator("#village-mode").textContent(),/Registered first-world replay/);
          await page.locator("#village-climate").selectOption("stress");
          await page.locator("#village-policy").selectOption("pooled");
          assert.match(await page.locator("#village-contrast").textContent(),/-9\.61 pp/);
          await page.locator("#village-day").press("End");
          assert.match(await page.locator("#village-day-label").textContent(),/24 of 24/);
          for (const ledger of await page.locator("#village-ledger tr").all()){
            const [initial,made,used,lost,stored]=(await ledger.locator("td").allTextContents()).map(Number);
            assert.equal(initial+made-used-lost,stored);
          }
          await page.locator("#village-agent").selectOption("2");
          assert.match(await page.locator("#village-detail").textContent(),/Agent 3/);
          await page.getByRole("button",{name:"Run sandbox"}).click();
          assert.match(await page.locator("#village-mode").textContent(),/Live sandbox/);
          await page.getByRole("button",{name:"Next day"}).click();
          assert.match(await page.locator("#village-day-label").textContent(),/Day 2/);
          await page.getByRole("button",{name:"Load registered replay"}).click();
          assert.match(await page.locator("#village-mode").textContent(),/Registered first-world replay/);
        }
        if (["morpheus","alpha-decay","noesis","scientia","episteme","civilizations"].includes(route)){
          const evidence=page.getByRole("link",{name:/Confirmatory results/i});
          const response=await page.request.get(new URL(await evidence.getAttribute("href"),base).href);
          assert.equal(response.status(),200);
          assert.equal((await response.json()).config.id,status);
        }
        if (width===390 || width===1440) {
          await page.evaluate(()=>scrollTo(0,0));
          await page.screenshot({path:fileURLToPath(new URL(route+"-" + width + ".png",screenshots))});
        }
      }
      assert.equal((await page.goto(new URL("academy.html",base).href)).status(),200);
      assert.equal(await page.locator("article.lesson").count(),7);
      await page.locator("#academy-barter").fill("4");
      assert.match(await page.locator("#academy-resources-result").textContent(),/A \[4, 4\].*B \[4, 4\].*8 \/ 8/);
      await page.locator("#academy-opponent").fill("3");
      assert.match(await page.locator("#academy-strategy-result").textContent(),/3\.00.*3\.00.*50\.0%/);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
      await page.getByLabel("Pairwise correlation").press("End");
      assert.match(await page.locator("#academy-dependence").textContent(),/65\.0% with shared shock and 65\.0%/);
      await page.getByLabel("Observation",{exact:true}).selectOption("disagree");
      assert.match(await page.locator("#academy-bayes").textContent(),/33\.33%/);
      assert.match(await page.locator("#academy-market").textContent(),/at 102, 105/);
      await page.getByLabel("Requested lots").press("Home");
      assert.match(await page.locator("#academy-market").textContent(),/1 of 1 lots filled/);
      assert.match(await page.locator("#academy-information").textContent(),/0\.2781 bits/);
      await page.getByLabel("Multiplicity rule").selectOption("holm");
      assert.match(await page.locator("#academy-testing").textContent(),/64\.15%.*H1, H2\./);
      await page.getByLabel("Multiplicity rule").selectOption("bh");
      assert.match(await page.locator("#academy-testing").textContent(),/H1, H2, H3\./);
      assert.equal(await page.locator("html").getAttribute("data-theme"),"light");
      await page.getByRole("button",{name:"Dark theme"}).click();
      assert.equal(await page.locator("html").getAttribute("data-theme"),"dark");
      assert.equal((await page.goto(new URL("library.html",base).href)).status(),200);
      const studies=[
        ["ECHO v1","index.html#evidence","confirmatory","echo"],
        ["ECHO 2.0","index.html#robustness","echo2-confirmatory","echo2"],
        ["MIRAGE","mirage.html","mirage-confirmatory","mirage"],
        ["REFLEX","reflex.html","reflex-confirmatory","reflex"],
        ["CONVERGENCE","convergence.html","convergence-confirmatory","convergence"],
        ["MORPHEUS","morpheus.html","morpheus-confirmatory","morpheus"],
        ["ALPHA DECAY","alpha-decay.html","alpha-decay-confirmatory","alpha-decay"],
        ["NOESIS","noesis.html","noesis-confirmatory","noesis"],
        ["SCIENTIA","scientia.html","scientia-confirmatory","scientia"],
        ["EPISTEME","episteme.html","episteme-confirmatory","episteme"],
        ["AXIOM","axiom.html","axiom-pilot","axiom"],
        ["GAME OF CIVILIZATIONS","civilizations.html","civilizations-confirmatory","civilizations"],
      ];
      assert.deepEqual(await page.locator("#studies article h2").allTextContents(),studies.map(([name])=>name));
      for (const [index,[,route,result,paper]] of studies.entries()){
        const links=await page.locator("#studies article").nth(index).getByRole("link").evaluateAll(nodes=>nodes.map(n=>n.getAttribute("href")));
        assert.deepEqual(links,["./"+route,"./data/"+result+".json","./data/"+result+".manifest.json","./papers/"+paper+".md"]);
        if(width===1440){
          for(const href of links)assert.equal((await page.request.get(new URL(href,base).href)).status(),200);
        }
      }

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
