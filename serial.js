(function () {
  // Evita que el script se ejecute dos veces si se carga por error más de una vez
  if (window.__arduinoSerialCargado) return;
  window.__arduinoSerialCargado = true;

  let conectado = false;
  let ultimoValorPot = null;
  let valorPotSuavizado = null;
  const ENTER_COOLDOWN_MS = 1000;
  const ENTER_TIMESTAMP_KEY = "arduino-enter-last-at";

  function enviarTecla(key) {
    document.dispatchEvent(new KeyboardEvent("keydown", { key }));
  }

  function puedeProcesarEnter() {
    const ahora = Date.now();
    const ultimoEnter = Number(sessionStorage.getItem(ENTER_TIMESTAMP_KEY));

    if (Number.isFinite(ultimoEnter) && ahora - ultimoEnter < ENTER_COOLDOWN_MS) {
      return false;
    }

    sessionStorage.setItem(ENTER_TIMESTAMP_KEY, String(ahora));
    return true;
  }

  function procesar(mensaje) {
    // BOTON 9: AVANZAR
    if (mensaje === "ENTER") {
      if (!puedeProcesarEnter()) return;

      enviarTecla("Enter");

      document.dispatchEvent(
        new CustomEvent("boton-arduino")
      );
    }

    // BOTON 8: PAUSAR O REANUDAR MUSICA
    else if (mensaje === "PAUSA") {
      document.dispatchEvent(
        new CustomEvent("pausa-arduino")
      );
    }

    // BOTON 10: VOLVER ATRAS
    else if (mensaje === "ATRAS") {
      document.dispatchEvent(
        new CustomEvent("boton-atras-arduino", { cancelable: true })
      );
    }

    // CAMINANTES: NUMEROS DEL 1 AL 6
    else if (/^[1-6]$/.test(mensaje)) {
      enviarTecla(mensaje);
    }

    // POTENCIOMETRO
    else if (mensaje.startsWith("POT:")) {
      const valor = Number(mensaje.slice(4));

      if (!Number.isNaN(valor) && valor >= 0 && valor <= 1023) {
        // Suaviza los movimientos de la perilla
        if (valorPotSuavizado === null) {
          valorPotSuavizado = valor;
        } else {
          valorPotSuavizado =
            valorPotSuavizado * 0.8 + valor * 0.2;
        }

        // Evita enviar cambios demasiado pequeños
        const valorRedondeado = Math.round(valorPotSuavizado / 25) * 25;

        if (
          ultimoValorPot === null ||
          Math.abs(valorRedondeado - ultimoValorPot) >= 25
        ) {
          ultimoValorPot = valorRedondeado;

          document.dispatchEvent(
            new CustomEvent("potenciometro", {
              detail: valorRedondeado
            })
          );
        }
      }
    }
  }

  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

  async function abrirPuerto(port) {
    if (conectado) return;
    conectado = true; // evita aperturas simultáneas

    // La página anterior puede tardar en soltar el puerto: reintentar el open()
    let abierto = false;
    for (let i = 0; i < 15 && !abierto; i++) {
      try {
        await port.open({ baudRate: 9600 });
        abierto = true;
      } catch (e) {
        console.warn(`open() falló (intento ${i + 1}):`, e.message);
        await esperar(300);
      }
    }
    if (!abierto) {
      conectado = false;
      console.error("No se pudo abrir el puerto (¿Monitor Serie o otra pestaña abierta?)");
      return;
    }

    console.log("Arduino conectado");
    try {
      const decoder = new TextDecoderStream();
      port.readable.pipeTo(decoder.writable).catch(() => {});
      const reader = decoder.readable.getReader();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lineas = buffer.split("\n");
        buffer = lineas.pop();
        lineas.forEach((l) => procesar(l.trim()));
      }
    } catch (e) {
      console.error("Lectura interrumpida:", e);
    } finally {
      conectado = false;
      console.log("Arduino desconectado");
    }
  }

  async function conectarManual() {
    if (conectado) return;

    if (!("serial" in navigator)) {
      alert("Usá Google Chrome o Microsoft Edge y abrí la página mediante HTTPS o un servidor local.");
      return;
    }
    try {
      const port = await navigator.serial.requestPort(); // abre la ventanita de puertos
      abrirPuerto(port);
    } catch (e) {
      console.error("No se eligió ningún puerto", e);
    }
  }

  async function autoconectar() {
    if (!("serial" in navigator)) return;
    const puertos = await navigator.serial.getPorts();
    console.log("Puertos autorizados:", puertos.length);
    if (puertos.length > 0) abrirPuerto(puertos[0]);
  }

  if (!("serial" in navigator)) {
    console.warn("Web Serial no está disponible: usá Chrome o Edge con Live Server.");
  } else {
    // Si enchufan el Arduino después de cargar la página
    navigator.serial.addEventListener("connect", autoconectar);
  }

  // Enter: solo actúa en las páginas que definen currentState / playSong
  document.addEventListener("keydown", (event) => {
    if (!event.isTrusted) return;
    if (event.key !== "Enter" || event.repeat) return;
    if (typeof currentState === "undefined") return;

    if (
      currentState === 4 &&
      typeof playSong === "function" &&
      !(event.target instanceof Element && event.target.closest("button, a, input, select, textarea"))
    ) {
      if (typeof toggleSongPlayback === "function") {
        toggleSongPlayback();
      } else {
        playSong();
      }
      return;
    }

    if (
      currentState === 5 &&
      !(event.target instanceof Element && event.target.closest("button, a, input, select, textarea"))
    ) {
      window.location.href = `entrevistas.html${window.location.search}`;
    }
  });

  document.addEventListener("boton-atras-arduino", (event) => {
    const page = window.location.pathname.split("/").pop().toLowerCase();
    if (event.defaultPrevented || page === "index.html" || page === "") return;

    const referrerIsLocal = document.referrer &&
      new URL(document.referrer).origin === window.location.origin;
    if (referrerIsLocal && window.history.length > 1) {
      window.history.back();
      return;
    }

    const fallbackPages = {
      "tutorial1.html": "index.html",
      "tutorial2.html": "tutorial1.html",
      "nucleo1.html": "tutorial2.html",
      "preresultado.html": "nucleo2.html",
      "nucleo3.html": "preresultado.html",
      "entrevistas.html": "nucleo3.html",
      "resultadocancion.html": "entrevistas.html",
      "final.html": "resultadocancion.html"
    };
    const fallbackPage = fallbackPages[page];
    if (fallbackPage) {
      window.location.href = `${fallbackPage}${window.location.search}`;
    }
  });

  const page = window.location.pathname.split("/").pop().toLowerCase();
  if (page !== "index.html" && page !== "" && !document.querySelector("#back-button")) {
    const backButton = document.createElement("button");
    backButton.className = "screen-back-button";
    backButton.type = "button";
    backButton.setAttribute("aria-label", "Volver a la pantalla anterior");
    backButton.innerHTML = `¡Presioná
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="3" fill="#f1ff00"></rect>
        <rect x="9" y="8" width="3.2" height="16" fill="#ff0054"></rect>
        <path d="M23 8v16L13.5 16z" fill="#ff0054"></path>
      </svg>
      para volver atrás!`;
    backButton.addEventListener("click", () => {
      document.dispatchEvent(new CustomEvent("boton-atras-arduino", { cancelable: true }));
    });
    document.body.append(backButton);
  }

  // Disponible para usar desde un botón: onclick="conectarManual()"
  window.conectarManual = conectarManual;

  autoconectar();
})();
