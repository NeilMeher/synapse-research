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
      if(width===1440)assert.ok((await page.locator("#map-view").boundingBox()).y<600,"The graph should be visible on the first screen.");
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
      assert.equal(await page.locator("#lab-list li:not([hidden])").count(),0);
      await page.getByLabel("Status",{exact:true}).selectOption("all");
      await labChoice.click();
      await page.getByLabel("Focus on selected lab").check();
      assert.deepEqual(await page.locator("#lab-list li:not([hidden]) button").allTextContents(),
        ["MIRAGE","MORPHEUS","ECHO","NOESIS","REFLEX"]);
      await page.getByLabel("Focus on selected lab").uncheck();
      await page.getByRole("searchbox",{name:"Search laboratories"}).fill("payoff matrices");
      assert.deepEqual(await page.locator("#lab-list li:not([hidden]) button").allTextContents(),["AXIOM"]);
      await page.getByText("AXIOM evidence",{exact:true}).click();
      assert.equal(await page.locator("#lab-detail").getByRole("link",{name:"Payoff matrices"}).getAttribute("href"),"./axiom.html#axiom-workbench");
      await page.getByRole("searchbox",{name:"Search laboratories"}).fill("");
      await page.getByText("Scientific discovery",{exact:true}).click();
      assert.equal(await page.locator("#map-journeys").getByRole("link",{name:"EPISTEME"}).getAttribute("href"),"./episteme.html");
      await page.getByText("From computing infrastructure to national economic systems",{exact:true}).click();
      assert.equal(await page.locator("#map-journeys").getByRole("link",{name:"NEXUS scenarios"}).getAttribute("href"),"./nexus.html#evidence");
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
        ["alpha-decay","alpha-decay-confirmatory-001"],["noesis","noesis-confirmatory-001"],["scientia","scientia-confirmatory-001"],["episteme","episteme-confirmatory-001"],["axiom","axiom-pilot-001"],["civilizations","civilizations-confirmatory-001"],["polis","polis-confirmatory-001"],["polis2","polis2-confirmatory-001"],["artha","artha-scenario-001"],["energia","energia-scenario-001"],["nexus","nexus-scenario-001"],["chronos","chronos-scenario-001"]]) {
        const studyResponse=await page.goto(new URL(route+".html",base).href);
        assert.equal(studyResponse.status(),200);
        await page.waitForFunction(({route,status})=>document.getElementById((route==="alpha-decay"?"alpha":route==="artha"?"artha-archive":route)+"-status")?.textContent.includes(status),{route,status});
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
        if (route==="polis"){
          assert.equal(await page.locator(".polis-chain li").count(),4);
          assert.equal(await page.locator("#polis-agents tr").count(),8);
          const original=await page.locator("#polis-agents tr").allTextContents();
          await page.locator("#polis-policy").selectOption("fixedPrior");
          assert.deepEqual(await page.locator("#polis-agents tr").allTextContents(),original);
          assert.match(await page.locator("#polis-decision").textContent(),/fixed delivery belief/);
          await page.locator("#polis-policy").selectOption("cautious");
          assert.match(await page.locator("#polis-decision").textContent(),/recorded failure/);
          await page.locator("#polis-day").press("End");
          assert.match(await page.locator("#polis-day-label").textContent(),/24 of 24/);
          assert.equal(await page.locator("#polis-outcomes tr").count(),4);
          await page.locator("#polis-climate").selectOption("moderate");
          assert.match(await page.locator("#polis-intake").textContent(),/units consumed this day/);
        }
        if (route==="polis2"){
          assert.match(await page.locator("#polis2-interaction").textContent(),/-9\.60 pp/);
          assert.match(await page.locator("#polis2-payer").textContent(),/-0\.20/);
          await page.locator("#polis2-payment").selectOption("delivery");
          assert.match(await page.locator("#polis2-payer").textContent(),/0\.60/);
          assert.match(await page.locator("#polis2-contrast").textContent(),/0\.00 pp/);
          await page.locator("#polis2-surplus").selectOption("3");
          assert.match(await page.locator("#polis2-payer").textContent(),/0\.00/);
          assert.equal(await page.locator("#polis2-results tr").count(),4);
        }

        if(route==="artha"){
          await page.locator("#artha-status").filter({hasText:/34 industries/}).waitFor();
          assert.equal(await page.locator("#artha-output").textContent(),"$185.09m");
          await page.locator("#artha-detail").selectOption("aggregated");
          assert.equal(await page.locator("#artha-output").textContent(),"$188.41m");
          await page.locator("#artha-year").selectOption("2023");
          assert.equal(await page.locator("#artha-output").textContent(),"$191.9m");
          await page.locator("#artha-amount").fill("-1");
          assert.match(await page.locator("#artha-status").textContent(),/Enter a whole amount/);
          await page.locator("#artha-amount").fill("0");
          assert.equal(await page.locator("#artha-output").textContent(),"$0m");
          assert.equal(await page.locator("#artha-flows tr").count(),10);
        }

        if(route==="energia"){
          assert.match(await page.locator("#energia-energy").textContent(),/594\.27 MWh/);
          assert.match(await page.locator("#energia-npv").textContent(),/-\$648,033/);
          assert.equal(await page.locator("#energia-gap").textContent(),"Year 5");
          await page.locator("#energia-case").selectOption("no-debt");
          assert.equal(await page.locator("#energia-dscr").textContent(),"—");
          assert.match(await page.locator("#energia-npv").textContent(),/-\$648,033/);
          await page.locator("#energia-case").selectOption("stress");
          assert.equal(await page.locator("#energia-gap").textContent(),"Year 2");
          await page.locator("#energia-tariff").fill("-1");
          assert.match(await page.locator("#energia-input-status").textContent(),/within the displayed bounds/);
          await page.locator("#energia-grid-choice").selectOption("debtHardware");
          assert.equal(await page.locator("#energia-grid tr").count(),3);
          assert.equal(await page.locator("#energia-frontier").getByText("Pareto frontier",{exact:true}).count(),1);
        }

        if(route==="nexus"){
          assert.equal(await page.locator("#nexus-output").textContent(),"$1,208,727");
          assert.equal(await page.locator("#nexus-domestic").textContent(),"$649,000");
          await page.locator("#nexus-local").press("End");
          assert.equal(await page.locator("#nexus-domestic").textContent(),"$825,750");
          assert.equal(await page.locator("#nexus-output").textContent(),"$1,564,563");
          await page.locator("#nexus-design").selectOption("efficient");
          assert.match(await page.locator("#nexus-operating").textContent(),/544\.05 MWh.*-\$622,256/);
          assert.equal(await page.locator("#nexus-output").textContent(),"$1,564,563");
          assert.match(await page.locator("#nexus-procurement tr").filter({hasText:"Accelerator package"}).textContent(),/0%.*\$0.*\$896,000/);
          await page.locator("#nexus-buyer").selectOption("c18");
          assert.equal(await page.locator("#nexus-links tr").count(),8);
          assert.equal(await page.locator("#nexus-archive tr").count(),4);
        }

        if(route==="chronos"){
          assert.equal(await page.locator("#chronos-national tr").count(),17);
          await page.locator("#chronos-mode").selectOption("growth");
          await page.locator("#chronos-window").selectOption("modern");
          assert.equal(await page.locator("#chronos-national tr").count(),10);
          await page.locator("#chronos-region-year").selectOption("2014");
          assert.match(await page.locator("#chronos-region-rows").textContent(),/Telangana.*1,753.*scope as ambiguous/);
          await page.locator("#chronos-synthetic").selectOption("different-trends");
          assert.match(await page.locator("#chronos-teaching").textContent(),/ATT 4.*differences-in-differences 7/);
          await page.locator("#chronos-event-window").selectOption("early");
          assert.equal(await page.locator("#chronos-events li").count(),1);
          assert.match(await page.locator("#chronos-conditional").textContent(),/64\.95%/);
          assert.match(await page.locator("#chronos-locators").textContent(),/65,510/);
        }
        if (["morpheus","alpha-decay","noesis","scientia","episteme","civilizations","polis","polis2"].includes(route)){
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
      assert.equal(await page.locator("article.lesson").count(),16);
      assert.match(await page.locator("#academy-io-result").textContent(),/102\.04.*20\.41.*122\.45/);
      assert.match(await page.locator("#academy-energy-result").textContent(),/720\.0 kWh/);
      assert.match(await page.locator("#academy-finance-result").textContent(),/4\.13.*0\.66.*2\.00/);
      await page.locator("#academy-opt-result").filter({hasText:/frontier full-equity/}).waitFor();
      await page.locator("#academy-water-limit").press("Home");
      assert.match(await page.locator("#academy-opt-result").textContent(),/0 feasible.*frontier empty/);
      await page.locator("#academy-history-result").filter({hasText:/29\.56|129\.56/}).waitFor();
      assert.match(await page.locator("#academy-selection-result").textContent(),/Post-only difference 12.*known treatment effect 4/);
      await page.locator("#academy-trend").press("Home");
      assert.match(await page.locator("#academy-trend-result").textContent(),/DiD -2.*bias -6/);
      assert.match(await page.locator("#academy-rounding-result").textContent(),/consistent after rounding/);
      await page.locator("#academy-history").selectOption("pooled");
      assert.match(await page.locator("#academy-cooperation-result").textContent(),/Pooled history.*fulfilled.*Gini/);
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
        ["POLIS","polis.html","polis-confirmatory","polis"],
        ["POLIS 2.0","polis2.html","polis2-confirmatory","polis2"],
        ["ARTHA","artha.html","artha-scenario","artha"],
        ["ENERGIA","energia.html","energia-scenario","energia"],
        ["NEXUS","nexus.html","nexus-scenario","nexus"],
        ["CHRONOS","chronos.html","chronos-scenario","chronos"],
      ];
      assert.deepEqual(await page.locator("#studies article h2").allTextContents(),studies.map(([name])=>name));
      for (const [index,[,route,result,paper]] of studies.entries()){
        const links=await page.locator("#studies article").nth(index).locator("a").evaluateAll(nodes=>nodes.map(n=>n.getAttribute("href")));
        assert.deepEqual(links.slice(0,5),["./"+route,"./data/"+result+".json","./data/"+result+".manifest.json","./papers/"+paper+".md","./reader.html?study="+paper]);
        if(width===1440){
          for(const href of links)assert.equal((await page.request.get(new URL(href,base).href)).status(),200);
        }
      }


      await page.locator("[data-study=chronos]").getByText("Evidence and reproduction",{exact:true}).click();
      assert.ok(await page.locator("[data-study=chronos]").getByRole("link",{name:"Read manuscript"}).isVisible());
      await page.locator("#catalogue-evidence").selectOption("Official historical data");
      assert.deepEqual(await page.locator("#studies article:not([hidden]) h2").allTextContents(),["CHRONOS"]);
      await page.locator("#catalogue-evidence").selectOption("all");
      await page.locator("#catalogue-direction").selectOption("Inconclusive");
      assert.deepEqual(await page.locator("#studies article:not([hidden]) h2").allTextContents(),["CONVERGENCE","NOESIS"]);
      assert.equal((await page.goto(new URL("knowledge.html?q=electrification",base).href)).status(),200);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
      await page.locator("#knowledge-type").selectOption("Study");
      await page.locator("#knowledge-results").getByRole("button",{name:"CHRONOS",exact:true}).click();
      assert.match(await page.locator("#knowledge-edges").textContent(),/Manuscript|manuscript/);
      await page.locator("#knowledge-rel").selectOption("has limitation");
      assert.match(await page.locator("#knowledge-edges").textContent(),/limitation/i);
      assert.equal((await page.goto(new URL("reader.html?study=chronos",base).href)).status(),200);
      await page.locator("#study-paper h1").filter({hasText:/CHRONOS/}).waitFor();
      assert.equal(await page.locator("#study-paper table").count(),1);
      assert.equal(await page.getByRole("link",{name:"Original Markdown"}).getAttribute("href"),new URL("papers/chronos.md",base).href);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth),width);
      await page.keyboard.press("Tab");
      assert.equal(await page.evaluate(()=>document.activeElement.textContent.trim()),"Skip to main content");
      if(width===1440){
        const navigation=await page.evaluate(()=>performance.getEntriesByType("navigation")[0].domContentLoadedEventEnd);
        console.log("Reader DOMContentLoaded at 1440px · "+Math.round(navigation)+" ms");
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
    const villageFallback=await browser.newPage();
    await villageFallback.route("**/data/civilizations-confirmatory.json",route=>route.fulfill({status:503,body:"unavailable"}));
    await villageFallback.goto(new URL("civilizations.html",base).href);
    await villageFallback.getByText("Archive unavailable. The live sandbox is ready.",{exact:true}).waitFor();
    await villageFallback.getByRole("button",{name:"Run sandbox"}).click();
    assert.match(await villageFallback.locator("#village-mode").textContent(),/Live sandbox/);
    console.log("503 economy archive fallback passed");
    const missingIndia=await browser.newPage();
    await missingIndia.route("**/data/processed/artha-india.json",route=>route.fulfill({status:503,body:"unavailable"}));
    await missingIndia.goto(new URL("artha.html",base).href);
    await missingIndia.getByText(/The national source tables are unavailable/).waitFor();
    assert.equal(await missingIndia.locator("#artha-amount").isDisabled(),true);
    await missingIndia.getByText(/12 deterministic comparisons/).waitFor();
    console.log("503 official dataset fallback passed");
    const missingFinance=await browser.newPage();
    await missingFinance.route("**/experiments/energia-scenario.json",route=>route.fulfill({status:503,body:"unavailable"}));
    await missingFinance.goto(new URL("energia.html",base).href);
    await missingFinance.getByText(/The scenario assumptions are unavailable/).waitFor();
    assert.equal(await missingFinance.locator("#energia-case").isDisabled(),true);
    await missingFinance.getByText(/six deterministic ledgers/).waitFor();
    console.log("503 finance configuration fallback passed");
    const missingBridge=await browser.newPage();
    await missingBridge.route("**/data/processed/nexus-capital-map.json",route=>route.fulfill({status:503,body:"unavailable"}));
    await missingBridge.goto(new URL("nexus.html",base).href);
    await missingBridge.getByText(/The linked source data are unavailable/).waitFor();
    assert.equal(await missingBridge.locator("#nexus-local").isDisabled(),true);
    await missingBridge.getByText(/four matched deterministic scenarios/).waitFor();
    console.log("503 procurement concordance fallback passed");
    const missingHistory=await browser.newPage();
    await missingHistory.route("**/data/processed/chronos-rail.json",route=>route.fulfill({status:503,body:"unavailable"}));
    await missingHistory.goto(new URL("chronos.html",base).href);
    await missingHistory.getByText(/Historical source files are unavailable/).waitFor();
    assert.equal(await missingHistory.locator("#chronos-metric").isDisabled(),true);
    await missingHistory.locator("#chronos-synthetic").selectOption("spillover");
    assert.match(await missingHistory.locator("#chronos-teaching").textContent(),/bias -2/);
    console.log("503 historical data fallback passed");
    const missingIndex=await browser.newPage();
    await missingIndex.route("**/data/research-index.json",route=>route.fulfill({status:503,body:"unavailable"}));
    await missingIndex.goto(new URL("knowledge.html?q=freight",base).href);
    await missingIndex.getByText(/Registry search remains available/).waitFor();
    assert.ok(await missingIndex.locator("#knowledge-results li").count()>0);
    console.log("503 research index fallback passed");
    if(process.env.AXE_SCRIPT){
      const violations=[];
      const auditRoutes=["index.html","chronos.html","knowledge.html?q=electrification","library.html","reader.html?study=chronos","academy.html"];
      for(const width of [390,1440]){
        const page=await browser.newPage({viewport:{width,height:900},reducedMotion:"reduce"});
        for(const path of auditRoutes){
          await page.goto(new URL(path,base).href);
          await page.evaluate(()=>document.fonts.ready);
          await page.addScriptTag({path:process.env.AXE_SCRIPT});
          for(const theme of ["dark","light"]){
            await page.locator("html").evaluate((element,value)=>{element.dataset.theme=value;},theme);
            const results=await page.evaluate(()=>window.axe.run({runOnly:["wcag2a","wcag2aa","wcag21a","wcag21aa"]}));
            violations.push(...results.violations.map(issue=>({width,path,theme,id:issue.id,
              targets:issue.nodes.map(details=>details.target).slice(0,12)})));
          }
        }
        await page.close();
      }
      assert.deepEqual(violations,[]);
      console.log("axe accessibility checks passed on six routes at two widths in both themes");
    }
  } finally {
    await browser.close();
  }
} finally {
  if (server.listening) server.close();
}
