import type { IconShape } from "@poe/filter-style/types";

/** Each minimap shape, drawn in a 24×24 box. */
export const ICON_PATHS: Readonly<Record<IconShape, string>> = {
  Circle: "M3 12A9 9 0 1 0 21 12A9 9 0 1 0 3 12Z",
  Diamond: "M12 2L22 12L12 22L2 12Z",
  Hexagon: "M12 2L21 7L21 17L12 22L3 17L3 7Z",
  Square: "M3 3H21V21H3Z",
  Star: "M12 2L14.6 9.1L22 9.1L16 13.6L18.3 21L12 16.5L5.7 21L8 13.6L2 9.1L9.4 9.1Z",
  Triangle: "M12 3L22 20L2 20Z",
  Cross: "M9 2H15V9H22V15H15V22H9V15H2V9H9Z",
  Moon: "M16 3A9 9 0 1 0 16 21A7.5 9 0 1 1 16 3Z",
  Raindrop: "M12 2C17 9 20 12 20 15A8 8 0 0 1 4 15C4 12 7 9 12 2Z",
  Kite: "M12 2L20 10L12 22L4 10Z",
  Pentagon: "M12 2L22 9.5L18 21L6 21L2 9.5Z",
  UpsideDownHouse: "M2 2H22V14L12 22L2 14Z",
};
