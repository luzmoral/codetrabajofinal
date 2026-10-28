(function () {
  // Evita que el script se ejecute dos veces si se carga por error más de una vez
  if (window.__arduinoSerialCargado) return;
  window.__arduinoSerialCargado = true;

  let conectado = false;

  function enviarTecla(key) {
    document.dispatchEvent(new KeyboardEvent("keydown", { key }));
  }

  function procesar(mensaje) {
    if (mensaje === "ENTER") {
      enviarTecla("Enter");
      document.dispatchEvent(new CustomEvent("boton-arduino"));
    } else if (/^[1-6]$/.test(mensaje)) {
      enviarTecla(mensaje);
    } else if (mensaje.startsWith("POT:")) {
      const valor = Number(mensaje.slice(4));
      if (!Number.isNaN(valor)) {
        document.dispatchEvent(new CustomEvent("potenciometro", { detail: valor }));
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

  // Disponible para usar desde un botón: onclick="conectarManual()"
  window.conectarManual = conectarManual;

  autoconectar();
})();