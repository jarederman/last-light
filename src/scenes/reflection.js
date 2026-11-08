import { show } from "../ui/dialog.js?v=illustrated-ui-7";
import { t } from "../i18n/index.js?v=illustrated-ui-7";
import { reflections, makerNote } from "../data/reflections.js?v=illustrated-ui-7";

export function reflectionMenu(back, backText = "Back to the end of the watch") {
  function menu() {
    show("After the line", "A second look",
      "<p>The receiver, the draft, and the open line stayed in the room after Nell's call. If you want, take another look at what each one left unresolved.</p>", [
        ...reflections.map((section) => ({ text: section.title, run: () => {
          show("After the line", section.title,
            section.paragraphs.map((text) => `<p>${t(text)}</p>`).join(""),
            [{ text: "Back to the room's traces", run: menu }, { text: backText, run: back }]);
        } })),
        { text: "Why I made this", run: () => {
          show("After the line", "A note from the maker",
            makerNote.map((text) => `<p>${t(text)}</p>`).join(""),
            [{ text: "Back to the room's traces", run: menu }, { text: backText, run: back }]);
        } },
        { text: backText, run: back },
      ]);
  }
  menu();
}
