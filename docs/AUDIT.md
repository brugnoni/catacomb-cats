# Auditoría de salud del juego — Catacomb Cats

Fecha: 24 de noviembre de 2026. Solo lectura: no se cambió código. Alcance: diseño (economía, progresión, dificultad, mecánicas, enemigos) y riesgos de código. Sin playtest humano, sin FPS/bundle.

## Resumen

El motor es sólido y está bien probado (37 pruebas de balance/progresión/expediciones pasan). El problema es de **diseño**: el juego se completa en ~11–14 victorias, casi todo el desafío ocurre en el jefe, y la dificultad real queda por encima del objetivo documentado. Antes de añadir contenido conviene fijar el fin de la progresión, subir la presión de las salas 1–2 y proteger el guardado.

## Datos medidos

Simulador `src/sim.ts`, bot medio, 16 semillas × 10 equipos, tier según `playerAfter`; bot óptimo, 4 semillas.

| Victorias | Tier | Medio | HP al limpiar sala 1 / 2 | Derrotas (sala 1/2/jefe) |
| --------- | ---- | ----- | ------------------------ | ------------------------ |
| 0         | 0    | 92%   | 97 / 81                  | 0 / 0 / 13               |
| 1         | 2    | 83%   | 98 / 80                  | 0 / 0 / 27               |
| 2         | 4    | 88%   | 98 / 82                  | 0 / 0 / 19               |
| 3         | 5    | 89%   | 97 / 80                  | 0 / 2 / 16               |
| 4         | 6    | 98%   | 98 / 85                  | 0 / 0 / 3                |
| 6         | 8    | 98%   | 96 / 85                  | 0 / 0 / 4                |
| 9 y 12    | 9    | 98%   | 99 / 86                  | 0 / 0 / 3                |

Bot óptimo: 100% en todas las etapas, con 96–100% de HP en la sala 1 y 92–97% en la sala 2.

Economía (cálculo desde `progression.ts` y `expeditions.ts`):

- Entrenamiento por gato: 170 / 370 / 650 de oro hasta rango 4 / 6 / 8. Hogar: 200 / 420 / 720.
- Comprarlo todo (5 gatos + Hogar) = 3 970 de oro; solo los 3 mejores gatos + Hogar = 2 670.
- Oro por victoria: 180 / 270 / 360 (x1 / 1,5 / 2). Ruta más rápida: 3 victorias en Catacombs + 5 en Warrens + 6 en Vault = **14 victorias** (11 si solo se mejoran 3 gatos). La maestría 10 (1 500 XP) llega con la primera victoria de Vault.
- Poder al tope: 20 / 31 / 42, es decir tier 6 / 10 / 14 (HP enemigo x1,78 / x2,30 / x2,82; potencia +3 / +5 / +7).

## Hallazgos (por prioridad)

### Alta

1. **No hay endgame.** Tras ~11–14 victorias todo está comprado: oro y XP no tienen uso, el tope de Poder es 42 y no hay más contenido. Decidir antes de añadir cosas si la progresión debe durar más, o si el contenido nuevo es el endgame.
2. **El guardado se puede perder en silencio** (`src/engine/save.ts`, `parseProgress`). Cualquier campo inválido devuelve `initialProgress()` y el siguiente `storeProgress` (`App.tsx`) sobrescribe el guardado real. Casos: renombrar un objeto de `ITEMS`, oro > 1 000 000, cambio de forma del guardado. No hay copia de seguridad ni exportar/importar (ya anotado en `HANDOFF.md`). Mínimo: guardar el JSON viejo en otra clave antes de resetear.
3. **La dificultad medida supera el objetivo.** Objetivo documentado: medio 75–85%, óptimo 92–97%. Medido: medio 83–98% (98% desde la victoria 4) y óptimo 100%. El juego es casi imposible de perder con juego atento.
4. **Salas 1 y 2 no presionan; todo el riesgo está en el jefe.** En 1 280 partidas del bot medio: 0 derrotas en la sala 1, 2 en la sala 2 y 88 en el jefe. Las salas cuestan ~3% y ~15–20% de HP, y luego se curan 33%. La tensión es plana hasta el jefe.

### Media

5. **Equipos desparejos.** Con 0 victorias `luna+clover+ember` gana 31% frente a 100% de la mayoría; `pip+clover+ember` 50–56% en las victorias 1–3. Según `outputs/balance-report.md`, sin sanador se pierde casi siempre en Warrens y Vault (0%). Luna aparece en casi todos los equipos fuertes; Miso rinde poco.
6. **El Poder sube el tier: parte de cada compra se cancela.** `tier = floor(Poder/3)` con +13% HP y +1 potencia cada 2 tiers: al comprar 3 de Poder los enemigos suben un tier. Catacombs al tope (tier 6) se gana ~100%, así que el castigo no se nota allí, pero hace opaca la sensación de mejora y explica el salto Catacombs → Warrens (límite conocido: ≈71% con el tope anterior, no <30%).
7. **El simulador deja puntos ciegos.** `playerAfter` solo suma victorias en Catacombs: las etapas 9 y 12 dan resultados idénticos (tier 9) y nunca miden Warrens/Vault; eso solo lo cubre `playerAtCap` con 3 equipos. Tampoco simula críticos, fallos (5%) ni esquivas (hasta 12%), así que la varianza real es mayor. El comentario de `sim.ts` ("90 gold") está viejo: son 180.
8. **Enemigos y rutas con poca variedad.** Los mismos 6 tipos de enemigo en las 3 Expediciones, con una sola habilidad de ataque; el comportamiento depende de `actor.name` y de `round % 3` (`enemyAI.ts`), y el armado por nombre en `units.ts`. Los refuerzos (tier 10+) son fijos (Cave bat / Bone squire). Cada ruta son 3 salas fijas y sin decisiones entre salas, aunque el log dice "Choose your next descent". Rejugabilidad baja.
9. **El sistema de objetos se agota con la primera victoria.** Hay 3 objetos, uno por sala (`ITEMS[run.room]` en `state.ts`); tras ganar una vez los tienes todos y no hay más. Un objeto por gato, con efectos pequeños (+6 HP, +3 iniciativa, +1 ataque).
10. **La recompensa se pierde si cierras la pestaña en la pantalla de victoria.** El botón "Return to lobby" es quien banca oro/XP (`leave()` en `App.tsx`); 180–360 de oro de una run completa dependen de ese clic. Es una decisión de diseño documentada, pero es un riesgo de pérdida; basta bancar al ganar el jefe.

### Baja

11. **Dos pestañas pisan el guardado** (no hay evento `storage`).
12. **Documentación desfasada:** `HANDOFF.md` dice +12% HP por tier y 71 + 21 pruebas; el código usa 13% (`DIFFICULTY_TUNING`). Las reglas ejecutables mandan, pero conviene corregirlo.
13. **`game.test.ts` tiene 1 698 líneas.** Está bien cubierto, pero cuesta navegarlo; dividir por tema cuando se añada contenido.

## Objetivo de dificultad propuesto

Casual con picos de reto, medido con el bot medio por Expedición **al tope de su rango**:

- Medio: 70–80% por Expedición (hoy 100% en Catacombs, ~58–60% en Warrens/Vault con 3 equipos).
- Óptimo: 90–95% (hoy 100%).
- Sala 1: 85–90% HP restante; sala 2: 60–70%; jefe: la mayor parte de las derrotas, pero no todas (hoy ~100%, 0 en las salas 1–2).
- Cualquier equipo de 3 gatos, aun sin sanador, ≥50% al tope de su ruta.

## Backlog sugerido antes de añadir contenido

1. Guardado: copia de seguridad antes de resetear y exportar/importar (hallazgo 2, 10).
2. Decidir la duración de la progresión y el uso del oro/XP sobrante (hallazgo 1, 6).
3. Subir presión de salas 1–2 y recalibrar jefe (hallazgo 3, 4), midiendo con el simulador.
4. Extender el simulador: victorias por Expedición, 5 equipos más, y modo con crits/fallos (hallazgo 7).
5. Equilibrar Miso/Ember/Pip frente a Luna + sanador (hallazgo 5).
6. Datos de enemigos (habilidades y patrones como datos, no por nombre) antes de crear enemigos nuevos (hallazgo 8).
7. Rediseñar objetos o añadir decisiones por run (hallazgo 9).

## Adenda (mismo día): mediciones con azar real y jugador competente

Las tablas anteriores usan críticos y fallos apagados y un bot voraz. Repetidas con críticos y fallos activados (como en el juego real) y un planificador de anchura 3 (12 semillas, 10 equipos):

- Todas las configuraciones dan 97–100% de victorias: Catacombs de inicio, Catacombs al tope, Warrens al tope (97%) y Vault al tope (100%). La dispersión entre equipos es ≤7 puntos.
- Con azar apagado, ese mismo bot gana 78% en Warrens con una dispersión de 39 puntos: los equipos con Pip y sin Luna caían a 0–13%. Gran parte del desequilibrio entre equipos (hallazgo 5) era efecto del azar apagado y del bot voraz, no del diseño real.
- Lo que sí persiste: turnos sin acción por gato (Miso ~52%, Mei ~47%, Ember ~52% con el bot competente; Luna 11%, Pip 3%), y una dificultad absoluta muy baja para un jugador atento (hallazgo 3 se confirma).
- El modelo de AP con ahorro se descartó (sin beneficio; combates 13% más largos).
- Los winrates con azar apagado son casi todo o nada (equipo gana o pierde por umbral), así que no sirven para comparar equipos con precisión; para comparar equipos usar azar activado y 12+ semillas.

## No verificado

- Sin playtest humano ni de UX (claridad, ritmo, duración de pausas).
- Optimal con 4 semillas y solo 4 etapas; la tabla de Warrens/Vault del informe previo no se volvió a medir, solo se verificó que sus pruebas pasan.
- No se leyeron `Lobby.tsx`, `Battle.tsx`, `Faq.tsx` ni `i18n`; no se auditó cobertura de pruebas de `parseProgress` con guardados corruptos.
- Sin FPS, carga ni tamaño de assets.
