document.addEventListener("DOMContentLoaded", () => {

    const sesion = HelpsyUI.montarShell("recursos", "Recursos");
    if (!sesion) return;
    if (!HelpsyUI.exigirRol("Paciente")) return;

    /* -------------------- Tabs -------------------- */

    document.getElementById("tabs-recursos").addEventListener("click", (evento) => {

        const boton = evento.target.closest(".tab-btn");
        if (!boton) return;

        document.querySelectorAll("#tabs-recursos .tab-btn").forEach((b) => b.classList.remove("activo"));
        boton.classList.add("activo");

        ["respiracion", "meditacion", "guias"].forEach((panel) => {
            document.getElementById(`panel-${panel}`).classList.toggle("oculto", panel !== boton.dataset.tab);
        });

    });

    /* -------------------- Respiración en caja -------------------- */

    const circulo = document.getElementById("circulo-respiracion");
    const textoRespiracion = document.getElementById("texto-respiracion");
    const botonIniciar = document.getElementById("btn-iniciar-respiracion");
    const botonDetener = document.getElementById("btn-detener-respiracion");
    const contadorCiclos = document.getElementById("ciclos-respiracion");

    const PASOS = [
        { texto: "Inhala...", clase: "expandir" },
        { texto: "Sostén", clase: "expandir" },
        { texto: "Exhala...", clase: "contraer" },
        { texto: "Sostén", clase: "contraer" }
    ];

    let temporizadorRespiracion = null;
    let pasoActual = 0;
    let ciclos = 0;

    function pasoDeRespiracion() {

        const paso = PASOS[pasoActual % PASOS.length];

        textoRespiracion.textContent = paso.texto;
        circulo.classList.remove("expandir", "contraer");
        circulo.classList.add(paso.clase);

        if (pasoActual > 0 && pasoActual % PASOS.length === 0) {
            ciclos++;
            contadorCiclos.textContent = `${ciclos} ciclo${ciclos === 1 ? "" : "s"} completado${ciclos === 1 ? "" : "s"}`;
        }

        pasoActual++;

    }

    botonIniciar.addEventListener("click", () => {

        pasoActual = 0;
        ciclos = 0;
        contadorCiclos.textContent = "";

        pasoDeRespiracion();
        temporizadorRespiracion = setInterval(pasoDeRespiracion, 4000);

        botonIniciar.classList.add("oculto");
        botonDetener.classList.remove("oculto");

    });

    botonDetener.addEventListener("click", detenerRespiracion);

    function detenerRespiracion() {

        clearInterval(temporizadorRespiracion);
        circulo.classList.remove("expandir", "contraer");
        textoRespiracion.textContent = "Listo";

        botonIniciar.classList.remove("oculto");
        botonDetener.classList.add("oculto");

    }

    /* -------------------- Meditación guiada (temporizador) -------------------- */

    const DURACION_MEDITACION = 5 * 60; // 5 minutos, en segundos
    let segundosRestantes = DURACION_MEDITACION;
    let temporizadorMeditacion = null;

    function pintarTiempo() {

        const mm = String(Math.floor(segundosRestantes / 60)).padStart(2, "0");
        const ss = String(segundosRestantes % 60).padStart(2, "0");
        document.getElementById("temporizador-meditacion").textContent = `${mm}:${ss}`;

    }

    document.getElementById("btn-iniciar-meditacion").addEventListener("click", (evento) => {

        segundosRestantes = DURACION_MEDITACION;
        pintarTiempo();

        temporizadorMeditacion = setInterval(() => {

            segundosRestantes--;
            pintarTiempo();

            if (segundosRestantes <= 0) {

                clearInterval(temporizadorMeditacion);
                HelpsyUI.toast("Meditación terminada. ¿Cómo te sientes? Puedes registrarlo en tu diario.", "exito");
                detenerMeditacion();

            }

        }, 1000);

        evento.target.classList.add("oculto");
        document.getElementById("btn-detener-meditacion").classList.remove("oculto");

    });

    document.getElementById("btn-detener-meditacion").addEventListener("click", detenerMeditacion);

    function detenerMeditacion() {

        clearInterval(temporizadorMeditacion);
        segundosRestantes = DURACION_MEDITACION;
        pintarTiempo();

        document.getElementById("btn-iniciar-meditacion").classList.remove("oculto");
        document.getElementById("btn-detener-meditacion").classList.add("oculto");

    }

    pintarTiempo();

    /* -------------------- Guías -------------------- */

    const GUIAS = [
        {
            titulo: "Antes de dormir",
            puntos: [
                "Evita pantallas 30 minutos antes de acostarte.",
                "Escribe en tu diario lo que te preocupa, para \"soltarlo\" del día.",
                "Mantén una hora fija para dormir, incluso los fines de semana."
            ]
        },
        {
            titulo: "Cuando sientas ansiedad repentina",
            puntos: [
                "Nombra 5 cosas que puedas ver, 4 que puedas tocar, 3 que puedas oír.",
                "Haz el ejercicio de respiración en caja de esta página.",
                "Si la sensación no baja en 20 minutos, escríbele a tu psicólogo."
            ]
        },
        {
            titulo: "Para sostener una rutina",
            puntos: [
                "Empieza con metas pequeñas y medibles, no \"sentirme mejor\" sino \"caminar 10 minutos\".",
                "Registra tu ánimo todos los días a la misma hora, así sea rápido.",
                "Celebra cumplir una tarea, aunque sea pequeña — eso sostiene el hábito."
            ]
        }
    ];

    document.getElementById("lista-guias").innerHTML = GUIAS.map((guia) => `
        <div class="guia-item">
            <h3>${guia.titulo}</h3>
            <ul>${guia.puntos.map((p) => `<li>${p}</li>`).join("")}</ul>
        </div>
    `).join("");

});
