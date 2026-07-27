const STORE_KEY = "staati-presentation-settings";
const HOSTED_EXPORT_URL = "https://staati.vercel.app/";
const { slides, brand } = window.STAATI_PRESENTATION;
const DEFAULT_LOGOS = {
  light: "assets/brand/logo-black.svg",
  dark: "assets/brand/logo-white.svg",
};

const state = {
  lang: "en",
  current: 0,
  presentation: false,
  thumbsOpen: false,
  controlsHidden: false,
  exporting: false,
  exportQuality: "normal",
  settingsOpen: false,
  exportModal: null,
  pendingAutoExport: false,
  settings: {
    organizationName: brand.organizationName,
    presenterName: brand.presenterName,
    companyName: brand.companyName,
    website: brand.website,
    email: brand.email,
    phone: brand.phone,
    accentColor: brand.accentColor,
    logoData: "",
    targetLogoData: "",
    confidential: true,
    slideNumbers: true,
  },
};

let hideControlsTimer = null;
let touchStartX = 0;
let touchStartY = 0;
const assetDataUrlCache = new Map();

const app = document.getElementById("app");
const exportRoot = document.getElementById("export-root");

slides.forEach((slide, index) => {
  slide.number = index + 1;
});

function t(value) {
  if (!value) return "";
  if (typeof value === "string") return value;
  return value[state.lang] || value.en || "";
}

function list(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return value[state.lang] || value.en || [];
}

function pad(num) {
  return String(num).padStart(2, "0");
}

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    Object.assign(state.settings, saved.settings || {});
    if (saved.lang) state.lang = saved.lang;
    if (saved.exportQuality) state.exportQuality = saved.exportQuality;
  } catch {
    localStorage.removeItem(STORE_KEY);
  }
}

function saveSettings() {
  localStorage.setItem(
    STORE_KEY,
    JSON.stringify({ settings: state.settings, lang: state.lang, exportQuality: state.exportQuality })
  );
}

function brandLogo(className = "", tone = "dark") {
  if (state.settings.logoData) {
    return `<img src="${state.settings.logoData}" alt="STAATI" class="${className}" />`;
  }
  return `<img src="${assetUrl(DEFAULT_LOGOS[tone] || DEFAULT_LOGOS.dark)}" alt="STAATI" class="${className}" />`;
}

function targetLogo() {
  if (!state.settings.targetLogoData) return "";
  return `<img src="${state.settings.targetLogoData}" alt="${escapeHtml(state.settings.organizationName)}" class="max-h-[58px] max-w-[170px] object-contain" />`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function assetUrl(src) {
  if (!src) return "";
  const embedded = embeddedAssetUrl(src);
  if (embedded) return embedded;
  if (/^(data:|blob:|https?:|file:)/i.test(src)) return src;
  return new URL(src, location.href).href;
}

function embeddedAssetUrl(src) {
  const data = window.STAATI_SCREENSHOT_DATA || {};
  if (data[src]) return data[src];
  try {
    const path = new URL(src, location.href).pathname.replace(/^\/+/, "");
    return data[path] || "";
  } catch {
    return "";
  }
}

function splitLines(text) {
  return escapeHtml(text).replaceAll("\n", "<br />");
}

function icon(name, size = 18) {
  return `<i data-lucide="${name}" style="width:${size}px;height:${size}px"></i>`;
}

function brandChrome(slide) {
  const tone = slide.theme === "light" ? "light" : "dark";
  return `
    <div class="brand-marker">
      <span class="staati-dot"></span>
      ${brandLogo("max-h-[42px] max-w-[230px] object-contain", tone)}
    </div>
    ${state.settings.slideNumbers ? `<div class="slide-number">P. ${pad(slide.number)} / ${pad(slides.length)}</div>` : ""}
  `;
}

function sectionLabel(slide) {
  return `<div class="section-label">${escapeHtml(t(slide.label) || `No. ${pad(slide.number)}`)}</div>`;
}

function renderSlide(slide, exportMode = false) {
  const exportClass = exportMode ? " exporting export-freeze" : "";
  return `
    <article class="slide-canvas slide-${slide.theme} grid-bg${exportClass}" data-slide-id="${slide.id}" lang="${state.lang}" dir="${state.lang === "ar" ? "rtl" : "ltr"}">
      ${brandChrome(slide)}
      ${renderSlideType(slide)}
    </article>
  `;
}

function renderSlideType(slide) {
  const map = {
    cover: renderCover,
    timeline: renderTimelineSlide,
    fragmented: renderFragmented,
    bullets: renderBullets,
    statement: renderStatement,
    journey: renderJourney,
    layers: renderLayers,
    coachDashboard: renderCoachDashboard,
    dashboardFeature: renderDashboardFeature,
    athlete: renderAthlete,
    workspace: renderWorkspace,
    checkins: renderCheckins,
    programs: renderPrograms,
    gates: renderGates,
    communication: renderCommunication,
    benefits: renderBenefits,
    organizations: renderOrganizations,
    enterprise: renderEnterprise,
    pilot: renderPilot,
    closing: renderClosing,
  };
  return (map[slide.type] || renderStatement)(slide);
}

function renderCover(slide) {
  return `
    <div class="orbital"></div>
    <div class="slide-content flex flex-col justify-between">
      <div class="flex items-center justify-between">
        ${sectionLabel(slide)}
        <div>${targetLogo()}</div>
      </div>
      <div class="max-w-[980px]">
        <div class="w-[520px] max-w-[48vw]">${brandLogo("w-full h-auto object-contain", "dark")}</div>
        <div class="mt-[34px] h-px w-[320px] bg-white/20"></div>
        <p class="mt-[38px] text-[clamp(20px,2.1vw,42px)] font-semibold leading-tight">${splitLines(t(slide.subtitle))}</p>
        <p class="slide-subtitle whitespace-pre-line">${splitLines(t(slide.body))}</p>
      </div>
      <div class="flex items-end justify-between text-[clamp(10px,0.75vw,16px)] uppercase tracking-[0.12em] text-white/45">
        <span>${state.settings.confidential ? escapeHtml(t(slide.notes)) : ""}</span>
        <span>${escapeHtml(state.settings.organizationName)}</span>
      </div>
    </div>
  `;
}

function renderTimelineSlide(slide) {
  return `
    <div class="slide-content flex flex-col justify-center">
      <div class="mx-auto w-full max-w-[1220px] text-center">
        <h2 class="slide-title mx-auto max-w-[1180px]">${splitLines(t(slide.title))}</h2>
        <p class="slide-subtitle mx-auto max-w-[920px]">${splitLines(t(slide.subtitle))}</p>
      </div>
      <div class="timeline mt-[96px]" style="--items:${list(slide.bullets).length}">
        ${list(slide.bullets).map((item, index) => `
          <div class="timeline-item ${index === 4 ? "text-white" : "text-white/58"}">
            <span class="timeline-dot ${index === 4 ? "scale-125 shadow-[0_0_36px_rgba(82,108,244,.88)]" : ""}"></span>
            <span>${escapeHtml(item)}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderFragmented(slide) {
  const items = list(slide.bullets);
  const waveform = [12, 22, 14, 34, 18, 46, 26, 58, 20, 42, 16, 30, 24, 52, 18, 38, 14, 28, 20, 44, 16, 32, 12, 24];
  return `
    <div class="slide-content grid grid-cols-[1.05fr_.95fr] gap-[5%] items-center">
      <div>
        ${sectionLabel(slide)}
        <h2 class="slide-title mt-[34px]">${splitLines(t(slide.title))}</h2>
        <p class="mt-[58px] text-[clamp(24px,2.5vw,54px)] font-bold leading-tight">${splitLines(t(slide.body))}</p>
      </div>
      <div class="relative h-[70%]">
        ${items.map((item, index) => `
          <div class="panel absolute px-[22px] py-[16px] text-[clamp(11px,1vw,19px)] font-bold"
            style="inset-inline-start:${(index % 3) * 28 + (index % 2) * 8}%; top:${Math.floor(index / 3) * 25 + (index % 2) * 6}%">
            ${icon(["message-circle", "table-2", "file-text", "clipboard", "mail", "sticky-note", "phone", "image"][index], 18)}
            <span class="ms-2">${escapeHtml(item)}</span>
          </div>
        `).join("")}
        <div class="voice-memo-wave" aria-hidden="true">
          ${waveform.map((height) => `<span style="height:${height}px"></span>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderBullets(slide) {
  return `
    <div class="slide-content grid grid-cols-[.92fr_1.08fr] gap-[7%] items-center">
      <div>
        ${sectionLabel(slide)}
        <h2 class="slide-title mt-[34px]">${splitLines(t(slide.title))}</h2>
      </div>
      <div class="grid gap-[18px]">
        ${list(slide.bullets).map((item, index) => `
          <div class="panel flex gap-[18px] items-start p-[22px]">
            <span class="text-staati-blue font-bold">${pad(index + 1)}</span>
            <span class="text-[clamp(13px,1.1vw,22px)] leading-snug">${escapeHtml(item)}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderStatement(slide) {
  return `
    <div class="orbital !w-[36%] !top-[18%] opacity-80"></div>
    <div class="slide-content grid grid-cols-[1fr_.7fr] gap-[6%] items-center">
      <div>
        ${sectionLabel(slide)}
        <h2 class="slide-title mt-[34px]">${splitLines(t(slide.title))}</h2>
        <p class="slide-subtitle">${splitLines(t(slide.body))}</p>
      </div>
      <div class="panel p-[30px]">
        <div class="blue-line mb-[28px]"></div>
        ${["Athlete", "Physio", "Doctor", "Coach", "Club"].map((x, i) => `
          <div class="flex items-center justify-between border-b border-white/10 py-[18px]">
            <span class="muted">${pad(i + 1)}</span><span>${x}</span><span class="staati-dot"></span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderJourney(slide) {
  return `
    <div class="slide-content flex flex-col justify-center">
      ${sectionLabel(slide)}
      <h2 class="slide-title mt-[28px] max-w-[1220px]">${splitLines(t(slide.title))}</h2>
      <div class="mt-[58px] grid grid-cols-5 gap-[14px]">
        ${list(slide.bullets).map((item, index) => `
          <div class="panel min-h-[118px] p-[18px] flex flex-col justify-between">
            <span class="text-staati-blue text-[clamp(11px,.8vw,16px)] font-bold">${pad(index + 1)}</span>
            <span class="text-[clamp(13px,1.05vw,20px)] font-semibold leading-snug">${escapeHtml(item)}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderLayers(slide) {
  return `
    <div class="slide-content flex flex-col justify-center">
      ${sectionLabel(slide)}
      <h2 class="slide-title mt-[30px] max-w-[1060px]">${splitLines(t(slide.title))}</h2>
      <div class="mt-[54px] grid grid-cols-3 gap-[22px] items-end">
        ${list(slide.bullets).map((item, index) => `
          <div class="panel h-[260px] p-[24px] flex flex-col justify-between">
            <div class="flex justify-between items-start"><span class="text-staati-blue font-bold">${pad(index + 1)}</span>${icon(["smartphone", "stethoscope", "layout-dashboard"][index], 34)}</div>
            <strong class="text-[clamp(18px,1.55vw,32px)] leading-tight">${escapeHtml(item)}</strong>
          </div>
        `).join("")}
      </div>
      <div class="mx-auto mt-[34px] w-[54%] border border-staati-blue/50 bg-staati-blue/10 p-[20px] text-center text-[clamp(15px,1.2vw,24px)] font-bold text-staati-blue">${escapeHtml(t(slide.notes))}</div>
    </div>
  `;
}

function renderCoachDashboard(slide) {
  return `
    <div class="slide-content grid grid-cols-[.78fr_1.22fr] gap-[5%] items-center">
      <div>
        ${sectionLabel(slide)}
        <h2 class="slide-title mt-[34px]">${splitLines(t(slide.title))}</h2>
        <p class="slide-subtitle">${splitLines(t(slide.body))}</p>
        <div class="mt-[30px] grid gap-[10px]">
          ${list(slide.bullets).map((item, index) => `
            <div class="panel p-[14px] flex items-center gap-[14px]">
              <span class="text-staati-blue font-bold">${pad(index + 1)}</span>
              <span class="text-[clamp(12px,.92vw,18px)] font-semibold">${escapeHtml(item)}</span>
            </div>
          `).join("")}
        </div>
      </div>
      <div class="dashboard-shot hero-shot">
        <img src="${assetUrl(slide.image)}" alt="${escapeHtml(t(slide.alt) || t(slide.title))}" />
      </div>
    </div>
  `;
}

function renderDashboardFeature(slide) {
  const shots = slide.images || [];
  const imageCount = shots.length;
  return `
    <div class="slide-content flex flex-col justify-center">
      <div class="grid grid-cols-[.82fr_1.18fr] gap-[5%] items-end">
        <div>
          ${sectionLabel(slide)}
          <h2 class="dashboard-feature-title mt-[24px] max-w-[940px]">${splitLines(t(slide.title))}</h2>
          <p class="slide-subtitle">${splitLines(t(slide.body))}</p>
        </div>
        <div class="grid grid-cols-2 gap-[12px]">
          ${list(slide.bullets).map((item, index) => `
            <div class="mini-glass p-[15px] flex gap-[12px] items-start">
              <span class="text-staati-blue font-bold">${pad(index + 1)}</span>
              <span class="text-[clamp(12px,.92vw,18px)] font-semibold leading-snug">${escapeHtml(item)}</span>
            </div>
          `).join("")}
        </div>
      </div>
      <div class="dashboard-shot-grid mt-[30px]" style="--shot-cols:${Math.min(imageCount, 3)}">
        ${shots.map((shot) => `
          <figure class="dashboard-shot">
            <img src="${assetUrl(shot.src)}" alt="${escapeHtml(t(shot.label))}" />
            <figcaption>${escapeHtml(t(shot.label))}</figcaption>
          </figure>
        `).join("")}
      </div>
    </div>
  `;
}

function renderAthlete(slide) {
  const images = slide.images || [];
  return `
    <div class="slide-content grid grid-cols-[.9fr_1.1fr] gap-[6%] items-center">
      <div>
        ${sectionLabel(slide)}
        <h2 class="slide-title mt-[34px]">${splitLines(t(slide.title))}</h2>
        <p class="slide-subtitle">${splitLines(t(slide.body))}</p>
      </div>
      <div class="flex items-center justify-center gap-[24px]">
        ${phoneImage(images[0], "STAATI athlete home screen", "tilt-left")}
        ${phoneImage(images[1], "STAATI daily log screen", "")}
        <div class="grid gap-[12px] w-[34%]">
          ${list(slide.bullets).map((item, index) => `<div class="panel p-[15px] flex items-center gap-[12px]"><span class="staati-dot"></span><span>${escapeHtml(item)}</span></div>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function phoneImage(src, alt, extra = "") {
  if (!src) return "";
  return `<div class="mockup-phone small ${extra}"><img src="${assetUrl(src)}" alt="${escapeHtml(alt)}" /></div>`;
}

function phoneMockup(title, rows) {
  return `
    <div class="mockup-phone">
      <div class="h-[4px] w-[60px] rounded-full bg-white/18 mx-auto mb-[24px]"></div>
      <div class="text-[13px] text-staati-muted">STAATI</div>
      <div class="mt-[8px] text-[28px] font-bold">${title}</div>
      <div class="mt-[22px] grid gap-[12px]">
        ${rows.map((row, i) => `<div class="mini-glass p-[14px]"><div class="text-[12px] text-staati-muted">${pad(i + 1)}</div><div class="mt-[5px] font-semibold">${row}</div></div>`).join("")}
      </div>
    </div>
  `;
}

function renderWorkspace(slide) {
  return `
    <div class="slide-content grid grid-cols-[.85fr_1.15fr] gap-[5%] items-center">
      <div>
        ${sectionLabel(slide)}
        <h2 class="slide-title mt-[34px]">${splitLines(t(slide.title))}</h2>
      </div>
      <div class="panel p-[22px] bg-white">
        <div class="flex justify-between border-b border-black/10 pb-[16px]">
          <strong>STAATI Medical</strong><span class="text-staati-blue font-bold">${escapeHtml(t(slide.label))}</span>
        </div>
        <div class="mt-[18px] grid grid-cols-[.65fr_1.35fr] gap-[18px]">
          <div class="grid gap-[10px]">${list(slide.bullets).slice(0, 5).map(x => `<div class="mini-glass p-[13px] text-[14px] font-semibold">${escapeHtml(x)}</div>`).join("")}</div>
          <div class="grid gap-[12px]">
            <div class="mini-glass h-[120px] p-[18px] flex justify-between"><span>ACL · Week 14</span><span class="text-staati-blue">Signed</span></div>
            <div class="grid grid-cols-2 gap-[12px]">${list(slide.bullets).slice(5).map(x => `<div class="mini-glass p-[15px] text-[14px]">${escapeHtml(x)}</div>`).join("")}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderCheckins(slide) {
  const images = slide.images || [];
  return `
    <div class="slide-content grid grid-cols-[.9fr_1.1fr] gap-[6%] items-center">
      <div>
        ${sectionLabel(slide)}
        <h2 class="slide-title mt-[34px]">${splitLines(t(slide.title))}</h2>
        <p class="slide-subtitle">${splitLines(t(slide.body))}</p>
      </div>
      <div class="grid grid-cols-[.72fr_1fr] gap-[24px] items-center">
        ${phoneImage(images[0], "STAATI daily log check-in screen", "tilt-left")}
        <div class="panel p-[28px]">
          <svg viewBox="0 0 640 250" class="w-full h-[225px]" aria-hidden="true">
            <path d="M20 190 C110 168 120 102 205 126 S325 202 400 112 520 58 620 74" class="chart-line" fill="none" stroke="var(--staati-blue)" stroke-width="4" stroke-linecap="round"></path>
            <g fill="rgba(146,152,172,.45)">${[70,130,190].map(y => `<line x1="20" x2="620" y1="${y}" y2="${y}" stroke="currentColor" stroke-width="1"/>`).join("")}</g>
          </svg>
          <div class="grid grid-cols-2 gap-[12px]">
            ${list(slide.metrics).map((m, i) => `<div class="mini-glass p-[14px]"><strong class="text-[24px]">${[2, 7, 8, 6, 3, 82][i]}${i === 5 ? "%" : "/10"}</strong><div class="muted text-[13px]">${escapeHtml(m)}</div></div>`).join("")}
          </div>
        </div>
      </div>
    </div>
  `;
}

function renderPrograms(slide) {
  const images = slide.images || [];
  return `
    <div class="slide-content grid grid-cols-[1fr_.95fr] gap-[6%] items-center">
      <div>
        ${sectionLabel(slide)}
        <h2 class="slide-title mt-[34px]">${splitLines(t(slide.title))}</h2>
        <p class="mt-[42px] text-[clamp(18px,1.55vw,32px)] font-bold leading-tight">${splitLines(t(slide.body))}</p>
      </div>
      <div class="grid grid-cols-[.72fr_1fr] gap-[24px] items-center">
        ${phoneImage(images[0], "STAATI program screen", "tilt-right")}
        <div class="grid gap-[10px]">
          ${list(slide.bullets).map((item, index) => `<div class="panel p-[15px] flex justify-between items-center"><span>${escapeHtml(item)}</span><span class="text-staati-blue">${index < 5 ? "●" : "○"}</span></div>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderGates(slide) {
  const statuses = state.lang === "ar" ? ["مجتاز", "قيد الانتظار", "غير مجتاز", "موقّع"] : ["Passed", "Pending", "Failed", "Signed"];
  return `
    <div class="slide-content flex flex-col justify-center">
      ${sectionLabel(slide)}
      <h2 class="slide-title mt-[28px] max-w-[1280px]">${splitLines(t(slide.title))}</h2>
      <div class="mt-[44px] panel overflow-hidden">
        ${list(slide.bullets).map((item, index) => `
          <div class="grid grid-cols-[.12fr_1.2fr_.5fr_.42fr_.58fr] gap-[18px] items-center border-b border-white/10 px-[20px] py-[12px] text-[clamp(11px,.9vw,17px)]">
            <span class="text-staati-blue font-bold">${pad(index + 1)}</span>
            <span>${escapeHtml(item)}</span>
            <span>${statuses[index % 3]}</span>
            <span>${index < 5 ? statuses[3] : "—"}</span>
            <span class="muted">${index < 5 ? `2026-0${(index % 6) + 3}-12` : "—"}</span>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderCommunication(slide) {
  const images = slide.images || [];
  return `
    <div class="slide-content grid grid-cols-[.9fr_1.1fr] gap-[6%] items-center">
      <div>${sectionLabel(slide)}<h2 class="slide-title mt-[34px]">${splitLines(t(slide.title))}</h2></div>
      <div class="grid grid-cols-[.85fr_1fr] gap-[24px] items-center">
        <div class="flex gap-[16px]">
          ${phoneImage(images[0], "STAATI messages screen", "tilt-left")}
          ${phoneImage(images[1], "STAATI profile screen", "tilt-right")}
        </div>
        <div>
          ${list(slide.bullets).map((item, index) => `<div class="panel my-[12px] p-[18px]"><span class="text-staati-blue font-bold">${pad(index + 1)}</span><span class="ms-3">${escapeHtml(item)}</span></div>`).join("")}
        </div>
      </div>
    </div>
  `;
}

function renderBenefits(slide) {
  return cardGridSlide(slide, 3);
}

function renderOrganizations(slide) {
  return cardGridSlide(slide, 4, true);
}

function renderEnterprise(slide) {
  return `
    <div class="slide-content flex flex-col justify-center">
      ${sectionLabel(slide)}
      <div class="grid grid-cols-[.9fr_1.1fr] gap-[6%] items-center mt-[30px]">
        <h2 class="slide-title mt-[28px]">${splitLines(t(slide.title))}</h2>
        <div class="grid grid-cols-2 gap-[12px]">
          ${list(slide.bullets).map((item, index) => `<div class="panel p-[15px]"><span class="text-staati-blue font-bold">${pad(index + 1)}</span><div class="mt-[8px]">${escapeHtml(item)}</div></div>`).join("")}
        </div>
      </div>
      <div class="absolute bottom-0 inset-inline-end-0 border border-staati-blue/40 bg-staati-blue/10 px-[20px] py-[13px] text-staati-blue">${escapeHtml(t(slide.notes))}</div>
    </div>
  `;
}

function renderPilot(slide) {
  return `
    <div class="slide-content grid grid-cols-[.9fr_1.1fr] gap-[5%] items-center">
      <div>${sectionLabel(slide)}<h2 class="slide-title mt-[34px]">${splitLines(t(slide.title))}</h2></div>
      <div>
        ${list(slide.bullets).map((item, index) => `<div class="panel p-[18px] mb-[14px]"><span class="text-staati-blue font-bold">${pad(index + 1)}</span><span class="ms-3">${escapeHtml(item)}</span></div>`).join("")}
        <div class="mt-[24px] grid grid-cols-2 gap-[10px]">${list(slide.metrics).map(x => `<div class="text-[14px] font-semibold text-[#5f6678]">· ${escapeHtml(x)}</div>`).join("")}</div>
      </div>
    </div>
  `;
}

function renderClosing(slide) {
  return `
    <div class="orbital"></div>
    <div class="slide-content flex flex-col justify-between">
      <div class="flex justify-between">${sectionLabel(slide)}${targetLogo()}</div>
      <div>
        <h2 class="slide-title max-w-[1150px]">${splitLines(t(slide.title))}</h2>
        <p class="slide-subtitle">${splitLines(t(slide.body))}</p>
        <div class="mt-[42px] inline-flex min-w-[420px] items-center justify-center rounded-full border border-staati-blue/60 bg-staati-blue px-[44px] py-[24px] text-center text-[clamp(15px,1.15vw,24px)] font-bold shadow-[0_18px_42px_rgba(82,108,244,.28)]">${escapeHtml(t(slide.cta))}</div>
      </div>
      <div class="grid grid-cols-3 gap-[20px] text-[clamp(11px,.8vw,16px)] text-white/62">
        <span dir="ltr">${escapeHtml(state.settings.website)}</span>
        <span dir="ltr">${escapeHtml(state.settings.email)}</span>
        <span dir="ltr">${escapeHtml(state.settings.phone)}</span>
      </div>
    </div>
  `;
}

function cardGridSlide(slide, columns, crest = false) {
  const icons = ["repeat-2", "file-heart", "messages-square", "badge-check", "chart-no-axes-combined", "scan-eye", "shield", "activity"];
  return `
    <div class="slide-content flex flex-col justify-center">
      ${sectionLabel(slide)}
      <h2 class="slide-title mt-[30px] max-w-[1340px]">${splitLines(t(slide.title))}</h2>
      <div class="editorial-card-grid mt-[62px]" style="--card-cols:${columns}">
        ${list(slide.bullets).map((item, index) => `
          <div class="editorial-card panel">
            <div class="editorial-card-number">${pad(index + 1)}</div>
            <div class="editorial-card-icon">
              ${crest ? `<span class="block h-[44px] w-[38px] border-2 border-staati-blue/45 rounded-b-full"></span>` : icon(icons[index % icons.length], 34)}
            </div>
            <strong class="editorial-card-title">${escapeHtml(item)}</strong>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderHeader() {
  return `
    <header class="deck-header no-export">
      <div class="control-cluster">
        <div class="flex items-center gap-2 px-2">
          <span class="staati-dot"></span>
          ${brandLogo("h-[14px] w-auto object-contain", "dark")}
        </div>
      </div>
      <div class="control-cluster">
        <button class="ui-btn" id="langBtn" aria-label="Switch language">${state.lang === "en" ? "AR" : "EN"}</button>
        <button class="ui-btn" id="settingsBtn" aria-label="Presentation settings">${icon("settings")}</button>
        <button class="ui-btn" id="thumbsBtn" aria-label="Slide thumbnails">${icon("panel-right-open")}<span class="ui-label" dir="ltr">${state.current + 1}/${slides.length}</span></button>
        <button class="ui-btn" id="fullscreenBtn" aria-label="Fullscreen presentation">${icon("maximize")}</button>
        <button class="ui-btn" id="exportBtn" aria-label="Export presentation" ${state.exporting ? "disabled" : ""}>${icon("download")}<span class="ui-label">Export</span></button>
      </div>
    </header>
  `;
}

function renderControls() {
  const prevIcon = state.lang === "ar" ? "chevron-right" : "chevron-left";
  const nextIcon = state.lang === "ar" ? "chevron-left" : "chevron-right";
  return `
    <nav class="deck-controls no-export control-cluster" aria-label="Slide navigation">
      <button class="ui-btn" id="prevBtn" aria-label="Previous slide">${icon(prevIcon)}</button>
      <span class="px-2 text-sm font-bold" dir="ltr">${pad(state.current + 1)} / ${pad(slides.length)}</span>
      <button class="ui-btn" id="nextBtn" aria-label="Next slide">${icon(nextIcon)}</button>
    </nav>
  `;
}

function renderThumbs() {
  return `
    <aside class="thumb-panel no-export ${state.thumbsOpen ? "open" : ""}" aria-label="Slide thumbnails">
      ${slides.map((slide, index) => `
        <button class="thumb-item ${index === state.current ? "active" : ""}" data-thumb="${index}">
          <div class="thumb-preview"></div>
          <div class="text-xs text-white/45">P. ${pad(slide.number)}</div>
          <div class="mt-1 text-sm font-bold leading-tight">${escapeHtml(t(slide.title)).split("\n")[0]}</div>
        </button>
      `).join("")}
    </aside>
  `;
}

function renderSettingsModal() {
  if (!state.settingsOpen) return "";
  return `
    <div class="modal-backdrop no-export" role="dialog" aria-modal="true" aria-label="Presentation settings">
      <form class="modal" id="settingsForm">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold">${state.lang === "ar" ? "إعدادات العرض" : "Presentation Settings"}</h2>
            <p class="mt-2 text-sm text-staati-muted">${state.lang === "ar" ? "تُحفظ الإعدادات محلياً في المتصفح." : "Settings are saved locally in this browser."}</p>
          </div>
          <button type="button" class="ui-btn" id="closeSettings">${icon("x")}</button>
        </div>
        <div class="mt-6 grid grid-cols-2 gap-4 max-md:grid-cols-1">
          ${field("organizationName", "Organization name")}
          ${field("presenterName", "Presenter name")}
          ${field("companyName", "Company name")}
          ${field("website", "Website")}
          ${field("email", "Email")}
          ${field("phone", "Phone")}
          ${field("accentColor", "Accent color", "color")}
          <label class="field">Language<select name="lang"><option value="en" ${state.lang === "en" ? "selected" : ""}>English</option><option value="ar" ${state.lang === "ar" ? "selected" : ""}>Arabic</option></select></label>
          <label class="field">Export quality<select name="exportQuality"><option value="normal" ${state.exportQuality === "normal" ? "selected" : ""}>Normal 1920×1080</option><option value="high" ${state.exportQuality === "high" ? "selected" : ""}>High 2560×1440</option></select></label>
          <label class="field">STAATI logo<input type="file" name="logoData" accept="image/*" /></label>
          <label class="field">Target organization logo<input type="file" name="targetLogoData" accept="image/*" /></label>
          <label class="field flex-row items-center"><input type="checkbox" name="confidential" ${state.settings.confidential ? "checked" : ""} /> Confidential label</label>
          <label class="field flex-row items-center"><input type="checkbox" name="slideNumbers" ${state.settings.slideNumbers ? "checked" : ""} /> Slide numbers</label>
        </div>
        <div class="mt-6 flex justify-end gap-2">
          <button type="button" class="ui-btn" id="resetSettings">${icon("rotate-ccw")} Reset</button>
          <button class="ui-btn bg-staati-blue/80" type="submit">${icon("save")} Save</button>
        </div>
      </form>
    </div>
  `;
}

function field(name, label, type = "text") {
  const value = escapeHtml(state.settings[name] || "");
  return `<label class="field">${label}<input type="${type}" name="${name}" value="${value}" /></label>`;
}

function renderExportModal() {
  if (!state.exportModal) return "";
  const progress = state.exportModal.progress;
  const percent = progress?.total ? Math.round((progress.current / progress.total) * 100) : 0;
  const count = progress?.total
    ? state.lang === "ar"
      ? `${progress.current} من ${progress.total}`
      : `${progress.current} of ${progress.total}`
    : "";
  return `
    <div class="modal-backdrop no-export" role="dialog" aria-modal="true" aria-label="Export progress">
      <div class="modal">
        <h2 class="text-2xl font-bold">${state.lang === "ar" ? "تصدير العرض" : "Export Presentation"}</h2>
        <div class="export-status mt-6">
          ${state.exportModal.error ? icon("circle-alert", 24) : state.exportModal.done ? icon("check-circle", 24) : `<span class="spinner"></span>`}
          <div>
            <div class="font-bold">${escapeHtml(state.exportModal.message)}</div>
            ${state.exportModal.detail ? `<div class="mt-1 text-sm text-staati-muted">${escapeHtml(state.exportModal.detail)}</div>` : ""}
          </div>
        </div>
        ${progress?.total ? `
          <div class="export-progress mt-6">
            <div class="export-progress-row">
              <span>${escapeHtml(count)}</span>
              <span>${percent}%</span>
            </div>
            <div class="export-progress-track" aria-hidden="true">
              <div class="export-progress-bar" style="width:${percent}%"></div>
            </div>
          </div>
        ` : ""}
        <div class="mt-6 flex justify-end gap-2">
          ${state.exportModal.error ? `<button class="ui-btn" id="retryExport">${icon("refresh-cw")} Retry</button>` : ""}
          <button class="ui-btn" id="closeExport">${state.exportModal.done || state.exportModal.error ? "Close" : "Hide"}</button>
        </div>
      </div>
    </div>
  `;
}

function render() {
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
  document.body.dir = document.documentElement.dir;
  document.documentElement.style.setProperty("--staati-blue", state.settings.accentColor || brand.accentColor);
  document.body.classList.toggle("presentation-mode", state.presentation);
  document.body.classList.toggle("controls-hidden", state.controlsHidden && state.presentation);

  app.innerHTML = `
    <div class="deck-shell">
      <main class="deck-scroll" id="deckScroll">
        ${slides.map((slide, index) => `
          <section class="slide-section ${index === state.current ? "active" : ""}" data-index="${index}">
            <div class="slide-shell">${renderSlide(slide)}</div>
          </section>
        `).join("")}
      </main>
      ${renderControls()}
      ${renderSettingsModal()}
      ${renderExportModal()}
    </div>
  `;
  lucide.createIcons();
  updateDeckScale();
  bindEvents();
  if (!state.presentation) scrollToCurrent(false);
}

function updateDeckScale() {
  const shell = document.querySelector(".slide-shell");
  if (!shell) return;
  document.documentElement.style.setProperty("--deck-scale", String(shell.clientWidth / 1920));
}

function bindEvents() {
  const langBtn = document.getElementById("langBtn");
  if (langBtn) langBtn.onclick = () => setLanguage(state.lang === "en" ? "ar" : "en");
  const settingsBtn = document.getElementById("settingsBtn");
  if (settingsBtn) settingsBtn.onclick = () => { state.settingsOpen = true; render(); };
  const thumbsBtn = document.getElementById("thumbsBtn");
  if (thumbsBtn) thumbsBtn.onclick = () => { state.thumbsOpen = !state.thumbsOpen; render(); };
  const fullscreenBtn = document.getElementById("fullscreenBtn");
  if (fullscreenBtn) fullscreenBtn.onclick = enterPresentation;
  const exportBtn = document.getElementById("exportBtn");
  if (exportBtn) exportBtn.onclick = exportPdf;
  document.getElementById("prevBtn").onclick = previousSlide;
  document.getElementById("nextBtn").onclick = nextSlide;

  document.querySelectorAll("[data-thumb]").forEach((button) => {
    button.addEventListener("click", () => goToSlide(Number(button.dataset.thumb)));
  });

  const scroller = document.getElementById("deckScroll");
  scroller.addEventListener("scroll", handleScroll, { passive: true });
  scroller.addEventListener("touchstart", handleTouchStart, { passive: true });
  scroller.addEventListener("touchend", handleTouchEnd, { passive: true });

  const closeSettings = document.getElementById("closeSettings");
  if (closeSettings) closeSettings.onclick = () => { state.settingsOpen = false; render(); };

  const resetSettings = document.getElementById("resetSettings");
  if (resetSettings) resetSettings.onclick = () => {
    localStorage.removeItem(STORE_KEY);
    location.reload();
  };

  const settingsForm = document.getElementById("settingsForm");
  if (settingsForm) settingsForm.addEventListener("submit", saveSettingsForm);

  const closeExport = document.getElementById("closeExport");
  if (closeExport) closeExport.onclick = () => { state.exportModal = null; render(); };
  const retryExport = document.getElementById("retryExport");
  if (retryExport) retryExport.onclick = () => exportPdf();
}

function setLanguage(lang) {
  state.lang = lang;
  saveSettings();
  render();
}

function handleScroll(event) {
  if (state.presentation) return;
  const sections = [...document.querySelectorAll(".slide-section")];
  const top = event.target.scrollTop;
  const index = Math.round(top / Math.max(1, window.innerHeight));
  if (sections[index] && index !== state.current) {
    state.current = index;
    updateActiveOnly();
  }
}

function updateActiveOnly() {
  document.querySelectorAll(".slide-section").forEach((section, index) => section.classList.toggle("active", index === state.current));
}

function scrollToCurrent(smooth = true) {
  const scroller = document.getElementById("deckScroll");
  const section = document.querySelector(`.slide-section[data-index="${state.current}"]`);
  if (scroller && section && !state.presentation) {
    scroller.scrollTo({ top: section.offsetTop, behavior: smooth ? "smooth" : "auto" });
  }
}

function goToSlide(index) {
  state.current = Math.max(0, Math.min(slides.length - 1, index));
  state.thumbsOpen = false;
  render();
}

function nextSlide() {
  goToSlide(state.current + 1);
}

function previousSlide() {
  goToSlide(state.current - 1);
}

async function enterPresentation() {
  state.presentation = true;
  render();
  const shell = document.querySelector(".deck-shell");
  try {
    if (!document.fullscreenElement && shell.requestFullscreen) await shell.requestFullscreen();
  } catch {
    state.exportModal = { error: true, message: "Fullscreen could not be opened.", detail: "The presentation mode is still active inside the page." };
  }
  revealControls();
}

function exitPresentation() {
  state.presentation = false;
  state.controlsHidden = false;
  if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  render();
}

function revealControls() {
  state.controlsHidden = false;
  document.body.classList.remove("controls-hidden");
  clearTimeout(hideControlsTimer);
  if (state.presentation) {
    hideControlsTimer = setTimeout(() => {
      state.controlsHidden = true;
      document.body.classList.add("controls-hidden");
    }, 2800);
  }
}

function handleTouchStart(event) {
  const touch = event.changedTouches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
}

function handleTouchEnd(event) {
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStartX;
  const dy = touch.clientY - touchStartY;
  if (Math.abs(dx) > 54 && Math.abs(dx) > Math.abs(dy) * 1.4) {
    const forward = state.lang === "ar" ? dx > 0 : dx < 0;
    forward ? nextSlide() : previousSlide();
  }
}

document.addEventListener("keydown", (event) => {
  if (state.settingsOpen || state.exportModal) return;
  if (event.key === "Escape" && state.presentation) return exitPresentation();
  if (event.key === "Home") return goToSlide(0);
  if (event.key === "End") return goToSlide(slides.length - 1);
  if (event.key === " " || event.key === "PageDown") {
    event.preventDefault();
    return nextSlide();
  }
  if (event.key === "ArrowRight") return state.lang === "ar" ? previousSlide() : nextSlide();
  if (event.key === "ArrowLeft") return state.lang === "ar" ? nextSlide() : previousSlide();
});

document.addEventListener("mousemove", revealControls);
document.addEventListener("click", revealControls);
document.addEventListener("fullscreenchange", () => {
  if (!document.fullscreenElement && state.presentation) {
    state.presentation = false;
    state.controlsHidden = false;
    render();
  }
});

window.addEventListener("resize", updateDeckScale);

async function saveSettingsForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const data = new FormData(form);
  ["organizationName", "presenterName", "companyName", "website", "email", "phone", "accentColor"].forEach((key) => {
    state.settings[key] = String(data.get(key) || "");
  });
  state.settings.confidential = data.get("confidential") === "on";
  state.settings.slideNumbers = data.get("slideNumbers") === "on";
  state.lang = String(data.get("lang") || "en");
  state.exportQuality = String(data.get("exportQuality") || "normal");

  const logo = data.get("logoData");
  const target = data.get("targetLogoData");
  if (logo && logo.size) state.settings.logoData = await fileToDataUrl(logo);
  if (target && target.size) state.settings.targetLogoData = await fileToDataUrl(target);
  saveSettings();
  state.settingsOpen = false;
  render();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function waitForAssets() {
  updateExport("Preparing assets.");
  document.body.classList.add("export-freeze");
  if (document.fonts && document.fonts.ready) {
    updateExport("Loading fonts.");
    await document.fonts.ready;
  }
  const images = [...document.images].filter((img) => !img.complete);
  await Promise.all(images.map((img) => new Promise((resolve) => {
    img.onload = resolve;
    img.onerror = resolve;
  })));
}

async function waitForNodeImages(node) {
  const images = [...node.querySelectorAll("img")];
  await Promise.all(images.map((img) => new Promise((resolve) => {
    if (img.complete && img.naturalWidth > 0) return resolve();
    img.onload = resolve;
    img.onerror = resolve;
  }).then(() => img.decode ? img.decode().catch(() => {}) : undefined)));
}

async function imageSrcToDataUrl(src) {
  if (!src || /^(data:|blob:)/i.test(src)) return src;
  const embedded = embeddedAssetUrl(src);
  if (embedded) return embedded;
  if (assetDataUrlCache.has(src)) return assetDataUrlCache.get(src);
  const response = await fetch(src, { cache: "force-cache" });
  if (!response.ok) throw new Error(`Image failed to load: ${src}`);
  const dataUrl = await blobToDataUrl(await response.blob());
  assetDataUrlCache.set(src, dataUrl);
  return dataUrl;
}

async function inlineNodeImages(node) {
  const images = [...node.querySelectorAll("img")];
  await Promise.all(images.map(async (img) => {
    const currentSrc = img.currentSrc || img.src;
    try {
      const dataUrl = await imageSrcToDataUrl(currentSrc);
      if (dataUrl && img.src !== dataUrl) img.src = dataUrl;
    } catch {
      // Keep the original source if conversion fails; html-to-image may still handle it.
    }
  }));
  await waitForNodeImages(node);
}

function renderExportSlide(index) {
  exportRoot.innerHTML = renderSlide(slides[index], true);
  lucide.createIcons({ attrs: { "stroke-width": 1.8 } });
  return exportRoot.querySelector(".slide-canvas");
}

async function slideToPng(index, quality = state.exportQuality) {
  const node = renderExportSlide(index);
  await inlineNodeImages(node);
  const pixelRatio = quality === "high" ? 2560 / 1920 : 1;
  const width = quality === "high" ? 2560 : 1920;
  const height = quality === "high" ? 1440 : 1080;
  updateExport(`Rendering slide ${index + 1} of ${slides.length}.`, `${width}×${height}`);
  return htmlToImage.toPng(node, {
    width: 1920,
    height: 1080,
    pixelRatio,
    cacheBust: true,
    backgroundColor: slides[index].theme === "light" ? "#F2F4FB" : "#0C0D10",
    style: {
      width: "1920px",
      height: "1080px",
      transform: "none",
    },
  });
}

async function exportPdf() {
  if (state.exporting) return;
  if (shouldUseHostedExport()) {
    redirectToHostedExport();
    return;
  }
  try {
    state.exporting = true;
    updateExport(
      state.lang === "ar" ? "جاري تجهيز ملف PDF." : "Preparing PDF.",
      state.lang === "ar" ? "خلك بنفس الصفحة، بعدها ينزل الملف على جهازك." : "Stay on this page. The PDF will download to your device.",
      false,
      false,
      { current: 0, total: slides.length }
    );
    render();
    await waitForAssets();
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [1920, 1080], compress: false });
    for (let index = 0; index < slides.length; index += 1) {
      updateExport(
        state.lang === "ar" ? `جاري تجهيز الشريحة ${index + 1}.` : `Rendering slide ${index + 1}.`,
        state.lang === "ar" ? "الصور والخطوط تنحفظ داخل ملف PDF." : "Images and fonts are being embedded in the PDF.",
        false,
        false,
        { current: index, total: slides.length }
      );
      const dataUrl = await slideToPng(index);
      if (index > 0) pdf.addPage([1920, 1080], "landscape");
      pdf.addImage(dataUrl, "PNG", 0, 0, 1920, 1080, undefined, "NONE");
      updateExport(
        state.lang === "ar" ? `تم تجهيز ${index + 1} من ${slides.length}.` : `Prepared ${index + 1} of ${slides.length}.`,
        "",
        false,
        false,
        { current: index + 1, total: slides.length }
      );
    }
    updateExport(
      state.lang === "ar" ? "جاري تنزيل ملف PDF." : "Downloading PDF.",
      "",
      false,
      false,
      { current: slides.length, total: slides.length }
    );
    const filename = `STAATI-B2B-Presentation-${state.lang.toUpperCase()}.pdf`;
    const blob = pdf.output("blob");
    downloadBlob(blob, filename);
    updateExport(
      state.lang === "ar" ? "تم تنزيل ملف PDF." : "PDF downloaded.",
      state.lang === "ar" ? "إذا فتح لك خيار الحفظ في الآيفون، اختر Save to Files." : "If your phone asks where to save it, choose Save to Files.",
      true,
      false,
      { current: slides.length, total: slides.length }
    );
  } catch (error) {
    updateExport("Export failed.", readableError(error), false, true);
  } finally {
    document.body.classList.remove("export-freeze");
    exportRoot.innerHTML = "";
    state.exporting = false;
    render();
  }
}

function shouldUseHostedExport() {
  return location.protocol === "file:";
}

function redirectToHostedExport() {
  updateExport(
    state.lang === "ar" ? "جاري فتح النسخة المباشرة." : "Opening live export.",
    state.lang === "ar"
      ? "Safari يمنع تصدير PDF من الملفات المحلية. بنفتح نفس الصفحة على الرابط المباشر ونبدأ التصدير تلقائياً."
      : "Safari blocks PDF export from local files. The live version will open in this tab and start exporting automatically.",
    false,
    false,
    { current: 0, total: slides.length }
  );
  const url = new URL(HOSTED_EXPORT_URL);
  url.searchParams.set("lang", state.lang);
  url.searchParams.set("slide", String(state.current + 1));
  url.searchParams.set("export", "pdf");
  window.location.href = url.toString();
}

async function exportCurrentPng() {
  const exportIndex = getStableCurrentIndex();
  try {
    state.exporting = true;
    state.exportModal = { message: "Preparing current slide." };
    render();
    await waitForAssets();
    const dataUrl = await slideToPng(exportIndex);
    downloadDataUrl(dataUrl, `STAATI-Slide-${pad(exportIndex + 1)}-${state.lang.toUpperCase()}.png`);
    updateExport("Download ready.", `Slide ${exportIndex + 1} PNG exported.`, true);
  } catch (error) {
    updateExport("PNG export failed.", error?.message || "Unknown export error.", false, true);
  } finally {
    document.body.classList.remove("export-freeze");
    exportRoot.innerHTML = "";
    state.exporting = false;
    render();
  }
}

function getStableCurrentIndex() {
  const active = document.querySelector(".slide-section.active");
  const index = active ? Number(active.dataset.index) : state.current;
  if (Number.isFinite(index)) return Math.max(0, Math.min(slides.length - 1, index));
  return Math.max(0, Math.min(slides.length - 1, state.current));
}

async function exportZip() {
  try {
    state.exporting = true;
    state.exportModal = { message: "Preparing assets." };
    render();
    await waitForAssets();
    const zip = new JSZip();
    for (let index = 0; index < slides.length; index += 1) {
      const dataUrl = await slideToPng(index);
      zip.file(`STAATI-Slide-${pad(index + 1)}-${state.lang.toUpperCase()}.png`, dataUrl.split(",")[1], { base64: true });
    }
    updateExport("Creating ZIP.");
    const blob = await zip.generateAsync({ type: "blob" });
    downloadBlob(blob, `STAATI-Slides-${state.lang.toUpperCase()}.zip`);
    updateExport("Download ready.", "All slides exported as PNG images.", true);
  } catch (error) {
    updateExport("ZIP export failed.", error?.message || "Unknown export error.", false, true);
  } finally {
    document.body.classList.remove("export-freeze");
    exportRoot.innerHTML = "";
    state.exporting = false;
    render();
  }
}

function updateExport(message, detail = "", done = false, error = false, progress = null) {
  state.exportModal = { message, detail, done, error, progress };
  render();
}

function readableError(error) {
  if (!error) return state.lang === "ar" ? "تعذر إنشاء ملف PDF." : "Could not create the PDF.";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  if (error.name) return error.name;
  try {
    return JSON.stringify(error);
  } catch {
    return state.lang === "ar" ? "تعذر إنشاء ملف PDF." : "Could not create the PDF.";
  }
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function copyShareLink() {
  const url = new URL(location.href);
  url.searchParams.set("slide", String(state.current + 1));
  url.searchParams.set("lang", state.lang);
  await navigator.clipboard.writeText(url.toString());
  state.exportModal = { done: true, message: state.lang === "ar" ? "تم نسخ الرابط." : "Share link copied.", detail: url.toString() };
  render();
}

function initFromUrl() {
  const params = new URLSearchParams(location.search);
  const lang = params.get("lang");
  const slide = Number(params.get("slide"));
  if (lang === "ar" || lang === "en") state.lang = lang;
  if (slide >= 1 && slide <= slides.length) state.current = slide - 1;
  if (params.get("export") === "pdf") state.pendingAutoExport = true;
}

loadSettings();
initFromUrl();
render();
if (state.pendingAutoExport) {
  state.pendingAutoExport = false;
  setTimeout(exportPdf, 400);
}
