import { UI } from "./ui";
import { GAME } from "./game";
import { FAQ } from "./faq";
import { TUTORIAL } from "./tutorial";

export const ES: Record<string, string> = {
  ...UI,
  ...GAME,
  ...FAQ,
  ...TUTORIAL,
};
