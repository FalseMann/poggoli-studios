import { App } from "./app";

async function main() {
  const canvas = document.createElement("canvas");
  canvas.style.width = "100%";
  canvas.style.height = "100%";

  document.body.appendChild(canvas);

  const app = new App(canvas);
  await app.initialize();
}

window.addEventListener("DOMContentLoaded", main);
