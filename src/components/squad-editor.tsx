"use client";

import { useState, type KeyboardEvent } from "react";
import { cleanSquad, LIMITS } from "@/lib/validation";
import { CloseIcon, PlusIcon } from "./icons";

type Props = {
  id: string;
  value: string[];
  onChange: (squad: string[]) => void;
  suggestions: string[];
  disabled: boolean;
  error?: string;
};

/** Add players by typing (Enter or comma), tapping a past player, and remove with ×. */
export function SquadEditor({ id, value, onChange, suggestions, disabled, error }: Props) {
  const [draft, setDraft] = useState("");
  const inSquad = new Set(value.map((p) => p.toLowerCase()));
  const unused = suggestions.filter((p) => !inSquad.has(p.toLowerCase())).slice(0, 12);
  const full = value.length >= LIMITS.squadSize;

  const add = (text: string) => {
    const names = text.split(/[,\n]/);
    onChange(cleanSquad([...value, ...names]).slice(0, LIMITS.squadSize));
    setDraft("");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      if (draft.trim()) add(draft);
    } else if (event.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <fieldset aria-describedby={error ? `${id}-error` : `${id}-hint`}>
      <legend className="field-label">
        Squad <span className="font-normal text-slate-400">({value.length} player{value.length === 1 ? "" : "s"})</span>
      </legend>

      {value.length > 0 && (
        <ol className="mt-2 flex flex-wrap gap-2" aria-label="Players in the squad">
          {value.map((name, i) => (
            <li
              key={name.toLowerCase()}
              className="flex items-center gap-1 rounded-full bg-pitch-500/15 py-1 pl-3 pr-1 text-sm font-semibold text-pitch-100 ring-1 ring-pitch-400/40"
            >
              <span className="text-xs text-pitch-300">{i + 1}.</span> {name}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                disabled={disabled}
                aria-label={`Remove ${name}`}
                className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-pitch-300"
              >
                <CloseIcon width={14} height={14} />
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="mt-2 flex gap-2">
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft.trim() && add(draft)}
          disabled={disabled || full}
          placeholder={full ? "Squad is full" : "Player name, then Enter"}
          autoComplete="off"
          autoCapitalize="words"
          enterKeyHint="done"
          aria-label="Add a player"
          aria-invalid={error ? true : undefined}
          className="field-input"
        />
        <button
          type="button"
          className="icon-btn shrink-0"
          onClick={() => draft.trim() && add(draft)}
          disabled={disabled || full || !draft.trim()}
          aria-label="Add player"
        >
          <PlusIcon />
        </button>
      </div>

      {unused.length > 0 && !full && (
        <div className="mt-2">
          <p className="text-xs text-slate-400">Played before — tap to add:</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {unused.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => add(name)}
                disabled={disabled}
                className="min-h-9 rounded-full border border-white/15 px-3 text-sm hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-pitch-300"
              >
                + {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-rose-200">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="mt-1 text-xs text-slate-400">
          Optional. Paste several names separated by commas to add them at once.
        </p>
      )}
    </fieldset>
  );
}
