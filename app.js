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
                <td><input type="time"></td>
                <td><input type="time"></td>
                <td><input type="time"></td>
                <td><input type="time"></td>
                <td>0:00</td>
                <td>0:00</td>
                <td><input type="number" step="0.01" value="0"></td>
                <td><input type="number" step="0.01" value="0"></td>
                <td><textarea></textarea></td>
            `;

            tbody.appendChild(fila);

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

});
