import "./style.css";
import { newGame } from "./core/game";
import { mountApp } from "./ui/render";

const app = document.querySelector<HTMLDivElement>("#app")!;
mountApp(app, newGame());
