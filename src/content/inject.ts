import { boot } from "../app/boot";

const HIDE = `html.ahx-boot, html.ahx-boot body { background:#0b0a09 !important; }
html.ahx-boot body > *:not(#ahx-root) { display:none !important; }`;

function hideOriginal() {
  document.documentElement.classList.add("ahx-boot");
  if (!document.getElementById("ahx-hide")) {
    const style = document.createElement("style");
    style.id = "ahx-hide";
    style.textContent = HIDE;
    document.documentElement.appendChild(style);
  }
}

function mount() {
  hideOriginal();
  let root = document.getElementById("ahx-root");
  if (!root) {
    root = document.createElement("div");
    root.id = "ahx-root";
    (document.body || document.documentElement).appendChild(root);
  }
  boot(root);
}

hideOriginal();
if (document.body) mount();
else document.addEventListener("DOMContentLoaded", mount, { once: true });
