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

async function abrirPuerto(port) {
  try {
    await port.open({ baudRate: 9600 });
  } catch (e) {
    console.error("No se pudo abrir el puerto (¿Monitor Serie abierto?)", e);
    return;
  }
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

if ("serial" in navigator) {
  navigator.serial.getPorts().then((ports) => {
    if (ports.length) abrirPuerto(ports[0]);
  });

  document.addEventListener("click", async () => {
    const ports = await navigator.serial.getPorts();
    if (!ports.length) {
      try {
        const port = await navigator.serial.requestPort();
        abrirPuerto(port);
      } catch (e) {
        console.error("No se eligió ningún puerto", e);
      }
    }
  }, { once: true });
} else {
  console.warn("Web Serial no está disponible: usá Chrome o Edge con Live Server.");
}
// Botón manual para conectar el Arduino (también con la tecla C)
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

const botonConectar = document.createElement("button");
botonConectar.textContent = "Conectar Arduino (C)";
botonConectar.style.cssText =
  "position:fixed;bottom:8px;right:8px;z-index:9999;padding:6px 10px;opacity:.6;font-size:12px;cursor:pointer;";
botonConectar.addEventListener("click", (e) => {
  e.stopPropagation();
  conectarManual();
});
document.addEventListener("DOMContentLoaded", () => document.body.append(botonConectar));

document.addEventListener("keydown", (e) => {
  if (e.key.toLowerCase() === "c" && !conectado) conectarManual();
});