import { show } from "../ui/dialog.js?v=closing-1";
import { t } from "../i18n/index.js?v=closing-1";
import { reflections, readingLinks, reflectionQuestion, limits } from "../data/reflections.js?v=closing-1";

export function reflectionMenu(back, backText = "Back to your shift record") {
  function menu() {
    show("After the line · Optional notes", "What was on the other end?",
      `<p>${t(reflectionQuestion)}</p><p>There is no scored answer. These notes connect the story to debates about minds and machines.</p>`, [
        ...reflections.map((section) => ({ text: section.title, run: () => {
          show("After the line · Optional notes", section.title,
            section.paragraphs.map((text) => `<p>${t(text)}</p>`).join(""),
            [{ text: "Back to the questions", run: menu }, { text: backText, run: back }]);
        } })),
        { text: "Readings and how this game works", run: () => {
          show("After the line · Optional notes", "Read further",
            `<p>${t(limits)}</p><ul>${readingLinks.map(({ title, url }) => `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${t(title)}</a></li>`).join("")}</ul><p>The systems and robot replies are discussed within Searle’s paper; his responses are included too.</p>`,
            [{ text: "Back to the questions", run: menu }, { text: backText, run: back }]);
        } },
        { text: backText, run: back },
      ]);
  }
  menu();
}
