# ⚡ Captura la Bandera 3D · Avengers Edition

Juego de **Captura la Bandera** en 3D, multijugador online y contra bot, con
**27 skins de personajes** y **43 accesorios**, todos **100 % gratis**.

No necesita instalar nada: el servidor HTTP + WebSocket está incluido y no usa
ninguna dependencia de npm.

---

## 🚀 Cómo jugar

```
start.bat            ← arranca el servidor en el puerto 3000
```

y abre **http://localhost:3000**

Alternativas:

```
start.js             ← mismo arrancador pero por Node directo
start.bat 8080       ← arranca en otro puerto
npm start            ← (opcional) si tienes Node en el PATH
```

Para jugar por internet con un amigo desde otra casa:

```
tunnel.bat           ← crea un enlace con cloudflared
```

---

## 🕹️ Modos de juego

| Modo | Cómo entrar |
|------|-------------|
| **Online (2 jugadores)** | Botón **Crear Sala** → copia el código de 5 letras. Tu amigo pulsa **Unirse a Sala** y lo pega (o abre el enlace directo). |
| **Vs Bot** | Botón **Jugar vs Bot** → elige dificultad Fácil / Normal / Difícil. |

### Reglas

- Coge la bandera enemiga y devuélvela a tu base para marcar.
- **Gana quien llegue primero a 3 puntos.**
- Si mueres, reapareces tras unos segundos.
- La partida online la dirige el anfitrión (host); el invitado manda sus
  teclas y el host simula el resto.

---

## 🎮 Controles

| Tecla | Acción |
|-------|--------|
| `W` / `↑` | Adelante |
| `A` / `↓` | Atrás |
| `Q` / `←` | Izquierda |
| `E` / `→` | Derecha |
| **Ratón** | Apuntar |
| **Clic izquierdo** | Disparar |
| **Botón derecho + ratón** | Girar cámara |
| `L` | Bloquear cámara libre |
| `Shift` | Boost |
| `Espacio` | Escudo |
| `R` | Disparo |
| `F` | Habilidad del héroe |
| `1` / `2` / `3` | Equipo: Guardián / Francotirador / Ágil |
| `C` | Cambiar cámara (automática, táctica, 3ª persona, 1ª persona) |
| `H` | Pantalla completa |
| `Esc` | Salir al menú |

---

## 🦸 Skins (todas gratis)

Hay **27 personajes**: 22 con retrato animado + 5 skins exclusivos del 3D.
**Ninguno está bloqueado ni cuesta nada**: se elige y ya.

Iron Man, Spider-Man, Black Panther, War Machine, Vision, Black Widow,
Heimdall, Loki, Thor, Hulk, Dr. Strange, Capitán América, Falcon, Ant-Man,
Winter Soldier, Scarlet Witch, Hawkeye, Groot, Rocket, Star-Lord, Gamora,
Drax, Iron Man MK-II, Venom, Ultron, Silver Surfer y Nova.

Cada uno tiene clase propia (Guardián / Francotirador / Ágil), con velocidad,
armadura y habilidad distintas.

---

## 🎩 Accesorios (todos gratis)

Botón **«🎨 Personaliza tu aspecto»** dentro del menú de personajes.
**No hay tienda, monedas, niveles ni compras**: todo se desbloquea al entrar y
se guarda solo en tu navegador.

| Categoría | Ejemplos |
|-----------|----------|
| 🎩 **Sombreros** (15) | Chistera, gorro de fiesta, sombrero de playa, corona, casco vikingo, vaquero, bruja, chef, lana, audífonos, orejas de conejo, cuernos, casco de carreras, mariachi, corona de flores |
| 🧣 **Capas y Ruanas** (9) | Capa de héroe, ruana tejida, poncho de playa, capucha misteriosa, manta real, alas de murciélago, capa arcoíris, toalla, capa bandera |
| 🤪 **Ropa chistosa** (10) | Disfraz de pollo, payaso, dinosaurio, pijama, plátano, presidiario, arcoíris, traje y corbata, sumo, unicornio |
| 😎 **Cara** (9) | Gafas de sol, anteojos de nerd, bigote, disfraz completo, nariz de payaso, barba de Papá Noel, careta de héroe, bigotes de gato, pico de pollo |

- La muestra 3D gira en directo mientras eliges.
- Los accesorios también viajan por la red: **tu rival te ve con los tuyos**.
- El bot se pone accesorios aleatorios para que la partida pinte más.
- En modo 2D se dibujan como emojis sobre cada jugador.

---

## 🗺️ Mapas

Clásico, Laberinto, Campo Abierto, Fortaleza y Cruce.

---

## 🧪 Pruebas

```
npm test            ← modelos (27 personajes × 43 accesorios), controles y UI
npm run test:net    ← salas, relay y accesorios por WebSocket (arranca antes el servidor)
```

| Archivo | Qué comprueba |
|---------|----------------|
| `test-models.js` | Que **todos** los personajes construyen con **todos** los accesorios sin errores ni geometría inválida, y que `WIN_SCORE` es 3. |
| `test-input.js` | Que el invitado se mueve con **su** cámara (`W/A/Q/E` + yaw) y no con los ejes del mundo. |
| `test-ui-ids.js` | Que todos los `id` usados en `ui.js` existen en `index.html`. |
| `test-net.js` | Sala → unirse → start → relay → salida. |
| `test-acc-net.js` | Los accesorios viajan en `create`, `join`, `set_char` y `start`, y el servidor filtra basura. |

---

## 📁 Estructura

```
server.js                 Servidor HTTP + WebSocket (sin dependencias)
start.bat / start.js      Arrancadores
public/
  index.html              Menú, HUD y pantalla final
  styles.css              Estilos
  vendor/three.min.js     Motor 3D (servido en local: funciona sin Internet)
  js/
    accessories.js        Catálogo y guardado de los 43 accesorios
    sprites.js            Hoja de retratos
    audio.js              Efectos de sonido sintetizados
    maps3d.js             Mapas, colisiones, pathfinding y WORLD (WIN_SCORE = 3)
    net.js                Conexión WebSocket, salas y reconexión
    models3d.js           Modelos de héroes + geometría de accesorios
    preview3d.js          Vista previa 3D del menú
    game.js               Simulación: jugadores, banderas, IA y red
    game3d.js             Renderizado, cámaras y animación
    ui.js                 Menú, HUD, bucle principal y modo 2D
```

---

## ⚙️ Requisitos

- Navegador con WebGL (si no, hay modo 2D de respaldo).
- Node.js ≥ 18 **solo para el servidor** (Laragon ya lo trae en
  `C:\laragon\bin\nodejs`).
- Internet solo es necesario para jugar **online** contra otra persona; el
  motor 3D va incluido.
