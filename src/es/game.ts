/** Spanish for game content: names, training, Hearth and the engine's messages. */
export const GAME: Record<string, string> = {
  // Roles
  Vanguard: "Vanguardia",
  Mystic: "Místico",
  Scout: "Explorador",
  Healer: "Sanador",
  Brawler: "Luchador",
  // Skills (one theme per cat)
  "Valiant slash": "Tajo valiente",
  "Nine lives": "Nueve vidas",
  "Stand behind me": "Tras de mí",
  "Moon bolt": "Rayo lunar",
  "Moon blessing": "Bendición lunar",
  Moonwell: "Pozo lunar",
  "Claw strike": "Zarpazo",
  "Dagger line": "Línea de dagas",
  "Needle strike": "Estocada de aguja",
  "Thorn swipe": "Zarpazo de espina",
  "Healing purr": "Ronroneo sanador",
  "Circle of renewal": "Círculo de renovación",
  "Return to the hearth": "Regreso al hogar",
  "Cinder jab": "Jab de brasa",
  "Flame paw": "Garra de fuego",
  "Sweeping embers": "Brasas arrasadoras",
  // Items
  "Relic chosen: {1}.": "Reliquia elegida: {1}.",
  "{1} overheats: -{2} HP ({3}/{4} HP).":
    "{1} se sobrecalienta: -{2} PV ({3}/{4} PV).",
  "Warm broth": "Caldo caliente",
  "Cleared rooms heal 20% more of max HP.":
    "Cada sala superada cura un 20% más de los PV máximos.",
  "Lucky whisker": "Bigote de la suerte",
  "+10% critical chance for your cats.":
    "+10% de probabilidad de crítico para tus gatos.",
  "+1 armor for every cat.": "+1 de armadura para cada gato.",
  "Stone den": "Guarida de piedra",
  "Guard shields cast by your cats are 3 stronger.":
    "Los escudos de Guardia de tus gatos son 3 más fuertes.",
  "Reckless torch": "Antorcha temeraria",
  "Your cats deal 3 more damage.": "Tus gatos hacen 3 de daño extra.",
  "Enemies deal 2 more damage.": "Los enemigos hacen 2 de daño extra.",
  "Heavy collars": "Collares pesados",
  "+25% max HP for every cat.": "+25% de PV máximos para cada gato.",
  "-4 initiative for every cat.": "-4 de iniciativa para cada gato.",
  "Healing thorns": "Espinas curativas",
  "Thorn swipe also heals the most wounded ally for 3.":
    "Zarpazo espinoso también cura 3 al aliado más herido.",
  "Hurried remedy": "Remedio apurado",
  "Healing purr costs 1 AP.": "Ronroneo curativo cuesta 1 PA.",
  "Healing purr heals 3 less.": "Ronroneo curativo cura 3 menos.",
  "Shield stance": "Postura de escudo",
  "Valiant slash also gives Miso a 3 shield.":
    "Tajo valiente también le da a Miso un escudo de 3.",
  "Iron coat": "Capa de hierro",
  "+2 armor for Miso.": "+2 de armadura para Miso.",
  "-6 initiative for Miso.": "-6 de iniciativa para Miso.",
  Kindling: "Yesca",
  "The first Cinder jab of each turn costs no AP.":
    "El primer Golpe de brasa de cada turno no cuesta PA.",
  Overheat: "Sobrecalentamiento",
  "Flame paw has no cooldown.": "Pata en llamas no tiene enfriamiento.",
  "Each Flame paw costs Tuntun 5 HP, never the last one.":
    "Cada Pata en llamas le cuesta 5 PV a Tuntun, nunca el último.",
  "Full moon": "Luna llena",
  "Moon bolt also hits the next foe for half.":
    "Rayo lunar también golpea al siguiente enemigo con la mitad.",
  "Smoke step": "Paso de humo",
  "Dagger line has no cooldown.": "Línea de dagas no tiene enfriamiento.",
  "Iron bell": "Campana de hierro",
  "Iron Warden": "Guardián de Hierro",
  "Golden Aegis": "Égida Dorada",
  Nightshade: "Belladona",
  "Light Moon": "Luna Clara",
  "Night Owl": "Búho Nocturno",
  "Muad'Dib": "Muad'Dib",
  "Frost Healer": "Sanadora de Escarcha",
  "Field Medic": "Médica de Campaña",
  "Karate Master": "Maestro de Karate",
  "Shaolin Monk": "Monje Shaolin",
  "Silk ribbon": "Cinta de seda",
  "Lucky fang": "Colmillo de la suerte",
  "Copper locket": "Medallón de cobre",
  "Brass whistle": "Silbato de latón",
  "Herb pouch": "Bolsita de hierbas",
  "Knight's button": "Botón de caballero",
  "Moon pebble": "Guijarro lunar",
  "Mint sprig": "Ramita de menta",
  "Pewter charm": "Dije de peltre",
  "Four-leaf clover": "Trébol de cuatro hojas",
  "Thorn ring": "Anillo de espinas",
  "Pocket lantern": "Farol de bolsillo",
  "Snack bag": "Bolsa de bocados",
  "Brave bell": "Cascabel valiente",
  "Warm milk": "Leche tibia",
  "Long thread": "Hilo largo",
  Hearthstone: "Piedra del hogar",
  "Beacon stone": "Piedra faro",
  "Ember glove": "Guante de brasas",
  // Enemies
  "Crypt rat": "Rata de cripta",
  "Moss slime": "Limo musgoso",
  "Bone sentry": "Centinela de huesos",
  "Cave bat": "Murciélago de cueva",
  "Spore imp": "Duende de esporas",
  "The Hollow King": "El Rey Hueco",
  "Royal wisp": "Voluta real",
  "Bone squire": "Escudero de huesos",
  // Enemy plans
  Attack: "Ataque",
  Curse: "Maldición",
  "Heal an ally": "Curar a un aliado",
  "Inspire an ally": "Inspirar a un aliado",
  "Shield an ally": "Proteger a un aliado",
  "Raise Mirror spores": "Alzar esporas espejo",
  Rally: "Arengar",
  // Rooms
  "Whispering entrance": "Entrada susurrante",
  "The forgotten hall": "El salón olvidado",
  "The king beneath": "El rey de abajo",
  Entrance: "Entrada",
  "Forgotten hall": "Salón olvidado",
  "Boss chamber": "Cámara del jefe",
  // Plurals
  "{n} turn": "{n} turno",
  "{n} turns": "{n} turnos",
  "{n} use": "{n} uso",
  "{n} uses": "{n} usos",
  "{n} hit": "{n} golpe",
  "{n} hits": "{n} golpes",
  enemy: "enemigo",
  ally: "aliado",
  // Training titles
  "Sturdy paws": "Patas robustas",
  "Shield practice": "Práctica de escudo",
  "Ready stance": "Postura lista",
  "Prepared defender": "Defensor preparado",
  "Hold the line": "Mantén la línea",
  "Veteran claws": "Garras veteranas",
  "Burrow guardian": "Guardián de la Madriguera",
  "Moon studies": "Estudios lunares",
  "Quick incantation": "Conjuro rápido",
  "Brighter blessing": "Bendición más brillante",
  "Ice ward": "Barrera de hielo",
  "Focused moonlight": "Luz de luna enfocada",
  "Astral rhythm": "Ritmo astral",
  "Winter moon": "Luna de invierno",
  "Gentle paws": "Patas gentiles",
  "First responder": "Primera respuesta",
  "Restorative touch": "Toque reparador",
  "Soothing spirit": "Espíritu sereno",
  "Steady hands": "Manos firmes",
  "Healing rhythm": "Ritmo sanador",
  "Unbroken spirit": "Espíritu inquebrantable",
  "Light feet": "Pies ligeros",
  "Sharp edge": "Filo afilado",
  "Cave runner": "Corredor de cuevas",
  Ambush: "Emboscada",
  "Honed claws": "Garras afiladas",
  "Fleet scout": "Explorador veloz",
  "Perfect opening": "Apertura perfecta",
  "Iron constitution": "Constitución de hierro",
  "Heavy paws": "Patas pesadas",
  "Battle rhythm": "Ritmo de batalla",
  "Battle ready": "Listo para la batalla",
  "Tempered strength": "Fuerza templada",
  "Relentless stride": "Zancada implacable",
  "Forged in fire": "Forjado en fuego",
  // Training descriptions
  "+3 max HP.": "+3 PV máx.",
  "+2 max HP and +1 Guard power.": "+2 PV máx. y +1 de poder de Guardia.",
  "Unlock Taunt: draw enemy attacks until your next turn.":
    "Desbloquea Provocación: atrae los ataques enemigos hasta tu siguiente turno.",
  "+3 max HP and +1 initiative.": "+3 PV máx. y +1 de iniciativa.",
  "Start each room with a 4-point Guard shield.":
    "Empieza cada sala con un escudo de Guardia de 4 puntos.",
  "+3 max HP and +1 attack power.": "+3 PV máx. y +1 de poder de ataque.",
  "+3 max HP, +1 Guard power; opening shield improves to 6 points.":
    "+3 PV máx., +1 de poder de Guardia; el escudo inicial mejora a 6 puntos.",
  "+1 max HP and +1 attack power.": "+1 PV máx. y +1 de poder de ataque.",
  "+1 max HP and +1 initiative.": "+1 PV máx. y +1 de iniciativa.",
  "Unlock Moonwell: raise shared AP by 2 for this room, once per room.":
    "Desbloquea Pozo lunar: sube en 2 los PA compartidos durante esta sala, una vez por sala.",
  "+1 Inspired blessing power.": "+1 de poder de la bendición Inspirado.",
  "Start each room reducing damage by 2 for the next 3 incoming attacks.":
    "Empieza cada sala reduciendo en 2 el daño de los siguientes 3 ataques recibidos.",
  "+2 max HP and +1 attack power.": "+2 PV máx. y +1 de poder de ataque.",
  "+1 initiative and +1 Inspired blessing power.":
    "+1 de iniciativa y +1 de poder de la bendición Inspirado.",
  "+3 max HP; Ice Ward protects against 4 incoming attacks per room.":
    "+3 PV máx.; la Barrera de hielo protege contra 4 ataques recibidos por sala.",
  "+2 max HP and +1 healing power.": "+2 PV máx. y +1 de poder de curación.",
  "Unlock a choice: heal the party or revive one fallen ally at 60% HP.":
    "Desbloquea una elección: curar al equipo o revivir a un aliado caído con el 60% de PV.",
  "Recover 2 HP when an attack damages you, up to 3 times per room.":
    "Recupera 2 PV cuando un ataque te daña, hasta 3 veces por sala.",
  "+1 initiative and +1 healing power.":
    "+1 de iniciativa y +1 de poder de curación.",
  "+3 max HP; Soothing Spirit can trigger 5 times per room.":
    "+3 PV máx.; el Espíritu sereno puede activarse 5 veces por sala.",
  "Unlock Needle strike: a precise attack that ignores armor.":
    "Desbloquea Estocada de aguja: un ataque preciso que ignora la armadura.",
  "+2 max HP and +1 initiative.": "+2 PV máx. y +1 de iniciativa.",
  "Your first damaging skill each room gains +2 attack power.":
    "Tu primera habilidad de daño de cada sala gana +2 de poder de ataque.",
  "+2 max HP, +1 attack power; Ambush improves to +3 power.":
    "+2 PV máx., +1 de poder de ataque; la Emboscada mejora a +3 de poder.",
  "Unlock Sweeping embers: strike every living enemy.":
    "Desbloquea Brasas arrasadoras: golpea a todos los enemigos vivos.",
  "Start each room with a 3-point Guard shield.":
    "Empieza cada sala con un escudo de Guardia de 3 puntos.",
  "+3 max HP, +1 attack power; opening shield improves to 5 points.":
    "+3 PV máx., +1 de poder de ataque; el escudo inicial mejora a 5 puntos.",
  // Hearth
  "Warm embers": "Brasas cálidas",
  "Sharpened claws": "Garras amoladas",
  "Second Wind": "Segundo aliento",
  "Thick fur": "Pelaje denso",
  "Soothing light": "Luz serena",
  "Hunter's focus": "Enfoque de cazador",
  "Stronger flame": "Llama más fuerte",
  Hearthlight: "Luz del hogar",
  "+2 max HP and +1 initiative for every cat.":
    "+2 PV máx. y +1 de iniciativa para cada gato.",
  "+1 attack power for every cat.": "+1 de poder de ataque para cada gato.",
  "+1 attack power and +5% critical chance for every cat.":
    "+1 de poder de ataque y +5% de probabilidad de crítico para cada gato.",
  "Once per expedition, the first cat to fall rises at once with 40% HP.":
    "Una vez por expedición, el primer gato que cae se levanta al instante con el 40% de PV.",
  "+3 max HP and +1 initiative for every cat.":
    "+3 PV máx. y +1 de iniciativa para cada gato.",
  "+1 healing, Guard and Inspired power for every cat.":
    "+1 de poder de curación, Guardia e Inspirado para cada gato.",
  "Second Wind restores 60% HP. +3 max HP for every cat.":
    "Segundo aliento restaura el 60% de PV. +3 PV máx. para cada gato.",
  "+1 AP in the first round of every room and +5% critical chance for every cat.":
    "+1 PA en la primera ronda de cada sala y +5% de probabilidad de crítico para cada gato.",
  // Engine log lines
  "The descent begins. {1}.": "El descenso comienza. {1}.",
  "Room rewards: +{1} gold, +{2} XP. Spoils are banked when the boss is defeated.":
    "Recompensas de sala: +{1} de oro, +{2} XP. El botín se guarda al derrotar al jefe.",
  "Trinket found: {1}.": "Amuleto encontrado: {1}.",
  "No new Trinket to find: +{1} gold.":
    "No quedan amuletos nuevos: +{1} de oro.",
  "Expedition Strength +1: all damage is now +{1} for the rest of this run.":
    "Fuerza de expedición +1: todo el daño es ahora +{1} durante el resto de esta partida.",
  "{1} fully recovers after expedition victory ({2}/{3} HP).":
    "{1} se recupera por completo tras la victoria de la expedición ({2}/{3} PV).",
  "{1} resurrects at 25% HP ({2}/{3}); no additional room recovery.":
    "{1} resucita con el 25% de PV ({2}/{3}); sin recuperación adicional de sala.",
  "{1} recovers {2} HP ({3}/{4}).": "{1} recupera {2} PV ({3}/{4}).",
  "The Hollow King is defeated!": "¡El Rey Hueco ha sido derrotado!",
  "Room cleared. Choose your next descent.":
    "Sala superada. Elige tu próximo descenso.",
  "Your expedition has fallen. Permanent upgrades remain.":
    "Tu expedición ha caído. Las mejoras permanentes se conservan.",
  "{1}'s Guard fades.": "La Guardia de {1} se desvanece.",
  "{1} is no longer cursed.": "{1} ya no sufre la maldición.",
  "{1} lifts the curse on {2}.": "{1} libera a {2} de la maldición.",
  "{1}'s taunt ends at the start of their turn.":
    "La provocación de {1} termina al inicio de su turno.",
  "{1} restores a {2} shield for {3} turns.":
    "{1} restaura un escudo de {2} durante {3} turnos.",
  "{1} gains a {2} shield for {3} turns.":
    "{1} gana un escudo de {2} durante {3} turnos.",
  "{1} renews Inspired +{2} for {3} turns.":
    "{1} renueva Inspirado +{2} durante {3} turnos.",
  "{1} gains Inspired +{2} for {3} turns.":
    "{1} gana Inspirado +{2} durante {3} turnos.",
  "{1} hits {2}: {3} damage ({4} attack power, {5} armor, {6} Guard blocked, {7} Ice Ward blocked; {8}/{9} HP).":
    "{1} golpea a {2}: {3} de daño ({4} de poder de ataque, {5} de armadura, {6} bloqueado por Guardia, {7} bloqueado por Barrera de hielo; {8}/{9} PV).",
  "{1} triggers Soothing Spirit: +{2} HP ({3} charges left; {4}/{5} HP).":
    "{1} activa el Espíritu sereno: +{2} PV ({3} cargas restantes; {4}/{5} PV).",
  "{1} reflects {2} damage to {3} ({4}/{5} HP).":
    "{1} refleja {2} de daño a {3} ({4}/{5} PV).",
  "{1} heals {2}: +{3} HP ({4} healing power; {5}/{6} HP).":
    "{1} cura a {2}: +{3} PV ({4} de poder de curación; {5}/{6} PV).",
  "{1} heals {2}: +{3} HP ({4}/{5}).": "{1} cura a {2}: +{3} PV ({4}/{5}).",
  "{1} raises Mirror spores: reflect {2} damage for 2 turns (does not stack).":
    "{1} alza esporas espejo: refleja {2} de daño durante 2 turnos (no se acumula).",
  "{1} curses {2}: -{3} to all skill output for 2 turns (active -{4}).":
    "{1} maldice a {2}: -{3} a todo el efecto de sus habilidades durante 2 turnos (activo -{4}).",
  "{1} has a snack: +{2} HP ({3}/{4} HP).":
    "{1} come un bocado: +{2} PV ({3}/{4} PV).",
  "{1} revives {2} at {3}% HP ({4}/{5}). They act next round.":
    "{1} revive a {2} con el {3}% de PV ({4}/{5}). Actúa en la próxima ronda.",
  "{1} taunts: enemies attack this cat until its next turn.":
    "{1} provoca: los enemigos atacan a este gato hasta su próximo turno.",
  "{1} expands the reservoir: +2 current and maximum shared AP for this room ({2}/{3} AP after the 1 AP cost).":
    "{1} amplía la reserva: +2 PA compartidos actuales y máximos en esta sala ({2}/{3} PA tras el coste de 1 PA).",
  "Entering room {1}. Expedition Strength remains +{2} damage.":
    "Entrando en la sala {1}. La Fuerza de expedición se mantiene en +{2} de daño.",
  "{1} passes: no usable skills left this turn.":
    "{1} pasa: no le quedan habilidades utilizables este turno.",
  "{1} automatically passes: no shared AP remain.":
    "{1} pasa automáticamente: no quedan PA compartidos.",
  "{1} has no usable skills left and passes.":
    "{1} no tiene habilidades utilizables y pasa.",
  "Second Wind! {1} rises at {2}% HP ({3}/{4}). It works once per expedition.":
    "¡Segundo aliento! {1} se levanta con el {2}% de PV ({3}/{4}). Funciona una vez por expedición.",
  "{1} scores a critical hit on {2}!": "¡{1} asesta un golpe crítico a {2}!",
  "{1} lands a critical heal on {2}!":
    "¡{1} logra una curación crítica en {2}!",
  "{1} misses {2}!": "¡{1} falla contra {2}!",
  "{1} evades {2}'s attack!": "¡{1} esquiva el ataque de {2}!",
  "{1} drains {2} HP from {3}.": "{1} drena {2} PV de {3}.",
  "{1} uses {2}.": "{1} usa {2}.",
  // Refusal reasons
  "Not your turn": "No es tu turno",
  "Not enough shared AP": "No hay suficientes PA compartidos",
  "Turn limit reached": "Límite de turno alcanzado",
  "Already used this room": "Ya se usó en esta sala",
  "No living caster": "No hay lanzador vivo",
  "This skill targets the caster or whole group":
    "Esta habilidad afecta a quien la lanza o a todo el grupo",
  "All living allies are already at full HP":
    "Todos los aliados vivos ya tienen la vida completa",
  "Choose a fallen ally to revive": "Elige un aliado caído para revivir",
  "Choose a living {1}": "Elige un {1} vivo",
  "Already at full HP": "Ya tiene la vida completa",
  "Guard is already at full duration":
    "La Guardia ya tiene la duración completa",
  "Inspired is already at full duration":
    "Inspirado ya tiene la duración completa",
  "Cooldown: ready in {1} turn": "Enfriamiento: listo en {1} turno",
  "Cooldown: ready in {1} turns": "Enfriamiento: listo en {1} turnos",
};
