/* ==========================================
   SMART PHONEBOOK - INTERACTIVE CONTROLLER
   ========================================== */

const API_URL = "http://localhost:5000/contacts";

// DOM Elements
const contactForm = document.getElementById("contactForm");
const contactList = document.getElementById("contactList");
const searchInput = document.getElementById("searchInput");
const themeCheckbox = document.getElementById("themeCheckbox");
const toastContainer = document.getElementById("toastContainer");

const statTotalVal = document.querySelector("#statTotal .stat-value");
const statFavoritesVal = document.querySelector("#statFavorites .stat-value");
const statTagsVal = document.querySelector("#statTags .stat-value");

const tagFilters = document.getElementById("tagFilters");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFileInput = document.getElementById("importFileInput");

const contactModal = document.getElementById("contactModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalAvatar = document.getElementById("modalAvatar");
const modalName = document.getElementById("modalName");
const modalCompany = document.getElementById("modalCompany");
const modalPhone = document.getElementById("modalPhone");
const modalEmail = document.getElementById("modalEmail");
const modalAddress = document.getElementById("modalAddress");
const modalTags = document.getElementById("modalTags");

// State
let allContacts = [];
let activeTagFilter = "all";
let isBackendOnline = true;
let editingContactId = null;

// Storage keys
const LOCAL_STORAGE_KEY = "smart_phonebook_contacts";
const FAVORITES_STORAGE_KEY = "smart_phonebook_favorites";

/* =========================
   TOAST NOTIFICATION ENGINE
   ========================= */
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let icon = "✨";
  if (type === "success") icon = "✅";
  else if (type === "error") icon = "❌";
  else if (type === "info") icon = "ℹ️";

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;

  toastContainer.appendChild(toast);

  // Smooth slide out and removal
  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/* =========================
   THEME MANAGER
   ========================= */
function initTheme() {
  const saved = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", saved);
  themeCheckbox.checked = saved === "dark";
}

themeCheckbox.addEventListener("change", () => {
  const theme = themeCheckbox.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  showToast(`Switched to ${theme} mode`, "info");
});

/* =========================
   FAVORITES MANAGER (STARS)
   ========================= */
function getStarredSet() {
  return new Set(JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY) || "[]"));
}

function isStarred(id) {
  return getStarredSet().has(id);
}

function toggleStar(id) {
  const set = getStarredSet();
  const idStr = String(id);

  if (set.has(idStr)) {
    set.delete(idStr);
    showToast("Removed from favorites", "info");
  } else {
    set.add(idStr);
    showToast("Added to favorites", "success");
  }

  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...set]));
  renderApp();
}

/* =========================
   MOCK LOCAL STORAGE DATABASE
   ========================= */
function getMockContacts() {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (data) return JSON.parse(data);

  const starter = [
    { id: 1, name: "John Doe", phone: "9876543210", email: "john@test.com", company: "Google", address: "1600 Amphitheatre Pkwy, Mountain View, CA", tags: "Work, Tech" },
    { id: 2, name: "Priya Sharma", phone: "9123456780", email: "priya@gmail.com", company: "Freelancer", address: "New Delhi, India", tags: "Friends, Design" },
    { id: 3, name: "Sarah Connor", phone: "9998887776", email: "sarah@cyberdyne.org", company: "Resistance", address: "Los Angeles, CA", tags: "Family, Critical" }
  ];

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(starter));
  return starter;
}

function saveMockContacts(contacts) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(contacts));
}

/* ==================================
   STRICT PHONE INPUT RESTRICTION UX
   ================================== */
const phoneInput = document.getElementById("phone");

// Prevent typing non-numeric keys dynamically
phoneInput.addEventListener("keypress", (e) => {
  // Allow only digit codes (0-9)
  if (e.key < "0" || e.key > "9") {
    e.preventDefault();
  }
});

// Sanitize paste actions and limit string length to 10
phoneInput.addEventListener("input", (e) => {
  // Strip all non-digits
  let sanitized = e.target.value.replace(/\D/g, "");
  // Cap at 10 digits
  if (sanitized.length > 10) {
    sanitized = sanitized.slice(0, 10);
  }
  e.target.value = sanitized;
});

/* =========================
   CONTACTS DATABASE FLOW
   ========================= */
async function fetchContacts() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error("Server error");
    const data = await res.json();

    allContacts = data;
    isBackendOnline = true;
    renderApp();
  } catch {
    if (isBackendOnline) {
      showToast("Backend server offline. Operating in offline storage mode.", "info");
    }
    isBackendOnline = false;
    allContacts = getMockContacts();
    renderApp();
  }
}

/* =====================================
   CUSTOM IN-APP OVERLAY DIALOG CONFIRM
   ===================================== */
function showConfirm(title, message) {
  return new Promise((resolve) => {
    const confirmModal = document.getElementById("confirmModal");
    const confirmTitle = document.getElementById("confirmTitle");
    const confirmMessage = document.getElementById("confirmMessage");
    const confirmCancelBtn = document.getElementById("confirmCancelBtn");
    const confirmOkBtn = document.getElementById("confirmOkBtn");

    confirmTitle.innerText = title;
    confirmMessage.innerText = message;

    confirmModal.classList.add("active");

    const cleanup = (value) => {
      confirmModal.classList.remove("active");
      confirmCancelBtn.onclick = null;
      confirmOkBtn.onclick = null;
      resolve(value);
    };

    confirmCancelBtn.onclick = () => cleanup(false);
    confirmOkBtn.onclick = () => cleanup(true);

    // Close on clicking backdrop
    confirmModal.onclick = (e) => {
      if (e.target === confirmModal) {
        cleanup(false);
      }
    };
  });
}

/* =========================
   DELETE CONTACT
   ========================= */
async function deleteContact(id) {
  const contact = allContacts.find(c => c.id === id);
  const name = contact ? contact.name : "this contact";

  const confirmed = await showConfirm(
    "Delete Contact?",
    `Are you sure you want to delete ${name} from your phonebook? This cannot be undone.`
  );

  if (!confirmed) return;

  if (isBackendOnline) {
    try {
      const res = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      showToast("Contact deleted successfully", "success");
      
      // If we are currently editing this contact, cancel the edit mode
      if (editingContactId === id) {
        cancelEdit();
      }
      
      fetchContacts();
    } catch {
      showToast("Could not contact server", "error");
    }
  } else {
    // Offline database
    allContacts = allContacts.filter(c => c.id !== id);
    saveMockContacts(allContacts);
    showToast("Contact deleted from local storage", "success");
    
    if (editingContactId === id) {
      cancelEdit();
    }
    
    renderApp();
  }
}

/* ===================================
   EDIT WORKFLOW - SIDEBAR SYNC LOGIC
   =================================== */
function editContact(id) {
  const contact = allContacts.find(c => c.id === id);
  if (!contact) return;

  editingContactId = id;
  
  // Populate form
  document.getElementById("name").value = contact.name || "";
  document.getElementById("phone").value = contact.phone || "";
  document.getElementById("email").value = contact.email || "";
  document.getElementById("company").value = contact.company || "";
  document.getElementById("address").value = contact.address || "";
  document.getElementById("tags").value = contact.tags || "";

  // Transform form title and submit button
  const formTitle = contactForm.querySelector("h3");
  const submitBtn = contactForm.querySelector("button[type='submit']");
  
  formTitle.innerHTML = "✏️ Edit Contact";
  submitBtn.innerHTML = "Save Changes";

  // Add a cancel button if not already existing
  let cancelBtn = document.getElementById("cancelEditBtn");
  if (!cancelBtn) {
    cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.id = "cancelEditBtn";
    cancelBtn.innerText = "Cancel Edit";
    cancelBtn.style.background = "rgba(255, 255, 255, 0.08)";
    cancelBtn.style.color = "var(--text-main)";
    cancelBtn.style.border = "1px solid var(--border-card)";
    cancelBtn.style.marginTop = "5px";
    cancelBtn.style.width = "100%";
    cancelBtn.style.padding = "10px";
    cancelBtn.style.borderRadius = "10px";
    cancelBtn.style.cursor = "pointer";
    cancelBtn.style.fontWeight = "600";
    cancelBtn.style.fontFamily = "var(--font-heading)";
    cancelBtn.addEventListener("click", cancelEdit);
    contactForm.appendChild(cancelBtn);
  }

  // Scroll to sidebar on mobile viewports
  if (window.innerWidth <= 992) {
    contactForm.scrollIntoView({ behavior: "smooth" });
  }
}

function cancelEdit() {
  editingContactId = null;
  contactForm.reset();
  
  const formTitle = contactForm.querySelector("h3");
  const submitBtn = contactForm.querySelector("button[type='submit']");
  formTitle.innerHTML = "➕ Create New Contact";
  submitBtn.innerHTML = "Add Contact";

  const cancelBtn = document.getElementById("cancelEditBtn");
  if (cancelBtn) {
    cancelBtn.remove();
  }
}

/* =======================================
   FORM SUBMISSION ENGINE (WITH DUAL LAYER)
   ======================================= */
contactForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const email = document.getElementById("email").value.trim();
  const company = document.getElementById("company").value.trim();
  const address = document.getElementById("address").value.trim();
  const tags = document.getElementById("tags").value.trim();

  // 1. Strict frontend validation
  const phoneRegex = /^\d{10}$/;
  if (!phoneRegex.test(phone)) {
    showToast("Phone number must be exactly 10 numeric digits", "error");
    return;
  }

  const contactData = { name, phone, email, company, address, tags };

  if (editingContactId) {
    // UPDATE MODE
    if (isBackendOnline) {
      try {
        const res = await fetch(`${API_URL}/${editingContactId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contactData)
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Update failed");
        }

        showToast("Contact updated successfully", "success");
        cancelEdit();
        fetchContacts();
      } catch (err) {
        showToast(err.message, "error");
      }
    } else {
      // Offline local update
      allContacts = allContacts.map(c => 
        c.id === editingContactId ? { ...c, ...contactData } : c
      );
      saveMockContacts(allContacts);
      showToast("Contact updated in offline storage", "success");
      cancelEdit();
      renderApp();
    }
  } else {
    // CREATE MODE
    if (isBackendOnline) {
      try {
        const res = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contactData)
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Save failed");
        }

        showToast("Contact created successfully", "success");
        contactForm.reset();
        fetchContacts();
      } catch (err) {
        showToast(err.message, "error");
      }
    } else {
      // Offline local insert
      const newContact = {
        id: Date.now(),
        ...contactData
      };
      allContacts.unshift(newContact);
      saveMockContacts(allContacts);
      showToast("Contact created in offline storage", "success");
      contactForm.reset();
      renderApp();
    }
  }
});

/* ==================================
   DETAILS MODAL POPUP RENDERER
   ================================== */
function openDetailsModal(id) {
  const contact = allContacts.find(c => c.id === id);
  if (!contact) return;

  const { initials, color } = getAvatar(contact.name);

  modalAvatar.innerText = initials;
  modalAvatar.style.background = color;
  
  modalName.innerText = contact.name || "N/A";
  modalCompany.innerText = contact.company || "Personal Contact";
  modalPhone.innerText = contact.phone || "N/A";
  modalEmail.innerText = contact.email || "N/A";
  modalAddress.innerText = contact.address || "N/A";

  // Build tags
  modalTags.innerHTML = "";
  if (contact.tags && contact.tags.trim() !== "") {
    contact.tags.split(",").forEach(t => {
      const tag = t.trim();
      if (!tag) return;
      const span = document.createElement("span");
      span.className = "tag-badge";
      span.innerText = tag;
      modalTags.appendChild(span);
    });
  } else {
    modalTags.innerHTML = `<em style="font-size:0.8rem;color:var(--text-muted)">No tags associated</em>`;
  }

  contactModal.classList.add("active");
}

function closeDetailsModal() {
  contactModal.classList.remove("active");
}

modalCloseBtn.addEventListener("click", closeDetailsModal);
contactModal.addEventListener("click", (e) => {
  if (e.target === contactModal) closeDetailsModal();
});

/* =====================================
   REAL-TIME RENDER ENGINE & SEARCH HIGHLIGHTS
   ===================================== */
function renderApp() {
  const searchQuery = searchInput.value.toLowerCase().trim();
  let filtered = allContacts;

  // 1. Tag Filtering
  if (activeTagFilter !== "all") {
    filtered = filtered.filter(c =>
      c.tags && c.tags.toLowerCase().split(",").map(t => t.trim()).includes(activeTagFilter.toLowerCase())
    );
  }

  // 2. Search query filtering
  if (searchQuery) {
    filtered = filtered.filter(c =>
      (c.name && c.name.toLowerCase().includes(searchQuery)) ||
      (c.phone && c.phone.toLowerCase().includes(searchQuery)) ||
      (c.email && c.email.toLowerCase().includes(searchQuery)) ||
      (c.company && c.company.toLowerCase().includes(searchQuery)) ||
      (c.address && c.address.toLowerCase().includes(searchQuery)) ||
      (c.tags && c.tags.toLowerCase().includes(searchQuery))
    );
  }

  // Populate Statistics
  updateStatistics(filtered);

  // Populate dynamic unique tags panel strip
  renderTagChips();

  // Clear contact list
  contactList.innerHTML = "";

  if (!filtered.length) {
    contactList.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px 20px; color: var(--text-muted);">
        <div style="font-size: 2.5rem; margin-bottom: 10px;">📭</div>
        <p style="font-weight: 500;">No contacts match your active search or filters</p>
      </div>
    `;
    return;
  }

  const starredSet = getStarredSet();

  filtered.forEach(c => {
    const { initials, color } = getAvatar(c.name);
    const starred = starredSet.has(String(c.id));

    // Highlight helper function for search matches
    const highlight = (text) => {
      if (!text) return "";
      if (!searchQuery) return text;
      
      // Escape special regex characters in query to prevent crash
      const escapedQuery = escapeRegExp(searchQuery);
      return text.replace(
        new RegExp(`(${escapedQuery})`, "gi"),
        `<span class="highlight">$1</span>`
      );
    };

    const card = document.createElement("div");
    card.className = "contact-card";
    card.style.borderLeftColor = color;

    // Render tag badges inside card
    let cardTagsHTML = "";
    if (c.tags && c.tags.trim() !== "") {
      c.tags.split(",").slice(0, 2).forEach(t => {
        const tag = t.trim();
        if (!tag) return;
        cardTagsHTML += `<span class="tag-badge">${tag}</span>`;
      });
    }

    card.innerHTML = `
      <div class="card-header-flex" onclick="openDetailsModal(${c.id})">
        <div class="avatar-circle" style="background: ${color}">
          ${initials}
        </div>
        <div class="card-title-block">
          <h3 class="name-row">
            <span class="name-text">${highlight(c.name)}</span>
            <span class="star-inline ${starred ? "active" : ""}" 
                  onclick="event.stopPropagation(); toggleStar('${c.id}')"
                  title="${starred ? "Remove from favorites" : "Add to favorites"}">
              ★
            </span>
          </h3>
          <p class="card-company">${highlight(c.company || "Personal Contact")}</p>
        </div>
      </div>

      <div class="card-details" onclick="openDetailsModal(${c.id})">
        <div class="detail-item">
          <span>📞 ${highlight(c.phone)}</span>
        </div>
        <div class="detail-item">
          <span>📧 ${highlight(c.email || "No Email")}</span>
        </div>
      </div>

      <div class="card-tags">
        ${cardTagsHTML}
      </div>

      <div class="card-actions">
        <button class="btn-call" onclick="event.stopPropagation(); location.href='tel:${c.phone}'" title="Call Contact">
          📞 Call
        </button>
        <button class="btn-edit" onclick="event.stopPropagation(); editContact(${c.id})" title="Edit Details">
          ✏️ Edit
        </button>
        <button class="btn-delete" onclick="event.stopPropagation(); deleteContact(${c.id})" title="Delete Contact">
          🗑️ Delete
        </button>
      </div>
    `;

    contactList.appendChild(card);
  });
}

// Live search listener
searchInput.addEventListener("input", renderApp);

/* ==================================
   STATISTICS ENGINE (REAL-TIME METRICS)
   ================================== */
function updateStatistics(filteredList) {
  // 1. Total count
  statTotalVal.innerText = allContacts.length;

  // 2. Starred Count
  const starredSet = getStarredSet();
  let favCount = 0;
  allContacts.forEach(c => {
    if (starredSet.has(String(c.id))) favCount++;
  });
  statFavoritesVal.innerText = favCount;

  // 3. Unique Tags Count
  const tagsSet = new Set();
  allContacts.forEach(c => {
    if (c.tags && c.tags.trim() !== "") {
      c.tags.split(",").forEach(t => {
        const tag = t.trim().toLowerCase();
        if (tag) tagsSet.add(tag);
      });
    }
  });
  statTagsVal.innerText = tagsSet.size;
}

/* =======================================
   DYNAMIC FILTER CHIPS MANAGER (STRIP)
   ======================================= */
function renderTagChips() {
  // Aggregate all unique tags from contacts
  const tagsSet = new Set();
  allContacts.forEach(c => {
    if (c.tags && c.tags.trim() !== "") {
      c.tags.split(",").forEach(t => {
        const tag = t.trim();
        if (tag) tagsSet.add(tag);
      });
    }
  });

  // Keep reference of current chip items and reset tag list
  const currentTags = [...tagsSet].sort();
  
  // Re-build child nodes starting from label
  tagFilters.innerHTML = `<span class="filter-label">Filter:</span>`;

  // Always append 'All Contacts' chip
  const allChip = document.createElement("button");
  allChip.className = `tag-chip ${activeTagFilter === "all" ? "active" : ""}`;
  allChip.innerText = "All Contacts";
  allChip.addEventListener("click", () => selectTagFilter("all"));
  tagFilters.appendChild(allChip);

  // Append other unique active tags
  currentTags.forEach(tag => {
    const chip = document.createElement("button");
    chip.className = `tag-chip ${activeTagFilter.toLowerCase() === tag.toLowerCase() ? "active" : ""}`;
    chip.innerText = tag;
    chip.addEventListener("click", () => selectTagFilter(tag));
    tagFilters.appendChild(chip);
  });
}

function selectTagFilter(tag) {
  activeTagFilter = tag;
  renderApp();
}

/* ==========================================
   BACKUP & SYNC UTILITIES (CSV/JSON BACKUP)
   ========================================== */

// 1. Export CSV
exportBtn.addEventListener("click", () => {
  if (!allContacts.length) {
    showToast("No contacts to export", "error");
    return;
  }

  const headers = ["ID", "Name", "Phone", "Email", "Company", "Address", "Tags"];
  const rows = allContacts.map(c => [
    c.id,
    `"${(c.name || "").replace(/"/g, '""')}"`,
    c.phone || "",
    c.email || "",
    `"${(c.company || "").replace(/"/g, '""')}"`,
    `"${(c.address || "").replace(/"/g, '""')}"`,
    `"${(c.tags || "").replace(/"/g, '""')}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," 
    + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `smart_phonebook_backup_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  showToast("CSV Backup file downloaded", "success");
});

// 2. Import JSON Trigger Button
importBtn.addEventListener("click", () => {
  importFileInput.click();
});

importFileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (event) => {
    try {
      const list = JSON.parse(event.target.result);
      if (!Array.isArray(list)) {
        throw new Error("Invalid backup structure: Must be a JSON array.");
      }

      let count = 0;
      let skipped = 0;

      for (let item of list) {
        // Enforce structural requirement
        if (!item.name || !item.phone) {
          skipped++;
          continue;
        }

        // Enforce phone digits 10 validation
        const phoneDigits = String(item.phone).replace(/\D/g, "");
        if (phoneDigits.length !== 10) {
          skipped++;
          continue;
        }

        const cleanedContact = {
          name: item.name.trim(),
          phone: phoneDigits,
          email: (item.email || "").trim(),
          company: (item.company || "").trim(),
          address: (item.address || "").trim(),
          tags: (item.tags || "").trim()
        };

        if (isBackendOnline) {
          // Push to backend
          await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(cleanedContact)
          });
        } else {
          // Push to local storage
          cleanedContact.id = Date.now() + count;
          allContacts.unshift(cleanedContact);
        }
        count++;
      }

      if (!isBackendOnline) {
        saveMockContacts(allContacts);
      }

      if (count > 0) {
        showToast(`Successfully imported ${count} contacts!`, "success");
        fetchContacts();
      } else {
        showToast("No valid contacts found to import.", "error");
      }

      if (skipped > 0) {
        showToast(`Skipped ${skipped} items due to invalid phone numbers or formats.`, "info");
      }

    } catch (err) {
      showToast("Failed to parse JSON file", "error");
      console.error(err);
    }
  };

  reader.readAsText(file);
  // Reset file input value
  importFileInput.value = "";
});

/* ==========================================
   UTILITY HELPER ROUTINES
   ========================================== */
function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getAvatar(name) {
  if (!name) return { initials: "SP", color: "#6366f1" };
  
  const initials = name
    .split(" ")
    .map(n => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  // Hash code to HSL color
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Harmonious, moderately saturated HSL values
  const h = Math.abs(hash % 360);
  const s = 65; // Sleek saturation
  const l = 48; // Highly readable contrast
  
  return {
    initials,
    color: `hsl(${h}, ${s}%, ${l}%)`
  };
}

/* ==========================
   INITIALIZER ROUTINE
   ========================== */
initTheme();
fetchContacts();