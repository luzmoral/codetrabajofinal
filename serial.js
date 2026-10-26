function enviarTecla(key) {
  document.dispatchEvent(new KeyboardEvent("keydown", { key }));
}

let conectado = false;

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

async function abrirPuerto(port) {
  try {
    await port.open({ baudRate: 9600 });
  } catch (e) {
    console.error("No se pudo abrir el puerto (¿Monitor Serie abierto?)", e);
    return;
  }
  conectado = true;
  const decoder = new TextDecoderStream();
  port.readable.pipeTo(decoder.writable);
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
}

if (!("serial" in navigator)) {
  console.warn("Web Serial no está disponible: usá Chrome o Edge con Live Server.");
}

async function conectarManual() {
  if (!("serial" in navigator)) {
    alert("Usá Chrome o Edge, abierto con Live Server.");
    return;
  }
  try {
    const port = await navigator.serial.requestPort(); // abre la ventanita de puertos
    abrirPuerto(port);
  } catch (e) {
    console.error("No se eligió ningún puerto", e);
  }
}

document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.repeat) return;

    if (currentState === 4) {
        playSong();
        return;
    }

    if (
        currentState === 5 &&
        !(event.target instanceof Element && event.target.closest("button, a, input, select, textarea"))
    ) {
        window.location.href = `entrevistas.html${window.location.search}`;
    }
});
async function autoconectar() {
  if (!("serial" in navigator)) return;
  const puertos = await navigator.serial.getPorts();
  console.log("Puertos autorizados:", puertos.length);
  if (puertos.length === 0 || conectado) return;
  for (let i = 0; i < 5 && !conectado; i++) {
    abrirPuerto(puertos[0]);
    await new Promise((r) => setTimeout(r, 400));
  }
}
autoconectar();