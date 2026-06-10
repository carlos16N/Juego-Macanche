// juego.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCN94GPlC0Q6BFgU0I1Sf1DDbxnoWtiNRo",
  authDomain: "macanche-fa1b5.firebaseapp.com",
  projectId: "macanche-fa1b5",
  storageBucket: "macanche-fa1b5.firebasestorage.app",
  messagingSenderId: "891393440473",
  appId: "1:891393440473:web:a5934748fdd20d2cdfdcc8",
  measurementId: "G-56R3TM0GWH"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

// --- CLASES DE ENTIDADES (Optimizadas con Imágenes Precargadas) ---

class Macanche {
    constructor(x, y, imgPreCargada) {
        this.x = x;
        this.y = y;
        this.width = 32;
        this.height = 32;
        this.speed = 4;
        this.imagen = imgPreCargada; 
    }
    dibujar(ctx) {
        // Validación estricta: Si la imagen está lista y no está rota
        if (this.imagen.complete && this.imagen.naturalWidth > 0) {
            ctx.drawImage(this.imagen, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = "green"; // Cuadro de emergencia
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
    mover(teclas, canvas) {
        if (teclas['ArrowUp'] && this.y > 0) this.y -= this.speed;
        if (teclas['ArrowDown'] && this.y + this.height < canvas.height) this.y += this.speed;
        if (teclas['ArrowLeft'] && this.x > 0) this.x -= this.speed;
        if (teclas['ArrowRight'] && this.x + this.width < canvas.width) this.x += this.speed;
    }
}

class Zapote {
    constructor(canvas, imgPreCargada) {
        this.canvas = canvas;
        this.width = 40;
        this.height = 40;
        this.imagen = imgPreCargada;
        this.reubicar();
    }
    reubicar() {
        this.x = Math.random() * (this.canvas.width - this.width);
        this.y = Math.random() * (this.canvas.height - this.height);
        this.framesDeVida = 3 * 60;
        this.visible = true;
        this.cooldown = 0;
    }
    actualizar() {
        if (this.visible) {
            this.framesDeVida--;
            if (this.framesDeVida <= 0) {
                this.visible = false;
                this.cooldown = 60;
            }
        } else {
            this.cooldown--;
            if (this.cooldown <= 0) this.reubicar();
        }
    }
    dibujar(ctx) {
        if (this.visible) {
            if (this.imagen.complete && this.imagen.naturalWidth > 0) {
                if (this.framesDeVida > 30 || this.framesDeVida % 10 > 5) {
                    ctx.drawImage(this.imagen, this.x, this.y, this.width, this.height);
                }
            } else {
                ctx.fillStyle = "darkgreen"; // Cuadro de emergencia
                ctx.fillRect(this.x, this.y, this.width, this.height);
            }
        }
    }
}

class CascoArriero {
    constructor(canvas, imgPreCargada) {
        this.width = 32;
        this.height = 32;
        this.x = Math.random() * (canvas.width - this.width);
        this.y = -40;
        this.speed = Math.random() * 2 + 2;
        this.imagen = imgPreCargada;
    }
    dibujar(ctx) {
        if (this.imagen.complete && this.imagen.naturalWidth > 0) {
            ctx.drawImage(this.imagen, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = "gray"; // Cuadro de emergencia
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
    mover() { this.y += this.speed; }
}

class Grieta {
    constructor(canvas, imgPreCargada) {
        this.width = canvas.width;
        this.height = 30;
        this.x = 0;
        this.y = canvas.height - this.height;
        this.imagen = imgPreCargada;
    }
    dibujar(ctx) {
        if (this.imagen.complete && this.imagen.naturalWidth > 0) {
            ctx.drawImage(this.imagen, this.x, this.y, this.width, this.height);
        } else {
            ctx.fillStyle = "#1a110a"; // Cuadro de emergencia (Tierra)
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }
    }
}

// --- GESTOR PRINCIPAL ---

class GestorJuego {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.teclas = {};
        this.jugadorNombre = "";
        this.activo = false;

        // 1. PRECARGA CENTRALIZADA DE IMÁGENES (Evita el bug del Nivel 2)
        this.imagenes = {
            macanche: new Image(),
            zapote: new Image(),
            casco: new Image(),
            grieta: new Image()
        };
        this.imagenes.macanche.src = 'imagen/nativo_ofidio.png';
        this.imagenes.zapote.src = 'imagen/arbusto.png';
        this.imagenes.casco.src = 'imagen/casco.png';
        this.imagenes.grieta.src = 'imagen/grietas.png';
        
        this.inicializarInstancias();
        this.asignarEventos();
        this.escucharAutenticacion();
    }

    inicializarInstancias() {
        this.nivel = 1;
        this.puntaje = 0;
        this.framesNivel1 = 0;
        this.exposicionSol = 0;
        this.maxFramesNivel1 = 15 * 60;
        this.maxExposicionSol = 4 * 60;
        this.framesNivel2 = 0;
        this.pausado = false;
        
        // Se inyectan las imágenes ya cargadas
        this.macanche = new Macanche(50, 50, this.imagenes.macanche);
        this.zapotes = [new Zapote(this.canvas, this.imagenes.zapote), new Zapote(this.canvas, this.imagenes.zapote)];
        this.cascos = [];
        this.grieta = new Grieta(this.canvas, this.imagenes.grieta);
        this.canvas.style.backgroundColor = "#f4db9a";
    }

    escucharAutenticacion() {
        onAuthStateChanged(auth, (user) => {
            const startScreen = document.getElementById('start-screen');
            if (user) {
                this.jugadorNombre = user.displayName;
                document.getElementById('welcome-title').innerText = `Hola, ${user.displayName}`;
                document.getElementById('btn-google').classList.add('hidden');
                document.getElementById('menu-logged-in').classList.remove('hidden');
            } else {
                this.jugadorNombre = "";
                document.getElementById('welcome-title').innerText = "Bienvenido, viajero";
                document.getElementById('btn-google').classList.remove('hidden');
                document.getElementById('menu-logged-in').classList.add('hidden');
                startScreen.classList.remove('hidden', 'fade-out');
            }
        });
    }

    asignarEventos() {
        window.addEventListener('keydown', (e) => {
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
                e.preventDefault();
            }
            this.teclas[e.code] = true;
            
            if ((e.code === 'KeyP' || e.key === 'p' || e.key === 'P') && this.activo) {
                this.pausado = !this.pausado;
            }
        });
        window.addEventListener('keyup', (e) => this.teclas[e.code] = false);
        
        document.getElementById('btn-google').addEventListener('click', () => {
            signInWithPopup(auth, provider).catch(err => console.error("Error Login:", err));
        });

        document.getElementById('startBtn').addEventListener('click', () => {
            const startScreen = document.getElementById('start-screen');
            startScreen.classList.add('fade-out');
            setTimeout(() => {
                startScreen.classList.add('hidden');
                this.iniciarJuego();
            }, 500);
        });

        document.getElementById('btn-restart').addEventListener('click', () => {
            document.getElementById('end-screen').classList.add('hidden');
            this.inicializarInstancias();
            this.iniciarJuego();
        });

        const realizarLogout = () => {
            document.getElementById('end-screen').classList.add('hidden');
            this.activo = false;
            signOut(auth).catch(err => console.error(err));
        };
        document.getElementById('btn-logout-menu').addEventListener('click', realizarLogout);
        document.getElementById('btn-logout-end').addEventListener('click', realizarLogout);

        document.getElementById('btn-ranking-menu').addEventListener('click', () => this.obtenerYMostrarRanking());
        document.getElementById('btn-back-ranking').addEventListener('click', () => {
            document.getElementById('ranking-screen').classList.add('hidden');
        });

        document.getElementById('btn-fullscreen').addEventListener('click', () => {
            const contenedor = document.getElementById('game-container');
            if (!document.fullscreenElement) {
                contenedor.requestFullscreen().catch(err => console.error(err));
            } else {
                document.exitFullscreen();
            }
        });

        document.addEventListener('fullscreenchange', () => {
            if (document.fullscreenElement) {
                this.canvas.width = window.innerWidth;
                this.canvas.height = window.innerHeight;
            } else {
                this.canvas.width = 600;
                this.canvas.height = 400;
            }
            this.grieta.width = this.canvas.width;
            this.grieta.y = this.canvas.height - this.grieta.height;
        });
    }

    iniciarJuego() {
        this.activo = true;
        this.tiempoInicio = Date.now();
        this.loop();
    }

    hayColisionRect(rect1, rect2) {
        return rect1.x < rect2.x + rect2.width &&
               rect1.x + rect1.width > rect2.x &&
               rect1.y < rect2.y + rect2.height &&
               rect1.y + rect1.height > rect2.y;
    }

    actualizarLógica() {
        this.macanche.mover(this.teclas, this.canvas);

        if (this.nivel === 1) {
            this.framesNivel1++;
            if (this.framesNivel1 >= this.maxFramesNivel1) {
                this.nivel = 2;
                this.macanche.x = 50; this.macanche.y = 50;
                this.canvas.style.backgroundColor = "#c48b5d"; 
                this.puntaje += 200;
                return;
            }

            this.zapotes.forEach(z => z.actualizar());

            let bajoSombra = false;
            for (let i = 0; i < this.zapotes.length; i++) {
                if (this.zapotes[i].visible && this.hayColisionRect(this.macanche, this.zapotes[i])) {
                    bajoSombra = true;
                    break;
                }
            }

            if (bajoSombra) {
                if (this.exposicionSol > 0) this.exposicionSol -= 2; 
            } else {
                this.exposicionSol++; 
                if (this.exposicionSol >= this.maxExposicionSol) {
                    this.finalizarJuego(false, "¡El inclemente sol piurano te calcinó!");
                }
            }

        } else if (this.nivel === 2) {
            this.framesNivel2++;
            
            // Generar un nuevo enemigo inyectándole la imagen precargada
            if (this.framesNivel2 % 30 === 0) {
                this.cascos.push(new CascoArriero(this.canvas, this.imagenes.casco));
            }

            for (let i = 0; i < this.cascos.length; i++) {
                this.cascos[i].mover();
                if (this.hayColisionRect(this.macanche, this.cascos[i])) {
                    this.finalizarJuego(false, "¡Fuiste pisado por un arriero!");
                    return;
                }
            }

            // LIMPIEZA DE MEMORIA: Eliminar cascos que ya salieron de la pantalla por abajo
            this.cascos = this.cascos.filter(c => c.y < this.canvas.height);

            if (this.hayColisionRect(this.macanche, this.grieta)) {
                this.puntaje += 500;
                this.finalizarJuego(true, "¡Llegaste a la grieta salvadora!");
            }
        }
    }

    dibujar() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.nivel === 1) {
            this.zapotes.forEach(z => z.dibujar(this.ctx));
            let tiempoRestante = Math.ceil((this.maxFramesNivel1 - this.framesNivel1) / 60);
            this.ctx.fillStyle = "#333";
            this.ctx.font = "bold 16px 'Segoe UI'";
            this.ctx.fillText(`Sobrevive: ${tiempoRestante}s`, 10, 25);
            this.ctx.fillText(`Calor:`, 10, 50);
            this.ctx.fillStyle = "black";
            this.ctx.fillRect(60, 36, 104, 16); 
            let porcentajeCalor = this.exposicionSol / this.maxExposicionSol;
            this.ctx.fillStyle = porcentajeCalor > 0.7 ? "#e74c3c" : "#f1c40f"; 
            this.ctx.fillRect(62, 38, 100 * porcentajeCalor, 12); 
        } else if (this.nivel === 2) {
            this.grieta.dibujar(this.ctx);
            this.cascos.forEach(c => c.dibujar(this.ctx));
            this.ctx.fillStyle = "#fff";
            this.ctx.font = "bold 16px 'Segoe UI'";
            this.ctx.fillText(`¡Llega a la grieta abajo!`, 10, 25);
        }

        this.macanche.dibujar(this.ctx);
        this.ctx.fillStyle = this.nivel === 1 ? "#333" : "#fff";
        this.ctx.font = "bold 16px 'Segoe UI'";
        this.ctx.fillText(`Nivel: ${this.nivel} | Puntos: ${this.puntaje}`, this.canvas.width - 180, 25);
    }

    loop() {
        if (!this.activo) return;
        if (!this.pausado) this.actualizarLógica();
        this.dibujar();

        if (this.pausado) {
            this.ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = "#ffffff";
            this.ctx.font = "bold 30px 'Segoe UI'";
            this.ctx.textAlign = "center";
            this.ctx.fillText("JUEGO EN PAUSA", this.canvas.width / 2, this.canvas.height / 2);
            this.ctx.textAlign = "left"; 
        }
        requestAnimationFrame(() => this.loop());
    }

    finalizarJuego(victoria, mensaje) {
        this.activo = false;
        this.tiempoTotal = Math.floor((Date.now() - this.tiempoInicio) / 1000);
        document.getElementById('end-screen').classList.remove('hidden');
        document.getElementById('end-message').innerText = mensaje;
        document.getElementById('end-stats').innerText = `Puntaje: ${this.puntaje} | Tiempo: ${this.tiempoTotal}s | Nivel: ${this.nivel}`;
        this.enviarDatosBackend();
    }

    async enviarDatosBackend() {
        try {
            await addDoc(collection(db, "tabla_records"), {
                nombre_jugador: this.jugadorNombre,
                puntaje_total: this.puntaje,
                tiempo_segundos: this.tiempoTotal,
                nivel_alcanzado: this.nivel,
                fecha_registro: new Date() 
            });
            console.log("Récord guardado exitosamente en la nube de Firebase.");
        } catch (e) {
            console.error("Error al guardar en Firebase: ", e);
        }
    }

    async obtenerYMostrarRanking() {
        try {
            const q = query(
                collection(db, "tabla_records"), 
                orderBy("puntaje_total", "desc"), 
                orderBy("tiempo_segundos", "asc"), 
                limit(10)
            );
            
            const querySnapshot = await getDocs(q);

            let html = '<table class="ranking-table"><tr><th>Pos</th><th>Jugador</th><th>Puntos</th><th>Tiempo</th><th>Nivel</th></tr>';
            let i = 1;

            querySnapshot.forEach((doc) => {
                const row = doc.data();
                html += `<tr>
                    <td>${i}</td>
                    <td>${row.nombre_jugador}</td>
                    <td>${row.puntaje_total}</td>
                    <td>${row.tiempo_segundos}s</td>
                    <td>${row.nivel_alcanzado}</td>
                </tr>`;
                i++;
            });
            html += '</table>';
            
            document.getElementById('ranking-table-container').innerHTML = html;
            document.getElementById('ranking-screen').classList.remove('hidden');

        } catch (e) {
            console.error("Error obteniendo el ranking desde Firebase: ", e);
            alert("Abre la consola (F12) y haz clic en el enlace azul de Firebase para generar el Índice.");
        }
    }
}

const juego = new GestorJuego();
