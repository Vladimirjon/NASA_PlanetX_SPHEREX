import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';
function files(path: string): string[] {
  return readdirSync(path, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(join(path, entry.name)) : [join(path, entry.name)]);
}
it('keeps browser APIs and adapter imports out of the functional core', () => {
  for (const file of files(join(process.cwd(), 'src/engine/core'))) {
    const source = readFileSync(file, 'utf8');
    expect(source, file).not.toMatch(/(?:from\s+['"][^'"]*adapters\/|\b(?:document|window|fetch|WebGL\w*|HTMLCanvasElement)\b)/);
  }
});
