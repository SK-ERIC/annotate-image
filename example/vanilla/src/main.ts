import "./style.css";

import { AnnotateImage } from "@annotate-image/core";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="annotate-container">
  <img src="" />
  </div>
`;

new AnnotateImage(".annotate-container", {
  onInput: (data) => {
    console.log("onInput :>> ", data);
  },
});
