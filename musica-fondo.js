(() => {
    const audio = new Audio("imagenes/Musica%20de%20fondo.mp3");
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0.3;

    let intentandoReproducir = false;

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
