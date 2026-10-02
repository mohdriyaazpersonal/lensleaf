import { $, escapeHTML as e, toast, uid } from "./lib.js";
import { demoPhotos, filterPhotos, parseTags, validateFile } from "./core.js";
import { openDatabase, transact } from "./storage.js";
let db,
  photos = [],
  collection = "All photographs",
  favorite = false,
  tag = "",
  activeId = null,
  pendingFiles = [];
const urls = new Map();
const visible = () =>
  filterPhotos(photos, {
    collection,
    favorite,
    tag,
    query: $("#search").value,
    sort: $("#sort").value,
  });
const source = (p) => {
  if (p.src) return p.src;
  if (!urls.has(p.id)) urls.set(p.id, URL.createObjectURL(p.blob));
  return urls.get(p.id);
};
async function put(p) {
  if (!db) throw new Error("Browser storage is unavailable.");
  await transact(db, "photos", "put", p);
  const i = photos.findIndex((x) => x.id === p.id);
  if (i < 0) photos.push(p);
  else photos[i] = p;
}
function render() {
  const shown = visible(),
    collections = [...new Set(photos.map((p) => p.collection))].sort();
  $("#all-count").textContent = photos.length;
  $("#fav-count").textContent = photos.filter((p) => p.favorite).length;
  $("#hero-count").textContent = String(photos.length).padStart(2, "0");
  $("#gallery-title").textContent = favorite ? "Favorite frames" : collection;
  $("#result-count").textContent =
    `${shown.length} ${shown.length === 1 ? "frame" : "frames"}`;
  $("[data-all]").classList.toggle(
    "active",
    collection === "All photographs" && !favorite,
  );
  $("#favorites").classList.toggle("active", favorite);
  $("#collections").innerHTML = collections
    .map(
      (c) =>
        `<button data-collection="${e(c)}" class="nav-item ${collection === c ? "active" : ""}"><span class="collection-dot"></span><span>${e(c)}</span><small>${photos.filter((p) => p.collection === c).length}</small></button>`,
    )
    .join("");
  $("#collection-options").innerHTML = collections
    .map((c) => `<option value="${e(c)}"></option>`)
    .join("");
  $("#tags").innerHTML =
    '<option value="">All tags</option>' +
    [...new Set(photos.flatMap((p) => p.tags))]
      .sort()
      .map(
        (t) =>
          `<option ${t === tag ? "selected" : ""} value="${e(t)}">${e(t)}</option>`,
      )
      .join("");
  $("#gallery").innerHTML = shown
    .map(
      (p, i) =>
        `<article class="photo-card"><div class="photo-frame"><button data-open="${e(p.id)}" class="image-button" aria-label="View ${e(p.title)}"><img src="${e(source(p))}" alt="${e(p.title)}" loading="${i < 3 ? "eager" : "lazy"}"></button><button data-favorite="${e(p.id)}" class="favorite-button ${p.favorite ? "is-favorite" : ""}" aria-label="${p.favorite ? "Unfavorite" : "Favorite"} ${e(p.title)}" aria-pressed="${p.favorite}">${p.favorite ? "♥" : "♡"}</button>${p.demo ? '<span class="demo-badge">DEMO ARTWORK</span>' : ""}</div><div class="photo-caption"><h3><button data-open="${e(p.id)}">${e(p.title)}</button></h3><p>${e(p.collection)}</p><div class="photo-tags">${p.tags
          .slice(0, 3)
          .map((t) => `<span>${e(t)}</span>`)
          .join("")}</div></div></article>`,
    )
    .join("");
  $("#empty").hidden = shown.length > 0;
  $("#restore").hidden = photos.some((p) => p.demo);
}
function openViewer(id) {
  activeId = id;
  const p = photos.find((p) => p.id === id);
  if (!p) return;
  $("#lightbox-image").src = source(p);
  $("#lightbox-image").alt = p.title;
  $("#lightbox-title").textContent = p.title;
  $("#lightbox-meta").textContent =
    p.collection + (p.tags.length ? " · " + p.tags.join(" / ") : "");
  $("#lightbox-label").textContent = p.demo
    ? "ORIGINAL DEMO ARTWORK"
    : "YOUR PHOTOGRAPH";
  $("#lightbox-favorite").textContent = p.favorite
    ? "♥ Favorited"
    : "♡ Favorite";
  $("#lightbox-favorite").setAttribute("aria-pressed", p.favorite);
  $("#previous").disabled = $("#next").disabled = visible().length < 2;
  if (!$("#lightbox").open) $("#lightbox").showModal();
}
function move(step) {
  const shown = visible(),
    index = shown.findIndex((p) => p.id === activeId);
  if (shown.length)
    openViewer(shown[(index + step + shown.length) % shown.length].id);
}
async function toggleFavorite(id) {
  const p = photos.find((p) => p.id === id);
  try {
    await put({ ...p, favorite: !p.favorite });
    render();
    if ($("#lightbox").open) openViewer(id);
  } catch (err) {
    toast(err.message);
  }
}
$("#gallery").onclick = (ev) => {
  const f = ev.target.closest("[data-favorite]"),
    b = ev.target.closest("[data-open]");
  if (f) toggleFavorite(f.dataset.favorite);
  else if (b) openViewer(b.dataset.open);
};
$("[data-all]").onclick = () => {
  collection = "All photographs";
  favorite = false;
  render();
};
$("#favorites").onclick = () => {
  collection = "All photographs";
  favorite = true;
  render();
};
$("#collections").onclick = (ev) => {
  const b = ev.target.closest("[data-collection]");
  if (b) {
    collection = b.dataset.collection;
    favorite = false;
    render();
  }
};
$("#search").oninput = render;
$("#sort").onchange = render;
$("#tags").onchange = (ev) => {
  tag = ev.target.value;
  render();
};
$("#previous").onclick = () => move(-1);
$("#next").onclick = () => move(1);
$("#close-lightbox").onclick = () => $("#lightbox").close();
$("#lightbox").addEventListener("keydown", (ev) => {
  if (ev.target instanceof HTMLInputElement) return;
  if (ev.key === "ArrowLeft") {
    ev.preventDefault();
    move(-1);
  }
  if (ev.key === "ArrowRight") {
    ev.preventDefault();
    move(1);
  }
});
$("#lightbox-favorite").onclick = () => toggleFavorite(activeId);
$("#edit-photo").onclick = () => {
  const p = photos.find((p) => p.id === activeId);
  for (const k of ["title", "collection"])
    $("#edit-form").elements[k].value = p[k];
  $("#edit-form").elements.tags.value = p.tags.join(", ");
  $("#edit-dialog").showModal();
};
$("#edit-form").onsubmit = async (ev) => {
  ev.preventDefault();
  const f = new FormData(ev.target),
    title = f.get("title").trim(),
    col = f.get("collection").trim();
  if (!title || !col) {
    toast("A title and collection are required.");
    return;
  }
  try {
    const p = photos.find((p) => p.id === activeId);
    await put({ ...p, title, collection: col, tags: parseTags(f.get("tags")) });
    $("#edit-dialog").close();
    render();
    openViewer(activeId);
    toast("Photo details updated.");
  } catch (err) {
    toast(err.message);
  }
};
$("#delete-photo").onclick = async () => {
  const p = photos.find((p) => p.id === activeId);
  if (
    !confirm(
      `Delete “${p.title}” from this gallery? Your original file is not changed.`,
    )
  )
    return;
  try {
    await transact(db, "photos", "delete", p.id);
    photos = photos.filter((x) => x.id !== p.id);
    if (urls.has(p.id)) {
      URL.revokeObjectURL(urls.get(p.id));
      urls.delete(p.id);
    }
    $("#lightbox").close();
    activeId = null;
    render();
    toast("Photograph removed.");
  } catch (err) {
    toast(err.message);
  }
};
function openUpload(files = []) {
  pendingFiles = files;
  $("#upload-form").reset();
  $("#file-summary").textContent = files.length
    ? `${files.length} ${files.length === 1 ? "image" : "images"} selected`
    : "Choose one or more image files.";
  $("#upload-dialog").showModal();
}
$("#upload-top").onclick = () => openUpload();
$("#files").onchange = (ev) => {
  pendingFiles = [...ev.target.files];
  $("#file-summary").textContent = `${pendingFiles.length} images selected`;
};
document
  .querySelectorAll("[data-close]")
  .forEach((b) => (b.onclick = () => b.closest("dialog").close()));
$("#upload-form").onsubmit = async (ev) => {
  ev.preventDefault();
  if (!pendingFiles.length) {
    toast("Choose at least one image.");
    return;
  }
  if (photos.length + pendingFiles.length > 500) {
    toast("This gallery supports up to 500 images.");
    return;
  }
  const f = new FormData(ev.target),
    col = f.get("collection").trim();
  if (!col) {
    toast("Add a collection name.");
    return;
  }
  $("#upload-submit").disabled = true;
  let count = 0;
  try {
    for (const file of pendingFiles) validateFile(file);
    for (const file of pendingFiles) {
      const decoded = await createImageBitmap(file);
      decoded.close();
      await put({
        id: uid(),
        title:
          file.name.replace(/\.[^.]+$/, "").slice(0, 160) ||
          "Untitled photograph",
        collection: col,
        tags: parseTags(f.get("tags")),
        favorite: false,
        demo: false,
        created: Date.now(),
        blob: file,
      });
      count++;
    }
    $("#upload-dialog").close();
    collection = "All photographs";
    favorite = false;
    tag = "";
    $("#search").value = "";
    toast(`${count} photographs added.`);
  } catch (err) {
    toast(
      `${count ? `${count} images saved. ` : ""}${err.name === "QuotaExceededError" ? "Browser storage is full. Remove some photos or use smaller files." : err.message}`,
    );
  } finally {
    $("#upload-submit").disabled = false;
    render();
  }
};
const zone = $("#drop-zone");
zone.ondragover = (ev) => {
  ev.preventDefault();
  zone.classList.add("dragging");
};
zone.ondragleave = (ev) => {
  if (!zone.contains(ev.relatedTarget)) zone.classList.remove("dragging");
};
zone.ondrop = (ev) => {
  ev.preventDefault();
  zone.classList.remove("dragging");
  openUpload([...ev.dataTransfer.files]);
};
$("#clear").onclick = async () => {
  if (
    !confirm(
      "Clear all photos, collections, and favorites saved by Lensleaf in this browser? Keep your original image files first.",
    )
  )
    return;
  try {
    await transact(db, "photos", "clear");
    for (const url of urls.values()) URL.revokeObjectURL(url);
    urls.clear();
    photos = [];
    collection = "All photographs";
    favorite = false;
    tag = "";
    $("#search").value = "";
    render();
    toast("Gallery data cleared.");
  } catch (err) {
    toast(err.message);
  }
};
$("#restore").onclick = async () => {
  try {
    for (const p of demoPhotos)
      if (!photos.some((x) => x.id === p.id)) await put({ ...p });
    collection = "All photographs";
    favorite = false;
    tag = "";
    $("#search").value = "";
    render();
  } catch (err) {
    toast(err.message);
  }
};
try {
  db = await openDatabase();
  const seeded = await transact(db, "meta", "get", "initialized");
  photos = await transact(db, "photos", "getAll");
  if (!seeded) {
    for (const p of demoPhotos) await put({ ...p });
    await transact(db, "meta", "put", true, "initialized");
  }
  render();
} catch (err) {
  photos = demoPhotos.map((p) => ({ ...p }));
  render();
  $("#upload-top").disabled = true;
  toast("Browser storage is unavailable. Demo gallery only: " + err.message);
}
