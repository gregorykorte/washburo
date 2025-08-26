window.CMS_MANUAL_INIT = true;

(function waitForCMS(tries = 200) {
  const CMS = window.CMS || window.DecapCms;
  if (CMS && typeof CMS.init === "function") {
    if (!window.CMS && window.DecapCms) window.CMS = window.DecapCms; // alias for plugins
    CMS.init({ config: "/admin/config.yml" });
    return;
  }
  if (tries <= 0) {
    console.error("Decap CMS failed to load. Check /admin/decap-cms.js");
    return;
  }
  setTimeout(() => waitForCMS(tries - 1), 50);
})();
