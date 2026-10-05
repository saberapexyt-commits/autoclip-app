/* AutoClip website: theme, menu, scroll effects, and live release data (releases.json - the same file the desktop updater reads). */
(function () {
  "use strict";
  var doc = document.documentElement;
  doc.classList.add("js");

  /* ---- theme (the only thing we ever store in your browser: your light/dark choice) ---- */
  function applyTheme(t) { if (t) doc.setAttribute("data-theme", t); else doc.removeAttribute("data-theme"); }
  var saved = null; try { saved = localStorage.getItem("autoclip-theme"); } catch (e) {}
  applyTheme(saved);
  var tbtn = document.getElementById("themeBtn");
  if (tbtn) tbtn.addEventListener("click", function () {
    var cur = doc.getAttribute("data-theme") || (window.matchMedia && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    var next = cur === "light" ? "dark" : "light"; applyTheme(next); try { localStorage.setItem("autoclip-theme", next); } catch (e) {}
  });

  /* ---- mobile menu + header shadow ---- */
  var menuBtn = document.getElementById("menuBtn"), menu = document.getElementById("navlinks");
  if (menuBtn && menu) menuBtn.addEventListener("click", function () { var o = menu.classList.toggle("open"); menuBtn.setAttribute("aria-expanded", o); });
  var hdr = document.querySelector("header.site");
  function onScroll() { if (hdr) hdr.classList.toggle("scrolled", window.scrollY > 8); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  /* ---- reveal on scroll ---- */
  var els = [].slice.call(document.querySelectorAll(".reveal"));
  if ("IntersectionObserver" in window && !(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)) {
    var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.12 });
    els.forEach(function (e) { io.observe(e); });
  } else els.forEach(function (e) { e.classList.add("in"); });

  /* ---- docs: highlight the section being read ---- */
  var side = [].slice.call(document.querySelectorAll("nav.side a[href^='#']"));
  if (side.length && "IntersectionObserver" in window) {
    var map = {}; side.forEach(function (a) { map[a.getAttribute("href").slice(1)] = a; });
    var spy = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting && map[e.target.id]) { side.forEach(function (a) { a.classList.remove("on"); }); map[e.target.id].classList.add("on"); } }); }, { rootMargin: "-20% 0px -70% 0px" });
    Object.keys(map).forEach(function (id) { var t = document.getElementById(id); if (t) spy.observe(t); });
  }

  /* ---- which Windows is this? (shown on the download page) ---- */
  function detectOS() {
    var ua = navigator.userAgent || "", out = { windows: /Windows NT/.test(ua), label: "" };
    if (!out.windows) { out.label = /Mac/.test(ua) ? "macOS" : /Linux|X11/.test(ua) ? "Linux" : /Android|iPhone|iPad/.test(ua) ? "a mobile device" : "your system"; return Promise.resolve(out); }
    out.label = "Windows 10 / 11";
    if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) {
      return navigator.userAgentData.getHighEntropyValues(["platformVersion"]).then(function (v) {
        var major = parseInt((v.platformVersion || "0").split(".")[0], 10); out.label = major >= 13 ? "Windows 11" : "Windows 10"; return out;
      }).catch(function () { return out; });
    }
    return Promise.resolve(out);
  }
  detectOS().then(function (os) {
    document.querySelectorAll("[data-os]").forEach(function (n) { n.textContent = os.label; });
    document.querySelectorAll("[data-os-note]").forEach(function (n) { n.hidden = os.windows; });
    document.querySelectorAll("[data-os-ok]").forEach(function (n) { n.hidden = !os.windows; });
  });

  /* ---- live release data ---- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmtDate(d) { try { return new Date(d + "T12:00:00").toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); } catch (e) { return d; } }
  function asset(r) { return (r.assets || []).filter(function (a) { return a.platform === "windows-x64" && (a.kind || "installer") === "installer"; })[0]; }
  function mb(n) { return n >= 1e8 ? Math.round(n / 1e6) + " MB" : (n / 1e6).toFixed(1) + " MB"; }
  var base = document.documentElement.getAttribute("data-base") || "";
  fetch(base + "releases.json", { cache: "no-cache" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (m) {
    if (!m || !m.releases || !m.releases.length) return;
    var stable = m.releases.filter(function (r) { return (r.channel || "stable") === "stable"; });
    var latest = stable[0]; if (!latest) return; var a = asset(latest); if (!a) return;
    document.querySelectorAll("[data-fill]").forEach(function (n) {
      var k = n.getAttribute("data-fill");
      if (k === "version") n.textContent = latest.version;
      else if (k === "date") n.textContent = fmtDate(latest.date);
      else if (k === "size") n.textContent = mb(a.size);
      else if (k === "sha256") n.textContent = a.sha256;
      else if (k === "filename") n.textContent = a.filename;
      else if (k === "href") { n.setAttribute("href", a.url); n.removeAttribute("aria-disabled"); }
    });
    var tb = document.getElementById("allVersions");
    if (tb) tb.innerHTML = m.releases.map(function (r) {
      var x = asset(r); var beta = (r.channel || "stable") !== "stable";
      return "<tr><td><b>AutoClip " + esc(r.version) + "</b>" + (r === latest ? '<span class="badge">Latest</span>' : "") + (beta ? '<span class="badge beta">Beta</span>' : "") + "</td><td>" + esc(fmtDate(r.date)) + "</td><td>" + (x ? mb(x.size) : "") + "</td><td>" + (x ? '<a href="' + esc(x.url) + '">Download</a>' : "") + "</td></tr>";
    }).join("");
    var cl = document.getElementById("releaseList");
    if (cl) cl.innerHTML = m.releases.map(function (r) {
      return '<div class="rel"><h3>AutoClip ' + esc(r.version) + ((r.channel || "stable") !== "stable" ? '<span class="badge beta">Beta</span>' : "") + '</h3><div class="muted">' + esc(fmtDate(r.date)) + "</div><ul>" +
        (r.notes || []).map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul></div>";
    }).join("");
    var recent = document.getElementById("recentChanges");
    if (recent) recent.innerHTML = (latest.notes || []).slice(0, 6).map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("");
  }).catch(function () { /* keep the content that was baked into the page */ });

  /* ---- copy the checksum ---- */
  document.querySelectorAll("[data-copy]").forEach(function (b) {
    b.addEventListener("click", function () {
      var t = document.querySelector(b.getAttribute("data-copy")); if (!t) return;
      if (navigator.clipboard) navigator.clipboard.writeText(t.textContent.trim()).then(function () { var o = b.textContent; b.textContent = "Copied"; setTimeout(function () { b.textContent = o; }, 1500); });
    });
  });
})();
