// Make Decap use our YAML config (no inline config)
window.CMS_MANUAL_INIT = true;

// After DOM is parsed, wait for Decap to attach its global
window.addEventListener('DOMContentLoaded', () => {
  (function waitForCMS(tries = 200) {
    const CMS = window.CMS || window.DecapCms;
    if (CMS && typeof CMS.init === 'function') {
      // Alias for plugins that expect window.CMS
      if (!window.CMS && window.DecapCms) window.CMS = window.DecapCms;
      CMS.init({ config: '/admin/config.yml' });
      return;
    }
    if (tries <= 0) {
      console.error('Decap CMS failed to load. Check /admin/decap-cms.js');
      return;
    }
    setTimeout(() => waitForCMS(tries - 1), 50);
  })();
});
