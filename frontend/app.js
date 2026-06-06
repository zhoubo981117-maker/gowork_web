// ── State ──────────────────────────────────────────────────────────────────
let currentCardId = null;

const COLUMNS = ["todo", "applied", "interview", "offer", "rejected"];

// ── API helpers ────────────────────────────────────────────────────────────
const api = {
  async getCards() {
    const r = await fetch("/api/cards");
    return r.json();
  },
  async createCard(company, role, status) {
    const r = await fetch("/api/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company, role, status }),
    });
    return r.json();
  },
  async updateCard(id, data) {
    const r = await fetch(`/api/cards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return r.json();
  },
  async deleteCard(id) {
    await fetch(`/api/cards/${id}`, { method: "DELETE" });
  },
  async getAttachments(cardId) {
    const r = await fetch(`/api/files/card/${cardId}`);
    return r.json();
  },
  async uploadFile(cardId, type, file) {
    const form = new FormData();
    form.append("file", file);
    const r = await fetch(`/api/files/upload?card_id=${cardId}&type=${type}`, {
      method: "POST",
      body: form,
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async deleteAttachment(attId) {
    await fetch(`/api/files/${attId}`, { method: "DELETE" });
  },
};

// ── Render helpers ─────────────────────────────────────────────────────────
function esc(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderCards(cards) {
  COLUMNS.forEach((status) => {
    const list = document.getElementById(`col-${status}`);
    if (list) list.innerHTML = "";
  });

  cards.forEach((card) => {
    const list = document.getElementById(`col-${card.status}`);
    if (!list) return;
    const el = document.createElement("div");
    el.className = "card";
    el.dataset.cardId = card.id;
    el.innerHTML = `
      <div class="card-company">${esc(card.company)}</div>
      <div class="card-role">${esc(card.role)}</div>
    `;
    el.addEventListener("click", () => openPanel(card));
    list.appendChild(el);
  });
}

// ── Load all cards ─────────────────────────────────────────────────────────
async function loadCards() {
  const cards = await api.getCards();
  renderCards(cards);
}

// ── Sortable ───────────────────────────────────────────────────────────────
function initSortable() {
  COLUMNS.forEach((status) => {
    const el = document.getElementById(`col-${status}`);
    if (!el) return;
    Sortable.create(el, {
      group: "kanban",
      animation: 150,
      ghostClass: "sortable-ghost",
      chosenClass: "sortable-chosen",
      onEnd: async (evt) => {
        const cardId = parseInt(evt.item.dataset.cardId);
        const newStatus = evt.to.dataset.status;
        const newOrder = evt.newIndex;
        await api.updateCard(cardId, { status: newStatus, sort_order: newOrder });
        await loadCards();
      },
    });
  });
}

// ── Detail panel ───────────────────────────────────────────────────────────
async function openPanel(card) {
  currentCardId = card.id;
  document.getElementById("panel-title").textContent = `${card.company} · ${card.role}`;
  document.getElementById("edit-company").value = card.company;
  document.getElementById("edit-role").value = card.role;
  document.getElementById("edit-notes").value = card.notes || "";
  document.getElementById("detail-panel").hidden = false;
  await loadAttachments();
}

function closePanel() {
  document.getElementById("detail-panel").hidden = true;
  currentCardId = null;
}

// ── Save card ──────────────────────────────────────────────────────────────
document.getElementById("save-card").addEventListener("click", async () => {
  if (!currentCardId) return;
  const updated = await api.updateCard(currentCardId, {
    company: document.getElementById("edit-company").value.trim(),
    role: document.getElementById("edit-role").value.trim(),
    notes: document.getElementById("edit-notes").value,
  });
  document.getElementById("panel-title").textContent =
    `${updated.company} · ${updated.role}`;
  await loadCards();
});

// ── Delete card ────────────────────────────────────────────────────────────
document.getElementById("delete-card").addEventListener("click", async () => {
  if (!currentCardId || !confirm("确认删除这张卡片？")) return;
  await api.deleteCard(currentCardId);
  closePanel();
  await loadCards();
});

document.getElementById("close-panel").addEventListener("click", closePanel);

// ── Add card modal ─────────────────────────────────────────────────────────
let pendingStatus = "todo";

document.querySelectorAll(".add-btn").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    pendingStatus = btn.dataset.status;
    document.getElementById("new-company").value = "";
    document.getElementById("new-role").value = "";
    document.getElementById("modal-overlay").hidden = false;
    document.getElementById("new-company").focus();
  });
});

document.getElementById("confirm-add").addEventListener("click", async () => {
  const company = document.getElementById("new-company").value.trim();
  const role = document.getElementById("new-role").value.trim();
  if (!company || !role) return;
  document.getElementById("modal-overlay").hidden = true;
  await api.createCard(company, role, pendingStatus);
  await loadCards();
});

document.getElementById("cancel-add").addEventListener("click", () => {
  document.getElementById("modal-overlay").hidden = true;
});

document.getElementById("modal-overlay").addEventListener("click", (e) => {
  if (e.target === e.currentTarget) e.currentTarget.hidden = true;
});

["new-company", "new-role"].forEach((id) => {
  document.getElementById(id).addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("confirm-add").click();
  });
});

// ── Attachments ────────────────────────────────────────────────────────────
async function loadAttachments() {
  if (!currentCardId) return;
  const atts = await api.getAttachments(currentCardId);
  renderImages(atts.filter((a) => a.type === "image"));
  renderFiles(atts.filter((a) => a.type !== "image"));
}

function renderImages(atts) {
  const grid = document.getElementById("images-grid");
  grid.innerHTML = "";
  atts.forEach((att) => {
    const wrap = document.createElement("div");
    wrap.className = "att-thumb";
    wrap.innerHTML = `
      <img src="/api/files/${att.id}" alt="${esc(att.filename)}" />
      <button class="del-btn" title="删除">✕</button>
    `;
    wrap.querySelector("img").addEventListener("click", () =>
      showLightbox(`/api/files/${att.id}`)
    );
    wrap.querySelector(".del-btn").addEventListener("click", async () => {
      await api.deleteAttachment(att.id);
      await loadAttachments();
    });
    grid.appendChild(wrap);
  });
}

function renderFiles(atts) {
  const list = document.getElementById("files-list");
  list.innerHTML = "";
  atts.forEach((att) => {
    const item = document.createElement("div");
    item.className = "file-item";
    item.innerHTML = `
      <a href="/api/files/${att.id}" target="_blank">${esc(att.filename)}</a>
      <button class="del-btn" title="删除">✕</button>
    `;
    item.querySelector(".del-btn").addEventListener("click", async () => {
      await api.deleteAttachment(att.id);
      await loadAttachments();
    });
    list.appendChild(item);
  });
}

// ── Paste zone ─────────────────────────────────────────────────────────────
const pasteZone = document.getElementById("paste-zone");

pasteZone.addEventListener("focus", () => pasteZone.classList.add("active"));
pasteZone.addEventListener("blur", () => pasteZone.classList.remove("active"));

document.addEventListener("paste", async (e) => {
  if (!currentCardId) return;
  const items = Array.from(e.clipboardData.items || []);
  const imageItem = items.find((i) => i.type.startsWith("image/"));
  if (!imageItem) return;
  const file = imageItem.getAsFile();
  if (!file) return;
  const named = new File([file], `jd_${Date.now()}.png`, { type: file.type });
  try {
    await api.uploadFile(currentCardId, "image", named);
    await loadAttachments();
  } catch (err) {
    alert("图片上传失败：" + err.message);
  }
});

// ── File input ─────────────────────────────────────────────────────────────
document.getElementById("file-input").addEventListener("change", async (e) => {
  if (!currentCardId || !e.target.files.length) return;
  const file = e.target.files[0];
  const ext = file.name.split(".").pop().toLowerCase();
  const type = ext === "pdf" ? "pdf" : "docx";
  try {
    await api.uploadFile(currentCardId, type, file);
    await loadAttachments();
  } catch (err) {
    alert("文件上传失败：" + err.message);
  }
  e.target.value = "";
});

// ── Lightbox ───────────────────────────────────────────────────────────────
function showLightbox(src) {
  const lb = document.createElement("div");
  lb.className = "lightbox";
  lb.innerHTML = `<img src="${src}" alt="preview" />`;
  lb.addEventListener("click", () => lb.remove());
  document.body.appendChild(lb);
}

// ── Boot ───────────────────────────────────────────────────────────────────
initSortable();
loadCards();
