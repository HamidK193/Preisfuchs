import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

// The rendered contract alone does not prove adoption. Follow application-local
// imports so a route can delegate to an extracted list component (Home <=100 lines).
function usesSharedListState(file: string, visited = new Set<string>()): boolean {
  if (visited.has(file) || !existsSync(file) || !statSync(file).isFile()) return false;
  visited.add(file);
  const source = readFileSync(file, 'utf8');
  if (/<ListState(?:\s|\/|>)/.test(source)) return true;
  const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)];
  return imports.some(([, specifier]) => {
    const base = specifier.startsWith('@/')
      ? resolve(__dirname, '../../src', specifier.slice(2))
      : specifier.startsWith('.') ? resolve(dirname(file), specifier) : undefined;
    if (!base) return false;
    return ['', '.tsx', '.ts', '/index.tsx', '/index.ts'].some((suffix) => usesSharedListState(`${base}${suffix}`, visited));
  });
}

test.each([
  '(tabs)/index.tsx', '(tabs)/suche.tsx', '(tabs)/angebote.tsx',
  '(tabs)/warenkorb.tsx', '../components/list-favorites.tsx', 'kategorie/[id].tsx',
])('E9: the real list route %s uses the shared ListState', (route) => {
  expect(usesSharedListState(resolve(__dirname, '../../src/app', route))).toBe(true);
});
