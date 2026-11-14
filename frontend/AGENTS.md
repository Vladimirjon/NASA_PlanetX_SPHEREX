# Frontend — estado parcial

Requiere Node 22 o Node 24 y pnpm. En Fedora y Windows, desde `frontend/`:

```text
pnpm install --frozen-lockfile
pnpm test
pnpm lint
pnpm build
```

La interfaz y el renderizador todavía no están implementados; `build` no tiene punto de entrada Vite.
