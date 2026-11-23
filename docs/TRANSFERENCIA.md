# Mover Catacomb Cats a otra computadora

Todo el código, assets seleccionados, borrador de personajes, configuración, tests, documentación y las dos skills propias están en esta carpeta. El ZIP `outputs/transfer/catacomb-cats-portable.zip` incluye también archivos ocultos y una build del juego. No depende de carpetas hermanas ni de rutas de esta computadora.

## Qué copiar

La opción recomendada es copiar y descomprimir el ZIP completo. Si haces una copia manual, incluye todos los archivos de contenido y las carpetas ocultas, pero omite `node_modules` y las cachés: deben regenerarse para el nuevo equipo. Conserva `.agents`, `.github`, `.githooks`, `.nvmrc` y los archivos de configuración. Abre **catacomb-cats como proyecto independiente** en Codex y comienza por `AGENTS.md`, `README.md` y `docs/HANDOFF.md`.

El ZIP excluye `node_modules`, cachés, resultados transitorios de tests y `.git`. Las dependencias incluyen programas nativos: deben reinstalarse para el sistema operativo de destino. El repositorio actual no tiene commits ni remotos; no hay historial de commits que perder en este paquete. La carpeta original y su `.git` no se borran ni modifican por el empaquetado.

## Preparación en la computadora personal

Instala Node.js 24 LTS, que incluye npm. Git es necesario si quieres continuar versionando y usar el hook de commits. Los comandos siguientes se ejecutan dentro de la carpeta descomprimida y usan una versión fija de pnpm sin necesitar una instalación global de pnpm:

```sh
node --version
npm --version
npm exec --yes --package=pnpm@11.25.0 -- pnpm install --frozen-lockfile
npm run dev
```

Abre la URL local que imprime Vite, normalmente `http://127.0.0.1:5173/`. Mantén la terminal abierta; `Ctrl+C` detiene el servidor. No uses `npm install`: el proyecto conserva un único lockfile de pnpm.

La instalación inicial requiere internet para descargar paquetes públicos. Después de instalar, el juego usa imágenes y fuentes locales y no necesita API keys ni servicios externos. Node, npm/pnpm, Git, Chromium de pruebas y la aplicación Codex son herramientas del equipo de destino, no archivos de contenido del juego.

## Calidad y pruebas de navegador

```sh
npm exec --yes --package=pnpm@11.25.0 -- pnpm exec playwright install chromium
npm exec --yes --package=pnpm@11.25.0 -- pnpm check
```

En Linux, Playwright puede requerir bibliotecas del sistema; su instalador oficial permite `playwright install --with-deps chromium`. El comando `check` ejecuta formato, lint, tipos, pruebas unitarias/balance, build y pruebas de navegador. Se debe ejecutar antes de cada commit. También puedes instalar globalmente la versión de pnpm fijada en `package.json` si prefieres usar `pnpm` directamente.

## Reactivar Git y el hook local

En el ZIP no hay carpeta `.git`. Si quieres continuar con Git, usa:

```sh
git init -b main
node scripts/install-hooks.mjs
git config core.hooksPath
```

El último comando debe imprimir `.githooks`. El hook ejecuta la suite completa mediante npm y el pnpm fijado, por lo que también funciona sin pnpm global. En macOS/Linux, si el programa usado para descomprimir perdió los permisos ejecutables, ejecuta `chmod +x .githooks/pre-commit`. El único remoto es el repo público `https://github.com/brugnoni/catacomb-cats` (`origin`); no hay publicación ni despliegue configurados. Para continuar desde otro equipo puedes clonar ese repo en lugar de usar el paquete portable. Git puede requerir tu identidad de autor local antes del primer commit; no contiene credenciales incluidas en el paquete.

## Probar la build incluida

La carpeta `dist` contiene una build con imágenes y fuentes locales. Con las dependencias instaladas:

```sh
npm run preview
```

Abre la URL que se muestre. Sirve el juego por HTTP desde la raíz del servidor: no abras `dist/index.html` haciendo doble clic y no lo montes bajo un subdirectorio. También puedes servir `dist` con un servidor estático existente; no se necesita Node para ejecutar el código en el navegador, pero sí alguna herramienta para servir HTTP.

## Skills y continuidad

Las skills versionadas están en `.agents/skills/catacomb-feature` y `.agents/skills/catacomb-review`. Ambas incluyen su propio `SKILL.md` y no dependen de las skills globales de esta computadora. Codex puede leerlas desde el proyecto; sus herramientas concretas dependen de la instalación y permisos de Codex en el nuevo equipo.

La generación de imágenes fue un paso de autoría, no una dependencia para ejecutar el juego. Los assets finales ya están incluidos, junto con la dirección artística, los prompts de referencia y el borrador inicial. No hacen falta una API key ni un generador de imágenes para continuar con gameplay. No generar nuevas imágenes hasta que el usuario lo solicite.

## Tu progreso guardado

El progreso del jugador está en el `localStorage` del navegador bajo `catacomb-cats.progress.v1`. No se ha exportado automáticamente desde tu navegador. Ni el ZIP ni `dist` contienen tu partida particular.

Para llevarla, abre el juego actual en el navegador donde hayas jugado y usa sus herramientas de desarrollador, sección Application/Storage → Local Storage. Guarda el valor de `catacomb-cats.progress.v1` como texto JSON en un archivo personal, por ejemplo `mi-partida.json`. Copia ese archivo por separado. También puedes obtener el valor en la consola del juego con:

```js
localStorage.getItem("catacomb-cats.progress.v1");
```

En la computadora nueva, abre el juego, entra a la misma sección de almacenamiento y crea esa clave con el JSON exportado. Recarga. Conserva una copia del JSON antes de sobrescribir nada; el juego valida el progreso y puede recuperar el estado inicial si el contenido no es válido.

`localhost` y `127.0.0.1`, distintos puertos, navegadores y perfiles tienen almacenamientos distintos. Usa siempre la misma URL local para mantener la misma partida. La expedición activa no se guarda; termina o abandona la run antes de exportar el progreso permanente.

## Integridad y volver a empaquetar

```sh
node scripts/verify-transfer.mjs
```

Comprueba que los archivos del paquete coinciden con el manifiesto SHA-256 incluido. El manifiesto corresponde a una instantánea: si editas archivos después, esa verificación señalará los cambios esperables.

Para generar un paquete nuevo, necesitas Python 3 para el empaquetador (no para jugar):

```sh
npm exec --yes --package=pnpm@11.25.0 -- pnpm build
python3 scripts/package-project.py
node scripts/verify-transfer.mjs
```

El empaquetador incluye código, configuración, skills, assets, documentación, capturas y `dist`; omite dependencias reinstalables, cachés, secretos de entorno y su propio ZIP. Guarda el checksum `.sha256` junto al ZIP para verificar la copia transferida.
