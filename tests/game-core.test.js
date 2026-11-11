"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const core = require("../src/competition-core.js");

test("competition configuration is complete and internally valid", () => {
  assert.deepEqual(core.validateConfiguration(), []);
  assert.equal(core.DECISIONS.length, 3);
  assert.equal(Object.keys(core.SUPPORTS).length, 4);
  core.DECISIONS.forEach(event => assert.ok(event.choices.length >= 3));
});

test("one professional decision is offered per level and never repeats", () => {
  assert.equal(core.decisionFor(1, 50, []), null);
  const event = core.decisionFor(1, 43, []);
  assert.equal(event.id, "verify-before-scheduling");
  assert.equal(core.decisionFor(1, 30, [event.id]), null);
  assert.equal(core.decisionFor(2, 45, []).id, "crisis-and-appointment");
  assert.equal(core.decisionFor(3, 44, []).id, "deadline-and-service");
});

test("decision effects change state and remain within valid bounds", () => {
  const initial = { life: 2, case: 98, doc: 2, network: 95 };
  const result = core.applyMetricEffects(initial, { life: -8, case: 10, doc: -8, network: 20 });
  assert.deepEqual(result, { life: 0, case: 100, doc: 0, network: 100 });
  assert.deepEqual(initial, { life: 2, case: 98, doc: 2, network: 95 });
});

test("choices in each event create materially different consequences", () => {
  core.DECISIONS.forEach(event => {
    const signatures = event.choices.map(choice => JSON.stringify({ effects: choice.effects, spawn: choice.spawn }));
    assert.equal(new Set(signatures).size, event.choices.length, event.id);
  });
});

test("support resources include immediate and delayed mechanisms", () => {
  const delays = Object.values(core.SUPPORTS).map(item => item.delay);
  assert.ok(delays.some(delay => delay === 0));
  assert.ok(delays.some(delay => delay >= 3));
  assert.equal(core.SUPPORTS.colleague.special, "delegate");
  assert.equal(core.SUPPORTS.reschedule.special, "reschedule");
});

test("education feedback reports teamwork and unresolved limits without professional scoring", () => {
  const feedback = core.educationFeedback({
    supports: [{}, {}],
    decisions: [{}],
    unresolved: 3,
  });
  assert.match(feedback, /團隊|網絡/);
  assert.match(feedback, /無法消除|限制/);
  assert.doesNotMatch(feedback, /稱職|不專業/);
});

test("HTML wires the competition module, decision dialog, support panel, and result screen", () => {
  const root = path.resolve(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.ok(html.indexOf("src/competition-core.js") < html.indexOf("src/app.js"));
  ["decision-dialog", "decision-choices", "support-actions", "support-capacity", "screen-result"].forEach(id => {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  });
});

test("all locally referenced media assets exist", () => {
  const root = path.resolve(__dirname, "..");
  const files = [
    "assets/hero-social-worker-day.png",
    "assets/images/game-guide.png",
    "assets/images/social-worker-avatar.png",
    "assets/images/system-monster.png",
    "assets/audio/bgm.mp3",
  ];
  files.forEach(file => assert.ok(fs.existsSync(path.join(root, file)), file));
});
