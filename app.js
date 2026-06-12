document.addEventListener("DOMContentLoaded", async () => {
    const SUPABASE_URL = "https://dpdlcrechuymojbdbtoi.supabase.co";
    const SUPABASE_KEY = "sb_publishable_hVtiEaNhrljcdvlwGVevQg_Dn1jn5pd";
    const supabaseClient = window.supabase
        ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
        : null;

    const btnGenerar = document.getElementById("btnGenerar");
    const btnGuardar = document.getElementById("btnGuardar");
    const btnCargar = document.getElementById("btnCargar");
    const btnPdf = document.getElementById("btnPdf");
    const btnLogin = document.getElementById("btnLogin");
    const btnRegistro = document.getElementById("btnRegistro");
    const btnLogout = document.getElementById("btnLogout");
    const authStatus = document.getElementById("authStatus");
    const authEmail = document.getElementById("authEmail");
    const authPassword = document.getElementById("authPassword");
    const periodoMes = document.getElementById("periodoMes");
    const periodoAnio = document.getElementById("periodoAnio");
    const periodoActual = document.getElementById("periodoActual");
    const observacionesFinales = document.getElementById("observacionesFinales");
    const tbody = document.getElementById("tablaBody");

    btnGenerar.addEventListener("click", () => {
        generarPeriodo();
        guardarDatos();
    });

    btnGuardar.addEventListener("click", async () => {
        await guardarDatos(true);
    });

    btnCargar.addEventListener("click", async () => {
        await cargarDatosGuardados();
    });

    btnPdf.addEventListener("click", async () => {
        await guardarDatos(true);
        window.print();
    });

    btnLogin.addEventListener("click", iniciarSesion);
    btnRegistro.addEventListener("click", crearCuenta);
    btnLogout.addEventListener("click", cerrarSesion);

    observacionesFinales.addEventListener("input", () => {
        guardarDatos();
    });

    prepararPeriodoInicial();
    await actualizarEstadoSesion();
    cargarPeriodo();
    cargarDatos();

    async function actualizarEstadoSesion() {
        if (!supabaseClient) {
            authStatus.textContent = "Supabase no está disponible";
            return null;
        }

        const { data } = await supabaseClient.auth.getSession();
        const user = data.session?.user || null;

        authStatus.textContent = user
            ? `Sesión iniciada: ${user.email}`
            : "Sin iniciar sesión";

        btnLogout.disabled = !user;
        return user;
    }

    async function iniciarSesion() {
        if (!supabaseClient) return;

        const email = authEmail.value.trim();
        const password = authPassword.value;

        if (!email || !password) {
            alert("Introduce email y contraseña");
            return;
        }

        const { error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            alert(`No se pudo iniciar sesión: ${error.message}`);
            return;
        }

        authPassword.value = "";
        await actualizarEstadoSesion();
        await cargarDatosGuardados(false);
    }

    async function crearCuenta() {
        if (!supabaseClient) return;

        const email = authEmail.value.trim();
        const password = authPassword.value;

        if (!email || !password) {
            alert("Introduce email y contraseña");
            return;
        }

        const { error } = await supabaseClient.auth.signUp({
            email,
            password
        });

        if (error) {
            alert(`No se pudo crear la cuenta: ${error.message}`);
            return;
        }

        authPassword.value = "";
        await actualizarEstadoSesion();
        alert("Cuenta creada. Si Supabase te envía un email de confirmación, confírmalo antes de entrar.");
    }

    async function cerrarSesion() {
        if (!supabaseClient) return;

        await supabaseClient.auth.signOut();
        await actualizarEstadoSesion();
    }

    function prepararPeriodoInicial() {
        const hoy = new Date();
        periodoMes.value = String(hoy.getMonth() + 1).padStart(2, "0");
        periodoAnio.value = hoy.getFullYear();
    }

    function obtenerPeriodo() {
        const mes = periodoMes.value;
        const anio = Number(periodoAnio.value);

        if (!mes || !anio) return "";

        return `${anio}-${mes}`;
    }

    function aplicarPeriodo(periodo) {
        const [anio, mes] = periodo.split("-");
        periodoAnio.value = anio;
        periodoMes.value = mes;
    }

    function generarPeriodo() {
        const periodo = obtenerPeriodo();

        if (!periodo) {
            alert("Selecciona mes y ano del periodo");
            return;
        }

        tbody.innerHTML = "";

        const [anio, mes] = periodo.split("-").map(Number);
        const fecha = new Date(anio, mes - 1, 26, 0, 0, 0);
        const fechaFin = new Date(anio, mes, 25, 0, 0, 0);

        periodoActual.textContent = `${formatearFecha(fecha)} - ${formatearFecha(fechaFin)}`;

        while (fecha <= fechaFin) {
            const fila = document.createElement("tr");
            const fechaFormateada = formatearFecha(fecha);

            fila.dataset.fecha = fechaFormateada;
            fila.innerHTML = `
                <td class="fecha" data-label="Fecha">
                    ${fechaFormateada}
                    <br>
                    <small class="${esFinSemana(fecha) ? "fecha-fin-semana" : ""}">
                        ${nombreDia(fecha)}
                    </small>
                </td>
                <td data-label="Entrada manana">
                    <input type="time" aria-label="Entrada manana ${fechaFormateada}">
                    <button class="ahora" type="button">Ahora</button>
                </td>
                <td data-label="Salida manana">
                    <input type="time" aria-label="Salida manana ${fechaFormateada}">
                    <button class="ahora" type="button">Ahora</button>
                </td>
                <td data-label="Entrada tarde">
                    <input type="time" aria-label="Entrada tarde ${fechaFormateada}">
                    <button class="ahora" type="button">Ahora</button>
                </td>
                <td data-label="Salida tarde">
                    <input type="time" aria-label="Salida tarde ${fechaFormateada}">
                    <button class="ahora" type="button">Ahora</button>
                </td>
                <td class="totalHoras" data-label="Total horas">0:00</td>
                <td class="horasExtras" data-label="Horas extras">0:00</td>
                <td data-label="Dieta EUR">
                    <input type="number" min="0" max="99.99" step="0.01" value="0.00" aria-label="Dieta ${fechaFormateada}">
                </td>
                <td data-label="Pernocta EUR">
                    <input type="number" min="0" max="999" step="1" value="0" aria-label="Pernocta ${fechaFormateada}">
                </td>
                <td data-label="Observaciones">
                    <textarea aria-label="Observaciones ${fechaFormateada}"></textarea>
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

        fila.querySelector("textarea").addEventListener("input", () => {
            guardarDatos();
        });

        fila.querySelectorAll(".ahora").forEach(btn => {
            btn.addEventListener("click", () => {
                const input = btn.parentElement.querySelector("input[type='time']");
                const ahora = new Date();
                const h = String(ahora.getHours()).padStart(2, "0");
                const m = String(ahora.getMinutes()).padStart(2, "0");

                input.value = `${h}:${m}`;
                calcularHorasFila(fila);
                guardarGPS(fila);
                guardarDatos();
            });
        });
    }

    function calcularHorasFila(fila) {
        const tiempos = fila.querySelectorAll("input[type='time']");
        const entradaM = tiempos[0].value;
        const salidaM = tiempos[1].value;
        const entradaT = tiempos[2].value;
        const salidaT = tiempos[3].value;

        let minutos = 0;

        if (entradaM && salidaT && !salidaM && !entradaT) {
            minutos = diferenciaMinutos(entradaM, salidaT);
        } else {
            minutos += diferenciaMinutos(entradaM, salidaM);
            minutos += diferenciaMinutos(entradaT, salidaT);
        }

        fila.querySelector(".totalHoras").textContent = convertirMinutos(minutos);
        calcularExtras(fila, minutos);
        actualizarTotales();
    }

    function calcularExtras(fila, minutos) {
        const exceso = minutos - 480;

        if (exceso <= 0) {
            fila.querySelector(".horasExtras").textContent = "0:00";
            return;
        }

        fila.querySelector(".horasExtras").textContent = convertirMinutos(Math.ceil(exceso / 30) * 30);
    }

    function actualizarTotales() {
        let minutosTrabajados = 0;
        let minutosExtras = 0;
        let totalDietas = 0;
        let totalPernoctas = 0;
        let totalDias = 0;

        document.querySelectorAll("#tablaBody tr").forEach(fila => {
            const horas = fila.querySelector(".totalHoras").textContent;
            const extras = fila.querySelector(".horasExtras").textContent;
            const numeros = fila.querySelectorAll("input[type='number']");

            if (horas !== "0:00") {
                totalDias++;
            }

            minutosTrabajados += convertirHorasAMinutos(horas);
            minutosExtras += convertirHorasAMinutos(extras);
            totalDietas += parseFloat(numeros[0].value) || 0;
            totalPernoctas += parseFloat(numeros[1].value) || 0;
        });

        document.getElementById("totalDias").textContent = totalDias;
        document.getElementById("totalHoras").textContent = convertirMinutos(minutosTrabajados);
        document.getElementById("totalExtras").textContent = convertirMinutos(minutosExtras);
        document.getElementById("totalDietas").textContent = totalDietas.toFixed(2).replace(".", ",");
        document.getElementById("totalPernoctas").textContent = totalPernoctas.toFixed(0);
    }

    function convertirMinutos(minutos) {
        const horas = Math.floor(minutos / 60);
        const mins = minutos % 60;
        return `${horas}:${String(mins).padStart(2, "0")}`;
    }

    function convertirHorasAMinutos(valor) {
        const [horas, minutos] = valor.split(":").map(Number);
        return (horas * 60) + minutos;
    }

    function diferenciaMinutos(inicio, fin) {
        if (!inicio || !fin) return 0;

        const [h1, m1] = inicio.split(":").map(Number);
        const [h2, m2] = fin.split(":").map(Number);
        const diferencia = (h2 * 60 + m2) - (h1 * 60 + m1);

        return Math.max(0, diferencia);
    }

    function guardarGPS(fila) {
        if (!navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition(pos => {
            fila.dataset.gps = JSON.stringify({
                lat: pos.coords.latitude,
                lon: pos.coords.longitude,
                fecha: new Date().toISOString()
            });

            guardarDatos();
        });
    }

    function recogerDatos() {
        const filas = document.querySelectorAll("#tablaBody tr");
        const datos = [];

        filas.forEach(fila => {
            const tiempos = fila.querySelectorAll("input[type='time']");
            const numeros = fila.querySelectorAll("input[type='number']");

            datos.push({
                fecha: fila.dataset.fecha,
                entradaM: tiempos[0].value,
                salidaM: tiempos[1].value,
                entradaT: tiempos[2].value,
                salidaT: tiempos[3].value,
                dieta: numeros[0].value,
                pernocta: numeros[1].value,
                observacion: fila.querySelector("textarea").value,
                gps: fila.dataset.gps || ""
            });
        });

        return datos;
    }

    async function guardarDatos(sincronizarNube = false) {
        const datos = recogerDatos();
        const periodo = obtenerPeriodo();

        guardarDatosLocales(periodo, datos, observacionesFinales.value);

        if (!sincronizarNube) return;

        const guardadoEnNube = await guardarDatosEnNube(periodo, datos);

        alert(guardadoEnNube
            ? "Datos guardados en la nube correctamente"
            : "Datos guardados solo en este dispositivo. Inicia sesión para guardarlos en la nube.");
    }

    function guardarDatosLocales(periodo, datos, observaciones) {
        localStorage.setItem("jornadaRicardo", JSON.stringify(datos));
        localStorage.setItem("periodoRicardo", periodo);
        localStorage.setItem("observacionesFinalesRicardo", observaciones);
    }

    async function guardarDatosEnNube(periodo, datos) {
        if (!supabaseClient || !periodo) return false;

        const user = await actualizarEstadoSesion();
        if (!user) return false;

        const { error } = await supabaseClient
            .from("jornadas")
            .upsert({
                user_id: user.id,
                periodo,
                datos,
                observaciones_finales: observacionesFinales.value,
                updated_at: new Date().toISOString()
            }, {
                onConflict: "user_id,periodo"
            });

        if (error) {
            alert(`No se pudo guardar en Supabase: ${error.message}`);
            return false;
        }

        return true;
    }

    function cargarDatos() {
        observacionesFinales.value = localStorage.getItem("observacionesFinalesRicardo") || "";

        const datosGuardados = localStorage.getItem("jornadaRicardo");
        if (!datosGuardados) return;

        let datos;

        try {
            datos = JSON.parse(datosGuardados);
        } catch (error) {
            console.error("No se pudieron leer los datos guardados", error);
            return;
        }

        const filas = document.querySelectorAll("#tablaBody tr");

        datos.forEach((dato, i) => {
            if (!filas[i]) return;

            const tiempos = filas[i].querySelectorAll("input[type='time']");
            const numeros = filas[i].querySelectorAll("input[type='number']");

            tiempos[0].value = dato.entradaM || "";
            tiempos[1].value = dato.salidaM || "";
            tiempos[2].value = dato.entradaT || "";
            tiempos[3].value = dato.salidaT || "";
            numeros[0].value = dato.dieta || "0.00";
            numeros[1].value = dato.pernocta || "0";
            filas[i].querySelector("textarea").value = dato.observacion || "";

            if (dato.gps) {
                filas[i].dataset.gps = dato.gps;
            }

            calcularHorasFila(filas[i]);
        });

        actualizarTotales();
    }

    async function cargarDatosGuardados(mostrarAviso = true) {
        const cargadoDeNube = await cargarDatosDesdeNube();

        if (!cargadoDeNube) {
            cargarPeriodo();
            cargarDatos();
        }

        if (mostrarAviso) {
            alert(cargadoDeNube
                ? "Datos cargados desde la nube"
                : "Datos cargados desde este dispositivo. Para cargar desde la nube, inicia sesión en este navegador y asegúrate de haber seleccionado un periodo guardado.");
        }
    }

    async function cargarDatosDesdeNube() {
        if (!supabaseClient) return false;

        const user = await actualizarEstadoSesion();
        const periodo = obtenerPeriodo();

        if (!user || !periodo) return false;

        const { data, error } = await supabaseClient
            .from("jornadas")
            .select("datos, observaciones_finales")
            .eq("user_id", user.id)
            .eq("periodo", periodo)
            .maybeSingle();

        if (error) {
            alert(`No se pudo cargar desde Supabase: ${error.message}`);
            return false;
        }

        if (!data) return false;

        guardarDatosLocales(periodo, data.datos || [], data.observaciones_finales || "");
        cargarDatos();
        return true;
    }

    function cargarPeriodo() {
        const periodo = localStorage.getItem("periodoRicardo");

        if (periodo) {
            aplicarPeriodo(periodo);
        }

        generarPeriodo();
    }

    function formatearFecha(fecha) {
        const d = String(fecha.getDate()).padStart(2, "0");
        const m = String(fecha.getMonth() + 1).padStart(2, "0");
        const y = fecha.getFullYear();
        return `${d}/${m}/${y}`;
    }

    function nombreDia(fecha) {
        const dias = ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"];
        return dias[fecha.getDay()];
    }

    function esFinSemana(fecha) {
        return fecha.getDay() === 0 || fecha.getDay() === 6;
    }
});
