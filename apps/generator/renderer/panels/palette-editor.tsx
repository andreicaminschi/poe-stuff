import { ICON_COLOURS, ICON_SHAPES, type IconShape as Shape } from "@poe/filter-style/types";
import { tierStyle } from "@poe/filter-style/tier-style";
import { IconShape } from "../components/icon-shape.tsx";
import { useCategory } from "../hooks/use-category.ts";
import { useSession } from "../session-store.ts";

/** The category's two colours and icon shape. */
export function PaletteEditor() {
  const category = useCategory();
  const setPalette = useSession((state) => state.setPalette);
  if (category === undefined) return null;

  const { palette } = category.config;
  const icon = tierStyle(palette, "T0").icon;

  return (
    <div className="palette">
      <p className="label">{category.name} · colours</p>
      {(["primary", "secondary"] as const).map((key) => (
        <div className="swatch" key={key}>
          <label htmlFor={`swatch-${key}`}>{key}</label>
          <input
            id={`swatch-${key}`}
            type="color"
            value={palette[key]}
            onChange={(event) => setPalette({ ...palette, [key]: event.target.value })}
          />
          <span className="hex">{palette[key]}</span>
        </div>
      ))}
      <div className="swatch">
        <label htmlFor="swatch-icon">icon</label>
        <span />
        <select
          id="swatch-icon"
          value={palette.icon}
          onChange={(event) => setPalette({ ...palette, icon: event.target.value as Shape })}
        >
          {ICON_SHAPES.map((shape) => (
            <option key={shape}>{shape}</option>
          ))}
        </select>
      </div>
      <div className="swatch">
        <label>icon, beam</label>
        <span />
        <span className="named">
          <IconShape icon={icon} size={16} />
          {icon === null ? "" : `${icon.colour} ${ICON_COLOURS[icon.colour]}`}
        </span>
      </div>
    </div>
  );
}
