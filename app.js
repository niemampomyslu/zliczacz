"use strict";

const KEY = "fence-counter-v1"; // Keep the existing storage key for backwards compatibility.
const SIDE_NAMES = ["Jacek / Piotrek", "Tomek / Jacek", "Jacek / Bożena"];
const ELEMENTS = [
  ["panels", "Panele (siatka)", "szt."],
  ["bases", "Podwaliny betonowe", "szt."],
  ["channels", "Ceowniki", "szt."],
  ["clamps", "Obejmy (kpl.)", "kpl."],
  ["posts", "Słupki", "szt."],
  ["anchors", "Kotwy", "szt."]
];
const COUNT_KEYS = ELEMENTS.filter(([key]) => key !== "anchors").map(([key]) => key);
const empty = () => Object.fromEntries(COUNT_KEYS.map(key => [key, 0]));
const blankPrices = () => Object.fromEntries(ELEMENTS.map(([key]) => [key, 0]));
const initial = () => ({ selected: 0, sides: [empty(), empty(), empty()], prices: blankPrices() });

function valid(value) {
  return value && Array.isArray(value.sides) && value.sides.length === 3 &&
    value.sides.every(side => side && COUNT_KEYS.every(key => Number.isSafeInteger(side[key]) && side[key] >= 0));
}
function migrate(value) {
  return {
    ...value,
    selected: Number.isInteger(value.selected) && value.selected >= 0 && value.selected < 3 ? value.selected : 0,
    prices: Object.fromEntries(ELEMENTS.map(([key]) => {
      const price = value.prices?.[key];
      return [key, typeof price === "number" && Number.isFinite(price) && price >= 0 && price <= 1000000000
        ? Math.round(price * 100) / 100 : 0];
    }))
  };
}
let state;
try {
  const stored = JSON.parse(localStorage.getItem(KEY));
  state = valid(stored) ? migrate(stored) : initial();
} catch {
  state = initial();
}
const history = [];
const priceEdits = new WeakSet(); // One undo step per continuous field edit.
const $ = id => document.getElementById(id);
const PLN = new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" });

const quantity = (side, key) => key === "anchors" ? side.posts : side[key];
const totalQuantity = key => state.sides.reduce((sum, side) => sum + quantity(side, key), 0);
const unitCents = key => Math.round(state.prices[key] * 100);
const itemCents = (side, key) => quantity(side, key) * unitCents(key);
const sideCents = side => ELEMENTS.reduce((sum, [key]) => sum + itemCents(side, key), 0);
const allCents = () => state.sides.reduce((sum, side) => sum + sideCents(side), 0);
const currency = cents => PLN.format(cents / 100);
const priceText = value => value ? String(value).replace(".", ",") : "";

// Input events fire for each keystroke (including on iOS); "change" waits for blur.
// Accept a Polish decimal comma and incomplete but valid values like "19,".
function parsePrice(text) {
  const raw = text.trim().replace(/[\s\u00a0]/g, "").replace(",", ".");
  if (raw === "") return 0;
  if (!/^(?:\d+(?:\.\d{0,2})?|\.\d{1,2})$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value <= 1000000000
    ? Math.round(value * 100) / 100 : null;
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(state));
}
function toast(message) {
  $("toast").textContent = message;
  $("toast").style.display = "block";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("toast").style.display = "none", 1800);
}
function snapshot() {
  history.push(JSON.stringify(state));
  if (history.length > 100) history.shift();
}

// Update totals without re-rendering inputs: the keyboard, focus and caret stay put.
function updateCosts() {
  const current = state.sides[state.selected];
  $("sideCost").textContent = currency(sideCents(current));
  for (const [key] of ELEMENTS) {
    $("item-cost-" + key).textContent = currency(itemCents(current, key));
    $("total-cost-" + key).textContent = currency(
      state.sides.reduce((sum, side) => sum + itemCents(side, key), 0)
    );
  }
  $("grandTotal").textContent = currency(allCents());
}
function render() {
  const current = state.sides[state.selected];
  $("tabs").innerHTML = state.sides.map((_, i) =>
    `<button class="tab ${i === state.selected ? "active" : ""}" data-side="${i}" aria-pressed="${i === state.selected}">${SIDE_NAMES[i]}</button>`
  ).join("");

  const count = ELEMENTS.reduce((sum, [key]) => sum + quantity(current, key), 0);
  $("summary").innerHTML = `<span>${SIDE_NAMES[state.selected]} • ${count} elementów łącznie</span><strong id="sideCost">${currency(sideCents(current))}</strong>`;

  $("items").innerHTML = ELEMENTS.map(([key, name, unit]) => {
    const isAnchor = key === "anchors";
    const counter = isAnchor
      ? `<div class="linked-count"><output class="count">${quantity(current, key)}</output><span>1 na słupek</span></div>`
      : `<div class="controls"><button class="btn minus" data-key="${key}" data-delta="-1" aria-label="Odejmij: ${name}">−</button><output class="count">${quantity(current, key)}</output><button class="btn plus" data-key="${key}" data-delta="1" aria-label="Dodaj: ${name}">+</button></div>`;
    return `<article class="item">
      <div class="item-top"><div><div class="name">${name}</div><div class="sub">${isAnchor ? "Automatycznie = liczba słupków" : unit}</div></div>${counter}</div>
      <div class="pricing"><div class="price-entry"><label class="price-label" for="price-${key}">Cena za ${unit}</label>
        <div class="price-field"><input id="price-${key}" data-price="${key}" type="text" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${priceText(state.prices[key])}" aria-label="Cena jednostkowa: ${name}"><span>zł</span></div></div>
        <div class="line-cost"><span>Koszt</span><strong id="item-cost-${key}">${currency(itemCents(current, key))}</strong></div>
      </div></article>`;
  }).join("");

  $("totals").innerHTML = ELEMENTS.map(([key, name, unit]) =>
    `<div class="totalrow"><span>${name}</span><div class="total-values"><strong>${totalQuantity(key)} ${unit}</strong><span id="total-cost-${key}">${currency(state.sides.reduce((sum, side) => sum + itemCents(side, key), 0))}</span></div></div>`
  ).join("");
  $("grandTotal").textContent = currency(allCents());
}

$("tabs").addEventListener("click", event => {
  const button = event.target.closest("[data-side]");
  if (!button) return;
  state.selected = Number(button.dataset.side);
  save();
  render();
});
$("items").addEventListener("click", event => {
  const button = event.target.closest("button[data-key]");
  if (!button) return;
  const key = button.dataset.key;
  const delta = Number(button.dataset.delta);
  const side = state.sides[state.selected];
  if (!COUNT_KEYS.includes(key) || ![-1, 1].includes(delta) ||
      side[key] + delta < 0 || side[key] + delta > Number.MAX_SAFE_INTEGER) return;
  snapshot();
  side[key] += delta;
  save();
  render();
});
$("items").addEventListener("input", event => {
  const input = event.target;
  if (!input.matches("input[data-price]") || event.isComposing) return;
  const key = input.dataset.price;
  if (!ELEMENTS.some(([name]) => name === key)) return;
  const price = parsePrice(input.value);
  if (price === null) return; // Temporary invalid input is corrected on focusout.
  if (state.prices[key] !== price) {
    if (!priceEdits.has(input)) {
      snapshot();
      priceEdits.add(input);
    }
    state.prices[key] = price;
    save(); // Synchronous localStorage write, no blur or confirmation required.
    updateCosts(); // Do not replace the input while the user is typing.
  }
});
$("items").addEventListener("focusout", event => {
  const input = event.target;
  if (!input.matches("input[data-price]")) return;
  const key = input.dataset.price;
  if (!ELEMENTS.some(([name]) => name === key)) return;
  const wasValid = parsePrice(input.value) !== null;
  input.value = priceText(state.prices[key]);
  priceEdits.delete(input);
  if (!wasValid) toast("Podaj poprawną cenę (maks. 2 miejsca po przecinku)");
});
$("undo").onclick = () => {
  if (!history.length) return toast("Brak zmian do cofnięcia");
  state = JSON.parse(history.pop());
  save();
  render();
  toast("Cofnięto");
};
function download(content, filename, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const decimal = number => number.toFixed(2).replace(".", ",");
$("export").onclick = () => {
  const rows = [
    ["Strona", "Element", "Ilość", "Jednostka", "Cena jednostkowa (zł)", "Koszt (zł)"],
    ...state.sides.flatMap((side, index) => ELEMENTS.map(([key, name, unit]) =>
      [SIDE_NAMES[index], name, quantity(side, key), unit, decimal(state.prices[key]), decimal(itemCents(side, key) / 100)])),
    ...ELEMENTS.map(([key, name, unit]) =>
      ["SUMA", name, totalQuantity(key), unit, decimal(state.prices[key]),
        decimal(state.sides.reduce((sum, side) => sum + itemCents(side, key), 0) / 100)]),
    ["RAZEM", "Koszt całego ogrodzenia", "", "", "", decimal(allCents() / 100)]
  ];
  const csv = "\ufeff" + rows.map(row => row.map(value =>
    `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\r\n");
  download(csv, "ogrodzenie.csv", "text/csv;charset=utf-8");
};
$("backup").onclick = () => download(JSON.stringify(state, null, 2), "ogrodzenie-kopia.json", "application/json");
$("importBtn").onclick = () => $("importFile").click();
$("importFile").onchange = async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!valid(imported)) throw Error("format");
    if (!confirm("Zastąpić obecne wyniki danymi z kopii?")) return;
    snapshot();
    state = migrate(imported);
    save();
    render();
    toast("Wczytano kopię");
  } catch {
    alert("Nieprawidłowy plik kopii JSON.");
  } finally {
    event.target.value = "";
  }
};
$("reset").onclick = () => {
  if (!confirm(`Wyzerować wszystkie liczniki: ${SIDE_NAMES[state.selected]}? Ceny jednostkowe pozostaną bez zmian.`)) return;
  snapshot();
  state.sides[state.selected] = empty();
  save();
  render();
  toast("Wyzerowano stronę");
};
render();
