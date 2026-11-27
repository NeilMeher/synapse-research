import {byId} from "./view.mjs";

export function setupTheme(onChange=()=>{}){
  const control=byId("theme");
  function apply(theme) {
    document.documentElement.dataset.theme=theme;
    control.setAttribute("aria-pressed",String(theme==="light"));
    control.textContent=theme==="light"?"Dark theme":"Light theme";
  }
  const preference=localStorage.getItem("synapse-theme");
  apply(preference==="light"?"light":"dark");
  control.addEventListener("click",()=>{
    const theme=document.documentElement.dataset.theme==="light"?"dark":"light";
    apply(theme);
    localStorage.setItem("synapse-theme",theme);
    onChange();
  });
}
