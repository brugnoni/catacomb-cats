import { useRef } from "react";
import { useT } from "./i18n";
import { exportSave, importSave } from "./storage";
import { type Progress } from "./game";

/** Download the progress as a file, or replace it with one. */
export function SaveFile({
  progress,
  onStore,
  onNotice,
}: {
  progress: Progress;
  onStore: (next: Progress) => void;
  onNotice: (message: string) => void;
}) {
  const { t } = useT();
  const picker = useRef<HTMLInputElement>(null);
  const download = () => {
    const url = URL.createObjectURL(
      new Blob([exportSave(progress)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "catacomb-cats-save.json";
    link.click();
    URL.revokeObjectURL(url);
  };
  const load = async (input: HTMLInputElement) => {
    const file = input.files?.[0];
    // Cleared so picking the same file again still fires a change.
    input.value = "";
    if (!file) return;
    const next = importSave(await file.text());
    if (!next) {
      onNotice(t("That file is not a valid save. Nothing was changed."));
      return;
    }
    if (!window.confirm(t("Replace your current progress with this file?")))
      return;
    onNotice(t("Progress imported."));
    onStore(next);
  };
  return (
    <div className="save-file">
      <button className="quiet" onClick={download}>
        {t("Export progress")}
      </button>
      <button className="quiet" onClick={() => picker.current?.click()}>
        {t("Import progress")}
      </button>
      <input
        ref={picker}
        type="file"
        accept=".json,application/json"
        hidden
        onChange={(event) => void load(event.target)}
      />
    </div>
  );
}
