# Auditoría de arquitectura de la UI

Fecha: 25 de noviembre de 2026. Alcance: arquitectura y fronteras.

## Estado

- Capas limpias: `App` coordina; `Lobby`/`Battle`/`Combatant` y hooks por función; ningún componente pasa de 340 líneas; sin store global.
- Ningún archivo de la UI importa `src/engine/*` (solo la fachada `game.ts`).

## Hecho en esta ronda

1. **Fronteras protegidas** (`eslint.config.js`, `no-restricted-imports`): la UI solo importa de `./game`; el motor solo de `../progression` y `../expeditions`, y no de React.
2. **`styles.css` dividido** en 10 archivos de `src/styles/`, importados en el orden original. El CSS compilado es idéntico byte a byte. Aviso: las rutas `url()` de variables CSS son relativas al archivo (por eso `../cursors/`).
3. **Playwright con `workers: 4`**: con los 16 por defecto fallaban 22 tests por timeouts de carga; con 4 pasan los 74.

## Pendiente (no tocado)

- El CSS sigue siendo global y dependiente del orden: reglas de `.combatant` repartidas en 12 puntos. Reagrupar por componente exige pruebas visuales.
- Accesibilidad: solo 4 apariciones de `aria-`/`role=` en `src/`; sin tests de teclado, foco ni roles.
- Responsive: solo se prueba escritorio.
- No hay tests de componente (solo lógica pura y e2e de 3,6 min).
