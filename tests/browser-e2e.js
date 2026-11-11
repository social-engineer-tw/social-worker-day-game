"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const net = require("node:net");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");

const ROOT = path.resolve(__dirname, "..");
const RESULTS = path.join(ROOT, "test-results");
const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".mp3": "audio/mpeg",
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function startStaticServer() {
  const server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    const file = path.resolve(ROOT, relative);
    if (!file.startsWith(`${ROOT}${path.sep}`) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      response.writeHead(404).end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": MIME[path.extname(file)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    fs.createReadStream(file).pipe(response);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function waitForTarget(port, expectedUrl, timeoutMs = 12000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const targets = await fetch(`http://127.0.0.1:${port}/json/list`).then(response => response.json());
      const page = targets.find(target => target.type === "page" && target.url?.startsWith(expectedUrl));
      if (page?.webSocketDebuggerUrl) return page;
    } catch {}
    await delay(120);
  }
  throw new Error("Timed out waiting for Chrome DevTools target");
}

async function connectCdp(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let sequence = 0;
  const pending = new Map();
  const events = [];
  socket.addEventListener("message", message => {
    const payload = JSON.parse(message.data);
    if (payload.id && pending.has(payload.id)) {
      const { resolve, reject } = pending.get(payload.id);
      pending.delete(payload.id);
      if (payload.error) reject(new Error(payload.error.message));
      else resolve(payload.result);
    } else if (payload.method) {
      events.push(payload);
    }
  });
  return {
    events,
    close: () => socket.close(),
    send(method, params = {}) {
      const id = ++sequence;
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
  };
}

async function evaluate(cdp, expression) {
  const result = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Browser evaluation failed");
  return result.result.value;
}

async function waitFor(cdp, expression, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (await evaluate(cdp, expression)) return;
    await delay(60);
  }
  throw new Error(`Timed out waiting for: ${expression}`);
}

async function screenshot(cdp, filename) {
  const capture = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  fs.writeFileSync(path.join(RESULTS, filename), Buffer.from(capture.data, "base64"));
}

async function run() {
  fs.mkdirSync(RESULTS, { recursive: true });
  assert.ok(fs.existsSync(CHROME), "Google Chrome is required for browser E2E tests");
  const server = await startStaticServer();
  const serverPort = server.address().port;
  const gameUrl = `http://127.0.0.1:${serverPort}/?test=1`;
  const debugPort = await freePort();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "sw-day-e2e-"));
  const chrome = spawn(CHROME, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--no-first-run",
    "--disable-default-apps",
    "--autoplay-policy=no-user-gesture-required",
    `--remote-debugging-port=${debugPort}`,
    "--remote-allow-origins=*",
    `--user-data-dir=${profile}`,
    "--window-size=1440,1000",
    gameUrl,
  ], { stdio: ["ignore", "pipe", "pipe"], windowsHide: true });

  let cdp;
  try {
    const target = await waitForTarget(debugPort, gameUrl);
    cdp = await connectCdp(target.webSocketDebuggerUrl);
    await cdp.send("Page.enable");
    await cdp.send("Runtime.enable");
    await cdp.send("Log.enable");
    await waitFor(cdp, "document.readyState === 'complete' && document.title === '社工的一日：當所有事情都很重要'");

    assert.equal(await evaluate(cdp, "document.title"), "社工的一日：當所有事情都很重要");
    assert.match(await evaluate(cdp, "document.querySelector('#game-title').textContent"), /當所有事情都很重要/);
    assert.equal(await evaluate(cdp, "document.querySelectorAll('#support-actions .support-button').length"), 4);

    await evaluate(cdp, "document.querySelector('#start-button').click()");
    await waitFor(cdp, "!document.querySelector('#screen-rules').hidden");
    assert.equal(await evaluate(cdp, "document.querySelectorAll('.competition-guide-grid p').length"), 3);
    await evaluate(cdp, "document.querySelector('#begin-level-button').click()");
    await waitFor(cdp, "state.running === true && !document.querySelector('#screen-game').hidden");

    const beforeSupport = await evaluate(cdp, "({ capacity: state.supportCapacity, life: state.metrics.life, caseRisk: state.metrics.case })");
    await evaluate(cdp, "document.querySelector('[data-support=\"supervisor\"]').click()");
    const afterSupport = await evaluate(cdp, "({ capacity: state.supportCapacity, life: state.metrics.life, caseRisk: state.metrics.case, status: state.supportLog[0].status })");
    assert.equal(afterSupport.capacity, beforeSupport.capacity - 1);
    assert.equal(afterSupport.status, "arrived");
    assert.ok(afterSupport.caseRisk < beforeSupport.caseRisk);

    await evaluate(cdp, "state.timeLeft = 43");
    await waitFor(cdp, "state.decisionOpen === true");
    assert.equal(await evaluate(cdp, "document.querySelectorAll('.decision-choice').length"), 3);
    await screenshot(cdp, "desktop-decision.png");
    const pausedAt = await evaluate(cdp, "state.timeLeft");
    await delay(250);
    const stillPausedAt = await evaluate(cdp, "state.timeLeft");
    assert.ok(Math.abs(pausedAt - stillPausedAt) < 0.02, "timer must pause while a decision is open");
    await evaluate(cdp, "document.querySelector('.decision-choice').click()");
    await waitFor(cdp, "state.decisionOpen === false && state.decisionLog.length === 1");

    await evaluate(cdp, "document.querySelector('[data-support=\"colleague\"]').click()");
    assert.equal(await evaluate(cdp, "state.pendingSupports.length"), 1);
    await waitFor(cdp, "state.supportLog.find(item => item.id === 'colleague')?.status === 'arrived'", 5000);
    assert.equal(await evaluate(cdp, "state.supportCapacity"), 0);

    await evaluate(cdp, "state.completed = level().kpiTarget; passLevel()");
    await waitFor(cdp, "!document.querySelector('#screen-result').hidden");
    assert.ok(await evaluate(cdp, "document.querySelector('#result-learning').textContent.includes('教育回饋')"));
    await evaluate(cdp, "document.querySelector('#restart-button').click()");
    await waitFor(cdp, "level().id === 2 && state.running");
    await evaluate(cdp, "state.completed = level().kpiTarget; passLevel()");
    await evaluate(cdp, "document.querySelector('#restart-button').click()");
    await waitFor(cdp, "level().id === 3 && state.running");
    await evaluate(cdp, "state.completed = level().kpiTarget; passLevel()");
    await waitFor(cdp, "document.querySelector('.result-card').classList.contains('is-final-clear') && !document.querySelector('#result-overlay').hidden");
    assert.equal(await evaluate(cdp, "document.querySelectorAll('#result-learning > section').length"), 4);
    assert.match(await evaluate(cdp, "document.querySelector('#result-learning').textContent"), /制度條件/);
    await screenshot(cdp, "desktop-final-result.png");

    await evaluate(cdp, "document.querySelector('#restart-button').click()");
    await waitFor(cdp, "level().id === 1 && state.running && journey.attempts === 0");
    await evaluate(cdp, "endGame('time')");
    await waitFor(cdp, "state.ended && !document.querySelector('#screen-result').hidden");
    await evaluate(cdp, "document.querySelector('#restart-button').click()");
    await waitFor(cdp, "level().id === 1 && state.running && !state.ended");

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
      screenWidth: 390,
      screenHeight: 844,
    });
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
    await cdp.send("Page.reload", { ignoreCache: true });
    await waitFor(cdp, "document.readyState === 'complete'");
    const portraitLayout = await evaluate(cdp, `(() => {
      const title = document.querySelector('#game-title').getBoundingClientRect();
      const subtitle = document.querySelector('.subtitle').getBoundingClientRect();
      return {
        viewport: window.innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
        title: { left: title.left, right: title.right },
        subtitle: { left: subtitle.left, right: subtitle.right },
      };
    })()`);
    assert.ok(portraitLayout.scrollWidth <= portraitLayout.viewport, "portrait home must not scroll horizontally");
    assert.ok(portraitLayout.title.left >= 0 && portraitLayout.title.right <= portraitLayout.viewport, "portrait title must fit viewport");
    assert.ok(portraitLayout.subtitle.left >= 0 && portraitLayout.subtitle.right <= portraitLayout.viewport, "portrait subtitle must fit viewport");
    await screenshot(cdp, "mobile-portrait-home.png");

    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width: 844,
      height: 390,
      deviceScaleFactor: 1,
      mobile: true,
      screenWidth: 844,
      screenHeight: 390,
    });
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 1 });
    await cdp.send("Page.reload", { ignoreCache: true });
    await waitFor(cdp, "document.readyState === 'complete'");
    await evaluate(cdp, "document.querySelector('#start-button').click(); document.querySelector('#begin-level-button').click()");
    await waitFor(cdp, "state.running === true && !document.querySelector('#screen-game').hidden");
    await evaluate(cdp, "window.dispatchEvent(new Event('resize')); updateStageScale()");
    assert.equal(await evaluate(cdp, "document.querySelector('#orientation-overlay').hidden"), true);
    assert.equal(await evaluate(cdp, "document.body.classList.contains('is-touch-layout')"), true);
    const scale = await evaluate(cdp, "Number(getComputedStyle(document.querySelector('#game-stage')).getPropertyValue('--stage-scale'))");
    assert.ok(scale > 0 && scale <= 1);
    await screenshot(cdp, "mobile-landscape-game.png");

    const browserErrors = cdp.events.filter(event =>
      event.method === "Runtime.exceptionThrown" ||
      (event.method === "Log.entryAdded" && event.params.entry.level === "error")
    );
    assert.deepEqual(browserErrors, []);

    const report = {
      title: "Chrome browser E2E",
      passed: 22,
      failed: 0,
      viewportChecks: ["1440x1000 desktop", "390x844 touch portrait", "844x390 touch landscape"],
      screenshots: ["desktop-decision.png", "desktop-final-result.png", "mobile-portrait-home.png", "mobile-landscape-game.png"],
    };
    console.log(JSON.stringify(report, null, 2));
  } finally {
    cdp?.close();
    chrome.kill();
    await Promise.race([
      new Promise(resolve => chrome.once("exit", resolve)),
      delay(2000),
    ]);
    await new Promise(resolve => server.close(resolve));
    try {
      fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch (error) {
      console.warn(`Temporary Chrome profile could not be removed: ${error.code}`);
    }
  }
}

run().catch(error => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
