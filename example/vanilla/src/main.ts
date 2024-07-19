import "./style.css";

import { AnnotateImage } from "@annotate-image/core";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div class="annotate-container">
  <img src="https://ljchat.obs.cn-east-3.myhuaweicloud.com/completeRepair/4cd54c21f0454b0118fde7d777b1df1d26bd4dca90db3f6252313c71980665a9_8115531998157993.jpg" />
  </div>
`;

new AnnotateImage(".annotate-container", {
  onInput: (data) => {
    console.log("onInput :>> ", data);
  },
});
