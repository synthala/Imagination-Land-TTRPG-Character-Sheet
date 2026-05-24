/**
 * @typedef {{
 *   baseDie: string,
 *   bonusDie: string,
 *   modifier: number
 * }} StatLine
 *
 * @typedef {{
 *   id: string,
 *   name: string,
 *   description: string
 * }} Strength
 *
 * @typedef {{
 *   name: string,
 *   adversityTokens: number,
 *   stats: Record<string, StatLine>,
 *   attributeNames: Record<string, string>,
 *   characterImage: string,
 *   notesBackstory: string,
 *   inventory: string,
 *   strengths: Strength[]
 * }} CharacterState
 */

const STORAGE_KEY = "frohlich-character-sheet";
const DIE_OPTIONS = ["d4", "d6", "d8", "d10", "d12", "d20"];
const BONUS_OPTIONS = ["None", ...DIE_OPTIONS];
const STAT_NAMES = ["Flight", "Charm", "Fight", "Grit", "Brain", "Brawn"];
const DEFAULT_THEME = {
  "--bg-top": "#1a1715",
  "--bg-mid": "#3c322b",
  "--bg-bottom": "#6b6652",
  "--panel-ink": "#000000",
  "--muted": "rgba(0, 0, 0, 0.74)",
  "--line": "rgba(255, 255, 255, 0.28)",
  "--line-strong": "rgba(255, 255, 255, 0.42)",
  "--accent": "#8df0ff",
  "--accent-strong": "#dff9ff",
  "--gold": "#ffe1a8",
  "--accent-wash": "rgba(141, 240, 255, 0.18)",
  "--accent-border": "rgba(141, 240, 255, 0.88)",
  "--accent-focus-ring": "rgba(141, 240, 255, 0.2)",
  "--accent-glow": "rgba(74, 169, 201, 0.34)",
  "--button-highlight-start": "rgba(235, 251, 255, 0.84)",
  "--button-highlight-end": "rgba(176, 236, 247, 0.56)",
  "--gold-wash": "rgba(255, 225, 168, 0.16)",
  "--top-stat-wash": "rgba(255, 236, 199, 0.18)",
  "--top-stat-ink": "#996919",
  "--menu-surface-start": "rgba(255, 255, 255, 0.94)",
  "--menu-surface-end": "rgba(238, 244, 249, 0.92)",
  "--shadow": "0 28px 80px rgba(0, 10, 18, 0.32)",
  "--inner-shadow": "inset 0 1px 0 rgba(255, 255, 255, 0.52)"
};

/** @type {CharacterState} */
const DEFAULT_STATE = {
  name: "",
  adversityTokens: 0,
  characterImage: "",
  notesBackstory: "",
  inventory: "",
  stats: {
    Flight: { baseDie: "d4", bonusDie: "None", modifier: 0 },
    Charm: { baseDie: "d4", bonusDie: "None", modifier: 0 },
    Fight: { baseDie: "d4", bonusDie: "None", modifier: 0 },
    Grit: { baseDie: "d4", bonusDie: "None", modifier: 0 },
    Brain: { baseDie: "d4", bonusDie: "None", modifier: 0 },
    Brawn: { baseDie: "d4", bonusDie: "None", modifier: 0 }
  },
  attributeNames: STAT_NAMES.reduce((result, statName) => {
    result[statName] = statName;
    return result;
  }, {}),
  strengths: []
};

/** @type {CharacterState} */
let state = loadState();
let themeRequestId = 0;
const collapsedSnapshotStrengthIds = new Set();

const startupMenu = document.querySelector("#startup-menu");
const startupLoadCharacterButton = document.querySelector("#startup-load-character");
const startupCreateCharacterButton = document.querySelector("#startup-create-character");
const startupExitMenuButton = document.querySelector("#startup-exit-menu");
const startupMenuTitleText = document.querySelector("#startup-menu-title-text");
const appShell = document.querySelector(".app-shell");
const rootStyle = document.documentElement.style;
const nameInput = document.querySelector("#character-name");
const sheetTitleText = document.querySelector("#sheet-title-text");
const adversityTokensInput = document.querySelector("#adversity-tokens");
const statsList = document.querySelector("#stats-list");
const strengthsList = document.querySelector("#strengths-list");
const summaryStack = document.querySelector("#summary-stack");
const bestStatLabel = document.querySelector("#best-stat");
const bestStatDetail = document.querySelector("#best-stat-detail");
const snapshotAdversity = document.querySelector("#snapshot-adversity");
const snapshotStrengthCount = document.querySelector("#snapshot-strength-count");
const saveStatus = document.querySelector("#save-status");
const sheetTabs = Array.from(document.querySelectorAll(".sheet-tab"));
const notesBackstoryInput = document.querySelector("#notes-backstory");
const inventoryNotesInput = document.querySelector("#inventory-notes");
const characterBackgroundBlur = document.querySelector(".character-background-blur");
const characterBackgroundFocus = document.querySelector(".character-background-focus");
const sheetCharacterUnderlay = document.querySelector(".sheet-character-underlay");
const previewCharacterArtButton = document.querySelector("#preview-character-art");
const saveCharacterButton = document.querySelector("#save-character-button");
const loadCharacterButton = document.querySelector("#load-character-button");
const characterImageInput = document.querySelector("#character-image-input");
const loadCharacterInput = document.querySelector("#load-character-input");
const uploadImageButton = document.querySelector("#upload-image-button");
const clearImageButton = document.querySelector("#clear-image-button");
const sheetMenuToggle = document.querySelector("#sheet-menu-toggle");
const sheetMenuPanel = document.querySelector("#sheet-menu-panel");
const statRowTemplate = document.querySelector("#stat-row-template");
const strengthTemplate = document.querySelector("#strength-template");
const addStrengthButton = document.querySelector("#add-strength");
const newCharacterButton = document.querySelector("#new-character-button");
const statRowElements = new Map();

initialize();

function initialize() {
  nameInput.value = state.name;
  updateCharacterSheetTitle();
  adversityTokensInput.value = String(state.adversityTokens);
  notesBackstoryInput.value = state.notesBackstory;
  inventoryNotesInput.value = state.inventory;
  saveStatus.textContent = getIdleStatusText();
  renderCharacterArt();
  renderStats();
  renderStrengths();
  renderSummary();
  setActiveSheetTab(sheetTabs[0]);
  bindStaticEvents();
  setStartupMenuVisible(true);
}

function bindStaticEvents() {
  startupLoadCharacterButton.addEventListener("click", () => {
    loadCharacterInput.click();
  });

  startupCreateCharacterButton.addEventListener("click", () => {
    setStartupMenuVisible(false);
    closeSheetMenu();
    applyState(createDefaultState(), "New character started.");
    nameInput.focus();
  });

  startupExitMenuButton.addEventListener("click", () => {
    setStartupMenuVisible(false);
    closeSheetMenu();
    nameInput.focus();
  });

  nameInput.addEventListener("input", () => {
    state.name = nameInput.value.trimStart();
    updateCharacterSheetTitle();
    persistState("Name updated.");
    renderSummary();
  });

  adversityTokensInput.addEventListener("input", () => {
    state.adversityTokens = clampInteger(adversityTokensInput.value, 0);
    adversityTokensInput.value = String(state.adversityTokens);
    persistState("Adversity updated.");
    renderSummary();
  });

  notesBackstoryInput.addEventListener("input", () => {
    state.notesBackstory = notesBackstoryInput.value;
    persistState("Notes updated.");
  });

  inventoryNotesInput.addEventListener("input", () => {
    state.inventory = inventoryNotesInput.value;
    persistState("Inventory updated.");
  });

  addStrengthButton.addEventListener("click", () => {
    state.strengths.push(createStrength());
    renderStrengths();
    renderSummary();
    persistState("Strength added.");
  });

  newCharacterButton.addEventListener("click", () => {
    closeSheetMenu();
    applyState(createDefaultState(), "New character started.");
  });

  uploadImageButton.addEventListener("click", async () => {
    closeSheetMenu();
    characterImageInput.click();
  });

  saveCharacterButton.addEventListener("click", () => {
    downloadCharacterFile();
  });

  loadCharacterButton.addEventListener("click", () => {
    loadCharacterInput.click();
  });

  previewCharacterArtButton.addEventListener("mouseenter", showCharacterArtPreview);
  previewCharacterArtButton.addEventListener("mouseleave", hideCharacterArtPreview);
  previewCharacterArtButton.addEventListener("focus", showCharacterArtPreview);
  previewCharacterArtButton.addEventListener("blur", hideCharacterArtPreview);

  characterImageInput.addEventListener("change", async () => {
    const file = characterImageInput.files && characterImageInput.files[0];

    if (!file) {
      return;
    }

    state.characterImage = await readFileAsDataUrl(file);
    renderCharacterArt();
    persistState("Character image updated.");
    characterImageInput.value = "";
  });

  loadCharacterInput.addEventListener("change", async () => {
    const file = loadCharacterInput.files && loadCharacterInput.files[0];

    if (!file) {
      return;
    }

    try {
      const fileContents = await readFileAsText(file);
      const parsedState = JSON.parse(fileContents);
      applyState(normalizeCharacterState(parsedState), "Character loaded.");
      setStartupMenuVisible(false);
    } catch (error) {
      console.warn("Unable to load character file.", error);
      saveStatus.textContent = "Load failed.";
      window.clearTimeout(persistState.statusTimeout);
      persistState.statusTimeout = window.setTimeout(() => {
        saveStatus.textContent = getIdleStatusText();
      }, 1600);
    } finally {
      loadCharacterInput.value = "";
    }
  });

  clearImageButton.addEventListener("click", () => {
    state.characterImage = "";
    renderCharacterArt();
    persistState("Character image cleared.");
    closeSheetMenu();
  });

  sheetMenuToggle.addEventListener("click", () => {
    const isOpen = sheetMenuPanel.classList.contains("is-open");
    setSheetMenuOpen(!isOpen);
  });

  sheetTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      setActiveSheetTab(tab);
    });

    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        return;
      }

      event.preventDefault();
      let nextIndex = index;

      if (event.key === "ArrowLeft") {
        nextIndex = (index - 1 + sheetTabs.length) % sheetTabs.length;
      } else if (event.key === "ArrowRight") {
        nextIndex = (index + 1) % sheetTabs.length;
      } else if (event.key === "Home") {
        nextIndex = 0;
      } else if (event.key === "End") {
        nextIndex = sheetTabs.length - 1;
      }

      const nextTab = sheetTabs[nextIndex];
      setActiveSheetTab(nextTab);
      nextTab.focus();
    });
  });

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".glass-select")) {
      closeAllGlassDropdowns();
    }

    if (!event.target.closest(".sheet-menu")) {
      closeSheetMenu();
    }

    const stepperButton = event.target.closest(".stepper-button");

    if (!stepperButton) {
      return;
    }

    const stepper = stepperButton.closest(".number-stepper");
    const input = stepper ? stepper.querySelector('input[type="number"]') : null;

    if (!input) {
      return;
    }

    if (stepperButton.dataset.step === "up") {
      input.stepUp();
    } else {
      input.stepDown();
    }

    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    input.focus();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllGlassDropdowns();
      closeSheetMenu();
    }
  });
}

function renderCharacterArt() {
  const hasCharacterImage = Boolean(state.characterImage);
  const backgroundImageValue = hasCharacterImage
    ? `url("${toRenderableImageUrl(state.characterImage)}")`
    : "none";

  characterBackgroundBlur.style.backgroundImage = backgroundImageValue;
  characterBackgroundFocus.style.backgroundImage = backgroundImageValue;
  characterBackgroundBlur.style.opacity = hasCharacterImage ? "" : "0";
  sheetCharacterUnderlay.style.backgroundImage = "none";
  characterBackgroundFocus.style.opacity = hasCharacterImage ? "" : "0";
  sheetCharacterUnderlay.style.opacity = "0";
  previewCharacterArtButton.disabled = !hasCharacterImage;
  clearImageButton.disabled = !state.characterImage;
  void updateCharacterTheme(state.characterImage);
}

function downloadCharacterFile() {
  const serializedState = serializeCharacterState();
  const fileBlob = new Blob([JSON.stringify(serializedState, null, 2)], { type: "application/json" });
  const objectUrl = URL.createObjectURL(fileBlob);
  const downloadLink = document.createElement("a");
  const safeName = state.name.trim()
    ? state.name.trim().replace(/[<>:"/\\|?*\x00-\x1F]/g, "").replace(/\s+/g, "-").toLowerCase()
    : "new-character";

  downloadLink.href = objectUrl;
  downloadLink.download = `${safeName || "new-character"}.ilcs.json`;
  document.body.append(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(objectUrl);
  persistState("Character saved.");
}

/**
 * @param {boolean} isVisible
 */
function setStartupMenuVisible(isVisible) {
  startupMenu.hidden = !isVisible;
  appShell.inert = isVisible;
  document.body.classList.toggle("startup-menu-open", isVisible);

  if (isVisible) {
    window.requestAnimationFrame(() => {
      startupMenu.focus();
    });
  }
}

function closeSheetMenu() {
  setSheetMenuOpen(false);
}

function getIdleStatusText() {
  return "Saved locally. Save to file to load on another device or browser.";
}

/**
 * @param {string} statusText
 */
function setTransientStatus(statusText) {
  saveStatus.textContent = statusText;
  window.clearTimeout(persistState.statusTimeout);
  persistState.statusTimeout = window.setTimeout(() => {
    saveStatus.textContent = getIdleStatusText();
  }, 1800);
}

/**
 * @returns {string}
 */
function toRenderableImageUrl(imageValue) {
  return imageValue;
}

/**
 * @param {string} imageValue
 * @returns {Promise<void>}
 */
async function updateCharacterTheme(imageValue) {
  const currentRequestId = ++themeRequestId;

  if (!imageValue) {
    applyThemeVariables(DEFAULT_THEME);
    return;
  }

  try {
    const nextTheme = await buildThemeFromImage(imageValue);

    if (currentRequestId !== themeRequestId) {
      return;
    }

    applyThemeVariables(nextTheme);
  } catch (error) {
    console.warn("Unable to derive theme from character image.", error);

    if (currentRequestId !== themeRequestId) {
      return;
    }

    applyThemeVariables(DEFAULT_THEME);
  }
}

/**
 * @param {Record<string, string>} theme
 */
function applyThemeVariables(theme) {
  for (const [name, value] of Object.entries(theme)) {
    rootStyle.setProperty(name, value);
  }
}

/**
 * @param {string} imageValue
 * @returns {Promise<Record<string, string>>}
 */
async function buildThemeFromImage(imageValue) {
  const sampledColors = await sampleImageColors(imageValue);
  const palette = buildPaletteAnchors(sampledColors);
  const darkColor = tintToRange(palette.dark, 0.12, 0.16, 0.12, 0.42);
  const midColor = tintToRange(mixColors(palette.dark, palette.mid, 0.55), 0.2, 0.28, 0.12, 0.46);
  const bottomColor = tintToRange(mixColors(palette.mid, palette.light, 0.4), 0.34, 0.46, 0.12, 0.4);
  const accentColor = tintToRange(palette.accent, 0.52, 0.64, 0.34, 0.82);
  const accentLight = tintToRange(mixColors(accentColor, palette.light, 0.76), 0.82, 0.92, 0.12, 0.34);
  const warmColor = tintToRange(palette.warm, 0.62, 0.76, 0.28, 0.66);
  const inkColor = tintToRange(darkColor, 0.08, 0.1, 0.08, 0.24);
  const edgeColor = tintToRange(mixColors(accentLight, accentColor, 0.28), 0.72, 0.84, 0.12, 0.3);
  const accentGlowColor = tintToRange(mixColors(accentColor, darkColor, 0.35), 0.32, 0.42, 0.2, 0.52);
  const buttonStart = tintToRange(mixColors(accentColor, accentLight, 0.78), 0.86, 0.94, 0.1, 0.28);
  const buttonEnd = tintToRange(mixColors(accentColor, accentLight, 0.46), 0.64, 0.8, 0.22, 0.48);
  const menuSurfaceStart = tintToRange(mixColors(accentLight, palette.light, 0.55), 0.9, 0.96, 0.08, 0.22);
  const menuSurfaceEnd = tintToRange(mixColors(accentLight, midColor, 0.22), 0.84, 0.92, 0.1, 0.26);
  const topStatInk = tintToRange(mixColors(warmColor, darkColor, 0.42), 0.28, 0.4, 0.34, 0.76);

  return {
    "--bg-top": toCssRgb(darkColor),
    "--bg-mid": toCssRgb(midColor),
    "--bg-bottom": toCssRgb(bottomColor),
    "--panel-ink": toCssRgb(inkColor),
    "--muted": toCssRgba(inkColor, 0.74),
    "--line": toCssRgba(edgeColor, 0.28),
    "--line-strong": toCssRgba(edgeColor, 0.42),
    "--accent": toCssRgb(accentColor),
    "--accent-strong": toCssRgb(accentLight),
    "--gold": toCssRgb(warmColor),
    "--accent-wash": toCssRgba(accentColor, 0.18),
    "--accent-border": toCssRgba(accentColor, 0.88),
    "--accent-focus-ring": toCssRgba(accentColor, 0.2),
    "--accent-glow": toCssRgba(accentGlowColor, 0.34),
    "--button-highlight-start": toCssRgba(buttonStart, 0.84),
    "--button-highlight-end": toCssRgba(buttonEnd, 0.56),
    "--gold-wash": toCssRgba(warmColor, 0.16),
    "--top-stat-wash": toCssRgba(warmColor, 0.18),
    "--top-stat-ink": toCssRgb(topStatInk),
    "--menu-surface-start": toCssRgba(menuSurfaceStart, 0.94),
    "--menu-surface-end": toCssRgba(menuSurfaceEnd, 0.92),
    "--shadow": `0 28px 80px ${toCssRgba(darkColor, 0.32)}`,
    "--inner-shadow": `inset 0 1px 0 ${toCssRgba(accentLight, 0.52)}`
  };
}

/**
 * @param {string} imageValue
 * @returns {Promise<Array<ReturnType<typeof createColor>>>}
 */
function sampleImageColors(imageValue) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.addEventListener("load", () => {
      const longestSide = Math.max(image.naturalWidth || image.width, image.naturalHeight || image.height, 1);
      const scale = Math.min(1, 48 / longestSide);
      const width = Math.max(12, Math.round((image.naturalWidth || image.width) * scale));
      const height = Math.max(12, Math.round((image.naturalHeight || image.height) * scale));
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true });

      if (!context) {
        reject(new Error("Unable to sample image colors."));
        return;
      }

      canvas.width = width;
      canvas.height = height;
      context.drawImage(image, 0, 0, width, height);

      const imageData = context.getImageData(0, 0, width, height).data;
      /** @type {Map<string, { count: number, r: number, g: number, b: number }>} */
      const buckets = new Map();

      for (let index = 0; index < imageData.length; index += 4) {
        const alpha = imageData[index + 3];

        if (alpha < 160) {
          continue;
        }

        const red = imageData[index];
        const green = imageData[index + 1];
        const blue = imageData[index + 2];
        const key = `${Math.round(red / 24)}-${Math.round(green / 24)}-${Math.round(blue / 24)}`;
        const bucket = buckets.get(key) || { count: 0, r: 0, g: 0, b: 0 };

        bucket.count += 1;
        bucket.r += red;
        bucket.g += green;
        bucket.b += blue;
        buckets.set(key, bucket);
      }

      const colors = Array.from(buckets.values(), (bucket) => createColor(
        bucket.r / bucket.count,
        bucket.g / bucket.count,
        bucket.b / bucket.count,
        bucket.count
      ))
        .filter((color) => color.count >= 2)
        .sort((left, right) => right.count - left.count);

      resolve(colors.length > 0 ? colors : [createColor(26, 23, 21, 1)]);
    });

    image.addEventListener("error", () => {
      reject(new Error("Unable to load character image for theming."));
    });

    image.src = imageValue;
  });
}

/**
 * @param {Array<ReturnType<typeof createColor>>} colors
 */
function buildPaletteAnchors(colors) {
  const fallback = colors[0];

  return {
    dark: selectColor(colors, (color) => color.count * (1.1 - color.l) * 1.8 + color.s * 0.25, fallback),
    mid: selectColor(colors, (color) => color.count * (1 - Math.abs(color.l - 0.42)) * (0.65 + color.s), fallback),
    accent: selectColor(colors, (color) => color.count * (0.45 + color.s * 1.9) * (1 - Math.abs(color.l - 0.56)), fallback),
    light: selectColor(colors, (color) => color.count * (0.3 + color.l * 1.2) * (0.7 + color.s * 0.35), fallback),
    warm: selectColor(colors, (color) => {
      const warmth = 1 - hueDistance(color.h, 42) / 180;
      return color.count * (0.4 + warmth * 1.8) * (0.45 + color.s);
    }, fallback)
  };
}

/**
 * @param {Array<ReturnType<typeof createColor>>} colors
 * @param {(color: ReturnType<typeof createColor>) => number} scoreColor
 * @param {ReturnType<typeof createColor>} fallback
 */
function selectColor(colors, scoreColor, fallback) {
  let bestColor = fallback;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const color of colors) {
    const score = scoreColor(color);

    if (score > bestScore) {
      bestColor = color;
      bestScore = score;
    }
  }

  return bestColor;
}

/**
 * @param {number} red
 * @param {number} green
 * @param {number} blue
 * @param {number} count
 */
function createColor(red, green, blue, count = 1) {
  const r = clampColor(red);
  const g = clampColor(green);
  const b = clampColor(blue);
  const [h, s, l] = rgbToHsl(r, g, b);

  return { r, g, b, h, s, l, count };
}

/**
 * @param {ReturnType<typeof createColor>} left
 * @param {ReturnType<typeof createColor>} right
 * @param {number} amount
 */
function mixColors(left, right, amount) {
  const mixAmount = clamp(amount, 0, 1);

  return createColor(
    left.r + (right.r - left.r) * mixAmount,
    left.g + (right.g - left.g) * mixAmount,
    left.b + (right.b - left.b) * mixAmount
  );
}

/**
 * @param {ReturnType<typeof createColor>} color
 * @param {number} minLightness
 * @param {number} maxLightness
 * @param {number} minSaturation
 * @param {number} maxSaturation
 */
function tintToRange(color, minLightness, maxLightness, minSaturation, maxSaturation) {
  return createColor(...hslToRgb(
    color.h,
    clamp(color.s, minSaturation, maxSaturation),
    clamp(color.l, minLightness, maxLightness)
  ));
}

/**
 * @param {number} hue
 * @param {number} targetHue
 * @returns {number}
 */
function hueDistance(hue, targetHue) {
  const delta = Math.abs(hue - targetHue) % 360;
  return delta > 180 ? 360 - delta : delta;
}

/**
 * @param {number} red
 * @param {number} green
 * @param {number} blue
 * @returns {[number, number, number]}
 */
function rgbToHsl(red, green, blue) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return [0, 0, lightness];
  }

  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  let hue = 0;

  if (max === r) {
    hue = 60 * (((g - b) / delta) % 6);
  } else if (max === g) {
    hue = 60 * (((b - r) / delta) + 2);
  } else {
    hue = 60 * (((r - g) / delta) + 4);
  }

  return [hue < 0 ? hue + 360 : hue, saturation, lightness];
}

/**
 * @param {number} hue
 * @param {number} saturation
 * @param {number} lightness
 * @returns {[number, number, number]}
 */
function hslToRgb(hue, saturation, lightness) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const segment = hue / 60;
  const secondary = chroma * (1 - Math.abs((segment % 2) - 1));
  let r = 0;
  let g = 0;
  let b = 0;

  if (segment >= 0 && segment < 1) {
    r = chroma;
    g = secondary;
  } else if (segment < 2) {
    r = secondary;
    g = chroma;
  } else if (segment < 3) {
    g = chroma;
    b = secondary;
  } else if (segment < 4) {
    g = secondary;
    b = chroma;
  } else if (segment < 5) {
    r = secondary;
    b = chroma;
  } else {
    r = chroma;
    b = secondary;
  }

  const match = lightness - chroma / 2;

  return [
    (r + match) * 255,
    (g + match) * 255,
    (b + match) * 255
  ];
}

/**
 * @param {ReturnType<typeof createColor>} color
 * @returns {string}
 */
function toCssRgb(color) {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

/**
 * @param {ReturnType<typeof createColor>} color
 * @param {number} alpha
 * @returns {string}
 */
function toCssRgba(color, alpha) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

/**
 * @param {number} value
 * @returns {number}
 */
function clampColor(value) {
  return Math.round(clamp(value, 0, 255));
}

/**
 * @param {number} value
 * @param {number} minimum
 * @param {number} maximum
 * @returns {number}
 */
function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * @param {HTMLButtonElement} tab
 */
function setActiveSheetTab(tab) {
  sheetTabs.forEach((sheetTab) => {
    const isActive = sheetTab === tab;
    const panel = document.getElementById(sheetTab.getAttribute("aria-controls"));

    sheetTab.setAttribute("aria-selected", String(isActive));
    sheetTab.tabIndex = isActive ? 0 : -1;

    if (panel) {
      panel.hidden = !isActive;
    }
  });
}

/**
 * @param {CharacterState} nextState
 * @param {string} statusText
 */
function applyState(nextState, statusText) {
  state = nextState;
  nameInput.value = state.name;
  updateCharacterSheetTitle();
  adversityTokensInput.value = String(state.adversityTokens);
  notesBackstoryInput.value = state.notesBackstory;
  inventoryNotesInput.value = state.inventory;
  renderCharacterArt();
  renderStats();
  renderStrengths();
  renderSummary();
  persistState(statusText);
}

function showCharacterArtPreview() {
  appShell.classList.add("is-previewing-character");
  document.body.classList.add("is-previewing-character");
}

function hideCharacterArtPreview() {
  appShell.classList.remove("is-previewing-character");
  document.body.classList.remove("is-previewing-character");
}

function updateCharacterSheetTitle() {
  const trimmedName = state.name.trim();
  const nextTitle = trimmedName
    ? `"${trimmedName}" Character Sheet`
    : "Character Sheet";

  document.title = nextTitle;
  startupMenuTitleText.textContent = nextTitle;
  sheetTitleText.textContent = nextTitle;
}

/**
 * @param {boolean} isOpen
 */
function setSheetMenuOpen(isOpen) {
  sheetMenuPanel.classList.toggle("is-open", isOpen);
  sheetMenuToggle.setAttribute("aria-expanded", String(isOpen));
}

function renderStats() {
  const previousRects = new Map(
    Array.from(statsList.children, (row) => [row.dataset.statName, row.getBoundingClientRect()])
  );
  const rankedStats = getRankedStats();

  for (const [index, statEntry] of rankedStats.entries()) {
    const statRow = getOrCreateStatRow(statEntry.statName);
    syncStatRow(statRow, statEntry.statName, index + 1);
    statsList.append(statRow);
  }

  animateStatReorder(previousRects);
}

function renderStrengths() {
  strengthsList.replaceChildren();

  if (state.strengths.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "empty-message";
    emptyMessage.textContent = "No strengths yet. Add one to start building the character.";
    strengthsList.append(emptyMessage);
    return;
  }

  for (const strength of state.strengths) {
    const fragment = strengthTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".strength-card");
    const nameField = fragment.querySelector(".strength-name");
    const descriptionField = fragment.querySelector(".strength-description");
    const removeButton = fragment.querySelector(".remove-strength");

    nameField.value = strength.name;
    descriptionField.value = strength.description;

    nameField.addEventListener("input", () => {
      strength.name = nameField.value.trimStart();
      persistState("Strength updated.");
      renderSummary();
    });

    descriptionField.addEventListener("input", () => {
      strength.description = descriptionField.value.trimStart();
      persistState("Strength updated.");
      renderSummary();
    });

    removeButton.addEventListener("click", () => {
      state.strengths = state.strengths.filter((entry) => entry.id !== strength.id);
      collapsedSnapshotStrengthIds.delete(strength.id);
      renderStrengths();
      persistState("Strength removed.");
      renderSummary();
    });

    card.dataset.strengthId = strength.id;
    strengthsList.append(card);
  }
}

function renderSummary() {
  const rankedStats = getRankedStats();
  const namedStrengths = state.strengths.filter((strength) => strength.name.trim());

  const topStat = rankedStats[0];
  bestStatLabel.textContent = topStat.name;
  bestStatDetail.textContent = formatStatExpression(topStat.line);
  snapshotAdversity.textContent = String(state.adversityTokens);
  snapshotStrengthCount.textContent = String(namedStrengths.length);

  summaryStack.replaceChildren();

  const rankingCard = createSummaryListCard(
    "Stat Order",
    rankedStats.map((statEntry, index) => ({
      label: `${index + 1}. ${statEntry.name}`,
      value: formatStatExpression(statEntry.line)
    }))
  );
  summaryStack.append(rankingCard);

  const strengthsCard = createStrengthsSummaryCard(namedStrengths);
  summaryStack.append(strengthsCard);
}

/**
 * @param {string} title
 * @param {{ label: string, value: string }[]} items
 * @param {string} emptyMessage
 * @returns {HTMLElement}
 */
function createSummaryListCard(title, items, emptyMessage = "") {
  const card = document.createElement("article");
  card.className = "summary-card summary-card-list";

  const heading = document.createElement("h3");
  heading.textContent = title;
  card.append(heading);

  if (items.length === 0) {
    const emptyText = document.createElement("p");
    emptyText.className = "summary-expression";
    emptyText.textContent = emptyMessage;
    card.append(emptyText);
    return card;
  }

  const list = document.createElement("div");
  list.className = "summary-list";

  for (const item of items) {
    const row = document.createElement("div");
    row.className = "summary-list-row";

    const label = document.createElement("p");
    label.className = "summary-list-label";
    label.textContent = item.label;

    row.append(label);

    if (item.value) {
      const value = document.createElement("p");
      value.className = "summary-list-value";
      value.textContent = item.value;
      row.append(value);
    }

    list.append(row);
  }

  card.append(list);
  return card;
}

/**
 * @param {Strength[]} strengths
 * @returns {HTMLElement}
 */
function createStrengthsSummaryCard(strengths) {
  const card = document.createElement("article");
  card.className = "summary-card summary-card-list strengths-summary-card";

  const heading = document.createElement("h3");
  heading.textContent = "Current Strengths";
  card.append(heading);

  if (strengths.length === 0) {
    const emptyText = document.createElement("p");
    emptyText.className = "summary-expression";
    emptyText.textContent = "No named strengths.";
    card.append(emptyText);
    return card;
  }

  const list = document.createElement("div");
  list.className = "summary-list strengths-summary-list";

  for (const strength of strengths) {
    const strengthDetail = document.createElement("details");
    strengthDetail.className = "summary-list-row strength-summary-row";
    strengthDetail.open = !collapsedSnapshotStrengthIds.has(strength.id);
    strengthDetail.addEventListener("toggle", () => {
      if (strengthDetail.open) {
        collapsedSnapshotStrengthIds.delete(strength.id);
        return;
      }

      collapsedSnapshotStrengthIds.add(strength.id);
    });

    const summary = document.createElement("summary");
    summary.className = "summary-list-label strength-summary-label";
    summary.textContent = strength.name;

    const description = document.createElement("p");
    description.className = "summary-list-value strength-summary-description";
    description.textContent = strength.description.trim() || "No description yet.";

    strengthDetail.append(summary, description);
    list.append(strengthDetail);
  }

  card.append(list);
  return card;
}

/**
 * @param {string} statName
 * @returns {HTMLElement}
 */
function getOrCreateStatRow(statName) {
  const existingRow = statRowElements.get(statName);

  if (existingRow) {
    return existingRow;
  }

  const fragment = statRowTemplate.content.cloneNode(true);
  const statRow = fragment.querySelector(".stat-row");
  const baseDropdown = fragment.querySelector(".stat-base-die");
  const bonusDropdown = fragment.querySelector(".stat-bonus-die");
  const modifierInput = fragment.querySelector(".stat-modifier");
  const statNameInput = fragment.querySelector(".stat-name");

  initializeGlassDropdown(baseDropdown, DIE_OPTIONS, state.stats[statName].baseDie, (value) => {
    state.stats[statName].baseDie = value;
    refreshSheetState(`${getStatDisplayName(statName)} updated.`);
  });
  initializeGlassDropdown(bonusDropdown, BONUS_OPTIONS, state.stats[statName].bonusDie, (value) => {
    state.stats[statName].bonusDie = value;
    refreshSheetState(`${getStatDisplayName(statName)} updated.`);
  });

  statNameInput.addEventListener("input", () => {
    state.attributeNames[statName] = statNameInput.value.trimStart();
    renderSummary();
    persistState("Attribute renamed.");
  });

  modifierInput.addEventListener("input", () => {
    state.stats[statName].modifier = clampInteger(modifierInput.value);
    refreshStatModifierEdit(statName, `${getStatDisplayName(statName)} updated.`);
  });

  modifierInput.addEventListener("change", () => {
    state.stats[statName].modifier = clampInteger(modifierInput.value);
    refreshSheetState(`${getStatDisplayName(statName)} updated.`);
  });

  statRow.dataset.statName = statName;
  statRowElements.set(statName, statRow);
  return statRow;
}

/**
 * @param {HTMLElement} statRow
 * @param {string} statName
 * @param {number} rank
 */
function syncStatRow(statRow, statName, rank) {
  const statLine = state.stats[statName];
  const statNameInput = statRow.querySelector(".stat-name");
  const statRankElement = statRow.querySelector(".stat-rank");
  const statFormulaElement = statRow.querySelector(".stat-formula");
  const baseDropdown = statRow.querySelector(".stat-base-die");
  const bonusDropdown = statRow.querySelector(".stat-bonus-die");
  const modifierInput = statRow.querySelector(".stat-modifier");

  statRow.dataset.rank = String(rank);
  if (statNameInput.value !== getStatEditableName(statName)) {
    statNameInput.value = getStatEditableName(statName);
  }
  statRankElement.textContent = rank === 1 ? "Top Edge" : `Rank ${rank}`;
  statFormulaElement.textContent = formatStatExpression(statLine);

  setGlassDropdownValue(baseDropdown, statLine.baseDie);
  setGlassDropdownValue(bonusDropdown, statLine.bonusDie);

  if (modifierInput.value !== String(statLine.modifier)) {
    modifierInput.value = String(statLine.modifier);
  }
}

/**
 * @returns {{ statName: string, name: string, line: StatLine, score: number }[]}
 */
function getRankedStats() {
  return STAT_NAMES
    .map((statName, index) => ({
      statName,
      name: getStatDisplayName(statName),
      line: state.stats[statName],
      score: scoreStatLine(state.stats[statName]),
      originalIndex: index
    }))
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.originalIndex - right.originalIndex;
    });
}

/**
 * @param {Map<string, DOMRect>} previousRects
 */
function animateStatReorder(previousRects) {
  for (const statRow of statsList.children) {
    const previousRect = previousRects.get(statRow.dataset.statName);

    if (!previousRect) {
      statRow.animate(
        [
          { opacity: 0, transform: "translateY(14px) scale(0.98)" },
          { opacity: 1, transform: "translateY(0) scale(1)" }
        ],
        {
          duration: 320,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)"
        }
      );
      continue;
    }

    const currentRect = statRow.getBoundingClientRect();
    const deltaX = previousRect.left - currentRect.left;
    const deltaY = previousRect.top - currentRect.top;

    if (deltaX === 0 && deltaY === 0) {
      continue;
    }

    statRow.animate(
      [
        {
          transform: `translate(${deltaX}px, ${deltaY}px) scale(0.985)`,
          boxShadow: "0 24px 42px rgba(5, 18, 31, 0.18)"
        },
        {
          transform: "translate(0, 0) scale(1)",
          boxShadow: "0 20px 36px rgba(5, 18, 31, 0.1)"
        }
      ],
      {
        duration: 460,
        easing: "cubic-bezier(0.22, 1, 0.36, 1)"
      }
    );
  }
}

/**
 * @param {string} statusText
 */
function refreshSheetState(statusText) {
  renderStats();
  renderSummary();
  persistState(statusText);
}

/**
 * @param {string} statName
 * @param {string} statusText
 */
function refreshStatModifierEdit(statName, statusText) {
  const statRow = statRowElements.get(statName);

  if (statRow) {
    const statFormulaElement = statRow.querySelector(".stat-formula");

    if (statFormulaElement) {
      statFormulaElement.textContent = formatStatExpression(state.stats[statName]);
    }
  }

  renderSummary();
  persistState(statusText);
}

/**
 * @param {HTMLElement} dropdownElement
 * @param {string[]} options
 * @param {string} selectedValue
 * @param {(value: string) => void} onSelect
 */
function initializeGlassDropdown(dropdownElement, options, selectedValue, onSelect) {
  const toggle = dropdownElement.querySelector(".glass-select-toggle");
  const menu = dropdownElement.querySelector(".glass-select-menu");

  menu.replaceChildren();

  for (const optionValue of options) {
    const optionButton = document.createElement("button");
    optionButton.type = "button";
    optionButton.className = "glass-select-option";
    optionButton.dataset.value = optionValue;
    optionButton.textContent = optionValue;
    optionButton.addEventListener("click", () => {
      setGlassDropdownValue(dropdownElement, optionValue);
      closeGlassDropdown(dropdownElement);
      onSelect(optionValue);
    });
    menu.append(optionButton);
  }

  toggle.addEventListener("click", () => {
    const isOpen = dropdownElement.classList.contains("is-open");
    closeAllGlassDropdowns();

    if (!isOpen) {
      openGlassDropdown(dropdownElement);
    }
  });

  setGlassDropdownValue(dropdownElement, selectedValue);
}

/**
 * @param {HTMLElement} dropdownElement
 * @param {string} value
 */
function setGlassDropdownValue(dropdownElement, value) {
  const toggle = dropdownElement.querySelector(".glass-select-toggle");
  const optionButtons = dropdownElement.querySelectorAll(".glass-select-option");

  dropdownElement.dataset.value = value;
  toggle.textContent = value;

  optionButtons.forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.value === value);
  });
}

/**
 * @param {HTMLElement} dropdownElement
 */
function openGlassDropdown(dropdownElement) {
  const toggle = dropdownElement.querySelector(".glass-select-toggle");
  const statRow = dropdownElement.closest(".stat-row");

  dropdownElement.classList.add("is-open");
  if (statRow) {
    statRow.classList.add("has-open-dropdown");
  }
  toggle.setAttribute("aria-expanded", "true");
}

/**
 * @param {HTMLElement} dropdownElement
 */
function closeGlassDropdown(dropdownElement) {
  const toggle = dropdownElement.querySelector(".glass-select-toggle");
  const statRow = dropdownElement.closest(".stat-row");

  dropdownElement.classList.remove("is-open");
  if (statRow) {
    statRow.classList.remove("has-open-dropdown");
  }
  toggle.setAttribute("aria-expanded", "false");
}

function closeAllGlassDropdowns() {
  document.querySelectorAll(".glass-select.is-open").forEach((dropdownElement) => {
    closeGlassDropdown(/** @type {HTMLElement} */ (dropdownElement));
  });
}

/**
 * @param {string} statName
 * @returns {string}
 */
function getStatEditableName(statName) {
  return state.attributeNames[statName] ?? statName;
}

/**
 * @param {string} statName
 * @returns {string}
 */
function getStatDisplayName(statName) {
  return getStatEditableName(statName).trim() || statName;
}

/**
 * @param {StatLine} statLine
 * @returns {string}
 */
function formatStatExpression(statLine) {
  let expression = statLine.baseDie;

  if (statLine.bonusDie !== "None") {
    expression += ` + ${statLine.bonusDie}`;
  }

  if (statLine.modifier !== 0) {
    expression += statLine.modifier > 0
      ? ` + ${statLine.modifier}`
      : ` - ${Math.abs(statLine.modifier)}`;
  }

  return expression;
}

/**
 * @param {StatLine} statLine
 * @returns {number}
 */
function scoreStatLine(statLine) {
  return parseDieValue(statLine.baseDie) + parseDieValue(statLine.bonusDie) + statLine.modifier;
}

/**
 * @param {string} dieLabel
 * @returns {number}
 */
function parseDieValue(dieLabel) {
  if (dieLabel === "None") {
    return 0;
  }

  return Number.parseInt(dieLabel.replace("d", ""), 10);
}

/**
 * @returns {Strength}
 */
function createStrength() {
  return {
    id: crypto.randomUUID(),
    name: "",
    description: ""
  };
}

/**
 * @returns {CharacterState}
 */
function createDefaultState() {
  return {
    name: DEFAULT_STATE.name,
    adversityTokens: DEFAULT_STATE.adversityTokens,
    characterImage: DEFAULT_STATE.characterImage,
    notesBackstory: DEFAULT_STATE.notesBackstory,
    inventory: DEFAULT_STATE.inventory,
    stats: STAT_NAMES.reduce((result, statName) => {
      const statLine = DEFAULT_STATE.stats[statName];
      result[statName] = {
        baseDie: statLine.baseDie,
        bonusDie: statLine.bonusDie,
        modifier: statLine.modifier
      };
      return result;
    }, {}),
    attributeNames: STAT_NAMES.reduce((result, statName) => {
      result[statName] = DEFAULT_STATE.attributeNames[statName];
      return result;
    }, {}),
    strengths: DEFAULT_STATE.strengths.map((strength) => ({
      id: crypto.randomUUID(),
      name: strength.name,
      description: strength.description
    }))
  };
}

/**
 * @returns {Record<string, unknown>}
 */
function serializeCharacterState() {
  return {
    version: 1,
    name: state.name,
    adversityTokens: state.adversityTokens,
    characterImage: state.characterImage,
    notesBackstory: state.notesBackstory,
    inventory: state.inventory,
    attributeNames: STAT_NAMES.reduce((result, statName) => {
      result[statName] = state.attributeNames[statName] ?? statName;
      return result;
    }, {}),
    stats: STAT_NAMES.reduce((result, statName) => {
      result[statName] = {
        baseDie: state.stats[statName].baseDie,
        bonusDie: state.stats[statName].bonusDie,
        modifier: state.stats[statName].modifier
      };
      return result;
    }, {}),
    strengths: state.strengths.map((strength) => ({
      id: strength.id,
      name: strength.name,
      description: strength.description
    }))
  };
}

/**
 * @param {Partial<CharacterState> & { stats?: Record<string, Partial<StatLine>> }} parsedState
 * @returns {CharacterState}
 */
function normalizeCharacterState(parsedState) {
  const fallbackState = createDefaultState();

  fallbackState.name = typeof parsedState.name === "string" ? parsedState.name : fallbackState.name;
  fallbackState.adversityTokens = Number.isFinite(parsedState.adversityTokens)
    ? clampInteger(parsedState.adversityTokens, 0)
    : fallbackState.adversityTokens;
  fallbackState.characterImage = typeof parsedState.characterImage === "string" ? parsedState.characterImage : fallbackState.characterImage;
  fallbackState.notesBackstory = typeof parsedState.notesBackstory === "string" ? parsedState.notesBackstory : fallbackState.notesBackstory;
  fallbackState.inventory = typeof parsedState.inventory === "string" ? parsedState.inventory : fallbackState.inventory;

  if (parsedState.attributeNames && typeof parsedState.attributeNames === "object") {
    for (const statName of STAT_NAMES) {
      const parsedAttributeName = parsedState.attributeNames[statName];

      if (typeof parsedAttributeName === "string") {
        fallbackState.attributeNames[statName] = parsedAttributeName;
      }
    }
  }

  for (const statName of STAT_NAMES) {
    const parsedStat = parsedState.stats && parsedState.stats[statName];

    if (!parsedStat) {
      continue;
    }

    fallbackState.stats[statName] = {
      baseDie: DIE_OPTIONS.includes(parsedStat.baseDie) ? parsedStat.baseDie : fallbackState.stats[statName].baseDie,
      bonusDie: BONUS_OPTIONS.includes(parsedStat.bonusDie) ? parsedStat.bonusDie : fallbackState.stats[statName].bonusDie,
      modifier: Number.isFinite(parsedStat.modifier) ? clampInteger(parsedStat.modifier) : fallbackState.stats[statName].modifier
    };
  }

  if (Array.isArray(parsedState.strengths)) {
    fallbackState.strengths = parsedState.strengths.map((strength) => ({
      id: typeof strength.id === "string" && strength.id ? strength.id : crypto.randomUUID(),
      name: typeof strength.name === "string" ? strength.name : "",
      description: typeof strength.description === "string" ? strength.description : ""
    }));
  }

  return fallbackState;
}

/**
 * @returns {CharacterState}
 */
function loadState() {
  const savedState = window.localStorage.getItem(STORAGE_KEY);

  if (!savedState) {
    return createDefaultState();
  }

  try {
    /** @type {Partial<CharacterState>} */
    const parsedState = JSON.parse(savedState);
    return normalizeCharacterState(parsedState);
  } catch (error) {
    console.warn("Unable to load saved character sheet state.", error);
  }

  return createDefaultState();
}

/**
 * @param {string} statusText
 */
function persistState(statusText) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  saveStatus.textContent = statusText;
  window.clearTimeout(persistState.statusTimeout);
  persistState.statusTimeout = window.setTimeout(() => {
    saveStatus.textContent = getIdleStatusText();
  }, 1600);
}

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    });
    reader.addEventListener("error", () => {
      reject(reader.error || new Error("Unable to read image file."));
    });
    reader.readAsDataURL(file);
  });
}

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      resolve(typeof reader.result === "string" ? reader.result : "");
    });
    reader.addEventListener("error", () => {
      reject(reader.error || new Error("Unable to read text file."));
    });
    reader.readAsText(file);
  });
}

/**
 * @param {string | number} value
 * @param {number} minimum
 * @returns {number}
 */
function clampInteger(value, minimum = Number.NEGATIVE_INFINITY) {
  const parsedValue = Number.parseInt(String(value), 10);

  if (Number.isNaN(parsedValue)) {
    return Math.max(0, minimum === Number.NEGATIVE_INFINITY ? 0 : minimum);
  }

  return Math.max(minimum, parsedValue);
}
