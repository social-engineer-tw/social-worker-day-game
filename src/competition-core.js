(function initCompetitionCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.CompetitionCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCompetitionCore() {
  "use strict";

  const DECISIONS = [
    {
      id: "verify-before-scheduling",
      levelId: 1,
      triggerAt: 43,
      title: "資訊還不完整，但服務時段正在減少",
      context: "一位虛構服務使用者留下簡短訊息，需要生活支持；目前尚無法確認急迫程度。你仍有既定工作在進行。",
      note: "不同作法各有取捨；重點是保留查證、協作與後續追蹤的空間。",
      choices: [
        {
          id: "call-to-clarify",
          label: "先致電確認，再調整順序",
          rationale: "多花一些時間查證，降低資訊不足造成的風險。",
          effects: { case: -8, doc: 5, life: -3 },
          spawn: ["case"],
          outcome: "你取得較完整資訊並新增一項服務任務；行政紀錄稍後仍需補上。",
          theme: "專業判斷需要資訊，也需要為查證保留時間。",
        },
        {
          id: "hold-slot",
          label: "先保留時段，稍後回覆確認",
          rationale: "維持服務可近性，但不把初步訊息當成完整評估。",
          effects: { case: -4, doc: 3, life: -1 },
          spawn: ["doc"],
          outcome: "你先保留彈性時段，並建立一項待確認紀錄。",
          theme: "在資訊不足時，暫時安排也可以是一種風險管理。",
        },
        {
          id: "finish-current-first",
          label: "先完成手邊工作，再集中確認",
          rationale: "避免頻繁切換造成錯誤，但等待期間的不確定性會增加。",
          effects: { case: 6, doc: -5, life: 2 },
          spawn: [],
          outcome: "你完成既定紀錄，但服務端等待與不確定性上升。",
          theme: "維持工作品質與及時回應之間，常需要持續重新排序。",
        },
      ],
    },
    {
      id: "crisis-and-appointment",
      levelId: 2,
      triggerAt: 45,
      title: "臨時安全疑慮與既定會談同時出現",
      context: "網絡單位通報一項需儘快確認的安全疑慮；同時，另一位虛構服務使用者已在等候既定會談。",
      note: "安全工作通常是團隊與制度責任，不應由單一社工獨自承擔。",
      choices: [
        {
          id: "triage-and-contact",
          label: "先做初步分級並聯繫雙方",
          rationale: "先確認即時風險，同時向等候者說明並重新約定。",
          effects: { case: -10, doc: 9, network: 4, life: -4 },
          spawn: ["crisis", "doc"],
          outcome: "你完成初步分級並留下後續工作；溝通與紀錄負荷增加。",
          theme: "優先順序不是放棄另一方，而是透明說明與安排後續。",
        },
        {
          id: "supervisor-coordination",
          label: "請督導協助分工，再處理急迫事項",
          rationale: "啟動組織責任，讓既定服務與安全確認能並行。",
          effects: { case: -7, doc: 4, network: -5, life: 1 },
          spawn: ["crisis"],
          supportTag: "督導諮詢",
          outcome: "督導協助協調等候者與人力，你仍需完成安全確認。",
          theme: "求助不是能力不足，而是把風險帶回團隊共同承擔。",
        },
        {
          id: "keep-appointment-with-check",
          label: "維持會談，先請網絡確認即時安全",
          rationale: "維持原有服務關係，但仰賴網絡能及時回應。",
          effects: { case: 3, doc: -3, network: 10, life: -1 },
          spawn: ["network"],
          outcome: "既定會談持續進行；網絡協調與等待的不確定性上升。",
          theme: "跨網絡合作能分擔工作，也受到回應速度與權責限制。",
        },
      ],
    },
    {
      id: "deadline-and-service",
      levelId: 3,
      triggerAt: 44,
      title: "行政期限與持續服務發生衝突",
      context: "系統要求今日完成成果回報，但一項持續服務正需要較完整的討論；目前人力無法同時立即完成。",
      note: "這不是勤奮程度的測驗，而是有限資源下的工作安排。",
      choices: [
        {
          id: "protect-service-time",
          label: "保留服務時間，回報申請調整期限",
          rationale: "維持服務連續性，但須承擔行政追蹤與說明成本。",
          effects: { case: -8, doc: 14, network: 3, life: -3 },
          spawn: ["case", "doc"],
          outcome: "服務時間被保留；行政負荷與後續協調增加。",
          theme: "制度期限可以被討論，但需要組織支持與合理授權。",
        },
        {
          id: "split-into-minimum-safe-steps",
          label: "拆成最低必要步驟並安排追蹤",
          rationale: "同時維持基本服務與期限，但後續工作不會消失。",
          effects: { case: -3, doc: 4, network: 2, life: -5 },
          spawn: ["doc", "network"],
          outcome: "眼前兩項工作都有最低限度進展，後續待辦增加。",
          theme: "分段處理是務實策略，也反映人力不足造成的工作碎片化。",
        },
        {
          id: "request-team-reallocation",
          label: "請團隊重新分配行政與服務工作",
          rationale: "把衝突提升到組織層次，但支援可能需要等待。",
          effects: { case: -5, doc: -5, network: 7, life: 2 },
          spawn: ["network"],
          supportTag: "團隊分工",
          outcome: "團隊開始協調分工；在支援到位前仍有等待成本。",
          theme: "服務品質取決於人力配置，不只是個人效率。",
        },
      ],
    },
  ];

  const SUPPORTS = {
    supervisor: {
      label: "向督導諮詢",
      shortLabel: "督導",
      description: "立即整理優先順序，降低服務風險與行政負荷。",
      delay: 0,
      effects: { case: -7, doc: -5, life: 4 },
      constraint: "每關限用一次，且會占用有限支援量。",
    },
    colleague: {
      label: "請同事分工",
      shortLabel: "同事分工",
      description: "同事約 3 秒後接手一項非危機任務；若當時沒有合適任務，支援會改為降低負荷。",
      delay: 3,
      effects: { life: 3 },
      special: "delegate",
      constraint: "同事也有工作量，支援不會立即到位。",
    },
    network: {
      label: "啟動外部網絡",
      shortLabel: "外部網絡",
      description: "合作單位約 4 秒後回應，降低協作與服務風險。",
      delay: 4,
      effects: { case: -5, network: -10 },
      special: "extend-deadlines",
      constraint: "跨機構回應需要時間，無法取代本機構的人力。",
    },
    reschedule: {
      label: "調整工作安排",
      shortLabel: "重新排程",
      description: "延長非危機任務期限，恢復少量工作者狀態，但行政負荷上升。",
      delay: 0,
      effects: { doc: 6, life: 6 },
      special: "reschedule",
      constraint: "重新排程不會讓工作消失，只是爭取合理時間。",
    },
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function applyMetricEffects(metrics, effects, maxLife = 100) {
    const next = { ...metrics };
    Object.entries(effects || {}).forEach(([key, value]) => {
      if (!(key in next)) return;
      next[key] = clamp(next[key] + value, 0, key === "life" ? maxLife : 100);
    });
    return next;
  }

  function decisionFor(levelId, timeLeft, triggeredIds) {
    const seen = new Set(triggeredIds || []);
    return DECISIONS.find(event => event.levelId === levelId && timeLeft <= event.triggerAt && !seen.has(event.id)) || null;
  }

  function taskCategoryCounts(items) {
    return (items || []).reduce((counts, item) => {
      const type = item.type || "other";
      counts[type] = (counts[type] || 0) + 1;
      return counts;
    }, {});
  }

  function educationFeedback(summary) {
    const supports = summary.supports?.length || 0;
    const unresolved = summary.unresolved || 0;
    const decisions = summary.decisions?.length || 0;
    if (supports >= 2 && unresolved > 0) {
      return "你有運用團隊與網絡支援，但仍留下未完成需求。這反映支援能降低風險，卻無法消除人力、時間與制度期限的限制。";
    }
    if (decisions > 0 && supports === 0) {
      return "你做了多次優先順序判斷，但較少啟動支援。社工實務中的安全與服務品質，需要組織與網絡共同承擔，而非只靠個人撐住。";
    }
    if (unresolved === 0) {
      return "本次體驗完成了眼前任務；真實服務仍需持續追蹤、紀錄與跨專業合作，單次完成不代表需求已永久解決。";
    }
    return "本次體驗同時出現已完成與未處理工作。社工專業包含持續評估、透明溝通與重新排序，未完成不等同個人失職。";
  }

  function validateConfiguration() {
    const ids = DECISIONS.map(event => event.id);
    const uniqueIds = new Set(ids);
    const errors = [];
    if (uniqueIds.size !== ids.length) errors.push("decision ids must be unique");
    DECISIONS.forEach(event => {
      if (!event.levelId || !Number.isFinite(event.triggerAt)) errors.push(`${event.id}: invalid trigger`);
      if (!Array.isArray(event.choices) || event.choices.length < 2) errors.push(`${event.id}: needs at least two choices`);
      event.choices?.forEach(choice => {
        if (!choice.id || !choice.label || !choice.outcome || !choice.theme) errors.push(`${event.id}: incomplete choice`);
      });
    });
    Object.entries(SUPPORTS).forEach(([id, support]) => {
      if (!support.label || !Number.isFinite(support.delay) || !support.constraint) errors.push(`${id}: invalid support`);
    });
    return errors;
  }

  return {
    DECISIONS,
    SUPPORTS,
    applyMetricEffects,
    clamp,
    decisionFor,
    educationFeedback,
    taskCategoryCounts,
    validateConfiguration,
  };
});
