import type { ObservableEffect, ObservableEffectType } from "../../types/chemistry";
import "./ObservableEffectsPanel.css";

function EffectIcon({ type }: { type: ObservableEffectType }) {
  switch (type) {
    case "color_change":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          <path d="M12 22A10 10 0 0 0 12 2" fill="currentColor" fillOpacity="0.2" />
        </svg>
      );
    case "precipitation":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M7 3h10v11a4 4 0 0 1-8 0" />
          <path d="M5 3h14" />
          <circle cx="9" cy="11" r="1" fill="currentColor" />
          <circle cx="13" cy="13" r="1" fill="currentColor" />
          <circle cx="10" cy="14.5" r="1" fill="currentColor" />
          <path d="M11 6v3m-1.5-1.5L11 9l1.5-1.5" />
        </svg>
      );
    case "gas_evolution":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="8" cy="16" r="3" />
          <circle cx="16" cy="12" r="2.5" />
          <circle cx="11" cy="6" r="2" />
          <path d="M4 21h16" />
        </svg>
      );
    case "temperature_increase":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
          <path d="M17 7l2-2m0 0l2 2m-2-2v6" />
        </svg>
      );
    case "temperature_decrease":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
          <path d="M19 5v6m0 0l-2-2m2 2l2-2" />
        </svg>
      );
    case "dissolution":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          <circle cx="12" cy="15" r="1.5" fill="currentColor" />
        </svg>
      );
    case "phase_change":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 8L17 4v3H7a4 4 0 0 0-4 4v1" />
          <path d="M3 16l4 4v-3h10a4 4 0 0 0 4-4v-1" />
        </svg>
      );
    case "effervescence":
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="7" cy="17" r="2" />
          <circle cx="15" cy="15" r="2.5" />
          <circle cx="11" cy="9" r="1.5" />
          <path d="M6 7l1-2m5-3v3m5 0l1-2" />
        </svg>
      );
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
      );
  }
}

export function ObservableEffectsPanel({ effects }: { effects: ObservableEffect[] }) {
  if (effects.length === 0) {
    return <p className="observable-effects__empty">No specific observable effects are recorded for this reaction.</p>;
  }
  return (
    <ul className="observable-effects">
      {effects.map((effect, i) => (
        <li key={i} className="observable-effects__item">
          <span className="observable-effects__icon" aria-hidden="true">
            <EffectIcon type={effect.type} />
          </span>
          <div className="observable-effects__body">
            <div className="observable-effects__header-row">
              <p className="observable-effects__type">{effect.type.replace(/_/g, " ")}</p>
              {effect.temperatureDeltaC !== undefined && (
                <span
                  className={`observable-effects__temp-badge ${
                    effect.temperatureDeltaC < 0
                      ? "observable-effects__temp-badge--decrease"
                      : effect.temperatureDeltaC > 0
                        ? "observable-effects__temp-badge--increase"
                        : "observable-effects__temp-badge--neutral"
                  }`}
                >
                  {effect.temperatureDeltaC < 0 ? (
                    <>
                      <span className="observable-effects__temp-arrow" aria-hidden="true">↓</span>
                      Decreased by {Math.abs(effect.temperatureDeltaC).toFixed(1)} °C
                    </>
                  ) : effect.temperatureDeltaC > 0 ? (
                    <>
                      <span className="observable-effects__temp-arrow" aria-hidden="true">↑</span>
                      Increased by {effect.temperatureDeltaC.toFixed(1)} °C
                    </>
                  ) : (
                    "±0.0 °C"
                  )}
                  {effect.initialTemperatureC !== undefined && effect.finalTemperatureC !== undefined && (
                    <span className="observable-effects__temp-range">
                      {" "}({effect.initialTemperatureC.toFixed(1)} °C → {effect.finalTemperatureC.toFixed(1)} °C)
                    </span>
                  )}
                </span>
              )}
            </div>
            <p className="observable-effects__description">{effect.description}</p>
          </div>
          {(effect.colorFrom || effect.colorTo) && (
            <span className="observable-effects__swatches">
              {effect.colorFrom && <span className="observable-effects__swatch" style={{ background: effect.colorFrom }} />}
              {effect.colorFrom && effect.colorTo && <span className="observable-effects__swatch-arrow">{"\u2192"}</span>}
              {effect.colorTo && <span className="observable-effects__swatch" style={{ background: effect.colorTo }} />}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
