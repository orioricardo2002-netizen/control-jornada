document.addEventListener("DOMContentLoaded", () => {

    const boton = document.querySelector("button");
    const tbody = document.querySelector("tbody");

    boton.addEventListener("click", generarPeriodo);

    function generarPeriodo() {

        const periodo = document.getElementById("periodo").value;

        if (!periodo) {
            alert("Selecciona un período");
            return;
        }

        tbody.innerHTML = "";

        const [anio, mes] = periodo.split("-").map(Number);

        let fecha = new Date(anio, mes - 1, 26);
        const fechaFin = new Date(anio, mes, 25);

        while (fecha <= fechaFin) {

            const fila = document.createElement("tr");

            fila.innerHTML = `
                <td class="fecha">${formatearFecha(fecha)}</td>

                <td><input type="time"><button class="ahora">Ahora</button></td>
                <td><input type="time"><button class="ahora">Ahora</button></td>
                <td><input type="time"><button class="ahora">Ahora</button></td>
                <td><input type="time"><button class="ahora">Ahora</button></td>

                <td class="totalHoras">0:00</td>
                <td class="horasExtras">0:00</td>

                <td><input type="number" min="0" max="99.99" step="0.01" value="0.00"></td>
<td><input type="number" min="0" max="999" step="1" value="0"></td>
                <td><textarea></textarea></td>
            `;

            tbody.appendChild(fila);

            configurarFila(fila);

            fecha.setDate(fecha.getDate() + 1);
        }
    }

    function configurarFila(fila) {

        fila.querySelectorAll('input[type="time"]').forEach(input => {

            input.addEventListener("change", () => {

                calcularHorasFila(fila);
                guardarDatos();

            });

        });

        fila.querySelectorAll('input[type="number"]').forEach(input => {

            input.addEventListener("change", guardarDatos);

        });

        fila.querySelector("textarea").addEventListener("input", guardarDatos);

        fila.querySelectorAll('.ahora').forEach(btn => {

            btn.addEventListener("click", () => {

                const input =
                    btn.parentElement.querySelector('input[type="time"]');

                const now = new Date();

                const h = String(now.getHours()).padStart(2, '0');
                const m = String(now.getMinutes()).padStart(2, '0');

                input.value = `${h}:${m}`;

                calcularHorasFila(fila);

                guardarDatos();

                guardarGPS(fila);

            });

        });

    }

    function calcularHorasFila(fila) {

        const t = fila.querySelectorAll('input[type="time"]');

        const entradaM = t[0].value;
        const salidaM = t[1].value;
        const entradaT = t[2].value;
        const salidaT = t[3].value;

        let minutos = 0;

        if (entradaM && salidaT && !salidaM && !entradaT) {

            minutos = diferencia(entradaM, salidaT);

        } else {

            minutos += diferencia(entradaM, salidaM);
            minutos += diferencia(entradaT, salidaT);

        }

        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;

        fila.querySelector(".totalHoras").textContent =
            `${horas}:${String(mins).padStart(2, '0')}`;

        calcularExtras(fila, minutos);
    }

    function calcularExtras(fila, minutos) {

        const exceso = minutos - 480;

        if (exceso <= 0) {

            fila.querySelector(".horasExtras").textContent = "0:00";
            return;

        }

        const bloques = Math.ceil(exceso / 30);
        const total = bloques * 30;

        const h = Math.floor(total / 60);
        const m = total % 60;

        fila.querySelector(".horasExtras").textContent =
            `${h}:${String(m).padStart(2, '0')}`;
    }

    function diferencia(a, b) {

        if (!a || !b) return 0;

        const [h1, m1] = a.split(":").map(Number);
        const [h2, m2] = b.split(":").map(Number);

        return (h2 * 60 + m2) - (h1 * 60 + m1);
    }

    function guardarGPS(fila) {

        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(pos => {

            fila.dataset.gps = JSON.stringify({
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
                time: new Date().toISOString()
            });

        });

    }

    function formatearFecha(fecha) {

        const d = String(fecha.getDate()).padStart(2, "0");
        const m = String(fecha.getMonth() + 1).padStart(2, "0");
        const y = fecha.getFullYear();

        return `${d}/${m}/${y}`;
    }

    function guardarDatos() {

        const filas = document.querySelectorAll("tbody tr");

        const datos = [];

        filas.forEach(fila => {

            const tiempos = fila.querySelectorAll('input[type="time"]');
            const numeros = fila.querySelectorAll('input[type="number"]');
            const observacion = fila.querySelector("textarea");

            datos.push({

                fecha: fila.querySelector(".fecha").textContent,

                entradaM: tiempos[0].value,
                salidaM: tiempos[1].value,
                entradaT: tiempos[2].value,
                salidaT: tiempos[3].value,

                dieta: numeros[0].value,
                pernocta: numeros[1].value,

                observacion: observacion.value,

                gps: fila.dataset.gps || ""

            });

        });

        localStorage.setItem(
            "jornadaRicardo",
            JSON.stringify(datos)
        );
    }

    function cargarDatos() {

        const datos = localStorage.getItem("jornadaRicardo");

        if (!datos) return;

        console.log("Datos guardados encontrados");
    }

});
