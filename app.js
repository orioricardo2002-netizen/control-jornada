document.addEventListener("DOMContentLoaded", () => {

    const btnGenerar = document.getElementById("btnGenerar");
    const btnGuardar = document.getElementById("btnGuardar");
    const btnSalir = document.getElementById("btnSalir");
    const tbody = document.getElementById("tablaBody");

    btnGenerar.addEventListener("click", generarPeriodo);

    btnGuardar.addEventListener("click", () => {
        guardarDatos();
        alert("Datos guardados correctamente");
    });

    btnSalir.addEventListener("click", () => {
        guardarDatos();
        alert("Datos guardados. Ya puedes cerrar la aplicación.");
    });

    function generarPeriodo() {

        const periodo = document.getElementById("periodo").value;

        if (!periodo) {
            alert("Selecciona un periodo");
            return;
        }

        tbody.innerHTML = "";

        const [anio, mes] = periodo.split("-").map(Number);

        let fecha = new Date(anio, mes - 1, 26);
        const fechaFin = new Date(anio, mes, 25);

        while (fecha <= fechaFin) {

            const fila = document.createElement("tr");

            fila.innerHTML = `
            <td class="fecha">
                ${formatearFecha(fecha)}
                <br>
                <small class="${esFinSemana(fecha) ? 'fecha-fin-semana' : ''}">
                    ${nombreDia(fecha)}
                </small>
            </td>

            <td>
                <input type="time">
                <button class="ahora">Ahora</button>
            </td>

            <td>
                <input type="time">
                <button class="ahora">Ahora</button>
            </td>

            <td>
                <input type="time">
                <button class="ahora">Ahora</button>
            </td>

            <td>
                <input type="time">
                <button class="ahora">Ahora</button>
            </td>

            <td class="totalHoras">0:00</td>
            <td class="horasExtras">0:00</td>

            <td>
                <input type="number" min="0" max="99.99" step="0.01" value="0.00">
            </td>

            <td>
                <input type="number" min="0" max="99" step="1" value="0">
            </td>

            <td>
                <textarea></textarea>
            </td>
            `;

            tbody.appendChild(fila);

            configurarFila(fila);

            fecha.setDate(fecha.getDate() + 1);
        }

        actualizarTotales();
    }

            function configurarFila(fila) {

        fila.querySelectorAll('input[type="time"]').forEach(input => {

            input.addEventListener("change", () => {

                calcularHorasFila(fila);
                guardarDatos();

            });

        });

        fila.querySelectorAll('input[type="number"]').forEach(input => {

            input.addEventListener("change", () => {

                actualizarTotales();
                guardarDatos();

            });

        });

        fila.querySelector("textarea")
            .addEventListener("input", guardarDatos);

        fila.querySelectorAll(".ahora").forEach(btn => {

            btn.addEventListener("click", () => {

                const input =
                    btn.parentElement.querySelector("input[type='time']");

                const ahora = new Date();

                const h =
                    String(ahora.getHours()).padStart(2, "0");

                const m =
                    String(ahora.getMinutes()).padStart(2, "0");

                input.value = `${h}:${m}`;

                calcularHorasFila(fila);

                guardarGPS(fila);

                guardarDatos();

            });

        });

    }

    function calcularHorasFila(fila) {

        const tiempos =
            fila.querySelectorAll("input[type='time']");

        const entradaM = tiempos[0].value;
        const salidaM = tiempos[1].value;
        const entradaT = tiempos[2].value;
        const salidaT = tiempos[3].value;

        let minutos = 0;

        if (entradaM && salidaT && !salidaM && !entradaT) {

            minutos =
                diferenciaMinutos(entradaM, salidaT);

        } else {

            minutos +=
                diferenciaMinutos(entradaM, salidaM);

            minutos +=
                diferenciaMinutos(entradaT, salidaT);

        }

        const horas =
            Math.floor(minutos / 60);

        const mins =
            minutos % 60;

        fila.querySelector(".totalHoras")
            .textContent =
            `${horas}:${String(mins).padStart(2, "0")}`;

        calcularExtras(fila, minutos);

        actualizarTotales();
    }

    function calcularExtras(fila, minutos) {

        const exceso = minutos - 480;

        if (exceso <= 0) {

            fila.querySelector(".horasExtras")
                .textContent = "0:00";

            return;
        }

        const bloques =
            Math.ceil(exceso / 30);

        const total =
            bloques * 30;

        const horas =
            Math.floor(total / 60);

        const mins =
            total % 60;

        fila.querySelector(".horasExtras")
            .textContent =
            `${horas}:${String(mins).padStart(2, "0")}`;
    }
        function actualizarTotales() {

        let minutosTrabajados = 0;
        let minutosExtras = 0;

        let totalDietas = 0;
        let totalPernoctas = 0;
        let totalDias = 0;

        document.querySelectorAll("#tablaBody tr")
            .forEach(fila => {

            const horas =
                fila.querySelector(".totalHoras")
                    .textContent;

            const extras =
                fila.querySelector(".horasExtras")
                    .textContent;

            const numeros =
                fila.querySelectorAll(
                    "input[type='number']"
                );

            if (horas !== "0:00") {
                totalDias++;
            }

            const [h1,m1] =
                horas.split(":").map(Number);

            const [h2,m2] =
                extras.split(":").map(Number);

            minutosTrabajados +=
                (h1 * 60) + m1;

            minutosExtras +=
                (h2 * 60) + m2;

            totalDietas +=
                parseFloat(numeros[0].value) || 0;

            totalPernoctas +=
                parseFloat(numeros[1].value) || 0;

        });

        document.getElementById("totalDias")
            .textContent = totalDias;

        document.getElementById("totalHoras")
            .textContent =
            convertirMinutos(minutosTrabajados);

        document.getElementById("totalExtras")
            .textContent =
            convertirMinutos(minutosExtras);

        document.getElementById("totalDietas")
            .textContent =
            totalDietas.toFixed(2)
                .replace(".", ",");

        document.getElementById("totalPernoctas")
            .textContent =
            totalPernoctas.toFixed(0);

    }

    function convertirMinutos(minutos) {

        const horas =
            Math.floor(minutos / 60);

        const mins =
            minutos % 60;

        return `${horas}:${String(mins)
            .padStart(2,"0")}`;
    }

    function diferenciaMinutos(inicio, fin) {

        if (!inicio || !fin) return 0;

        const [h1,m1] =
            inicio.split(":").map(Number);

        const [h2,m2] =
            fin.split(":").map(Number);

        return (h2 * 60 + m2)
             - (h1 * 60 + m1);
    }

    function guardarGPS(fila) {

        if (!navigator.geolocation) return;

        navigator.geolocation
            .getCurrentPosition(pos => {

            fila.dataset.gps =
                JSON.stringify({

                lat:
                    pos.coords.latitude,

                lon:
                    pos.coords.longitude,

                fecha:
                    new Date().toISOString()

            });

        });

    }

    function guardarDatos() {

        const filas =
            document.querySelectorAll(
                "#tablaBody tr"
            );

        const datos = [];

        filas.forEach(fila => {

            const tiempos =
                fila.querySelectorAll(
                    "input[type='time']"
                );

            const numeros =
                fila.querySelectorAll(
                    "input[type='number']"
                );

            datos.push({

                fecha:
                    fila.querySelector(".fecha")
                        .textContent,

                entradaM:
                    tiempos[0].value,

                salidaM:
                    tiempos[1].value,

                entradaT:
                    tiempos[2].value,

                salidaT:
                    tiempos[3].value,

                dieta:
                    numeros[0].value,

                pernocta:
                    numeros[1].value,

                observacion:
                    fila.querySelector("textarea")
                        .value,

                gps:
                    fila.dataset.gps || ""

            });

        });

        localStorage.setItem(
            "jornadaRicardo",
            JSON.stringify(datos)
        );

    }

    function formatearFecha(fecha) {

        const d =
            String(fecha.getDate())
                .padStart(2,"0");

        const m =
            String(fecha.getMonth()+1)
                .padStart(2,"0");

        const y =
            fecha.getFullYear();

        return `${d}/${m}/${y}`;
    }

    function nombreDia(fecha) {

        const dias = [
            "Domingo",
            "Lunes",
            "Martes",
            "Miércoles",
            "Jueves",
            "Viernes",
            "Sábado"
        ];

        return dias[fecha.getDay()];
    }

    function esFinSemana(fecha) {

        return (
            fecha.getDay() === 0 ||
            fecha.getDay() === 6
        );

    }

});
