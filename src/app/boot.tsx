import { render } from "preact";
import { App } from "./App";
import "./styles.css";

export function boot(root: HTMLElement) {
  document.documentElement.classList.add("ahx");
  render(<App />, root);
}
