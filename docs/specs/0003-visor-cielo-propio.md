# Ficha 0003 — Visor del cielo propio (motor HiPS WebGL2)

- Dueño humano: Dax
- Estado: aprobada por Dax el 2026-11-14
- ADRs relacionados: 0040 (arquitectura base), 0003 (stack, en lo que no contradiga a 0040)
- Ejecutor propuesto: Codex en worktree propio, rama `feat/sky-engine`. Revisores: UI/UX, rendimiento, física (textos y coordenadas).

## 1. Objetivo funcional
Un mapa del cielo completo, propio, con **paridad de comportamiento visible con Aladin Lite** para el HiPS de SPHEREx DR1: arrastrar y hacer zoom de forma fluida desde todo el cielo hasta el detalle máximo (orden 5), cambiar entre las 102 bandas, ver la cuadrícula RA/Dec y, al hacer clic, obtener la coordenada exacta que luego abre la serie temporal del analizador (ficha 0002). Funciona para cualquier región del cielo.

## 2. Entradas exactas
- Teselas HiPS: `GET /api/v1/hips/{order}/{dir}/{npix}?plane=` (contrato `contracts/openapi.yaml`). Mientras no exista backend: directo a `https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube/` (tiene CORS), detrás de una interfaz `TileSource` para cambiarlo sin tocar el motor.
- Metadatos HiPS: `properties` del servicio (orden máximo, formato, frame, número de planos). Copia de referencia: `docs/fuentes/spherex-dr1-hips-properties.txt`.
- Estado de vista en la URL: `?ra=<deg>&dec=<deg>&fov=<deg>&plane=<0-101>&proj=<SIN|TAN|AIT>`; RA [0,360), Dec [-90,90], fov (0, 360]. Valores inválidos → vista por defecto + aviso, nunca excepción.
- Interacción: puntero (arrastre, rueda, pellizco táctil), teclado (flechas = mover, +/- = zoom, PageUp/PageDown = banda).

## 3. Salidas exactas
- Canvas WebGL2 con el cielo renderizado; evento `onPick({ra, dec})` en grados ICRS con 6 decimales; evento `onViewChange({ra, dec, fov, plane, proj})` (sincroniza la URL).
- Lectura persistente: RA/Dec del centro y bajo el cursor (sexagesimal y decimal), FOV, banda (índice y λ en µm según `SPECTRAL_CHANNELS`/properties), fuente y fecha del dato ("SPHEREx DR1 HiPS · IRSA"), aviso "solo visualización".
- API del motor (TypeScript, sin React dentro): `createSkyEngine(canvas, { tileSource, initialView }) → { setView, getView, setPlane, setProjection, on(event), destroy }`.

## 4. Restricciones científicas y técnicas
- **Sin código de Aladin Lite** (GPL-3.0; repo MIT). Se permite estudiar su comportamiento y su documentación pública. Fuente de verdad: estándar IVOA HiPS 1.0 y HEALPix (Górski et al. 2005).
- HEALPix NESTED, frame ICRS/equatorial; orientación verificada contra el cubo FITS (`x PNG ↔ dy`, `fila ↔ dx`, ver `docs/context/11` §C) y contra el WCS de una tesela FITS de referencia.
- Las teselas PNG son de 8 bits estiradas: **solo visualización**. El visor nunca muestra un valor físico (MJy/sr) leído de un PNG.
- Bordes difíciles obligatorios: polos, RA 0°/360°, borde de proyección, teselas faltantes (404 → padre escalado, sin agujeros negros ni excepción).
- Accesibilidad: controles por teclado, `prefers-reduced-motion` (sin inercia), contraste AA, lector de pantalla anuncia coordenada central al detenerse. Norma visual: `docs/context/07-estandar-ui.md`.

## 5. Casos de prueba
- Válido: `?ra=133.7951&dec=-7.2451&fov=1&plane=20` → centra WISE 0855; `onPick` en el centro devuelve RA/Dec con error < 1 píxel de pantalla.
- Ida y vuelta: para 10 000 posiciones aleatorias, pantalla → cielo → pantalla con error < 0,01 px en cada proyección (property-based).
- HEALPix: `ang2pix`/`pix2ang` coinciden con `astropy-healpix` en ≥ 1 000 000 puntos (fixture generada en Python).
- Entrada inválida: `?ra=400&dec=abc` → vista por defecto + aviso visible.
- Bordes: centro en Dec = ±90 y RA = 359,99 → sin costuras ni teselas faltantes.
- Red: IRSA caído → teselas en caché se ven, faltantes muestran el padre; mensaje honesto de estado.

## 6. Criterio de aceptación
- Rendimiento (revisor de rendimiento, medido con Playwright + `performance`): primer cuadro de todo el cielo < 1,5 s con caché; arrastre a ≥ 55 fps p95 en laptop integrada; ninguna tesela pedida dos veces en la misma sesión; peticiones canceladas al salir del campo; memoria GPU acotada (LRU ≤ 256 texturas configurable).
- Paridad visual (revisor UI/UX): capturas lado a lado con el visor oficial de IRSA en 5 vistas fijas (todo el cielo, los 5 objetos a FOV 1°) con misma proyección y banda; diferencias documentadas en `docs/reviews/`.
- Calidad: `pnpm lint`, `pnpm test`, `pnpm build` en verde con salida pegada; cero `any`; capturas en `docs/reviews/`.

## 7. Fuentes
- [IVOA HiPS 1.0](https://www.ivoa.net/documents/HiPS/20170519/REC-HIPS-1.0-20170519.pdf) · [HEALPix, Górski et al. 2005](https://doi.org/10.1086/427976) · [Calabretta & Greisen 2002, proyecciones FITS](https://doi.org/10.1051/0004-6361:20021327)
- [IRSA SPHEREx HiPS cube](https://caltech-ipac.github.io/irsa-tutorials/spherex-hipscube/) · [LAYOUT de teselas](https://irsa.ipac.caltech.edu/data/hips/SPHEREx/spherex_allsky_cube/LAYOUT.md) · [visor IRSA](https://irsa.ipac.caltech.edu/onlinehelp/spherex/spherex/visualization.html)
