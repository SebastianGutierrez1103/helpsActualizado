document.addEventListener("DOMContentLoaded", () => {

    const sesion = HelpsyData.obtenerSesion();

    if (!sesion) {
        window.location.href = "login.html";
        return;
    }

    if (sesion.rol !== "Paciente") {
        window.location.href = "post-login.html";
        return;
    }

    const preguntas = HelpsyData.PREGUNTAS_BIENESTAR;
    let indiceActual = -1; // -1 = pantalla de intro
    const respuestas = [];

    const progresoRelleno = document.getElementById("progreso-relleno");
    const pantallaIntro = document.getElementById("pantalla-intro");
    const pantallaPregunta = document.getElementById("pantalla-pregunta");
    const pantallaResultado = document.getElementById("pantalla-resultado");

    document.getElementById("total-preguntas").textContent = preguntas.length;

    document.getElementById("btn-omitir").addEventListener("click", () => {

        const confirmado = confirm(
            "Puedes responderlo más tarde desde tu perfil. ¿Ir directo a tu panel?"
        );

        if (confirmado) window.location.href = "paciente.html";

    });

    document.getElementById("btn-empezar").addEventListener("click", () => {
        indiceActual = 0;
        mostrarPregunta();
    });

    function actualizarProgreso() {

        const porcentaje = indiceActual < 0
            ? 0
            : Math.round((indiceActual / preguntas.length) * 100);

        progresoRelleno.style.width = `${porcentaje}%`;

    }

    function mostrarPregunta() {

        actualizarProgreso();

        pantallaIntro.classList.add("oculto");
        pantallaResultado.classList.add("oculto");
        pantallaPregunta.classList.remove("oculto");

        const pregunta = preguntas[indiceActual];

        document.getElementById("contador-pregunta").textContent =
            `Pregunta ${indiceActual + 1} de ${preguntas.length}`;

        document.getElementById("texto-pregunta").textContent = pregunta.texto;

        document.getElementById("opciones-pregunta").innerHTML = pregunta.opciones.map((opcion, indice) => `
            <button type="button" class="cuestionario-opcion" data-indice="${indice}">
                ${opcion}
            </button>
        `).join("");

        document.querySelectorAll(".cuestionario-opcion").forEach((boton) => {

            boton.addEventListener("click", () => {

                respuestas[indiceActual] = {
                    preguntaId: pregunta.id,
                    esPreguntaSeguridad: !!pregunta.esPreguntaSeguridad,
                    valor: Number(boton.dataset.indice),
                    texto: pregunta.opciones[Number(boton.dataset.indice)]
                };

                setTimeout(siguientePregunta, 150);

            });

        });

    }

    function siguientePregunta() {

        indiceActual++;

        if (indiceActual < preguntas.length) {
            mostrarPregunta();
        } else {
            mostrarResultado();
        }

    }

    function mostrarResultado() {

        actualizarProgreso();
        progresoRelleno.style.width = "100%";

        pantallaPregunta.classList.add("oculto");
        pantallaResultado.classList.remove("oculto");

        const respuestaSeguridad = respuestas.find((r) => r.esPreguntaSeguridad);
        const enRiesgo = respuestaSeguridad && respuestaSeguridad.valor >= 2; // "A veces" o "Frecuentemente"

        const puntajeGeneral = respuestas
            .filter((r) => !r.esPreguntaSeguridad)
            .reduce((suma, r) => suma + r.valor, 0);

        const maximoPosible = (preguntas.length - 1) * 3;
        const porcentaje = Math.round((puntajeGeneral / maximoPosible) * 100);

        let banda, colorBanda, mensaje;

        if (porcentaje < 30) {
            banda = "Bienestar estable";
            colorBanda = "badge-verde";
            mensaje = "Tus respuestas muestran un momento relativamente estable. De todas formas, mantener seguimiento con un psicólogo ayuda a sostenerlo.";
        } else if (porcentaje < 60) {
            banda = "Algunas señales para atender";
            colorBanda = "badge-naranja";
            mensaje = "Se notan algunas señales de cansancio emocional o estrés. Hablar con un psicólogo certificado puede ayudarte a manejarlas antes de que crezcan.";
        } else {
            banda = "Momento para buscar apoyo";
            colorBanda = "badge-rojo";
            mensaje = "Tus respuestas sugieren que estás pasando por un momento difícil. Te recomendamos agendar una cita con un psicólogo lo antes posible.";
        }

        HelpsyData.guardarCuestionario(sesion.cedula, {
            fecha: new Date().toLocaleString("es-CO"),
            puntajePorcentaje: porcentaje,
            banda,
            enRiesgo,
            respuestas
        });

        pantallaResultado.innerHTML = `
            <div class="cuestionario-resultado-icono">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78Z"/></svg>
            </div>
            <span class="badge ${colorBanda} cuestionario-resultado-banda">${banda}</span>
            <h1>Gracias por responder</h1>
            <p>${mensaje}</p>

            ${enRiesgo ? `
                <div class="cuestionario-aviso">
                    <strong>Si sientes que necesitas hablar con alguien ahora mismo:</strong>
                    En Colombia puedes llamar a la <strong>Línea 106</strong> (línea de salud
                    mental, gratuita, 24 horas) o al <strong>123</strong> en caso de
                    emergencia. Esto no reemplaza ayuda profesional inmediata si la
                    necesitas — por favor no esperes a agendar una cita en la app.
                </div>
            ` : ""}

            <p style="font-size: 11px; margin-top: 18px;">
                Esto no es un diagnóstico clínico. Es un contexto inicial para
                que tu psicólogo entienda mejor tu punto de partida.
            </p>

            <button class="btn btn-primario" id="btn-ir-panel" style="margin-top: 10px;">
                Ir a mi panel
            </button>
        `;

        document.getElementById("btn-ir-panel").addEventListener("click", () => {
            window.location.href = "paciente.html";
        });

    }

});
