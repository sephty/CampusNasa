// satellites.js - Noticias NASA (usa NASA Image and Video Library)

const NEWS_ENDPOINT = "https://images-api.nasa.gov/search?q=nasa%20news&media_type=image";
const TITLE_KEYWORDS = ["nasa", "mission", "launch", "update"];

document.addEventListener("DOMContentLoaded", () => {
  const gallery = document.getElementById("gallery");
  const statusContainer = document.getElementById("statusContainer");
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modalBody");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const toast = document.getElementById("toast");
  const searchRangeBtn = document.getElementById("searchRange");
  const loadTodayBtn = document.getElementById("loadToday");
  const startInput = document.getElementById("start");
  const endInput = document.getElementById("end");

  // Keep dates bounded like index
  const todayStr = new Date().toISOString().split("T")[0];
  if (startInput) startInput.max = todayStr;
  if (endInput) endInput.max = todayStr;

  let cachedNews = [];
  let currentView = "all"; // all | today | range

  const sortByDateDesc = (items = []) =>
    [...items].sort((a, b) => b.date.localeCompare(a.date));

  // Helpers
  const showToast = (msg) => {
    toast.innerText = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
  };

  const showLoading = (isLoading) => {
    statusContainer.innerHTML = isLoading ? '<div class="loader">Cargando noticias NASA...</div>' : '';
  };

  const truncate = (text, max = 150) => {
    if (!text) return "No disponible";
    return text.length > max ? `${text.slice(0, max)}…` : text;
  };

  const formatDate = (value) => {
    if (!value) return "Fecha desconocida";
    const d = new Date(value);
    return isNaN(d.getTime()) ? "Fecha desconocida" : d.toISOString().split("T")[0];
  };

  const isToday = (dateStr) => {
    const today = new Date().toISOString().split("T")[0];
    return dateStr === today;
  };

  function parseItem(item) {
    const data = Array.isArray(item?.data) ? item.data[0] : {};
    const links = Array.isArray(item?.links) ? item.links[0] : {};
    return {
      title: data?.title || "Sin título",
      description: data?.description || "No disponible",
      date: formatDate(data?.date_created) || "Fecha desconocida",
      url: links?.href || "",
    };
  }

  function filterNews(items) {
    return (items || []).filter((item) => {
      const parsed = parseItem(item);
      const descOk = parsed.description && parsed.description.length > 100;
      const titleLower = (parsed.title || "").toLowerCase();
      const titleOk = TITLE_KEYWORDS.some((kw) => titleLower.includes(kw));
      return descOk && titleOk && parsed.url;
    }).map(parseItem);
  }

  async function fetchNews() {
    showLoading(true);
    try {
      const resp = await fetch(NEWS_ENDPOINT);
      if (!resp.ok) throw new Error("Respuesta no OK");
      const json = await resp.json();
      const items = json?.collection?.items;
      return filterNews(items);
    } catch (err) {
      console.error(err);
      showToast("Error al obtener noticias");
      return [];
    } finally {
      showLoading(false);
    }
  }

  function renderNews(items) {
    gallery.innerHTML = "";
    if (!items || items.length === 0) {
      gallery.innerHTML = "<p style='text-align:center; grid-column: 1/-1;'>No se encontraron imágenes en este sector.</p>";
      return;
    }

    items.forEach((data) => {
      const card = document.createElement("div");
      card.className = "card";
      card.innerHTML = `
        <div class="card-img-container">
            <img src="${data.url}" alt="${data.title}" loading="lazy">
        </div>
        <div class="card-content">
            <small class="text-accent">${data.date}</small>
            <h3>${data.title}</h3>
            <p class="card-description">${truncate(data.description)}</p>
        </div>
      `;
      card.addEventListener("click", () => openModal(data));
      gallery.appendChild(card);
    });
  }

  function openModal(data) {
    modalBody.innerHTML = `
      <small class="text-accent">${data.date}</small>
      <h2 class="modal-title">${data.title}</h2>
      <img src="${data.url}" alt="${data.title}">
      <p class="modal-text">${data.description}</p>
    `;
    modal.classList.add("active");
  }

  function closeModal() {
    modal.classList.remove("active");
  }

  // Modal behavior
  modal.addEventListener("click", closeModal);
  modal.querySelector(".modal-content").addEventListener("click", (e) => e.stopPropagation());
  closeModalBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeModal();
  });

  // Favoritos redirige a la vista principal
  window.showFavorites = () => {
    window.location.href = "index.html";
  };

  // Acciones
  loadTodayBtn.addEventListener("click", () => {
    if (!cachedNews.length) return showToast("Primero carga noticias");
    currentView = "today";
    renderNews(sortByDateDesc(cachedNews.filter((n) => isToday(n.date))));
  });

  searchRangeBtn.addEventListener("click", () => {
    if (!cachedNews.length) return showToast("Primero carga noticias");
    const start = startInput.value;
    const end = endInput.value;

    if (start && end && start > end) return showToast("Fecha inicio mayor a fin");

    currentView = "range";

    // If both dates are provided, filter between them; otherwise show all (newest → oldest)
    const filtered = start && end
      ? cachedNews.filter((n) => n.date >= start && n.date <= end)
      : cachedNews;

    renderNews(sortByDateDesc(filtered));
  });

  // Carga inicial automática
  (async () => {
    cachedNews = await fetchNews();
    currentView = "all";
    renderNews(sortByDateDesc(cachedNews));
  })();
});
