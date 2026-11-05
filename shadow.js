/* Shadow — PS4 Exploit Host
   Smart flow: auto-detect FW, auto-pick exploit, auto-launch GoldHEN.
   After jailbreak: show utility payload options. */

var EXPLOITS = [
  { id: "cssfontface", name: "CSSFontFace", desc: "WebKit UAF + Lapse kernel", fwMin: 600, fwMax: 1102, fwLabel: "6.00 – 11.02", runner: "exploits/cssfontface/", platform: "ps4" },
  { id: "psfree-lapse", name: "PSFree + Lapse", desc: "PSFree WebKit + Lapse kernel", fwMin: 700, fwMax: 960, fwLabel: "7.00 – 9.60", runner: "exploits/psfree-lapse/", platform: "ps4" },
  { id: "psfree900", name: "PSFree 9.00", desc: "PSFree + ChendoChap kernel", fwMin: 900, fwMax: 900, fwLabel: "9.00", runner: "exploits/psfree900/", platform: "ps4" },
  { id: "afterglow", name: "Afterglow", desc: "Afterglow WebKit + apm-UAF kernel", fwMin: 1100, fwMax: 1400, fwLabel: "11.00 – 14.00", runner: "exploits/afterglow/jb.html", platform: "ps4" },
];

var PAYLOADS = [
  { id: "goldhen", name: "GoldHEN", desc: "HEN + FTP + debug + cheats", file: "payloads/goldhen.bin", cat: "enabler", tag: "recommended" },
  { id: "hen", name: "PS4-HEN", desc: "Lightweight homebrew enabler", file: "payloads/hen.bin", cat: "enabler" },
  { id: "disable-updates", name: "Disable Updates", desc: "Block system update downloads", file: "payloads/disable-updates.bin", cat: "utility" },
  { id: "enable-updates", name: "Enable Updates", desc: "Restore system update downloads", file: "payloads/enable-updates.bin", cat: "utility" },
  { id: "fan-threshold", name: "Fan Threshold", desc: "Lower fan activation temperature", file: "payloads/fan-threshold.bin", cat: "utility" },
  { id: "disable-aslr", name: "Disable ASLR", desc: "Turn off address randomization", file: "payloads/disable-aslr.bin", cat: "utility" },
];

var STORE_KEY = "shadow.config";
var JB_KEY = "shadow.jailbroken";
var AUTOSTART_SECONDS = 5;

var detectedFW = null;
var detectedPlatform = null;
var selectedExploit = null;
var selectedPayload = "goldhen";
var isJailbroken = false;
var ticker = null;
var showAdvanced = false;

function parseFW(ua) {
  var m5 = (ua || "").match(/PlayStation\s+5[\/ ](\d+)\.(\d+)/);
  if (m5) {
    detectedPlatform = "ps5";
    return parseInt(m5[1], 10) * 100 + parseInt(m5[2], 10);
  }
  var m = (ua || "").match(/PlayStation\s+4[\/ ](\d+)\.(\d+)/);
  if (!m) return null;
  detectedPlatform = "ps4";
  return parseInt(m[1], 10) * 100 + parseInt(m[2], 10);
}

function fwString(fw) {
  if (fw === null) return "??";
  var major = Math.floor(fw / 100);
  var minor = fw % 100;
  return major + "." + (minor < 10 ? "0" : "") + minor;
}

function fwInRange(fw, ex) {
  return fw >= ex.fwMin && fw <= ex.fwMax;
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({
      exploit: selectedExploit,
      payload: selectedPayload,
    }));
  } catch (e) {}
}

function restore() {
  try {
    var s = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (!s) return;
    if (s.exploit) selectedExploit = s.exploit;
    if (s.payload) selectedPayload = s.payload;
  } catch (e) {}
}

function checkJailbroken() {
  try {
    var ts = sessionStorage.getItem(JB_KEY);
    if (ts) {
      isJailbroken = true;
    }
  } catch (e) {}
}

function bestExploit() {
  if (detectedFW === null) return null;
  for (var i = EXPLOITS.length - 1; i >= 0; i--) {
    if (fwInRange(detectedFW, EXPLOITS[i])) return EXPLOITS[i].id;
  }
  return null;
}

/* ---- rendering ---- */

function renderStatus() {
  var el = document.getElementById("fw-detect");
  if (!el) return;

  var platformTag = detectedPlatform === "ps5" ? "PS5 " : "";
  if (isJailbroken) {
    el.className = "fw-indicator jailbroken";
    el.innerHTML = '<span class="fw-dot"></span><span class="fw-label">Jailbroken' +
      (detectedFW !== null ? ' · ' + platformTag + 'FW ' + fwString(detectedFW) : '') + '</span>';
  } else if (detectedFW !== null) {
    el.className = "fw-indicator detected";
    el.innerHTML = '<span class="fw-dot"></span><span class="fw-label">' + platformTag + 'FW <span class="fw-ver">' + fwString(detectedFW) + '</span></span>';
  } else {
    el.className = "fw-indicator";
    el.innerHTML = '<span class="fw-dot"></span><span class="fw-label">manual mode</span>';
  }
}

function renderPS5View(zone) {
  var info = document.createElement("div");
  info.className = "auto-info";
  info.innerHTML = '<span class="auto-label" style="color:#0a84ff">PS5 Detected</span>' +
    '<span class="auto-value">Firmware ' + fwString(detectedFW) + '</span>';
  zone.appendChild(info);

  var status = document.createElement("div");
  status.className = "auto-info";
  status.style.marginTop = "8px";

  if (detectedFW !== null && detectedFW <= 751) {
    status.innerHTML =
      '<span class="auto-label" style="color:#30d158">Exploitable Firmware</span>' +
      '<div style="margin-top:8px;font:400 13px/1.6 var(--font);color:var(--secondary)">' +
      'Your PS5 firmware is in the exploitable range.<br>' +
      'PS5 kernel exploit support is being developed.<br>' +
      'WebKit userland access is available.' +
      '</div>';
  } else if (detectedFW !== null && detectedFW <= 900) {
    status.innerHTML =
      '<span class="auto-label" style="color:#ff9f0a">Partial Support</span>' +
      '<div style="margin-top:8px;font:400 13px/1.6 var(--font);color:var(--secondary)">' +
      'Your PS5 firmware may have WebKit vulnerabilities.<br>' +
      'Full kernel exploit is not yet available for this version.<br>' +
      'Stay on this firmware for future support.' +
      '</div>';
  } else {
    status.innerHTML =
      '<span class="auto-label" style="color:#ff453a">Firmware Too High</span>' +
      '<div style="margin-top:8px;font:400 13px/1.6 var(--font);color:var(--secondary)">' +
      'No public exploit is available for PS5 FW ' + fwString(detectedFW) + ' yet.<br>' +
      'Do not update your console — stay on the lowest firmware possible.' +
      '</div>';
  }
  zone.appendChild(status);

  var roadmap = document.createElement("div");
  roadmap.className = "auto-info";
  roadmap.style.marginTop = "8px";
  roadmap.innerHTML =
    '<span class="auto-label">PS5 Roadmap</span>' +
    '<div style="margin-top:8px;font:400 12px/1.7 var(--font);color:var(--secondary)">' +
    '&#10003; PS5 firmware detection<br>' +
    '&#9744; WebKit exploit integration<br>' +
    '&#9744; Kernel exploit (FW 1.00 – 7.51)<br>' +
    '&#9744; PS5 HEN / homebrew enabler<br>' +
    '&#9744; Payload manager' +
    '</div>';
  zone.appendChild(roadmap);
}

function renderMainAction() {
  var zone = document.getElementById("main-action");
  if (!zone) return;
  zone.innerHTML = "";

  if (detectedPlatform === "ps5") {
    renderPS5View(zone);
    return;
  }

  if (isJailbroken) {
    renderJailbrokenView(zone);
    return;
  }

  if (!showAdvanced && selectedExploit && selectedPayload) {
    var info = document.createElement("div");
    info.className = "auto-info";

    var ex = getExploit(selectedExploit);
    var pl = getPayload(selectedPayload);

    info.innerHTML = '<span class="auto-label">Auto-selected</span>' +
      '<span class="auto-value">' + (ex ? ex.name : "") + ' + ' + (pl ? pl.name : "") + '</span>';
    zone.appendChild(info);

    var btn = document.createElement("button");
    btn.className = "go-btn";
    btn.id = "start-btn";
    btn.textContent = "Jailbreak";
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      startExploit();
    });
    zone.appendChild(btn);

    var countdown = document.createElement("div");
    countdown.className = "countdown";
    countdown.id = "status";
    zone.appendChild(countdown);

    var advBtn = document.createElement("button");
    advBtn.className = "adv-btn";
    advBtn.textContent = "Advanced options";
    advBtn.addEventListener("click", function () {
      showAdvanced = true;
      renderAll();
    });
    zone.appendChild(advBtn);

  } else {
    renderAdvanced(zone);
  }
}

function checkPayloadExists(file, cb) {
  try {
    var xhr = new XMLHttpRequest();
    xhr.open("HEAD", file, true);
    xhr.onload = function () { cb(xhr.status >= 200 && xhr.status < 300); };
    xhr.onerror = function () { cb(false); };
    xhr.send();
  } catch (e) { cb(false); }
}

function renderJailbrokenView(zone) {
  var info = document.createElement("div");
  info.className = "auto-info";
  info.innerHTML = '<span class="auto-label" style="color:#30d158">GoldHEN Active</span>' +
    '<span class="auto-value">Your PS4 is jailbroken</span>';
  zone.appendChild(info);

  var features = document.createElement("div");
  features.className = "auto-info";
  features.style.marginTop = "8px";
  features.style.textAlign = "left";
  features.innerHTML =
    '<span class="auto-label">Available now</span>' +
    '<div style="margin-top:8px;font:400 12px/1.6 var(--font);color:var(--secondary)">' +
    '&#10003; FTP server (port 2121)<br>' +
    '&#10003; Debug settings enabled<br>' +
    '&#10003; Package installer ready<br>' +
    '&#10003; Cheats / plugin support' +
    '</div>';
  zone.appendChild(features);

  var enablers = [];
  var utilities = [];
  for (var j = 0; j < PAYLOADS.length; j++) {
    if (PAYLOADS[j].cat === "utility") {
      utilities.push(PAYLOADS[j]);
    } else {
      enablers.push(PAYLOADS[j]);
    }
  }

  if (utilities.length > 0) {
    var utilPanel = document.createElement("div");
    utilPanel.className = "auto-info";
    utilPanel.style.marginTop = "8px";
    utilPanel.innerHTML = '<span class="auto-label">Utility Payloads</span>';
    var utilList = document.createElement("div");
    utilList.style.marginTop = "8px";

    for (var u = 0; u < utilities.length; u++) {
      (function (pl) {
        var plBtn = document.createElement("button");
        plBtn.className = "go-btn";
        plBtn.style.cssText = "margin-top:6px;padding:14px 16px;font-size:14px";
        plBtn.textContent = pl.name + " — " + pl.desc;
        plBtn.setAttribute("data-id", pl.id);
        plBtn.addEventListener("click", function (e) {
          e.preventDefault();
          sendPayload(pl.file, this);
        });
        utilList.appendChild(plBtn);
      })(utilities[u]);
    }
    utilPanel.appendChild(utilList);
    zone.appendChild(utilPanel);
  }

  if (enablers.length > 0) {
    var enPanel = document.createElement("div");
    enPanel.className = "auto-info";
    enPanel.style.marginTop = "8px";
    enPanel.innerHTML = '<span class="auto-label">Re-run Jailbreak</span>';
    var enList = document.createElement("div");
    enList.style.marginTop = "8px";

    for (var e2 = 0; e2 < enablers.length; e2++) {
      (function (pl) {
        var plBtn = document.createElement("button");
        plBtn.className = "go-btn";
        plBtn.style.cssText = "margin-top:6px;padding:14px 16px;font-size:14px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15)";
        plBtn.textContent = pl.name + " — " + pl.desc;
        plBtn.setAttribute("data-id", pl.id);
        plBtn.addEventListener("click", function (e) {
          e.preventDefault();
          selectedPayload = this.getAttribute("data-id");
          save();
          startExploit();
        });
        enList.appendChild(plBtn);
      })(enablers[e2]);
    }
    enPanel.appendChild(enList);
    zone.appendChild(enPanel);
  }

  var resetBtn = document.createElement("button");
  resetBtn.className = "adv-btn";
  resetBtn.textContent = "Clear jailbroken status";
  resetBtn.addEventListener("click", function () {
    try { sessionStorage.removeItem(JB_KEY); } catch (e) {}
    isJailbroken = false;
    renderAll();
  });
  zone.appendChild(resetBtn);
}

function renderAdvanced(zone) {
  var panels = document.createElement("div");
  panels.className = "panels";

  var exPanel = document.createElement("section");
  exPanel.className = "panel";
  var exHead = document.createElement("h2");
  exHead.className = "panel-heading";
  exHead.textContent = "Exploit";
  exPanel.appendChild(exHead);
  var exList = document.createElement("div");
  exList.id = "exploit-list";
  exList.className = "option-list";
  exPanel.appendChild(exList);
  panels.appendChild(exPanel);

  var plPanel = document.createElement("section");
  plPanel.className = "panel";
  var plHead = document.createElement("h2");
  plHead.className = "panel-heading";
  plHead.textContent = "Payload";
  plPanel.appendChild(plHead);
  var plList = document.createElement("div");
  plList.id = "payload-list";
  plList.className = "option-list";
  plPanel.appendChild(plList);
  panels.appendChild(plPanel);

  zone.appendChild(panels);

  renderExploits();
  renderPayloads();

  var actionBar = document.createElement("div");
  actionBar.className = "action-bar";

  var btn = document.createElement("button");
  btn.className = "go-btn";
  btn.id = "start-btn";
  btn.disabled = !selectedExploit || !selectedPayload;
  btn.textContent = isJailbroken ? "Send Payload" : "Launch";
  btn.addEventListener("click", function (e) {
    e.preventDefault();
    startExploit();
  });
  actionBar.appendChild(btn);

  var countdown = document.createElement("div");
  countdown.className = "countdown";
  countdown.id = "status";
  actionBar.appendChild(countdown);

  zone.appendChild(actionBar);
}

function renderExploits() {
  var container = document.getElementById("exploit-list");
  if (!container) return;
  container.innerHTML = "";

  for (var i = 0; i < EXPLOITS.length; i++) {
    var ex = EXPLOITS[i];
    var available = detectedFW === null || fwInRange(detectedFW, ex);

    var card = document.createElement("label");
    card.className = "card" + (selectedExploit === ex.id ? " selected" : "") + (!available ? " disabled" : "");

    var radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "exploit";
    radio.value = ex.id;
    if (selectedExploit === ex.id) radio.checked = true;

    var header = document.createElement("div");
    header.className = "card-header";

    var nameEl = document.createElement("span");
    nameEl.className = "card-name";
    nameEl.textContent = ex.name;
    header.appendChild(nameEl);

    var fwBadge = document.createElement("span");
    fwBadge.className = "card-badge badge-fw";
    fwBadge.textContent = ex.fwLabel;
    header.appendChild(fwBadge);

    var desc = document.createElement("div");
    desc.className = "card-desc";
    desc.textContent = ex.desc;

    card.appendChild(radio);
    card.appendChild(header);
    card.appendChild(desc);
    container.appendChild(card);
  }

  container.addEventListener("change", function (e) {
    if (e.target.name === "exploit") {
      selectedExploit = e.target.value;
      renderExploits();
      var btn = document.getElementById("start-btn");
      if (btn) btn.disabled = !selectedExploit || !selectedPayload;
      save();
    }
  });
}

function renderPayloads() {
  var container = document.getElementById("payload-list");
  if (!container) return;
  container.innerHTML = "";

  for (var j = 0; j < PAYLOADS.length; j++) {
    var pl = PAYLOADS[j];

    var card = document.createElement("label");
    card.className = "card" + (selectedPayload === pl.id ? " selected" : "");

    var radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "payload";
    radio.value = pl.id;
    if (selectedPayload === pl.id) radio.checked = true;

    var header = document.createElement("div");
    header.className = "card-header";

    var nameEl = document.createElement("span");
    nameEl.className = "card-name";
    nameEl.textContent = pl.name;
    header.appendChild(nameEl);

    if (pl.tag) {
      var tagBadge = document.createElement("span");
      tagBadge.className = "card-badge badge-ok";
      tagBadge.textContent = pl.tag;
      header.appendChild(tagBadge);
    }

    var desc = document.createElement("div");
    desc.className = "card-desc";
    desc.textContent = pl.desc;

    card.appendChild(radio);
    card.appendChild(header);
    card.appendChild(desc);
    container.appendChild(card);
  }

  container.addEventListener("change", function (e) {
    if (e.target.name === "payload") {
      selectedPayload = e.target.value;
      renderPayloads();
      var btn = document.getElementById("start-btn");
      if (btn) btn.disabled = !selectedExploit || !selectedPayload;
      save();
    }
  });
}

function renderAll() {
  renderStatus();
  renderMainAction();
}

/* ---- actions ---- */

function getExploit(id) {
  for (var i = 0; i < EXPLOITS.length; i++) {
    if (EXPLOITS[i].id === id) return EXPLOITS[i];
  }
  return null;
}

function getPayload(id) {
  for (var i = 0; i < PAYLOADS.length; i++) {
    if (PAYLOADS[i].id === id) return PAYLOADS[i];
  }
  return null;
}

function showPayloadOk(btn, origText) {
  btn.textContent = "[OK] " + origText;
  btn.style.borderColor = "rgba(48,209,88,0.5)";
  btn.style.background = "rgba(48,209,88,0.12)";
  btn.style.opacity = "1";
  btn.disabled = false;
}

function showPayloadFail(btn, origText, msg) {
  btn.textContent = "[FAIL] " + (msg || "unknown");
  btn.style.borderColor = "rgba(255,69,58,0.5)";
  btn.style.background = "rgba(255,69,58,0.12)";
  btn.style.opacity = "1";
  btn.disabled = false;
  setTimeout(function () {
    btn.textContent = origText;
    btn.style.borderColor = "";
    btn.style.background = "";
  }, 5000);
}

function sendPayloadDirect(file, btn, origText) {
  var fetchXhr = new XMLHttpRequest();
  fetchXhr.open("GET", file, true);
  fetchXhr.responseType = "arraybuffer";
  fetchXhr.onload = function () {
    if (fetchXhr.status < 200 || fetchXhr.status >= 300) {
      showPayloadFail(btn, origText, "cached file missing");
      return;
    }
    var data = fetchXhr.response;
    var sendXhr = new XMLHttpRequest();
    sendXhr.open("POST", "/api/send-payload-bin", true);
    sendXhr.timeout = 10000;
    sendXhr.setRequestHeader("Content-Type", "application/octet-stream");
    sendXhr.onload = function () {
      try {
        var r = JSON.parse(sendXhr.responseText);
        if (r.ok) { showPayloadOk(btn, origText); }
        else { showPayloadFail(btn, origText, r.error || "send failed"); }
      } catch (e) { showPayloadFail(btn, origText, "bad response"); }
    };
    sendXhr.onerror = function () { showPayloadFail(btn, origText, "server unreachable"); };
    sendXhr.ontimeout = function () { showPayloadFail(btn, origText, "timeout"); };
    sendXhr.send(new Uint8Array(data));
  };
  fetchXhr.onerror = function () { showPayloadFail(btn, origText, "payload not cached"); };
  fetchXhr.send();
}

function sendPayload(file, btn) {
  var origText = btn.textContent;
  btn.textContent = "Sending...";
  btn.disabled = true;
  btn.style.opacity = "0.6";
  try {
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/send-payload", true);
    xhr.timeout = 10000;
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.onload = function () {
      try {
        var r = JSON.parse(xhr.responseText);
        if (r.ok) { showPayloadOk(btn, origText); }
        else {
          if (r.error && r.error.indexOf("not found") !== -1) {
            sendPayloadDirect(file, btn, origText);
          } else {
            showPayloadFail(btn, origText, r.error || "unknown");
          }
        }
      } catch (e) {
        btn.textContent = "[ERROR] Bad response";
        btn.style.opacity = "1";
        btn.disabled = false;
        setTimeout(function () { btn.textContent = origText; }, 5000);
      }
    };
    xhr.onerror = function () {
      sendPayloadDirect(file, btn, origText);
    };
    xhr.ontimeout = function () {
      sendPayloadDirect(file, btn, origText);
    };
    xhr.send(JSON.stringify({ file: file }));
  } catch (e) {
    btn.textContent = origText;
    btn.style.opacity = "1";
    btn.disabled = false;
  }
}

function startExploit() {
  stopClock();
  var ex = getExploit(selectedExploit);
  var pl = getPayload(selectedPayload);
  if (!ex || !pl) return;

  var url;
  if (ex.id === "afterglow") {
    if (pl.id === "goldhen") {
      url = "exploits/afterglow/jb.html?log=1&afterglow=run&mode=goldhen&shadow=1";
    } else {
      url = "exploits/afterglow/jb.html?log=1&afterglow=run&payload=" + encodeURIComponent(pl.file) + "&shadow=1";
    }
  } else {
    url = ex.runner + "?payload=" + encodeURIComponent(pl.file) + "&shadow=1";
  }

  location.href = url;
}

function stopClock() {
  if (ticker !== null) {
    clearInterval(ticker);
    ticker = null;
  }
  var el = document.getElementById("status");
  if (el) el.textContent = "";
}

function startClock() {
  var left = AUTOSTART_SECONDS;
  var el = document.getElementById("status");
  if (el) el.textContent = "launching in " + left + "s…";
  ticker = setInterval(function () {
    left -= 1;
    if (left <= 0) { startExploit(); return; }
    if (el) el.textContent = "launching in " + left + "s…";
  }, 1000);
}

/* ---- init ---- */

function init() {
  detectedFW = parseFW(navigator.userAgent);
  restore();
  checkJailbroken();

  if (!selectedPayload) selectedPayload = "goldhen";
  if (!selectedExploit) {
    var best = bestExploit();
    if (best) selectedExploit = best;
  }

  renderAll();

  if (detectedFW !== null && selectedExploit && selectedPayload && !isJailbroken) {
    startClock();
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
