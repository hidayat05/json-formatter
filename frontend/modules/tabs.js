export function initTabs(tabModules = {}) {
  const buttons = document.querySelectorAll("[data-tab]");
  const sections = document.querySelectorAll("[data-section]");

  function activate(targetTab) {
    buttons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === targetTab);
    });

    sections.forEach((sec) => {
      sec.classList.toggle("hidden", sec.dataset.section !== targetTab);
    });

    if (typeof tabModules[targetTab] === "function") {
      tabModules[targetTab]();
      delete tabModules[targetTab];
    }
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      if (tab) activate(tab);
    });
  });

  return { activate };
}
