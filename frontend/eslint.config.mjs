import tseslint from 'typescript-eslint';
export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'copernix/qa/**'] },
  ...tseslint.configs.strictTypeChecked,
  { files: ['**/*.ts', '**/*.tsx'], languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } }, rules: { '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }] } },
);
