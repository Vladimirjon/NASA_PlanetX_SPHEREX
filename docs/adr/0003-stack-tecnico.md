# 0003 · Stack técnico

- Estado: **recomendación** (no obligatoria; cada módulo puede elegir otro stack con su propio ADR)
- Fecha: 2026-11-14
- Decidido por: pendiente

## Contexto
Hay que comparar imágenes FITS de varias épocas con orientaciones distintas (WCS TAN-SIP), en una web pública, con demo offline y UX profesional. IRSA, Gaia y JPL no tienen CORS; S3 de SPHEREx sí.

## Opciones consideradas
1. Ciencia en el navegador (FITS + WCS en JS): menos servidor, pero reproyectar SIP en JS es arriesgado.
2. **Ciencia en Python (astropy + reproject) y navegador liviano con WebGL2**: correcto y rápido de construir.

## Decisión (propuesta)
Opción 2. Detalle completo en `docs/context/06-stack-propuesto.md`: React 19 + Vite + TS 6, TanStack Router/Query, Zustand, Base UI, Tailwind v4 con tokens, IBM Plex, Observable Plot, Aladin Lite, WebGL2 propio; FastAPI + astropy + reproject + pyvo + diskcache; Float32 binario; Cloudflare Pages + backend en [Cloud Run o HF Spaces, por decidir].

## Consecuencias
Backend obligatorio y desplegado temprano. Precalcular los 5 objetos. Falta elegir el hosting del backend (Cloud Run pide tarjeta).
