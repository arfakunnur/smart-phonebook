/* ==========================================
   SMART PHONEBOOK - INTERACTIVE CONTROLLER
   ========================================== */

const API_URL = "http://localhost:5000/contacts";

// DOM Element Selectors
const contactForm = document.getElementById("contactForm");
const contactList = document.getElementById("contactList");
const searchInput = document.getElementById("searchInput");
const themeCheckbox = document.getElementById("themeCheckbox");
const toastContainer = document.getElementById("toastContainer");

// Stats selectors
const statTotalVal = document.querySelector("#statTotal .stat-value");
const statFavoritesVal = document.querySelector("#statFavorites .stat-value");
const statTagsVal = document.querySelector("#statTags .stat-value");

// Action selectors
const tagFilters = document.getElementById("tagFilters");
const exportBtn = document.getElementById("exportBtn");
const importBtn = document.getElementById("importBtn");
const importFileInput = document.getElementById("importFileInput");

// Modal selectors
const contactModal = document.getElementById("contactModal");
const modalCloseBtn = document.getElementById("modalCloseBtn");
const modalAvatar = document.getElementById("modalAvatar");
const modalName = document.getElementById("modalName");
const modalCompany = document.getElementById("modalCompany");
const modalPhone = document.getElementById("modalPhone");
const modalEmail = document.getElementById("modalEmail");
const modalAddress = document.getElementById("modalAddress");
const modalTags = document.getElementById("modalTags");

// State Variables
let allContacts = [];
let activeTagFilter = "all";
let isBackendOnline = true;

// Helper: Local Storage Keys
const LOCAL_STORAGE_KEY = "smart_phonebook_contacts";
const FAVORITES_STORAGE_KEY = "smart_phonebook_favorites";

// -----------------------------
// THEME SWITCHER (DARK MODE)
// -----------------------------
function initTheme() {
  const savedTheme = localStorage.getItem("theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  themeCheckbox.checked = savedTheme === "dark";
}

themeCheckbox.addEventListener("change", () => {
  const theme = themeCheckbox.checked ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  showToast(`Switched to ${theme} mode`, "info");
});

// -----------------------------
// DYNAMIC TOAST NOTIFICATIONS
// -----------------------------
function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  
  let icon = "🔔";
  if (type === "success") icon = "✅";
  if (type === "error") icon = "❌";
  if (type === "info") icon = "💡";

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
  `;

  toastContainer.appendChild(toast);

  // Auto remove toast
  setTimeout(() => {
    toast.classList.add("fade-out");
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}

// -----------------------------
// LOCAL STORAGE MOCK ENGINE (FALLBACK)
// -----------------------------
function getMockContacts() {
  const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!localData) {
    // Generate some starter mock data
    const starterContacts = [
      {
        id: 1,
        name: "John Doe",
        phone: "+1 (555) 123-4567",
        email: "john.doe@company.com",
        company: "Google Inc.",
        address: "1600 Amphitheatre Pkwy, Mountain View, CA",
        tags: "Work, Tech"
      },
      {
        id: 2,
        name: "Jane Smith",
        phone: "+1 (555) 987-6543",
        email: "jane.smith@design.co",
        company: "Figma Studio",
        address: "760 Market St, San Francisco, CA",
        tags: "Design, Personal"
      },
      {
        id: 3,
        name: "David Miller",
        phone: "+44 20 7946 0958",
        email: "david@millers.org",
        company: "",
        address: "Baker Street 221B, London",
        tags: "Family"
      }
    ];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(starterContacts));
    return starterContacts;
  }
  return JSON.parse(localData);
}

function saveMockContacts(contacts) {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(contacts));
}

// -----------------------------
// FETCH ALL CONTACTS
// -----------------------------
async function fetchContacts() {
  try {
    const response = await fetch(API_URL);

    if (!response.ok) {
      throw new Error("API responded with an error status");
    }

    const contacts = await response.json();
    isBackendOnline = true;
    allContacts = contacts;
    renderApp();

  } catch (error) {
    console.warn("Backend server not reached. Switching to robust LocalStorage database.", error);
    if (isBackendOnline) {
      isBackendOnline = false;
      showToast("Backend offline. Using local database fallback.", "info");
    }
    // Load local storage fallback
    allContacts = getMockContacts();
    renderApp();
  }
}

// -----------------------------
// DYNAMIC AVATAR COLORS & INITIALS
// -----------------------------
function getAvatarDetails(name) {
  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "👤";

  // Generate unique HSL color based on string hash
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  // Keep colors saturated and pleasant
  const color = `hsl(${hue}, 65%, 45%)`;
  return { initials, color };
}

// -----------------------------
// STAR / FAVORITE FUNCTIONALITY
// -----------------------------
function getStarredSet() {
  const starred = localStorage.getItem(FAVORITES_STORAGE_KEY);
  return starred ? new Set(JSON.parse(starred)) : new Set();
}

function toggleStar(id) {
  const starred = getStarredSet();
  if (starred.has(id)) {
    starred.delete(id);
    showToast("Removed from favorites", "info");
  } else {
    starred.add(id);
    showToast("Added to favorites", "success");
  }
  localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(starred)));
  renderApp();
}

// -----------------------------
// DISPLAY & RENDER APP ENGINE
// -----------------------------
function renderApp() {
  // Update stats
  updateStats();

  // Redraw tag filter bar
  renderTagFilterChips();

  // Apply filters and search to contacts list
  const searchQuery = searchInput.value.trim().toLowerCase();
  
  let filtered = allContacts;

  // 1. Tag filter
  if (activeTagFilter !== "all") {
    filtered = filtered.filter(c => {
      if (!c.tags) return false;
      const tagList = c.tags.split(",").map(t => t.trim().toLowerCase());
      return tagList.includes(activeTagFilter.toLowerCase());
    });
  }

  // 2. Search query filter
  if (searchQuery !== "") {
    filtered = filtered.filter(c => {
      return (
        (c.name && c.name.toLowerCase().includes(searchQuery)) ||
        (c.phone && c.phone.toLowerCase().includes(searchQuery)) ||
        (c.email && c.email.toLowerCase().includes(searchQuery)) ||
        (c.company && c.company.toLowerCase().includes(searchQuery)) ||
        (c.address && c.address.toLowerCase().includes(searchQuery)) ||
        (c.tags && c.tags.toLowerCase().includes(searchQuery))
      );
    });
  }

  // Draw list
  contactList.innerHTML = "";

  if (filtered.length === 0) {
    contactList.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted);">
        <p style="font-size: 1.5rem; margin-bottom: 8px;">🔍</p>
        <p>No contacts found matching your selection.</p>
      </div>
    `;
    return;
  }

  const starredSet = getStarredSet();

  filtered.forEach((c) => {
    const isStarred = starredSet.has(c.id);
    const { initials, color } = getAvatarDetails(c.name);
    
    // Highlight matched text helper
    const highlightText = (text) => {
      if (!text) return "N/A";
      if (!searchQuery) return text;
      const regex = new RegExp(`(${escapeRegExp(searchQuery)})`, "gi");
      return text.replace(regex, '<span class="highlight">$1</span>');
    };

    // Parse tag items
    let tagsHTML = "";
    if (c.tags) {
      const tagItems = c.tags.split(",").map((t) => t.trim());
      tagItems.forEach((tag) => {
        if (tag) {
          tagsHTML += `<span class="tag-badge">${highlightText(tag)}</span>`;
        }
      });
    }

    const card = document.createElement("div");
    card.className = "contact-card";
    card.style.borderLeftColor = color;
    
    card.innerHTML = `
      <button class="star-btn-card ${isStarred ? "starred" : ""}" onclick="event.stopPropagation(); toggleStar(${c.id})" title="Favorite Contact">
        ${isStarred ? "★" : "☆"}
      </button>

      <div class="card-header-flex" onclick="openDetailsModal(${c.id})">
        <div class="avatar-circle" style="background-color: ${color}">${initials}</div>
        <div class="card-title-block">
          <h3>${highlightText(c.name)}</h3>
          <p class="card-company">${c.company ? highlightText(c.company) : "Personal"}</p>
        </div>
      </div>

      <div class="card-details" onclick="openDetailsModal(${c.id})">
        <div class="detail-item">
          <span>📞</span>
          <span>${highlightText(c.phone)}</span>
        </div>
        <div class="detail-item">
          <span>📧</span>
          <span>${c.email ? highlightText(c.email) : "<i>No Email</i>"}</span>
        </div>
      </div>

      <div class="card-tags">
        ${tagsHTML}
      </div>

      <div class="card-actions">
        <button class="btn-call" onclick="event.stopPropagation(); window.open('tel:${c.phone}', '_self')">📞 Call</button>
        <button class="btn-edit" onclick="event.stopPropagation(); prepareEdit(${c.id}, '${escapeQuote(c.name)}', '${escapeQuote(c.phone)}', '${escapeQuote(c.email || "")}', '${escapeQuote(c.company || "")}', '${escapeQuote(c.address || "")}', '${escapeQuote(c.tags || "")}')">✏️ Edit</button>
        <button class="btn-delete" onclick="event.stopPropagation(); deleteContact(${c.id})">🗑️ Delete</button>
      </div>
    `;

    contactList.appendChild(card);
  });
}

// RegExp Escape Helper
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeQuote(str) {
  return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// -----------------------------
// UPDATE APP STATISTICS
// -----------------------------
function updateStats() {
  statTotalVal.textContent = allContacts.length;

  const starredSet = getStarredSet();
  const totalStarred = allContacts.filter((c) => starredSet.has(c.id)).length;
  statFavoritesVal.textContent = totalStarred;

  const uniqueTags = new Set();
  allContacts.forEach((c) => {
    if (c.tags) {
      c.tags.split(",").forEach((t) => {
        const cleaned = t.trim().toLowerCase();
        if (cleaned) uniqueTags.add(cleaned);
      });
    }
  });
  statTagsVal.textContent = uniqueTags.size;
}

// -----------------------------
// RENDER TAG FILTER CHIPS
// -----------------------------
function renderTagFilterChips() {
  const uniqueTags = new Set();
  allContacts.forEach((c) => {
    if (c.tags) {
      c.tags.split(",").forEach((t) => {
        const cleaned = t.trim();
        if (cleaned) uniqueTags.add(cleaned);
      });
    }
  });

  // Preserve the existing dynamic tags and clear any custom chips (except the first 'All Contacts' button)
  const allChip = tagFilters.querySelector('button[data-tag="all"]');
  tagFilters.innerHTML = "";
  tagFilters.appendChild(allChip);

  if (activeTagFilter === "all") {
    allChip.classList.add("active");
  } else {
    allChip.classList.remove("active");
  }

  // Draw other tag buttons
  Array.from(uniqueTags).sort().forEach(tag => {
    const chip = document.createElement("button");
    chip.className = `tag-chip ${activeTagFilter.toLowerCase() === tag.toLowerCase() ? "active" : ""}`;
    chip.textContent = tag;
    chip.setAttribute("data-tag", tag);
    
    chip.addEventListener("click", () => {
      activeTagFilter = activeTagFilter.toLowerCase() === tag.toLowerCase() ? "all" : tag;
      renderApp();
    });
    
    tagFilters.appendChild(chip);
  });
}

// Click listener for "All Contacts"
tagFilters.querySelector('button[data-tag="all"]').addEventListener("click", () => {
  activeTagFilter = "all";
  renderApp();
});

// -----------------------------
// ADD / EDIT CONTACT SUBMIT
// -----------------------------
contactForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const id = contactForm.dataset.editingId;
  const newContact = {
    name: contactForm.name.value.trim(),
    phone: contactForm.phone.value.trim(),
    email: contactForm.email.value.trim(),
    company: contactForm.company.value.trim(),
    address: contactForm.address.value.trim(),
    tags: contactForm.tags.value.trim(),
  };

  if (isBackendOnline) {
    try {
      if (id) {
        // Edit flow
        // Since original API did not explicitly have a PUT endpoint shown in contacts.js routes (it only had GET, POST, DELETE, SEARCH),
        // let's execute Edit by first deleting the old contact and posting the new one, OR fall back if they didn't implement PUT.
        // Wait, let's verify: did contacts.js routes have a PUT/PATCH? No! It had GET /, POST /, DELETE /:id, and GET /search.
        // So editing in backend is cleanest done by DELETE then POST, or keeping it in-memory. Let's do DELETE then POST on backend to stay consistent!
        await fetch(`${API_URL}/${id}`, { method: "DELETE" });
        
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newContact),
        });

        if (!response.ok) throw new Error("Could not update backend contact");
        showToast("Contact updated successfully!", "success");
      } else {
        // Create flow
        const response = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newContact),
        });

        if (!response.ok) throw new Error("Could not save to backend");
        showToast("Contact added successfully!", "success");
      }
    } catch (error) {
      console.error("Backend post failed, falling back to local edit.", error);
      showToast("Error syncing with server. Saved locally.", "error");
      handleLocalSave(id, newContact);
    }
  } else {
    // Offline fallback
    handleLocalSave(id, newContact);
  }

  // Reset form status
  delete contactForm.dataset.editingId;
  contactForm.querySelector('button[type="submit"]').textContent = "Add Contact";
  contactForm.querySelector('h3').textContent = "➕ Create New Contact";
  contactForm.reset();
  fetchContacts();
});

// Helper for offline storage operations
function handleLocalSave(id, data) {
  let contacts = getMockContacts();
  if (id) {
    // Edit
    const index = contacts.findIndex(c => c.id == id);
    if (index !== -1) {
      contacts[index] = { ...contacts[index], ...data };
    }
    showToast("Contact updated locally", "success");
  } else {
    // Add
    const newId = contacts.length > 0 ? Math.max(...contacts.map(c => c.id)) + 1 : 1;
    contacts.unshift({ id: newId, ...data });
    showToast("Contact saved locally", "success");
  }
  saveMockContacts(contacts);
}

// -----------------------------
// PREPARE CONTACT FOR EDITING
// -----------------------------
function prepareEdit(id, name, phone, email, company, address, tags) {
  contactForm.dataset.editingId = id;
  contactForm.name.value = name;
  contactForm.phone.value = phone;
  contactForm.email.value = email === "undefined" ? "" : email;
  contactForm.company.value = company === "undefined" ? "" : company;
  contactForm.address.value = address === "undefined" ? "" : address;
  contactForm.tags.value = tags === "undefined" ? "" : tags;

  contactForm.querySelector('button[type="submit"]').textContent = "Save Changes";
  contactForm.querySelector('h3').textContent = "✏️ Edit Contact Info";
  
  // Scroll form into view smoothly
  contactForm.scrollIntoView({ behavior: "smooth" });
}

// -----------------------------
// DELETE CONTACT
// -----------------------------
async function deleteContact(id) {
  if (!confirm("Are you sure you want to delete this contact?")) return;

  if (isBackendOnline) {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      showToast("Contact deleted successfully", "success");
      fetchContacts();

    } catch (error) {
      console.error("Delete error:", error);
      showToast("Could not delete from backend. Deleting locally.", "error");
      handleLocalDelete(id);
    }
  } else {
    handleLocalDelete(id);
  }
}

function handleLocalDelete(id) {
  let contacts = getMockContacts();
  contacts = contacts.filter(c => c.id != id);
  saveMockContacts(contacts);
  
  // Remove from favorites set too
  const starred = getStarredSet();
  if (starred.has(id)) {
    starred.delete(id);
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(Array.from(starred)));
  }

  showToast("Contact deleted locally", "success");
  fetchContacts();
}

// -----------------------------
// SEARCH INPUT EVENT LISTENER
// -----------------------------
searchInput.addEventListener("input", () => {
  renderApp();
});

// -----------------------------
// EXPORT & IMPORT ACTIONS
// -----------------------------
exportBtn.addEventListener("click", () => {
  if (allContacts.length === 0) {
    showToast("No contacts to export!", "error");
    return;
  }

  // Compile CSV contents
  const headers = ["Name", "Phone", "Email", "Company", "Address", "Tags"];
  const csvRows = [headers.join(",")];

  allContacts.forEach((c) => {
    const row = [
      `"${(c.name || "").replace(/"/g, '""')}"`,
      `"${(c.phone || "").replace(/"/g, '""')}"`,
      `"${(c.email || "").replace(/"/g, '""')}"`,
      `"${(c.company || "").replace(/"/g, '""')}"`,
      `"${(c.address || "").replace(/"/g, '""')}"`,
      `"${(c.tags || "").replace(/"/g, '""')}"`,
    ];
    csvRows.push(row.join(","));
  });

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `phonebook_backup_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("Backup exported as CSV", "success");
});

// Trigger upload trigger
importBtn.addEventListener("click", () => {
  importFileInput.click();
});

importFileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const importedData = JSON.parse(e.target.result);
      if (!Array.isArray(importedData)) {
        throw new Error("Invalid file structure. Must be a JSON array of contacts.");
      }

      // Add each imported contact
      for (const item of importedData) {
        if (!item.name || !item.phone) continue; // Skip malformed contacts

        const cleanContact = {
          name: item.name,
          phone: item.phone,
          email: item.email || "",
          company: item.company || "",
          address: item.address || "",
          tags: item.tags || "",
        };

        if (isBackendOnline) {
          try {
            await fetch(API_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(cleanContact),
            });
          } catch (err) {
            handleLocalSave(null, cleanContact);
          }
        } else {
          handleLocalSave(null, cleanContact);
        }
      }

      showToast(`Contacts imported successfully!`, "success");
      importFileInput.value = ""; // Clear file selector
      fetchContacts();

    } catch (error) {
      console.error("Import error:", error);
      showToast("Failed to parse backup JSON file.", "error");
    }
  };
  reader.readAsText(file);
});

// -----------------------------
// DETAIL MODAL LOGIC
// -----------------------------
function openDetailsModal(id) {
  const contact = allContacts.find((c) => c.id === id);
  if (!contact) return;

  const { initials, color } = getAvatarDetails(contact.name);
  modalAvatar.textContent = initials;
  modalAvatar.style.backgroundColor = color;
  modalName.textContent = contact.name;
  modalCompany.textContent = contact.company || "Personal Contact";
  modalPhone.textContent = contact.phone;
  modalEmail.textContent = contact.email || "No Email Provided";
  modalAddress.textContent = contact.address || "No Address Provided";

  modalTags.innerHTML = "";
  if (contact.tags) {
    contact.tags.split(",").forEach((t) => {
      const cleaned = t.trim();
      if (cleaned) {
        modalTags.innerHTML += `<span class="tag-badge">${cleaned}</span>`;
      }
    });
  } else {
    modalTags.innerHTML = "<span style='font-size:0.8rem; color:var(--text-muted)'>No tags assigned</span>";
  }

  contactModal.classList.add("active");
}

function closeDetailsModal() {
  contactModal.classList.remove("active");
}

modalCloseBtn.addEventListener("click", closeDetailsModal);
contactModal.addEventListener("click", (e) => {
  if (e.target === contactModal) {
    closeDetailsModal();
  }
});

// Close modal on Escape key press
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && contactModal.classList.contains("active")) {
    closeDetailsModal();
  }
});

// -----------------------------
// INITIAL INITIALIZATION
// -----------------------------
initTheme();
fetchContacts();