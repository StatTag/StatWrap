/**
 * Set the renderer CSP before loading styles and application bundles.
 * Development server access is restricted to unpackaged hot-reload sessions.
 * @returns {void}
 * @throws {Error} If Electron remote initialization or development port validation fails.
 */
(() => {
  const { app } = require('@electron/remote');
  const development = !app.isPackaged && process.env.NODE_ENV === 'development';
  const hot = development && !!process.env.START_HOT;
  const port = process.env.PORT || '1212';
  if (hot && (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535)) {
    throw new Error(`Invalid development server PORT: ${port}`);
  }

  const server = hot ? `http://localhost:${Number(port)}` : '';
  const developmentSource = hot ? ` ${server}` : '';
  const policy = [
    "default-src 'none'",
    `script-src 'self'${developmentSource}`,
    // Emotion, editor components, and the development style-loader inject styles.
    `style-src 'self' 'unsafe-inline'${developmentSource}`,
    `img-src 'self' data:${developmentSource}`,
    `font-src 'self' data:${developmentSource}`,
    hot ? `connect-src ${server} ws://localhost:${Number(port)}` : "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
  ];
  const meta = document.createElement('meta');
  meta.id = 'content-security-policy';
  meta.httpEquiv = 'Content-Security-Policy';
  meta.content = policy.join('; ');
  // Chromium processes CSP when the element is inserted, not when an existing
  // meta element's content is changed.
  document.head.prepend(meta);

  if (!hot) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = './dist/style.css';
    document.head.appendChild(link);
  }

  const scripts = [];
  if (development) {
    scripts.push('../dll/renderer.dev.dll.js');
  }
  scripts.push(hot ? `${server}/dist/renderer.dev.js` : './dist/renderer.prod.js');
  for (const src of scripts) {
    const script = document.createElement('script');
    // Dynamic scripts must execute in order: the renderer depends on the DLL.
    script.async = false;
    script.src = src;
    document.body.appendChild(script);
  }
})();
