import { useState } from "react";
import { CompanionSheet } from "./CompanionSheet";
import { buildEntries } from "./faqEntries";
import { useT } from "./i18n";

type GuideTab = "faq" | "companions";
export function Faq({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const [tab, setTab] = useState<GuideTab>("faq");
  const entries = buildEntries(t);
  const tabs: { id: GuideTab; label: string }[] = [
    { id: "faq", label: t("Frequently Asked Questions") },
    { id: "companions", label: t("Companions") },
  ];
  return (
    <main className="field-guide">
      <header className="guide-heading">
        <div>
          <span className="eyebrow">
            {t("THE BURROW ARCHIVES / RULES & ANSWERS")}
          </span>
          <h1>{t("Field Guide")}</h1>
          <p>{t("Know your claws. Know your odds.")}</p>
        </div>
        <button onClick={onClose}>{t("Back to game")}</button>
      </header>
      <div
        className="guide-tabs"
        role="tablist"
        aria-label={t("Field guide sections")}
      >
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            role="tab"
            id={`guide-tab-${id}`}
            aria-selected={tab === id}
            aria-controls={`guide-panel-${id}`}
            className={tab === id ? "guide-tab active" : "guide-tab"}
            onClick={() => setTab(id)}
          >
            {label}
            <span aria-hidden="true">{tab === id ? "▾" : "▸"}</span>
          </button>
        ))}
      </div>
      {tab === "faq" && (
        <section
          role="tabpanel"
          id="guide-panel-faq"
          aria-labelledby="guide-tab-faq"
          aria-label={t("Frequently asked questions")}
          className="faq-entries"
        >
          {entries.map(([question, answer]) => (
            <details key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </section>
      )}
      {tab === "companions" && (
        <section
          role="tabpanel"
          id="guide-panel-companions"
          aria-labelledby="guide-tab-companions"
          className="guide-companions"
        >
          <CompanionSheet />
        </section>
      )}
    </main>
  );
}
