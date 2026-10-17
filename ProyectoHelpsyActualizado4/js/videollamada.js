document.addEventListener("DOMContentLoaded", () => {

    const sesion = HelpsyUI.montarShell("citas", "Sala de videollamada");
    if (!sesion) return;
    if (!HelpsyUI.exigirRol("Paciente", "Tutor", "Psicólogo")) return;

    const parametros = new URLSearchParams(window.location.search);
    const citaId = parametros.get("cita");
    const cita = HelpsyData.obtenerCitas().find((c) => c.id === citaId);

    const esParticipanteAutorizado = cita && (
        (sesion.rol === "Paciente" && cita.pacienteCedula === sesion.cedula) ||
        (sesion.rol === "Psicólogo" && cita.psicologoCedula === sesion.cedula) ||
        (sesion.rol === "Tutor" &&
            cita.agendadaPorTutor &&
            cita.agendadaPorTutor.cedula === sesion.cedula &&
            HelpsyData.obtenerMenores(sesion.cedula).some((menor) =>
                menor.documento === cita.pacienteCedula &&
                HelpsyData.menorTieneConsentimiento(menor.documento)
            ))
    );

    if (!esParticipanteAutorizado ||
        !["Programada", "Reprogramada", "En curso"].includes(cita.estado) ||
        cita.fecha !== new Date().toISOString().split("T")[0]) {
        HelpsyUI.toast("No puedes ingresar: la cita no existe, no es de hoy o no pertenece a tu cuenta.", "error");
        document.getElementById("modal-confidencialidad").classList.remove("visible");
        setTimeout(() => { window.location.href = "citas.html"; }, 1200);
        return;
    }

    const otraPersona = !cita
        ? "tu contacto"
        : sesion.rol === "Psicólogo" ? cita.pacienteNombre : cita.psicologoNombre;

    document.getElementById("video-lienzo").innerHTML = `
        <div class="video-avatar-grande">${HelpsyUI.iniciales(otraPersona)}</div>
        <div class="video-mini">Tú</div>
    `;

    document.getElementById("detalle-cita-video").innerHTML = cita ? `
        <div class="tarjeta">
            <div class="tarjeta-encabezado">
                <div>
                    <h2>Sesión con ${otraPersona}</h2>
                    <p>${cita.especialidad} · ${cita.fecha} a las ${cita.hora}</p>
                </div>
                <span class="badge badge-azul" id="cronometro">00:00</span>
            </div>
        </div>
    ` : `
        <div class="tarjeta">
            <div class="estado-vacio">
                ${HelpsyUI.ICONOS.vacio}
                <strong>No se encontró la cita asociada</strong>
                <span>Entra a la sala desde "Mis citas" el día de tu sesión.</span>
            </div>
        </div>
    `;

    /* -------------------------------------------------------------
       Aviso de confidencialidad: obligatorio, no se puede saltar.
       El botón de entrar sigue deshabilitado hasta marcar el check.
    ------------------------------------------------------------- */

    const checkConfidencialidad = document.getElementById("check-confidencialidad");
    checkConfidencialidad.focus();
    const botonAceptar = document.getElementById("btn-aceptar-confidencialidad");

    checkConfidencialidad.addEventListener("change", () => {
        botonAceptar.disabled = !checkConfidencialidad.checked;
    });

    let intervalo = null;

    botonAceptar.addEventListener("click", () => {

        if (!checkConfidencialidad.checked) return;

        if (!HelpsyData.registrarAceptacionConfidencialidad(
            cita.id,
            { cedula: sesion.cedula, nombre: sesion.nombre },
            sesion.rol
        )) {
            HelpsyUI.toast("No se pudo registrar tu aceptación de confidencialidad. No puedes entrar todavía.", "error");
            return;
        }

        HelpsyUI.cerrarModal("modal-confidencialidad");
        document.getElementById("video-shell").classList.remove("oculto");

        intervalo = iniciarCronometro();

    });

    function iniciarCronometro() {

        let segundos = 0;

        return setInterval(() => {

            segundos++;
            const cronometro = document.getElementById("cronometro");
            if (!cronometro) return;

            const mm = String(Math.floor(segundos / 60)).padStart(2, "0");
            const ss = String(segundos % 60).padStart(2, "0");
            cronometro.textContent = `${mm}:${ss}`;

        }, 1000);

    }

    let micActivo = true;
    let camaraActiva = true;

    document.getElementById("btn-mic").addEventListener("click", (evento) => {
        micActivo = !micActivo;
        evento.currentTarget.style.background = micActivo ? "" : "var(--rojo-600)";
        HelpsyUI.toast(micActivo ? "Micrófono activado (simulado)." : "Micrófono silenciado (simulado).", "info");
    });

    document.getElementById("btn-camara").addEventListener("click", (evento) => {
        camaraActiva = !camaraActiva;
        evento.currentTarget.style.background = camaraActiva ? "" : "var(--rojo-600)";
        HelpsyUI.toast(camaraActiva ? "Cámara encendida (simulada)." : "Cámara apagada (simulada).", "info");
    });

    document.getElementById("btn-colgar").addEventListener("click", () => {

        if (intervalo) clearInterval(intervalo);

        if (cita && confirm("¿Salir de la llamada y marcar la sesión como completada?")) {

            const citas = HelpsyData.obtenerCitas();
            const indice = citas.findIndex((c) => c.id === cita.id);

            if (indice !== -1) {
                citas[indice].estado = "Completada";
                HelpsyData.guardarCitas(citas);
            }

        }

        window.location.href = "citas.html";

    });

});
