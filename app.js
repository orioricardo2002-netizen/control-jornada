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
                <td>${formatearFecha(fecha)}</td>
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
fila.querySelectorAll('.ahora').forEach(boton => {

    boton.addEventListener('click', () => {

        const inputHora =
            boton.parentElement.querySelector('input[type="time"]');

        const ahora = new Date();

        const hora =
            String(ahora.getHours()).padStart(2, '0');

        const minutos =
            String(ahora.getMinutes()).padStart(2, '0');

        inputHora.value = `${hora}:${minutos}`;

        calcularHorasFila(fila);

        guardarGeolocalizacion(fila);

    });

});
                <td class="totalHoras">0:00</td>
                <td class="horasExtras">0:00</td>
                <td><input type="number" step="0.01" value="0"></td>
                <td><input  
            `;

            tbody.appendChild(fila);
            fila.querySelectorAll('input[type="time"]').forEach(campo => {

            campo.addEventListener("change", () => {

        calcularHorasFila(fila);

    });

});
            fecha.setDate(fecha.getDate() + 1);
        }

        alert("Periodo generado correctamente");
    }

    function formatearFecha(fecha) {

        const dia = String(fecha.getDate()).padStart(2, "0");
        const mes = String(fecha.getMonth() + 1).padStart(2, "0");
        const anio = fecha.getFullYear();

        return `${dia}/${mes}/${anio}`;
    }
function calcularHorasFila(fila) {

    const tiempos = fila.querySelectorAll('input[type="time"]');

    const entradaM = tiempos[0].value;
    const salidaM = tiempos[1].value;
    const entradaT = tiempos[2].value;
    const salidaT = tiempos[3].value;
    if (entradaM && salidaT && !salidaM && !entradaT) {

    minutosTotales =
        diferenciaMinutos(entradaM, salidaT);

} else {

    minutosTotales = 0;

    minutosTotales += diferenciaMinutos(entradaM, salidaM);

    minutosTotales += diferenciaMinutos(entradaT, salidaT);
}

    const horas = Math.floor(minutosTotales / 60);
    const minutos = minutosTotales % 60;

    fila.querySelector(".totalHoras").textContent =
        `${horas}:${String(minutos).padStart(2, '0')}`;

    calcularExtras(fila, minutosTotales);
}

function diferenciaMinutos(inicio, fin) {

    if (!inicio || !fin) return 0;

    const [h1, m1] = inicio.split(":").map(Number);
    const [h2, m2] = fin.split(":").map(Number);

    return (h2 * 60 + m2) - (h1 * 60 + m1);
}

function calcularExtras(fila, minutosTotales) {

    const exceso = minutosTotales - 480;

    if (exceso <= 0) {

        fila.querySelector(".horasExtras").textContent = "0:00";
        return;
    }

    const bloques = Math.ceil(exceso / 30);

    const extrasMinutos = bloques * 30;

    const horas = Math.floor(extrasMinutos / 60);
    const minutos = extrasMinutos % 60;

    fila.querySelector(".horasExtras").textContent =
        `${horas}:${String(minutos).padStart(2, '0')}`;
}
});
function guardarGeolocalizacion(fila) {

    if (!navigator.geolocation) {
        return;
    }

    navigator.geolocation.getCurrentPosition(

        (posicion) => {

            const datosGPS = {

                latitud: posicion.coords.latitude,

                longitud: posicion.coords.longitude,

                fecha: new Date().toISOString()

            };

            fila.dataset.gps =
                JSON.stringify(datosGPS);

        },

        () => {

            console.log(
                "No se pudo obtener ubicación"
            );

        }

    );
}
