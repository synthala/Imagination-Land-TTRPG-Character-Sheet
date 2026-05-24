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
  strengths: []
};

/** @type {CharacterState} */
let state = loadState();

const appShell = document.querySelector(".app-shell");
const nameInput = document.querySelector("#character-name");
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
}

function bindStaticEvents() {
  nameInput.addEventListener("input", () => {
    state.name = nameInput.value.trimStart();
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
  sheetCharacterUnderlay.style.backgroundImage = backgroundImageValue;
  characterBackgroundBlur.style.opacity = hasCharacterImage ? "" : "0";
  characterBackgroundFocus.style.opacity = hasCharacterImage ? "" : "0";
  sheetCharacterUnderlay.style.opacity = hasCharacterImage ? "" : "0";
  clearImageButton.disabled = !state.characterImage;
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

function closeSheetMenu() {
  setSheetMenuOpen(false);
}

function getIdleStatusText() {
  return "Saved locally.";
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
}

function hideCharacterArtPreview() {
  appShell.classList.remove("is-previewing-character");
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
    const statRow = getOrCreateStatRow(statEntry.name);
    syncStatRow(statRow, statEntry.name, index + 1);
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
    });

    removeButton.addEventListener("click", () => {
      state.strengths = state.strengths.filter((entry) => entry.id !== strength.id);
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

  const strengthsCard = createSummaryListCard(
    "Named Strengths",
    namedStrengths.map((strength) => ({
      label: strength.name,
      value: strength.description.trim()
    })),
    "No named strengths."
  );
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

  initializeGlassDropdown(baseDropdown, DIE_OPTIONS, state.stats[statName].baseDie, (value) => {
    state.stats[statName].baseDie = value;
    refreshSheetState(`${statName} updated.`);
  });
  initializeGlassDropdown(bonusDropdown, BONUS_OPTIONS, state.stats[statName].bonusDie, (value) => {
    state.stats[statName].bonusDie = value;
    refreshSheetState(`${statName} updated.`);
  });

  modifierInput.addEventListener("input", () => {
    state.stats[statName].modifier = clampInteger(modifierInput.value);
    refreshSheetState(`${statName} updated.`);
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
  const statNameElement = statRow.querySelector(".stat-name");
  const statRankElement = statRow.querySelector(".stat-rank");
  const statFormulaElement = statRow.querySelector(".stat-formula");
  const baseDropdown = statRow.querySelector(".stat-base-die");
  const bonusDropdown = statRow.querySelector(".stat-bonus-die");
  const modifierInput = statRow.querySelector(".stat-modifier");

  statRow.dataset.rank = String(rank);
  statNameElement.textContent = statName;
  statRankElement.textContent = rank === 1 ? "Top Edge" : `Rank ${rank}`;
  statFormulaElement.textContent = formatStatExpression(statLine);

  setGlassDropdownValue(baseDropdown, statLine.baseDie);
  setGlassDropdownValue(bonusDropdown, statLine.bonusDie);

  if (modifierInput.value !== String(statLine.modifier)) {
    modifierInput.value = String(statLine.modifier);
  }
}

/**
 * @returns {{ name: string, line: StatLine, score: number }[]}
 */
function getRankedStats() {
  return STAT_NAMES
    .map((statName, index) => ({
      name: statName,
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
