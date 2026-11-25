import type { Lang } from "./i18n";

/** First screen: nothing loads, it only waits for the player's language. */
export function LanguageScreen({ onPick }: { onPick: (lang: Lang) => void }) {
  return (
    <main className="language-screen">
      <div className="language-card">
        <h1>Select Your Language</h1>
        <div className="language-options">
          <button className="primary" lang="en" onClick={() => onPick("en")}>
            English
          </button>
          <button className="primary" lang="es" onClick={() => onPick("es")}>
            Español
          </button>
        </div>
      </div>
    </main>
  );
}
