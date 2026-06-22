document.addEventListener("DOMContentLoaded", async () => {
    const SUPABASE_URL = "https://dpdlcrechuymojbdbtoi.supabase.co";
    const SUPABASE_KEY = "sb_publishable_hVtiEaNhrljcdvlwGVevQg_Dn1jn5pd";
    const supabaseClient = window.supabase
        ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
        : null;

    const btnGuardar = document.getElementById("btnGuardar");
    const btnCargar = document.getElementById("btnCargar");
    const btnPdf = document.getElementById("btnPdf");
    const btnCsv = document.getElementById("btnCsv");
    const btnLimpiarPeriodo = document.getElementById("btnLimpiarPeriodo");
    const btnAccionesMenu = document.getElementById("btnAccionesMenu");
    const accionesMenu = document.getElementById("accionesMenu");
    const accionesPanel = document.querySelector(".accionesPanel");
    const btnLogin = document.getElementById("btnLogin");
    const btnRegistro = document.getElementById("btnRegistro");
    const btnLogout = document.getElementById("btnLogout");
    const authStatus = document.getElementById("authStatus");
    const authEmail = document.getElementById("authEmail");
    const authPassword = document.getElementById("authPassword");
    const perfilNombreInput = document.getElementById("perfilNombreInput");
    const perfilDniInput = document.getElementById("perfilDniInput");
    const perfilNombre = document.getElementById("perfilNombre");
    const perfilDni = document.getElementById("perfilDni");
    const periodoMes = document.getElementById("periodoMes");
    const periodoAnio = document.getElementById("periodoAnio");
    const periodoActual = document.getElementById("periodoActual");
    const estadoGuardado = document.getElementById("estadoGuardado");
    const observacionesFinales = document.getElementById("observacionesFinales");
    const tbody = document.getElementById("tablaBody");

    const STORAGE_JORNADAS = "jornadasPorPeriodo";
    const STORAGE_PERIODO_ACTIVO = "periodoActivo";
    const RETRASO_SINCRONIZACION_MS = 1500;
    const PERFIL_PREDEFINIDO = {
        email: "orioricardo2002@gmail.com",
        nombre_completo: "Ricardo Orío Yangüela",
        dni_nie: "16635902W"
    };
    let periodoEnPantalla = "";
    let temporizadorSincronizacion = null;
    let hayCambiosLocalesPendientes = false;
    let cargaAutomaticaEnCurso = false;

    // Inicializar desplegable de años dinámicamente
    inicializarSelectorAnios();

    btnAccionesMenu.addEventListener("click", () => {
        const abierto = accionesPanel.classList.toggle("abierto");
        btnAccionesMenu.setAttribute("aria-expanded", abierto ? "true" : "false");
    });

    accionesMenu.querySelectorAll("button").forEach(boton => {
        boton.addEventListener("click", () => {
            if (window.innerWidth <= 768) {
                accionesPanel.classList.remove("abierto");
                btnAccionesMenu.setAttribute("aria-expanded", "false");
            }
        });
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

    btnCsv.addEventListener("click", exportarCSV);

    btnLimpiarPeriodo.addEventListener("click", limpiarPeriodo);
    btnLogin.addEventListener("click", iniciarSesion);
    btnRegistro.addEventListener("click", crearCuenta);
    btnLogout.addEventListener("click", cerrarSesion);

    observacionesFinales.addEventListener("input", () => {
        marcarCambioLocal();
    });

    function inicializarSelectorAnios() {
        const anioActual = new Date().getFullYear();
        const anioInicio = 2025;
        const anioFin = 2035;

        periodoAnio.innerHTML = "";
        for (let i = anioInicio; i <= anioFin; i++) {
            const option = document.createElement("option");
            option.value = String(i);
            option.textContent = String(i);
            if (i === anioActual) {
                option.selected = true;
            }
            periodoAnio.appendChild(option);
        }

        if (anioActual < anioInicio || anioActual > anioFin) {
            periodoAnio.value = String(anioInicio);
        }
    }

    function actualizarEstadoGuardado(mensaje, tipo = "neutro") {
        estadoGuardado.textContent = mensaje;
        estadoGuardado.dataset.tipo = tipo;
    }

    function marcarCambioLocal(fila = null) {
        if (fila) {
            calcularHorasFila(fila);
        } else {
            actualizarTotales();
        }

        hayCambiosLocalesPendientes = true;
        guardarDatos();
        actualizarEstadoGuardado("Cambios pendientes de sincronizar", "local");
        programarSincronizacionNube();
    }

    function programarSincronizacionNube() {
        window.clearTimeout(temporizadorSincronizacion);
        temporizadorSincronizacion = window.setTimeout(sincronizarNubeSilenciosamente, RETRASO_SINCRONIZACION_MS);
    }

    async function sincronizarNubeSilenciosamente() {
        const user = await actualizarEstadoSesion();

        if (!user) {
            actualizarEstadoGuardado("Cambios guardados en este dispositivo", "local");
            return;
        }

        actualizarEstadoGuardado("Sincronizando con la nube...", "local");

        const periodo = obtenerPeriodo();
        const datos = recogerDatos();
        const guardadoEnNube = await guardarDatosEnNube(periodo, datos, false);

        actualizarEstadoGuardado(
            guardadoEnNube ? "Sincronizado con la nube" : "Pendiente de sincronizar",
            guardadoEnNube ? "nube" : "local"
        );

        if (guardadoEnNube) {
            hayCambiosLocalesPendientes = false;
        }
    }

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

        document.querySelector(".authPanel").classList.toggle("sesionActiva", Boolean(user));
        btnLogout.disabled = !user;
        return user;
    }

    function pintarPerfil(perfil = null) {
        perfilNombre.textContent = perfil?.nombre_completo || "Sin perfil cargado";
        perfilDni.textContent = perfil?.dni_nie || "Sin datos";
        perfilNombreInput.value = perfil?.nombre_completo || "";
        perfilDniInput.value = perfil?.dni_nie || "";
    }

    function obtenerPerfilFormulario() {
        return {
            nombre_completo: perfilNombreInput.value.trim(),
            dni_nie: perfilDniInput.value.trim().toUpperCase()
        };
    }

    function obtenerPerfilPredefinido(email) {
        return email?.toLowerCase() === PERFIL_PREDEFINIDO.email
            ? PERFIL_PREDEFINIDO
            : null;
    }

    async function cargarPerfilUsuario(user) {
        if (!supabaseClient || !user) {
            pintarPerfil();
            return null;
        }

        const { data, error } = await supabaseClient
            .from("perfiles")
            .select("nombre_completo, dni_nie")
            .eq("user_id", user.id)
            .maybeSingle();

        if (error) {
            console.error("No se pudo cargar el perfil", error);
            pintarPerfil(obtenerPerfilPredefinido(user.email));
            return null;
        }

        if (data) {
            pintarPerfil(data);
            return data;
        }

        const perfilBase = obtenerPerfilPredefinido(user.email);
        if (perfilBase) {
            await guardarPerfilUsuario(user, perfilBase, false);
            pintarPerfil(perfilBase);
            return perfilBase;
        }

        pintarPerfil();
        return null;
    }

    async function guardarPerfilUsuario(user, perfil, mostrarError = true) {
        if (!supabaseClient || !user) return false;

        const { error } = await supabaseClient
            .from("perfiles")
            .upsert({
                user_id: user.id,
                email: user.email,
                nombre_completo: perfil.nombre_completo,
                dni_nie: perfil.dni_nie,
                updated_at: new Date().toISOString()
            }, {
                onConflict: "user_id"
            });

        if (error) {
            if (mostrarError) {
                alert(`No se pudo guardar el perfil: ${error.message}`);
            }
            return false;
        }

        pintarPerfil(perfil);
        return true;
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
        const user = await actualizarEstadoSesion();
        await cargarPerfilUsuario(user);
        await cargarDatosGuardados(false);
    }

    async function crearCuenta() {
        if (!supabaseClient) return;

        const email = authEmail.value.trim();
        const password = authPassword.value;
        const perfil = obtenerPerfilFormulario();

        if (!email || !password || !perfil.nombre_completo || !perfil.dni_nie) {
            alert("Introduce email, contraseña, nombre completo y DNI/NIE");
            return;
        }

        const { error } = await supabaseClient.auth.signUp({
            email,
            password,
            options: {
                data: {
                    nombre_completo: perfil.nombre_completo,
                    dni_nie: perfil.dni_nie
                }
            }
        });

        if (error) {
            alert(`No se pudo crear la cuenta: ${error.message}`);
            return;
        }

        authPassword.value = "";
        const user = await actualizarEstadoSesion();
        if (user) {
            await guardarPerfilUsuario(user, perfil);
        }
        actualizarEstadoGuardado("Cuenta creada", "nube");
        alert("Cuenta creada. Si Supabase te envía un email de confirmación, confírmalo antes de entrar.");
    }

    async function cerrarSesion() {
        if (!supabaseClient) return;

        const datos = recogerDatos();
        const periodo = obtenerPeriodo();
        const guardadoEnNube = await guardarDatosEnNube(periodo, datos, false);

        await supabaseClient.auth.signOut();
        await actualizarEstadoSesion();
        pintarPerfil();
        limpiarPantalla();

        alert(guardadoEnNube
            ? "Datos guardados en la nube. Sesión cerrada."
            : "Sesión cerrada.");
    }

    async function limpiarPeriodo() {
        const periodo = obtenerPeriodo();

        if (!periodo) {
            alert("Selecciona un periodo antes de limpiarlo.");
            return;
        }

        const confirmado = confirm(`Vas a borrar los datos del periodo ${periodo}. Esta acción no se puede deshacer. ¿Continuar?`);

        if (!confirmado) return;

        const borradoEnNube = await borrarPeriodoEnNube(periodo);

        const mapa = leerJornadasPorPeriodo();
        delete mapa[periodo];
        localStorage.setItem(STORAGE_JORNADAS, JSON.stringify(mapa));
        observacionesFinales.value = "";
        generarPeriodo();
        guardarDatosLocales(periodo, recogerDatos(), "");

        alert(borradoEnNube
            ? "Periodo limpiado en este dispositivo y en la nube."
            : "Periodo limpiado en este dispositivo.");
        actualizarEstadoGuardado("Periodo limpiado", "local");
    }

    function migrarStorageAntiguo() {
        if (localStorage.getItem(STORAGE_JORNADAS)) return;

        const periodoViejo = localStorage.getItem("periodoRicardo");
        const datosViejos = localStorage.getItem("jornadaRicardo");

        if (!periodoViejo || !datosViejos) return;

        try {
            const mapa = {
                [periodoViejo]: {
                    datos: JSON.parse(datosViejos),
                    observaciones: localStorage.getItem("observacionesFinalesRicardo") || ""
                }
            };
            localStorage.setItem(STORAGE_JORNADAS, JSON.stringify(mapa));
            localStorage.setItem(STORAGE_PERIODO_ACTIVO, periodoViejo);
        } catch (error) {
            console.error("No se pudieron migrar los datos guardados", error);
        }
    }

    function leerJornadasPorPeriodo() {
        const raw = localStorage.getItem(STORAGE_JORNADAS);
        if (!raw) return {};
        try { return JSON.parse(raw); } catch (error) { return {}; }
    }

    function obtenerDatosPeriodo(periodo) {
        if (!periodo) return null;
        return leerJornadasPorPeriodo()[periodo] || null;
    }

    function iniciarPeriodo() {
        const periodoGuardado = localStorage.getItem(STORAGE_PERIODO_ACTIVO)
            || localStorage.getItem("periodoRicardo");

        if (periodoGuardado) {
            const [anio, mes] = periodoGuardado.split("-");
            if (periodoAnio.querySelector(`option[value="${anio}"]`)) {
                periodoAnio.value = anio;
            }
            periodoMes.value = mes;
        } else {
            const hoy = new Date();
            periodoMes.value = String(hoy.getMonth() + 1).padStart(2, "0");
            periodoAnio.value = String(hoy.getFullYear());
        }

        periodoEnPantalla = obtenerPeriodo();
        localStorage.setItem(STORAGE_PERIODO_ACTIVO, periodoEnPantalla);
        generarPeriodo();
        cargarDatos();
    }

    async function cambiarMesActivo() {
        const periodoActualGuardar = periodoEnPantalla || obtenerPeriodo();

        if (periodoActualGuardar && tbody.querySelectorAll("tr").length > 0) {
            guardarDatosLocales(
                periodoActualGuardar,
                recogerDatos(),
                observacionesFinales.value
            );
        }

        const nuevoPeriodo = obtenerPeriodo();
        if (!nuevoPeriodo) return;

        periodoEnPantalla = nuevoPeriodo;
        localStorage.setItem(STORAGE_PERIODO_ACTIVO, nuevoPeriodo);
        generarPeriodo();

        const user = await actualizarEstadoSesion();
        if (user) {
            await cargarDatosGuardados(false);
        } else {
            cargarDatos();
        }
    }

    periodoMes.addEventListener("change", cambiarMesActivo);
    periodoAnio.addEventListener("change", cambiarMesActivo);
    window.addEventListener("focus", cargarNubeAutomaticamente);
    window.addEventListener("online", cargarNubeAutomaticamente);
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            cargarNubeAutomaticamente();
        }
    });
    window.setInterval(() => {
        if (document.visibilityState === "visible") {
            cargarNubeAutomaticamente();
        }
    }, 60000);

    migrarStorageAntiguo();
    iniciarPeriodo();
    const userInicial = await actualizarEstadoSesion();
    await cargarPerfilUsuario(userInicial);
    if (userInicial) {
        await cargarDatosGuardados(false);
    }

    function obtenerPeriodo() {
        const mes = periodoMes.value;
        const anio = Number(periodoAnio.value);
        if (!mes || !anio) return "";
        return `${anio}-${mes}`;
    }

    function generarPeriodo() {
        const periodo = obtenerPeriodo();
        if (!periodo) return;

        tbody.innerHTML = "";

        const [anio, mes] = periodo.split("-").map(Number);
        const fechaInicio = new Date(anio, mes - 2, 26, 0, 0, 0);
        const fechaFin = new Date(anio, mes - 1, 25, 0, 0, 0);
        const fecha = new Date(fechaInicio);

        periodoActual.textContent = `${formatearFecha(fechaInicio)} - ${formatearFecha(fechaFin)}`;

        while (fecha <= fechaFin) {
            tbody.appendChild(crearFilaDia(new Date(fecha)));
            fecha.setDate(fecha.getDate() + 1);
        }
        actualizarTotales();
        irAlDiaActual();
    }

    function crearFilaDia(fecha) {
        const fila = document.createElement("tr");
        const fechaFormateada = formatearFecha(fecha);

        fila.dataset.fecha = fechaFormateada;
        if (esFinSemana(fecha)) {
            fila.classList.add("fila-fin-semana");
        }
        if (fechaFormateada === formatearFecha(new Date())) {
            fila.classList.add("fila-hoy");
        }

        fila.innerHTML = `
                <td class="fecha" data-label="Fecha">
                    ${fechaFormateada}
                    <br>
                    <small class="${esFinSemana(fecha) ? "fecha-fin-semana" : ""}">
                        ${nombreDia(fecha)}
                    </small>
                </td>
                <td data-label="Entrada mañana">
                    <input type="time" aria-label="Entrada mañana ${fechaFormateada}">
                    <button class="ahora" type="button">Ahora</button>
                </td>
                <td data-label="Salida mañana">
                    <input type="time" aria-label="Salida mañana ${fechaFormateada}">
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

        configurarFila(fila);
        return fila;
    }

    function configurarFila(fila) {
        fila.querySelectorAll('input[type="time"]').forEach(input => {
            input.addEventListener("change", () => {
                marcarCambioLocal(fila);
            });
            input.addEventListener("input", () => {
                marcarCambioLocal(fila);
            });
        });

        fila.querySelectorAll('input[type="number"]').forEach(input => {
            input.addEventListener("change", () => {
                marcarCambioLocal();
            });
            input.addEventListener("input", () => {
                marcarCambioLocal();
            });
        });

        fila.querySelector("textarea").addEventListener("input", () => {
            marcarCambioLocal();
        });

        fila.querySelectorAll(".ahora").forEach(btn => {
            btn.addEventListener("click", () => {
                const input = btn.parentElement.querySelector("input[type='time']");
                const ahora = new Date();
                const h = String(ahora.getHours()).padStart(2, "0");
                const m = String(ahora.getMinutes()).padStart(2, "0");

                input.value = `${h}:${m}`;
                guardarGPS(fila);
                marcarCambioLocal(fila);
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

    function irAlDiaActual() {
        const filaHoy = document.querySelector("#tablaBody .fila-hoy");

        if (!filaHoy) return;

        window.setTimeout(() => {
            filaHoy.scrollIntoView({
                behavior: "smooth",
                block: "center",
                inline: "nearest"
            });
        }, 100);
    }

    function calcularExtras(fila, minutos) {
        const exceso = minutos - 480;
        if (exceso <= 0) {
            fila.querySelector(".horasExtras").textContent = "0:00";
            return;
        }
        const minutosExtras = Math.floor((exceso + 20) / 30) * 30;
        fila.querySelector(".horasExtras").textContent = convertirMinutos(minutosExtras);
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

    function exportarCSV() {
        guardarDatos();

        const periodo = obtenerPeriodo() || "periodo";
        const datos = recogerDatos();
        const filas = [
            [
                "Fecha",
                "Entrada mañana",
                "Salida mañana",
                "Entrada tarde",
                "Salida tarde",
                "Total horas",
                "Horas extras",
                "Dieta EUR",
                "Pernocta EUR",
                "Observaciones"
            ]
        ];

        document.querySelectorAll("#tablaBody tr").forEach((fila, index) => {
            const dato = datos[index] || {};
            filas.push([
                dato.fecha || "",
                dato.entradaM || "",
                dato.salidaM || "",
                dato.entradaT || "",
                dato.salidaT || "",
                fila.querySelector(".totalHoras")?.textContent || "0:00",
                fila.querySelector(".horasExtras")?.textContent || "0:00",
                dato.dieta || "0.00",
                dato.pernocta || "0",
                dato.observacion || ""
            ]);
        });

        filas.push([]);
        filas.push(["Total días trabajados", document.getElementById("totalDias").textContent]);
        filas.push(["Total horas trabajadas", document.getElementById("totalHoras").textContent]);
        filas.push(["Total horas extras", document.getElementById("totalExtras").textContent]);
        filas.push(["Total dietas EUR", document.getElementById("totalDietas").textContent]);
        filas.push(["Total pernoctas EUR", document.getElementById("totalPernoctas").textContent]);
        filas.push(["Observaciones finales", observacionesFinales.value]);

        const contenido = filas
            .map(fila => fila.map(escaparCSV).join(";"))
            .join("\r\n");

        descargarArchivo(
            `jornada-${periodo}.csv`,
            "\uFEFF" + contenido,
            "text/csv;charset=utf-8"
        );

        actualizarEstadoGuardado("CSV exportado", "nube");
    }

    function escaparCSV(valor) {
        const texto = String(valor ?? "");
        return `"${texto.replace(/"/g, '""')}"`;
    }

    function descargarArchivo(nombre, contenido, tipo) {
        const blob = new Blob([contenido], { type: tipo });
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement("a");

        enlace.href = url;
        enlace.download = nombre;
        document.body.appendChild(enlace);
        enlace.click();
        enlace.remove();
        URL.revokeObjectURL(url);
    }

    async function guardarDatos(sincronizarNube = false) {
        const datos = recogerDatos();
        const periodo = obtenerPeriodo();

        guardarDatosLocales(periodo, datos, observacionesFinales.value);

        if (!sincronizarNube) return;

        const guardadoEnNube = await guardarDatosEnNube(periodo, datos);

        alert(guardadoEnNube
            ? "Datos guardados en la nube correctamente"
            : "Datos guardados solo en este dispositivo.");
        actualizarEstadoGuardado(
            guardadoEnNube ? "Sincronizado con la nube" : "Guardado en este dispositivo",
            guardadoEnNube ? "nube" : "local"
        );

        if (guardadoEnNube) {
            hayCambiosLocalesPendientes = false;
        }
    }

    function guardarDatosLocales(periodo, datos, observaciones) {
        if (!periodo) return;
        const mapa = leerJornadasPorPeriodo();
        mapa[periodo] = { datos, observaciones };
        localStorage.setItem(STORAGE_JORNADAS, JSON.stringify(mapa));
        localStorage.setItem(STORAGE_PERIODO_ACTIVO, periodo);
    }

    async function guardarDatosEnNube(periodo, datos, mostrarError = true) {
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

        if (error && mostrarError) {
            alert(`No se pudo guardar en Supabase: ${error.message}`);
        }

        return !error;
    }

    async function borrarPeriodoEnNube(periodo) {
        if (!supabaseClient || !periodo) return false;

        const user = await actualizarEstadoSesion();
        if (!user) return false;

        const { error } = await supabaseClient
            .from("jornadas")
            .delete()
            .eq("user_id", user.id)
            .eq("periodo", periodo);

        return !error;
    }

    function limpiarPantalla() {
        localStorage.removeItem(STORAGE_JORNADAS);
        localStorage.removeItem(STORAGE_PERIODO_ACTIVO);
        authPassword.value = "";
        observacionesFinales.value = "";

        const hoy = new Date();
        periodoMes.value = String(hoy.getMonth() + 1).padStart(2, "0");
        periodoAnio.value = String(hoy.getFullYear());
        periodoEnPantalla = obtenerPeriodo();
        localStorage.setItem(STORAGE_PERIODO_ACTIVO, periodoEnPantalla);
        generarPeriodo();
        actualizarTotales();
    }

    function aplicarDatoAFila(fila, dato) {
        const tiempos = fila.querySelectorAll("input[type='time']");
        const numeros = fila.querySelectorAll("input[type='number']");

        tiempos[0].value = dato.entradaM || "";
        tiempos[1].value = dato.salidaM || "";
        tiempos[2].value = dato.entradaT || "";
        tiempos[3].value = dato.salidaT || "";
        numeros[0].value = dato.dieta || "0.00";
        numeros[1].value = dato.pernocta || "0";
        fila.querySelector("textarea").value = dato.observacion || "";

        if (dato.gps) {
            fila.dataset.gps = dato.gps;
        } else {
            delete fila.dataset.gps;
        }

        calcularHorasFila(fila);
    }

    function cargarDatos() {
        const periodo = obtenerPeriodo();
        const entrada = obtenerDatosPeriodo(periodo);

        observacionesFinales.value = entrada?.observaciones || "";

        if (!entrada?.datos?.length) {
            actualizarTotales();
            irAlDiaActual();
            return;
        }

        const datosPorFecha = Object.fromEntries(
            entrada.datos.map(dato => [dato.fecha, dato])
        );

        document.querySelectorAll("#tablaBody tr").forEach(fila => {
            const dato = datosPorFecha[fila.dataset.fecha];
            if (!dato) return;

            aplicarDatoAFila(fila, dato);
        });

        actualizarTotales();
        irAlDiaActual();
    }

    async function cargarDatosGuardados(mostrarAviso = true) {
        const cargadoDeNube = await cargarDatosDesdeNube();

        if (!cargadoDeNube) {
            cargarDatos();
        }

        if (mostrarAviso) {
            alert(cargadoDeNube
                ? "Datos cargados desde la nube"
                : "Datos cargados desde este dispositivo.");
        }
        actualizarEstadoGuardado(
            cargadoDeNube ? "Datos cargados desde la nube" : "Datos cargados desde este dispositivo",
            cargadoDeNube ? "nube" : "local"
        );
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

        if (error || !data) return false;

        guardarDatosLocales(periodo, data.datos || [], data.observaciones_finales || "");
        periodoEnPantalla = periodo;
        cargarDatos();
        hayCambiosLocalesPendientes = false;
        return true;
    }

    async function cargarNubeAutomaticamente() {
        if (hayCambiosLocalesPendientes || cargaAutomaticaEnCurso) return;

        const user = await actualizarEstadoSesion();
        if (!user) return;

        cargaAutomaticaEnCurso = true;
        try {
            await cargarDatosGuardados(false);
        } finally {
            cargaAutomaticaEnCurso = false;
        }
    }

    function formatearFecha(fecha) {
        return `${String(fecha.getDate()).padStart(2, "0")}/${String(fecha.getMonth() + 1).padStart(2, "0")}/${fecha.getFullYear()}`;
    }

    function nombreDia(fecha) {
        return ["Domingo", "Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado"][fecha.getDay()];
    }

    function esFinSemana(fecha) {
        return fecha.getDay() === 0 || fecha.getDay() === 6;
    }
});
