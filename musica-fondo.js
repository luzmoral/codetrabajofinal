(() => {
    const CLAVE = "musica-fondo-estado";
    const audio = new Audio("imagenes/Musica%20de%20fondo.mp3");
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0.3;

    let intentandoReproducir = false;
    let ultimoGuardado = 0;

    // ---- Leer / guardar el punto de la canción entre pantallas ----
    function leerEstado() {
        try {
            return JSON.parse(sessionStorage.getItem(CLAVE)) || null;
        } catch {
            return null;
        }
    }

    function guardarEstado() {
        try {
            sessionStorage.setItem(CLAVE, JSON.stringify({
                tiempo: audio.currentTime,
                sonando: !audio.paused,
                marca: Date.now()
            }));
        } catch {
            // si el navegador no permite guardar, la música simplemente reinicia
        }
    }

    // Al cargar la pantalla, retomar desde donde quedó la anterior
    const estadoPrevio = leerEstado();

    function retomarPosicion() {
        if (!estadoPrevio || !isFinite(audio.duration) || audio.duration <= 0) return;

        let tiempo = estadoPrevio.tiempo || 0;

        // Compensar lo que tardó en cargar la nueva pantalla
        if (estadoPrevio.sonando) {
            const transcurrido = (Date.now() - estadoPrevio.marca) / 1000;
            if (transcurrido >= 0 && transcurrido < 10) tiempo += transcurrido;
        }

        audio.currentTime = tiempo % audio.duration;
    }

    audio.addEventListener("loadedmetadata", retomarPosicion, { once: true });

    // Guardar mientras suena (cada ~250 ms) y al salir de la pantalla
    audio.addEventListener("timeupdate", () => {
        const ahora = Date.now();
        if (ahora - ultimoGuardado > 250) {
            ultimoGuardado = ahora;
            guardarEstado();
        }
    });
    window.addEventListener("pagehide", guardarEstado);
    window.addEventListener("beforeunload", guardarEstado);

    // ---- Reproducción ----
    function quitarEventosDeInicio() {
        document.removeEventListener("pointerdown", iniciarConInteraccion);
        document.removeEventListener("keydown", iniciarConInteraccion);
    }

    function iniciarConInteraccion() {
        if (intentandoReproducir || !audio.paused) return;
        intentandoReproducir = true;

        audio.play()
            .then(quitarEventosDeInicio)
            .catch((error) => {
                if (error.name !== "NotAllowedError") {
                    console.error("No se pudo reproducir la música de fondo.", error);
                }
            })
            .finally(() => {
                intentandoReproducir = false;
            });
    }

    audio.addEventListener("error", () => {
        console.error("No se pudo cargar imagenes/Musica de fondo.mp3.");
    });

    document.addEventListener("pointerdown", iniciarConInteraccion);
    document.addEventListener("keydown", iniciarConInteraccion);
    iniciarConInteraccion();
})();