# 0009 · Visor Copernix: UI propia sobre la plataforma, servida con la landing

- Fecha: 2026-11-14.
- Estado: implementado por solicitud de Daniel; revisión visual humana pendiente.

## Contexto

La plataforma (`frontend/` React + motor WebGL2, `backend/` FastAPI) ya traía su propia interfaz (`src/app`). La landing (`landing/`, estática, ES/EN) y esa interfaz tienen lenguajes visuales distintos; al pasar de una a otra el visitante cambiaba de producto. Daniel pidió conectar los CTA de la landing con la plataforma interactiva **sin** usar la UI del repo, con el diseño de la landing. El producto pasa a llamarse **Copernix** (NA ZA es el equipo).

## Decisión

1. Nueva entrada `frontend/copernix/` (React 19, base `/viewer/`, build a `frontend/dist-copernix/`) con **UI propia** basada en los tokens, tipografías y componentes de la landing. Reutiliza solo lógica sin UI: `src/app/core`, `src/series`, el motor por su API pública. No se modifican `src/engine/**`, `src/ui/**` ni la app actual (`/`), que conserva sus pruebas.
2. `scripts/serve_landing.py` sirve en un solo origen (`:4410`): `/` landing, `/viewer/` el build y `/api/**` como proxy a la API (`:8000`). Así `localStorage` (idioma) se comparte entre landing y visor. `mise run copernix` levanta API + servidor.
3. Los CTA de la landing navegan a `/viewer/?target=<slug>` o `?ra=&dec=`; las cinco tarjetas de objetos enlazan a su objetivo.
4. Textos de explicación ES/EN generados con los mismos números que `series/core/explain.ts` (`copernix/src/explain-i18n.ts`); semáforo Observado/Evaluado/Confirmado visible; procedencia en el panel.

## Consecuencias y riesgos

- El motor del mapa usa WebGL2 con `requestAnimationFrame`. La máquina de Daniel (Intel Iris Xe) registró un `GPU HANG` de i915 en Chrome (ver ADR 0007); no se reprodujo con esta página ni se probó el visor sobre la GPU física. Todas las pruebas del visor corrieron con SwiftShader (CPU). `?map=off` muestra el visor sin mapa. Probar en la GPU real con cuidado y guardar el trabajo abierto antes.
- Dos interfaces conviven (la del repo en `/` del servidor Vite y Copernix en `/viewer/`); la decisión de cuál es el producto final es del equipo.
- Los tokens de `copernix/src/styles/tokens.css` duplican los de `landing/css/styles.css`; mantenerlos sincronizados.
