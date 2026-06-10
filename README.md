# Informe Técnico y Documentación de Sistema
## Proyecto: El Escape de la Serpiente Macanche (Arquitectura Serverless)

Este documento contiene la documentación técnica completa, la bitácora detallada del código, el glosario de términos con evidencia algorítmica, el diagrama de contexto y el manual de usuario del proyecto web interactivo **"El Escape de la Serpiente Macanche"**.

---

## 1. Bitácora General del Código y Arquitectura

El proyecto está estructurado de manera modular bajo las mejores prácticas del desarrollo web moderno, separando rigurosamente el contenido semántico, la presentación visual y el comportamiento lúdico e interactivo junto con servicios en la nube en tres frentes principales:

* **Estructura Base (`index.html`):** Define el esqueleto semántico de la aplicación y la interfaz de usuario (UI). Organiza un contenedor principal (`#game-container`) que alberga el lienzo gráfico (`<canvas>`) de dimensiones dinámicas responsivas (600x400 píxeles por defecto), destinado a la renderización gráfica del juego. Además, implementa un sistema de múltiples capas superpuestas (`<div class="overlay">`) para gestionar de forma dinámica las pantallas de inicio, el menú de sesión, la visualización de la tabla de rankings y la pantalla de fin de juego (Game Over). Finaliza vinculando el script lógico bajo el formato de módulo (`type="module"`).
* **Presentación y Diseño (`estilos.css`):** Controla el apartado estético y la maquetación espacial del sistema. Emplea el modelo de caja *Flexbox* para asegurar el centrado del contenedor del juego en el navegador. Gestiona la jerarquía visual mediante el uso de la propiedad `z-index` para los menús superpuestos y aplica transiciones suaves (`transition: opacity 0.5s ease`) para ocultar elementos de la UI. Además, incorpora animaciones clave personalizadas (`@keyframes latido`) para captar la atención del usuario en botones interactivos.
* **Comportamiento Dinámico y Backend (`juego.js`):** Actúa como el motor de la aplicación, dividido funcionalmente en dos grandes áreas:
    * **Motor Gráfico y POO:** Emplea Programación Orientada a Objetos para instanciar entidades independientes (`Macanche`, `Zapote`, `CascoArriero` y `Grieta`). Mantiene un bucle gráfico continuo a 60 FPS mediante `requestAnimationFrame()` para actualizar la lógica de movimiento, termorregulación y detección de colisiones rectangulares (AABB). Implementa la precarga de imágenes en caché para optimizar el rendimiento y evitar caídas de memoria fotograma a fotograma.
    * **Arquitectura Serverless (Firebase):** Importa de manera modular los SDKs de Google Firebase. Controla el estado de la sesión del usuario mediante un observador en tiempo real (`onAuthStateChanged`) y despliega la autenticación OAuth 2.0 mediante ventanas emergentes. Finalmente, utiliza promesas asíncronas (`async/await`) para inyectar nuevos documentos y realizar consultas ordenadas (`query`, `orderBy`) en la base de datos en la nube Firestore, generando dinámicamente la tabla de posiciones en el DOM.

---

## 2. Glosario de Términos Técnicos e Implementación

| Término Técnico | Definición Aplicada al Proyecto | Evidencia de Código / Implementación |
| :--- | :--- | :--- |
| **API de Canvas (HTML5)** | Interfaz gráfica nativa del navegador que provee un contexto 2D (`ctx`) para renderizar fotogramas en tiempo real. | `ctx.drawImage(this.imagen, this.x, this.y, this.width, this.height);` |
| **Colisión AABB (Axis-Aligned Bounding Box)** | Algoritmo matemático implementado para detectar intersecciones entre dos cajas rectangulares en un plano 2D bidimensional sin rotación. | `rect1.x < rect2.x + rect2.width && rect1.x + rect1.width > rect2.x && rect1.y < rect2.y + rect2.height` |
| **requestAnimationFrame()** | Función nativa de la API web que sincroniza el redibujado del lienzo con la tasa de refresco del monitor del usuario, garantizando un rendimiento óptimo. | `requestAnimationFrame(() => this.loop());` |
| **Módulos ES6 (Import/Export)** | Arquitectura de JavaScript que permite encapsular variables y clases en archivos independientes usando las directivas `import` y `export`. | `<script type="module" src="juego.js"></script>` |
| **BaaS (Backend as a Service)** | Modelo de infraestructura en la nube. El proyecto externaliza la capa de servidor tradicional hacia Google Firebase, delegando la persistencia. | `const db = getFirestore(app);` |
| **OAuth 2.0 (Autenticación)** | Protocolo estándar de autorización federada. El juego utiliza ventanas emergentes para autenticar al usuario mediante Google de forma encriptada. | `signInWithPopup(auth, provider)` |
| **Cloud Firestore** | Base de datos NoSQL en la nube orientada a documentos que permite inyecciones y consultas JSON directas y asíncronas sin servidores físicos. | `await addDoc(collection(db, "tabla_records"), { ... });` |
| **Programación Defensiva** | Práctica de codificación que anticipa fallos externos (ej. error 404 de recursos en producción o imágenes rotas) validando la carga de elementos. | `if (this.imagen.complete && this.imagen.naturalWidth > 0)` |
| **Precarga de Activos (Preloading)** | Técnica de optimización en memoria RAM que consiste en instanciar las imágenes una sola vez en el constructor para reutilizarlas en el loop. | `this.imagenes.casco = new Image();
this.imagenes.casco.src = '...';` |

---

## 3. Diagrama de Contexto (Nivel 0)

Este esquema representa las fronteras lógicas del sistema y el flujo de los datos entre el núcleo de la aplicación y los agentes externos:

### Proceso Central (Sistema)
* **0.0 - Aplicación Web "Escape Macanche":** Single Page Application (SPA) interactiva encargada del procesamiento físico, renderizado gráfico y control de estado lúdico.

### Entidades Externas e Interfaces de Datos
1.  **Usuario Final (Jugador):**
    * *Flujo de entrada:* Proporciona eventos de hardware directos (pulsaciones discretas de teclado como `ArrowUp`, `ArrowDown`, `KeyP` y clics de ratón).
    * *Flujo de salida:* Recibe el flujo gráfico rasterizado a 60 FPS dentro del elemento `<canvas>` y cambios en el DOM de la interfaz de usuario superpuesta.
2.  **Proveedor de Identidad (Google OAuth 2.0):**
    * *Flujo de entrada:* Recibe la petición modal de autenticación segura con el SDK.
    * *Flujo de salida:* Devuelve al sistema un token firmado de sesión activa y el objeto descriptor con el nombre público verificado (`displayName`).
3.  **Firebase Cloud Firestore (Base de Datos):**
    * *Flujo de entrada:* Recibe el *payload* transaccional estructurado en formato JSON al concluir la partida para almacenar el puntaje de manera permanente.
    * *Flujo de salida:* Suministra colecciones filtradas (`QuerySnapshot`) conteniendo el *Top 10* de récords históricos ordenados de forma descendente.
4.  **Servidor de Despliegue (GitHub Pages / CDN):**
    * *Flujo de salida:* Distribuye los archivos estáticos base (`.html`, `.css`, `.js`, imágenes `.png`) mediante peticiones HTTP GET estandarizadas a través de la red.

---

## 4. Manual Técnico y de Usuario Básico

### Especificaciones de Ejecución y Entorno
* **Entorno Requerido:** Cualquier navegador web moderno compatible con el estándar ECMAScript 6 y renderizado nativo de Canvas 2D (Google Chrome v61+, Mozilla Firefox v60+, Microsoft Edge). No requiere instalación local.
* **Conectividad:** Es indispensable contar con acceso persistente a Internet a través del puerto seguro 443 (HTTPS) para cargar los módulos de Firebase, gestionar el SDK de autenticación federada y realizar las transacciones en la nube en tiempo real.

### Flujo de Operación General
1.  **Arranque y Autenticación:** Al inicializar la aplicación, el sistema intercepta el estado de sesión actual. Si no existe un usuario autenticado, se bloquea el acceso al loop lúdico y se renderiza un overlay forzando la interacción con el botón "Iniciar sesión con Google". Tras completar el protocolo OAuth 2.0, el observador en tiempo real conmuta los estados de visibilidad de los elementos del DOM, habilitando el menú principal con las opciones "Jugar Aventura", "Ver Ranking" y "Cerrar Sesión".
2.  **Gestión de Pantalla Completa:** Al presionar el botón correspondiente, se ejecuta el disparador responsivo `requestFullscreen()`. El motor del juego recalcula automáticamente sus límites espaciales (matriz de colisiones) inyectando eventos nativos de redimensionamiento: `window.innerWidth` y `window.innerHeight`.

### Mecánicas de Interacción Lógica y Controles
* **Movimiento de Entidad:** El usuario utiliza las flechas direccionales (`ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`). Cada interacción altera las coordenadas cartesianas (X, Y) del objeto en una magnitud de 4 píxeles por fotograma (`this.speed = 4`).
* **Control Defensivo de Scroll:** El sistema ejecuta de forma interna la función `e.preventDefault()` sobre las teclas de movimiento y barra espaciadora para inhabilitar el scroll nativo de la ventana del navegador, evitando que la página se mueva mientras se controla al personaje.
* **Conmutación de Pausa:** La tecla alfanumérica **"P"** suspende inmediatamente el procesamiento algorítmico de la física, congelando la escena y superponiendo una capa semitransparente con el texto indicador "JUEGO EN PAUSA".

### Condiciones de Cierre de Partida
* **Derrota en Nivel 1 (Fase Térmica):** Si la hitbox del jugador no intersecta con la matriz de un elemento "Zapote" visible, el acumulador de exposición solar aumenta. Al alcanzar los 240 fotogramas (4 segundos continuos en el sol directo), el juego concluye por sobrecalentamiento.
* **Derrota en Nivel 2 (Fase Balística):** Se evalúa constantemente mediante un bucle si la caja del jugador intersecta con el arreglo dinámico de `CascoArriero`. Al detectar una intersección verdadera, la partida concluye de forma inmediata.
* **Victoria del Juego:** Se gatilla estrictamente si el jugador sobrepasa los límites espaciales del objeto `Grieta` situado en la franja inferior del lienzo durante el transcurso del Nivel 2.
* **Persistencia Directa:** Al concluir la sesión de juego de manera exitosa o fallida, el Gestor de Juego serializa las variables (`puntaje`, `tiempoTotal` calculados con `Date.now()` y `nivel`) y ejecuta una promesa asíncrona (`addDoc`) inyectando los datos directamente en Firestore sin necesidad de recargar la página.
