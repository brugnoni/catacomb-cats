# Catacomb Cats — continuidad del proyecto

Estado documentado: 23 de noviembre de 2026. Este archivo permite retomar el desarrollo sin depender del chat anterior. Las reglas ejecutables en `src/game.ts` y `src/progression.ts` prevalecen si una nota queda desactualizada.

## Alcance y preferencias del usuario

- Proyecto personal independiente. No usar información, código, credenciales ni integraciones laborales o de otros proyectos.
- Juego de navegador para escritorio, con interfaz en inglés. La conversación y documentación de continuidad pueden estar en español.
- El usuario quiere construir mediante vibecoding, con buenas prácticas, seguridad, pruebas y agentes con responsabilidades separadas.
- Trabajar localmente. El único remoto es el repo público https://github.com/brugnoni/catacomb-cats: hacer push solo después de un commit que pasó `pnpm check` y solo si el usuario lo aprueba en el chat. Nunca force-push. El juego se despliega únicamente en GitHub Pages (https://brugnoni.github.io/catacomb-cats/) mediante `.github/workflows/pages.yml` en cada push a `main`; no desplegar en ningún otro sitio. Al ser público, nunca subir secretos ni datos personales. El agente principal integra y revisa; los agentes de módulos no hacen commits independientes.
- Leer `AGENTS.md` y `README.md` antes de cambiar cosas. Usar las dos skills locales de `.agents/skills/` cuando corresponda.
- Antes de cada commit, ejecutar `pnpm check`; no saltarse hooks ni ocultar errores.
- No generar más imágenes hasta que el usuario vuelva a pedirlo. Se rechazó expresamente la estética genérica de dashboard y los gatos dibujados con CSS.

## Idea y experiencia actual

Un equipo de gatos explora una mazmorra por turnos, obtiene tesoros y vuelve a su refugio para mejorar. El tono combina un refugio acogedor con catacumbas oscuras. La primera expedición se llama **The Hollow Below** y su lobby **The Burrow**.

Hay cinco gatos y se eligen tres: Miso (Vanguard), Luna (Mystic), Pip (Scout), Mei (Healer) y Ember (Brawler). **Mei conserva el ID interno `clover`** para no romper entrenamiento, equipo ni guardados anteriores. No renombrar ese ID solo para hacer coincidir el nombre visible.

El flujo implementado es lobby → tres salas → victoria/derrota → lobby. La primera sala tiene dos enemigos, la segunda tres y la última al Hollow King con dos acompañantes. Ascension puede añadir refuerzos. Todavía no existe un selector de expediciones ni más contenido que esas tres salas.

## Reglas de combate que deben conservarse

- Cola global por iniciativa, incluyendo enemigos y gatos vivos. El equipo comparte 6 AP por ronda.
- Cada habilidad de 1 AP admite hasta tres usos por turno propio; cada habilidad de 2 AP admite hasta dos. Algunas habilidades tienen límites más estrictos.
- Al llegar a 0 AP, termina el turno actual, se omiten gatos sin AP, actúan los enemigos y se devuelve el control al siguiente turno jugable. Una nueva ronda repone el máximo de AP correspondiente.
- Un ataque conserva el objetivo enemigo vivo mientras continúe el mismo turno del mismo gato. Una habilidad de apoyo, End turn, un cambio automático de turno, la muerte del objetivo o el resultado de sala limpian la selección.
- Los efectos temporales descuentan duración al **inicio del turno de la unidad afectada**, nunca por cada clic en End turn de otros personajes. Guard sobre Mei sigue los inicios de turno de Mei, aunque lo lance Miso.
- Taunt dirige los ataques enemigos a Miso mientras viva y termina al comenzar su próximo turno. No desvía apoyo enemigo ni maldiciones.
- Moon Blessing otorga **Inspired**, no “Fury” visible. Sus campos/efecto internos todavía se llaman `fury`. Mejora daño, curación y Guard; no aumenta AP, taunt ni la potencia de otra bendición.
- Inspired no acumula potencia al refrescarse: solo renueva duración. Un efecto con duración completa bloquea una repetición accidental.
- Guard tampoco se acumula, pero un refresco permitido restaura **toda su potencia efectiva y duración**. Un escudo completamente consumido puede aplicarse de nuevo.
- Un objetivo con HP completo no admite curación individual; la cura de grupo se bloquea si todos los aliados vivos están completos.
- **Marcas enemigas:** al iniciar la sala y al terminar cada turno suyo, cada enemigo marca un gato vivo al azar (`Unit.mark`, generador con semilla `Run.rng`; `createRun(progress, party, seed)` usa semilla 1 por defecto para pruebas deterministas y `App.tsx` usa una aleatoria). Su siguiente ataque va a esa marca; Taunt la sustituye y, si la marca cayó, se vuelve a sortear. Las maldiciones siguen yendo al gato con menos HP. `enemyIntent()` expone la acción siguiente (también apoyo a aliados) y la UI dibuja hilos bajo las tarjetas (rojo al gato marcado, verde al aliado que recibirá apoyo): al inicio de cada turno se muestran de uno en uno, en el orden de actuación (máx. ~3 s en total), y después solo al pasar el mouse (o foco de teclado) por una unidad: un enemigo muestra su propio plan, un gato muestra quién lo atacará y un enemigo apoyado muestra quién lo ayudará. Los E2E fijan la semilla con `window.__CATACOMB_SEED__`.
- **Eventos de combate:** cada transición (`act`, `endTurn`, `nextRoom`) reinicia `Run.events` con un evento `hit` por golpe y sube `Run.eventId`. La UI los usa para el destello rojo de 1 s (borde, nombre, barra y HP); alterna las clases `hit-0`/`hit-1` para reiniciar la animación.
- **Bordes de estado:** un escudo (`guard > 0`) pone borde plateado persistente hasta que se rompe o expira; una curación (`CombatEvent` tipo `heal`, incluye Revive y la cura del Royal wisp) hace destellar el borde verde 1 s en cada unidad curada. Expedition Strength se muestra en la franja de dificultad bajo el nombre de la sala.
- **Dagger line (Pip, 2 AP):** potencia 8; golpea al objetivo con 100%, al enemigo vivo siguiente (a su derecha en el campo, orden de `Run.enemies`) con 50% y al siguiente con 35% (`LINE_FALLOFF`, redondeo normal). La armadura y los escudos reducen cada golpe. Un uso por turno y cooldown de 1 turno. Nunca golpea a los enemigos que están delante del objetivo.
- **Ataques perforantes (Needle strike):** ignoran por completo armadura, Guard y Ice Ward; no gastan cargas de Ice Ward ni escudo. Vista previa y resolución usan `damagePreview()`.
- **Taunt y marcas:** al lanzar Taunt, todos los enemigos vivos marcan al gato que provoca (`mark`); mientras dure, cada marca nueva también es ese gato. Al terminar Taunt (inicio del turno del gato) se vuelven a sortear las marcas. Las maldiciones y el apoyo no siguen a Taunt: la maldición va al gato con menos HP y su hilo es **violeta**; el ataque es rojo y el apoyo verde.
- **Críticos:** cada golpe y cada curación (gatos y enemigos) tiene `BASE_CRIT_CHANCE` = 10% de ser crítico (`CRIT_MULTIPLIER` = 1.5, redondeo hacia arriba, antes de armadura). La probabilidad es fija: solo la bendición del Hogar suma (+5% en rango 6 y +5% en rango 8, solo gatos). Cada objetivo de un ataque en área o de Dagger line tira por separado. Tiene su propio generador (`Run.critRng`) para no alterar las marcas. `createRun(..., { crit })`: `"off"` (por defecto en el motor y en las pruebas), `"on"` (juego real) o un número fijo; los E2E usan `window.__CATACOMB_CRIT__`.
- **Rango siguiente:** el lobby escribe "Next rank N · título: …" para que quede claro que ese es el próximo rango, no el actual.
- **Pase automático:** si un gato aún tiene AP pero ninguna habilidad utilizable (límites de uso, cooldowns, coste mayor que el AP restante, sin objetivo válido), su turno termina solo (`canAct()` en `src/game.ts`).
- **Descripciones:** `src/abilityText.ts` genera tipo (Damage/Heal/Shield/Buff/Utility), objetivo y una frase corta por habilidad. Duraciones se dicen en turnos ("Lasts 2 turns"), sin "turn starts".
- Los intentos inválidos no consumen AP, usos ni cooldowns. Estas reglas se validan en el motor y también se explican en la interfaz.
- Los iconos de estado encima de cada personaje muestran valor y reglas mediante tooltip al pasar el mouse o usar foco de teclado.

## Habilidades desbloqueadas en rango 3

| Gato  | Desbloqueo y restricciones                                                                                                                                                                                                                                |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Miso  | Stand behind me: Taunt, 2 AP, una vez por turno.                                                                                                                                                                                                          |
| Luna  | Moonwell: 1 AP de coste, +2 AP actuales y +2 al máximo por ronda durante esa sala; una vez por sala. Ganancia inmediata neta de +1 AP. Se reinicia al cambiar de sala.                                                                                    |
| Mei   | Circle of renewal: cura a todos los aliados vivos, 3 AP y una vez por turno; **sin cooldown de varios turnos**. El mismo desbloqueo agrega Return to the hearth para revivir a un aliado caído al 60% de su HP máximo, redondeado hacia arriba, por 3 AP. |
| Pip   | Needle strike: 2 AP, **ignora armadura, escudos (Guard) y Ice Ward**; una vez por turno.                                                                                                                                                                  |
| Ember | Sweeping embers: 3 AP, daño a todos los enemigos vivos; una vez por turno y con cooldown propio.                                                                                                                                                          |

La última aclaración expresa del usuario es que **solo Revive de Mei tiene cooldown de dos turnos**. No comparte cooldown con la cura de grupo ni con Healing purr. Usar Revive en el turno N lo bloquea en N+1 y N+2; vuelve en N+3. Se puede elegir un gato muerto desde su sprite o el selector. El revivido actúa desde la siguiente ronda, no gana un turno inmediato.

**Ember:** Cinder jab **no tiene cooldown**. Flame paw (potencia 20, 3 AP) tiene cooldown de 2 turnos: usado en N, bloqueado en N+1 y N+2, disponible en N+3. Sweeping embers conserva su cooldown de 1 turno. Cada ataque tiene su propio cooldown, y otro ataque listo sigue siendo utilizable. Flame paw debe rendir más daño por AP que repetir Cinder jab (prueba en `game.test.ts`). Los cooldowns cuentan inicios de turno del propio gato y se reinician entre salas.

## Idiomas (inglés y español)

- Primera visita: pantalla "Select Your Language" con el fondo de The Burrow (`src/LanguageScreen.tsx`); la elección se guarda en `localStorage` (`catacomb-cats.lang`, separada del progreso) y se puede cambiar en cualquier momento con el menú **Language/Idioma** junto a FAQ, incluso a mitad de expedición.
- El **texto en inglés es la clave**: `t("English text", { params })` de `src/i18n.ts`. El español vive en `src/es/` (`ui.ts` interfaz, `game.ts` nombres, entrenamiento, Hearth y mensajes del motor, `faq.ts` guía). Los nombres internos (ids, enemigos, habilidades) siguen en inglés en el motor; solo se traducen al mostrarlos.
- Los mensajes del motor (registro de combate y motivos de rechazo) se traducen en la interfaz con las reglas de `src/engineText.ts`; el motor no cambia. Si añades o cambias un mensaje del motor, añade o ajusta su regla y su traducción.
- `src/i18n.test.ts` falla si falta una traducción (claves `t("...")` del código, nombres, entrenamiento, Hearth, reglas del motor, enemigos), si cambian los marcadores `{x}`, o si un mensaje real de partidas simuladas no tiene regla. Los E2E fijan el inglés con `localStorage`.
- Español: PV (HP), PA (AP), Guardia, Barrera de hielo, Hogar (Hearth), Madriguera (Burrow/lobby).

## Nombres de habilidades (un tema por gato)

| Gato  | Tema            | Habilidades                                                        |
| ----- | --------------- | ------------------------------------------------------------------ |
| Miso  | Caballero       | Valiant slash, Nine lives, Stand behind me                         |
| Luna  | Luna            | Moon bolt, Moon blessing, Moonwell                                 |
| Pip   | Pícaro          | Claw strike, Dagger line, Needle strike                            |
| Mei   | Hierbas y hogar | Thorn swipe, Healing purr, Circle of renewal, Return to the hearth |
| Ember | Fuego           | Cinder jab, Flame paw, Sweeping embers                             |

Los ids internos (`strike`, `guard`, `slam`...) no cambian; solo los nombres visibles.

## Progresión y pasivas

`TRAINING_TRACKS`, `trainingTrack()`, `trainingBonuses()` y `trainingPassives()` en `src/progression.ts` son la fuente común del motor, la FAQ y el texto de próxima mejora del lobby.

- Ocho rangos individuales por gato. Precios: 20, 30, 50, 70, 90, 110, 130 y 150 de oro. El desbloqueo de rango 3 cuesta 100 en total.
- Cada rango tiene un beneficio concreto; el rango 3 conserva la habilidad especial, el 5 introduce una pasiva y el 8 la mejora.
- Miso prioriza HP y Guard; Luna, ataques y bendiciones; Mei, curación; Pip, iniciativa y ataques; Ember, HP y ataques.
- Miso empieza cada sala con Guard 4 en rango 5, que pasa a 6 en rango 8. Ember empieza con Guard 3, después 5.
- Luna obtiene Ice Ward: reducción de 2 para los próximos tres ataques entrantes válidos; cuatro cargas en rango 8. No es un temporizador de turnos.
- Mei obtiene Soothing Spirit: recupera 2 HP cuando un ataque le quita HP y sobrevive, hasta tres veces por sala; cinco en rango 8. No revive ni produce bucles con daño reflejado.
- Pip obtiene +2 de potencia en su primera habilidad dañina de cada sala; +3 en rango 8. Se consume una vez por lanzamiento, no una vez por objetivo.
- La FAQ muestra los ocho rangos completos y su coste. El lobby muestra solo la próxima mejora, con texto breve y legible.
- Cada 150 XP bancados da un nivel de maestría compartida: +2 HP para todos. Cada tres niveles añade +1 a potencia numérica de ataques, curación, Guard y bendiciones. Maestría máxima 10.
- Maestría no modifica AP, taunt, el 60% fijo de Revive ni los valores fijos de pasivas. `masteryBonuses().attack` es un alias de `power`; no sumar ambos.
- **Hearth (bendición global)**, `HEARTH_TRACK` en `src/progression.ts`; ocho rangos, coste 20 + 20 × rango. R1 +2 HP y +1 iniciativa; R2 +1 ataque; R3 **Second Wind** (una vez por expedición el primer gato caído se levanta al 40% HP, `Run.secondWind`); R4 +3 HP y +1 iniciativa; R5 +1 curación/Guard/Inspired; R6 +1 ataque y +5% crítico; R7 Second Wind al 60% y +3 HP; R8 +1 AP en la primera ronda de cada sala y +5% crítico (`Run.hearthAp`). Los guardados antiguos conservan el rango pero siguen estas reglas nuevas (ya no es +2 HP por rango).
- Equipo único: Iron bell +6 HP; Silk ribbon +3 iniciativa; Lucky fang +1 ataque. Empty slot desequipa sin perder el objeto.

## Daño, enemigos y dificultad

El motor comparte `damagePreview()` entre resolución y UI: potencia modificada → armadura → Ice Ward → Guard → pérdida real de HP; también contempla curación reactiva. No aplicar esa curación dos veces.

El caso reportado de 1/37 HP, armadura 2 y ataque de potencia 6 está cubierto: muere sin escudo adicional. Guard suficiente puede absorber los 4 restantes; el preview y Field Notes muestran esa diferencia.

Los enemigos tienen roles: tanques con armadura/Guard, ágiles con iniciativa alta, mejoras de ataque, maldiciones, protección, reflexión y curación limitada de aliados. Reflejar causa daño de retorno fijo y no vuelve a reflejarse.

Tras la primera victoria, se fija al entrar una dificultad de Ascension según victorias, oro gastado y maestría; el oro sin gastar no cuenta. El nivel no cambia durante la run. Fórmula actual:

`tier = min(12, wins + floor(spentGold / 200) + floor(masteryLevel / 2))`

HP enemigo × `(1 + 0.08 × tier)`; potencia +`ceil(tier / 4)`; iniciativa +`floor(tier / 4)`. En tier 5 aparece un refuerzo por sala, en tier 10 un segundo. Enemigos ya acorazados ganan hasta dos de armadura adicional, en tiers 6 y 12. Antes de la primera victoria el tier es 0.

## Recompensas, recuperación y guardado

- Sala 1: 20 oro/30 XP; sala 2: 30 oro/45 XP; jefe: 40 oro/60 XP. Total completo: 90 oro y 135 XP, más objetos descubiertos.
- Oro, XP y objetos de salas son **Expedition Loot provisional**. Solo se bancan tras vencer al jefe **y pulsar Return to lobby**. No se equipan objetos encontrados a mitad de run.
- Tras las primeras dos salas, los supervivientes recuperan hasta 8 HP y todos ganan +1 de daño para el resto de la run. Los caídos reviven al 25% de HP máximo, redondeado arriba, sin recibir además los +8.
- Vencer al jefe cura y revive a todo el grupo al máximo y limpia efectos temporales. La siguiente expedición comienza sana.
- Derrota total, retirada o recarga pierden loot provisional. Una derrota total no activa resurrección.
- El progreso permanente está en `localStorage`, clave **`catacomb-cats.progress.v1`**. La run activa no se guarda.
- **Mover esta carpeta no mueve automáticamente el progreso del navegador.** El almacenamiento depende también del origen/puerto y perfil. Exportar/importar progreso no es una función del juego actual; consultar la guía de traslado incluida para el procedimiento disponible.
- Mantener migración y validación de guardados. No cambiar IDs o versión sin plan de compatibilidad. Los rangos antiguos se conservan aunque sus efectos sigan las reglas nuevas.

## Arquitectura y herramientas

| Área                                               | Ubicación                                                             |
| -------------------------------------------------- | --------------------------------------------------------------------- |
| Motor puro e inmutable, validadores y tipos        | `src/game.ts`                                                         |
| Datos de rangos, pasivas, maestría y Ascension     | `src/progression.ts`                                                  |
| Lobby, combate, selección y guardado del navegador | `src/App.tsx`                                                         |
| FAQ en inglés con todas las reglas                 | `src/Faq.tsx`                                                         |
| Sprites, estados y estilos                         | `src/Sprite.tsx`, `src/UnitEffects.tsx`, `src/styles.css`             |
| Pruebas de reglas y simulaciones                   | `src/*.test.ts`                                                       |
| Pruebas Chromium de la aplicación compilada        | `tests/game.spec.ts`                                                  |
| Arte final y procedencia/prompts                   | `public/art/`                                                         |
| Capturas y mediciones                              | `outputs/`                                                            |
| Skills del proyecto                                | `.agents/skills/catacomb-feature/`, `.agents/skills/catacomb-review/` |
| Hook y CI preparado                                | `.githooks/`, `.github/`                                              |

Stack: React, TypeScript estricto y Vite. Node 24 LTS es el objetivo; `package.json` fija pnpm 11.25.0 y `pnpm-lock.yaml` fija dependencias. No crear un segundo lockfile con npm.

Comandos desde la raíz: `pnpm install --frozen-lockfile`, `pnpm exec playwright install chromium`, `pnpm dev` y `pnpm check`. Con dependencias ya instaladas, `npm run dev` también arranca el juego. No asumir que pnpm está en el PATH de otra máquina: en el entorno original solo estaba expuesto internamente a Codex.

`pnpm check` ejecuta formato, lint, tipos, pruebas unitarias, build y E2E. `pnpm install` configura el hook si hay `.git`; en una copia sin `.git` revisar la guía de traslado para inicializarlo. CI incluye auditoría, secretos, CodeQL y Dependabot, pero todavía necesita habilitarse y verificarse en el alojamiento futuro. Pages usa `base: "./"` en `vite.config.ts` para funcionar bajo `/catacomb-cats/`; el progreso del juego es `localStorage` de ese origen, separado del local.

Verificación repetida al preparar el traslado: **71 pruebas de motor/progresión/balance y 21 de navegador pasaron**, además de formato, lint, tipos y build, mediante la ruta npm/pnpm documentada. El archivo `outputs/VALIDACION-TRASLADO.md` describe el alcance de la comprobación y del paquete.

## Estado visual y límites conocidos

Los escenarios y atlas son recursos raster de estilo pixel generados, inspeccionados e integrados; no se afirmaron dibujados manualmente. Las fuentes pixel se empaquetan localmente. No hay cuentas, servidor, telemetría ni nube. El diseño es de escritorio; móvil no es objetivo de esta versión.

El balance está documentado en `outputs/balance-report.md`, con simulaciones reproducibles mediante `src/balance.test.ts`. Esas políticas prueban ejemplos concretos, no una tasa universal de victoria ni la dificultad justa de todas las combinaciones. Las resurrecciones y nuevas mejoras hicieron el juego más permisivo; no se retocaron enemigos solo para ocultarlo.

## Siguiente trabajo solicitado, aún no implementado

1. Explorar más salas y varias expediciones.
2. Permitir elegir expedición mediante un selector/botón en el lobby.
3. Mostrar dificultad, parámetros y objetivos de cada expedición antes de entrar.
4. Diseñar desbloqueos por objetivos/progreso, con equilibrio entre crecimiento y desafío.
5. Seguir probando balance con partidas humanas y combinaciones distintas; evitar volver a mejoras genéricas sin propósito para cada clase.

No empezar esta ampliación durante el cierre/traslado. Retomarla cuando el usuario pida continuar.
