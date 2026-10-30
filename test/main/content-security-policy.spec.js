import fs from 'fs';
import path from 'path';
import vm from 'vm';

const root = path.join(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'app/renderer-bootstrap.js'), 'utf8');

/**
 * Run the local bootstrap with a minimal DOM and Electron environment.
 * @param {object} env Renderer environment variables.
 * @param {boolean} isPackaged Whether Electron is running a packaged application.
 * @returns {object} The policy string and appended resources in execution order.
 * @throws {Error} If bootstrap validation fails.
 */
function bootstrap(env, isPackaged = false) {
  let policy;
  const resources = [];
  /**
   * Record a resource together with the policy active when it was appended.
   * @param {object} element The DOM resource element.
   * @returns {void}
   */
  const appendChild = (element) => {
    resources.push({ ...element, policy: policy.content });
  };
  vm.runInNewContext(source, {
    require: () => ({ app: { isPackaged } }),
    process: { env },
    document: {
      createElement: (tag) => ({ tag }),
      head: {
        prepend: (element) => {
          expect(element.httpEquiv).toBe('Content-Security-Policy');
          expect(element.content).toContain("default-src 'none'");
          policy = element;
        },
        appendChild,
      },
      body: { appendChild },
    },
  });
  return { policy: policy.content, resources };
}

describe('renderer Content Security Policy', () => {
  it('sets a local-only production policy before loading any resources', () => {
    const { policy, resources } = bootstrap({ NODE_ENV: 'production' });
    expect(policy).toContain("script-src 'self';");
    expect(policy).toContain("connect-src 'none'");
    expect(policy).not.toMatch(/unsafe-eval|http:|ws:/);
    expect(resources.map((resource) => resource.href || resource.src)).toEqual([
      './dist/style.css',
      './dist/renderer.prod.js',
    ]);
    expect(resources.every((resource) => resource.policy === policy)).toBe(true);
  });

  it.each(['1212', '2345'])('allows only the configured hot-reload port %s', (port) => {
    const { policy, resources } = bootstrap({
      NODE_ENV: 'development',
      START_HOT: '1',
      PORT: port,
    });
    expect(policy).toContain(`script-src 'self' http://localhost:${port};`);
    expect(policy).toContain(`connect-src http://localhost:${port} ws://localhost:${port}`);
    expect(policy).toContain(`font-src 'self' data: http://localhost:${port};`);
    expect(policy).toContain(`img-src 'self' data: http://localhost:${port};`);
    expect(policy).not.toContain('unsafe-eval');
    expect(resources.map((resource) => resource.src)).toEqual([
      '../dll/renderer.dev.dll.js',
      `http://localhost:${port}/dist/renderer.dev.js`,
    ]);
    expect(resources.every((resource) => resource.async === false)).toBe(true);
    expect(resources.every((resource) => resource.policy === policy)).toBe(true);
  });

  it('defaults to port 1212', () => {
    expect(bootstrap({ NODE_ENV: 'development', START_HOT: '1' }).policy).toContain(
      'http://localhost:1212',
    );
  });

  it('keeps packaged builds local-only even with development environment flags', () => {
    const { policy, resources } = bootstrap(
      {
        NODE_ENV: 'development',
        START_HOT: '1',
        PORT: '2345',
      },
      true,
    );
    expect(policy).not.toMatch(/http:|ws:|unsafe-eval/);
    expect(resources.map((resource) => resource.href || resource.src)).toEqual([
      './dist/style.css',
      './dist/renderer.prod.js',
    ]);
  });

  it('preserves non-hot development startup with local styles and the DLL', () => {
    const { policy, resources } = bootstrap({ NODE_ENV: 'development' });
    expect(policy).toContain("connect-src 'none'");
    expect(resources.map((resource) => resource.href || resource.src)).toEqual([
      './dist/style.css',
      '../dll/renderer.dev.dll.js',
      './dist/renderer.prod.js',
    ]);
  });

  it.each(['0', '65536', 'abc', '1212; https://example.com'])(
    'rejects invalid hot-reload port %s instead of weakening the policy',
    (port) => {
      expect(() => bootstrap({ NODE_ENV: 'development', START_HOT: '1', PORT: port })).toThrow(
        'Invalid development server PORT',
      );
    },
  );

  it('loads only the trusted external bootstrap from the main HTML', () => {
    const html = fs.readFileSync(path.join(root, 'app/app.html'), 'utf8');
    expect(html.match(/<script\b/g)).toHaveLength(1);
    expect(html).toContain('<script src="renderer-bootstrap.js"></script>');
    const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    expect(manifest.build.files).toContain('renderer-bootstrap.js');
  });

  it('protects the background worker before loading its script', () => {
    const html = fs.readFileSync(path.join(root, 'app/worker.html'), 'utf8');
    expect(html).toContain("default-src 'none'; script-src 'self';");
    expect(html).not.toMatch(/unsafe-eval|unsafe-inline/);
    expect(html.indexOf('Content-Security-Policy')).toBeLessThan(html.indexOf('<script'));
  });

  it.each(['renderer', 'worker'])('uses non-eval source maps for the %s DLL', (name) => {
    const config = fs.readFileSync(
      path.join(root, `configs/webpack.config.${name}.dev.dll.babel.js`),
      'utf8',
    );
    expect(config).toContain("devtool: 'source-map'");
    expect(config).not.toContain("devtool: 'eval");
  });
});
