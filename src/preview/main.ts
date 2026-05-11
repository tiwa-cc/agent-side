import "./style.css";

const iframe = document.querySelector<HTMLIFrameElement>("#preview");

if (iframe) {
  iframe.src = "/../../dist/index.html";
}
