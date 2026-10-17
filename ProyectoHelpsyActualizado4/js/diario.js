document.addEventListener("DOMContentLoaded", () => {

    const sesion = HelpsyUI.montarShell("diario", "Diario emocional");
    if (!sesion) return;
    if (!HelpsyUI.exigirRol("Paciente", "Tutor")) return;

    const esTutor = sesion.rol === "Tutor";
    const campoMenor = document.getElementById("campo-diario-menor");
    const selectMenor = document.getElementById("diario-menor");

    // RF-27 (Tutor "por el menor"): todo lo que antes usaba la cédula de
    // la sesión ahora usa el documento del menor seleccionado, cuando
    // quien está en sesión es un Tutor.
    let identificadorActivo = sesion.cedula;
    let nombreActivo = sesion.nombre;

    if (esTutor) {

        const menoresConConsentimiento = HelpsyData.obtenerMenores(sesion.cedula)
            .filter((m) => HelpsyData.menorTieneConsentimiento(m.documento));

        if (menoresConConsentimiento.length === 0) {

            document.querySelector("main.contenido").innerHTML = `
                <div class="topbar" id="helpsy-topbar"></div>
                <div class="estado-vacio" style="margin-top: 20px;">
                    ${HelpsyUI.ICONOS.vacio}
                    <strong>No tienes menores con consentimiento registrado</strong>
                    <span>Ve a "Mis menores" para registrar uno antes de usar el diario emocional.</span>
                </div>
            `;
            HelpsyUI.montarShell("menores", "Diario emocional");
            return;

        }

        campoMenor.classList.remove("oculto");
        selectMenor.innerHTML = menoresConConsentimiento
            .map((m) => `<option value="${m.documento}">${m.nombre}</option>`)
            .join("");

        identificadorActivo = selectMenor.value;
        nombreActivo = menoresConConsentimiento.find((m) => m.documento === identificadorActivo)?.nombre;

        selectMenor.addEventListener("change", async () => {
            identificadorActivo = selectMenor.value;
            actualizarAvisoHoy();
            await pintarHistorialYGrafico();
        });

    }

    const OPCIONES_ANIMO = [
        { valor: 1, emoji: "😞", texto: "Mal" },
        { valor: 2, emoji: "😕", texto: "Bajo" },
        { valor: 3, emoji: "😐", texto: "Regular" },
        { valor: 4, emoji: "🙂", texto: "Bien" },
        { valor: 5, emoji: "😄", texto: "Muy bien" }
    ];

    let seleccion = null;
    let grafico = null;

    const grid = document.getElementById("animo-grid");

    grid.innerHTML = OPCIONES_ANIMO.map((o) => `
        <button type="button" class="animo-opcion" data-valor="${o.valor}">
            <span class="emoji">${o.emoji}</span>
            ${o.texto}
        </button>
    `).join("");

    grid.addEventListener("click", (evento) => {

        const boton = evento.target.closest(".animo-opcion");
        if (!boton) return;

        grid.querySelectorAll(".animo-opcion").forEach((b) => b.classList.remove("seleccionado"));
        boton.classList.add("seleccionado");
        seleccion = OPCIONES_ANIMO.find((o) => o.valor === Number(boton.dataset.valor));

    });

    const hoy = new Date().toISOString().split("T")[0];

    function yaRegistroHoy() {
        return HelpsyData.obtenerDiario(identificadorActivo).some((e) => e.fechaISO === hoy);
    }

    function actualizarAvisoHoy() {

        const aviso = document.getElementById("aviso-ya-registrado");
        const boton = document.getElementById("btn-guardar-diario");

        if (yaRegistroHoy()) {
            aviso.textContent = "Ya registraste tu ánimo hoy. Puedes guardar de nuevo para reemplazarlo.";
            aviso.classList.remove("oculto");
        } else {
            aviso.classList.add("oculto");
        }

    }

    document.getElementById("btn-guardar-diario").addEventListener("click", async () => {

        if (!seleccion) {
            HelpsyUI.toast("Elige primero cómo te sientes hoy.", "error");
            return;
        }

        const notas = document.getElementById("diario-notas").value.trim();

        // Las notas son el dato más sensible del diario (reflexiones
        // personales), así que se cifran antes de tocar localStorage.
        // Se cifran con el documento del TITULAR (paciente o menor), no
        // con la cédula de quien hace clic, para que la llave de
        // descifrado no dependa de quién esté de tutor en ese momento.
        const notasCifradas = await HelpsyUI.cifrarTexto(notas, identificadorActivo);

        HelpsyData.agregarEntradaDiario({
            id: `d${Date.now()}`,
            pacienteCedula: identificadorActivo,
            registradoPorTutor: esTutor ? { cedula: sesion.cedula, nombre: sesion.nombre } : null,
            fechaISO: hoy,
            fecha: new Date().toLocaleDateString("es-CO"),
            animo: seleccion.valor,
            animoTexto: seleccion.texto,
            emoji: seleccion.emoji,
            notasCifradas
        });

        HelpsyUI.toast("Registro de hoy guardado (notas cifradas).", "exito");

        document.getElementById("diario-notas").value = "";
        grid.querySelectorAll(".animo-opcion").forEach((b) => b.classList.remove("seleccionado"));
        seleccion = null;

        actualizarAvisoHoy();
        await pintarHistorialYGrafico();

    });

    async function pintarHistorialYGrafico() {

        // RF-43: leer el diario emocional de alguien es acceder a un
        // dato clínico sensible; queda en la auditoría aunque sea el
        // propio titular (o su tutor) quien lo esté viendo.
        HelpsyData.registrarAccesoSensible(sesion.nombre, sesion.rol, "Diario emocional", identificadorActivo);

        const entradas = HelpsyData.obtenerDiario(identificadorActivo);
        const lista = document.getElementById("lista-diario");

        document.getElementById("contador-diario").textContent = `${entradas.length} registros`;

        if (entradas.length === 0) {

            lista.innerHTML = `
                <div class="estado-vacio">
                    ${HelpsyUI.ICONOS.vacio}
                    <strong>Todavía no hay registros</strong>
                    <span>Tu historial aparecerá aquí apenas guardes el primero.</span>
                </div>
            `;

        } else {

            // Se descifran las notas de cada entrada antes de pintarlas.
            const entradasConNotas = await Promise.all(
                [...entradas].reverse().map(async (e) => ({
                    ...e,
                    notasTexto: e.notasCifradas
                        ? await HelpsyUI.descifrarTexto(e.notasCifradas, identificadorActivo)
                        : (e.notas || "") // compatibilidad con registros viejos sin cifrar
                }))
            );

            lista.innerHTML = entradasConNotas.map((e) => `
                <div class="diario-entrada">
                    <span class="diario-entrada-emoji">${e.emoji}</span>
                    <div class="diario-entrada-texto">
                        <strong>${e.animoTexto}</strong>
                        <p>${e.notasTexto || "Sin notas."}</p>
                    </div>
                    <span class="diario-entrada-fecha">${e.fecha}</span>
                </div>
            `).join("");

        }

        const ultimasEntradas = entradas.slice(-14);

        if (grafico) grafico.destroy();

        const contexto = document.getElementById("grafico-diario").getContext("2d");

        grafico = new Chart(contexto, {
            type: "line",
            data: {
                labels: ultimasEntradas.map((e) => e.fecha),
                datasets: [{
                    label: "Estado de ánimo",
                    data: ultimasEntradas.map((e) => e.animo),
                    borderColor: "#3b6df0",
                    backgroundColor: "rgba(59,109,240,0.12)",
                    tension: 0.35,
                    fill: true,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { display: false } },
                scales: {
                    y: { min: 1, max: 5, ticks: { stepSize: 1 } }
                }
            }
        });

    }

    actualizarAvisoHoy();
    pintarHistorialYGrafico();

});
