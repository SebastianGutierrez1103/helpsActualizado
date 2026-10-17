document.addEventListener("DOMContentLoaded", () => {

    const sesion = HelpsyUI.montarShell("tareas", "Tareas");
    if (!sesion) return;
    if (!HelpsyUI.exigirRol("Paciente", "Tutor", "Psicólogo")) return;

    const esPsicologo = sesion.rol === "Psicólogo";
    const esTutor = sesion.rol === "Tutor";

    // RF-33 (Tutor "por el menor"): un tutor ve las tareas de todos sus
    // menores con consentimiento vigente, no solo de uno.
    function documentosDeMisMenores() {
        return HelpsyData.obtenerMenores(sesion.cedula)
            .filter((m) => HelpsyData.menorTieneConsentimiento(m.documento))
            .map((m) => m.documento);
    }

    document.getElementById("titulo-tareas").textContent = esPsicologo ? "Tareas que has asignado" : "Tus tareas";

    document.getElementById("info-tareas").innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        ${esPsicologo
            ? "Asigna actividades entre sesiones a tus pacientes y revisa cuáles ya completaron."
            : "Actividades que tu psicólogo te dejó para practicar entre sesiones."}
    `;

    function pacientesDelPsicologo() {

        const citas = HelpsyData.obtenerCitas().filter((c) => c.psicologoCedula === sesion.cedula);
        const mapa = new Map();

        citas.forEach((c) => mapa.set(c.pacienteCedula, c.pacienteNombre));

        return Array.from(mapa, ([cedula, nombre]) => ({ cedula, nombre }));

    }

    if (esPsicologo) {

        const botonNueva = document.getElementById("btn-nueva-tarea");
        botonNueva.classList.remove("oculto");

        botonNueva.addEventListener("click", () => {

            const pacientes = pacientesDelPsicologo();

            if (pacientes.length === 0) {
                HelpsyUI.toast("Todavía no tienes pacientes con citas agendadas.", "error");
                return;
            }

            document.getElementById("tarea-paciente").innerHTML =
                pacientes.map((p) => `<option value="${p.cedula}">${p.nombre}</option>`).join("");

            document.getElementById("form-tarea").reset();
            HelpsyUI.abrirModal("modal-tarea");

        });

        document.getElementById("cerrar-modal-tarea").addEventListener("click", () => HelpsyUI.cerrarModal("modal-tarea"));
        document.getElementById("cancelar-modal-tarea").addEventListener("click", () => HelpsyUI.cerrarModal("modal-tarea"));

        document.getElementById("form-tarea").addEventListener("submit", (evento) => {

            evento.preventDefault();

            const pacienteCedula = document.getElementById("tarea-paciente").value;
            const pacientes = pacientesDelPsicologo();
            const paciente = pacientes.find((p) => p.cedula === pacienteCedula);
            const titulo = document.getElementById("tarea-titulo").value.trim();
            const descripcion = document.getElementById("tarea-descripcion").value.trim();

            if (titulo.length < 3) {
                HelpsyUI.toast("Escribe un título para la tarea.", "error");
                return;
            }

            HelpsyData.agregarTarea({
                id: `t${Date.now()}`,
                pacienteCedula,
                pacienteNombre: paciente.nombre,
                psicologoNombre: sesion.nombre,
                titulo,
                descripcion,
                fechaAsignada: new Date().toLocaleDateString("es-CO"),
                fechaAsignadaISO: new Date().toISOString(),
                estado: "Pendiente"
            });

            HelpsyUI.cerrarModal("modal-tarea");
            HelpsyUI.toast("Tarea asignada.", "exito");
            pintar();

        });

    }

    function pintar() {

        const tareas = esPsicologo
            ? HelpsyData.obtenerTareas().filter((t) => {
                const pacientes = pacientesDelPsicologo().map((p) => p.cedula);
                return pacientes.includes(t.pacienteCedula) && t.psicologoNombre === sesion.nombre;
            })
            : esTutor
                ? HelpsyData.obtenerTareas().filter((t) => documentosDeMisMenores().includes(t.pacienteCedula))
                : HelpsyData.obtenerTareas(sesion.cedula);

        document.getElementById("contador-tareas").textContent = `${tareas.length} tareas`;

        const contenedor = document.getElementById("lista-tareas");

        if (tareas.length === 0) {

            contenedor.innerHTML = `
                <div class="estado-vacio">
                    ${HelpsyUI.ICONOS.vacio}
                    <strong>No hay tareas todavía</strong>
                    <span>${esPsicologo ? "Asigna la primera actividad a uno de tus pacientes." : "Tu psicólogo aún no te ha asignado actividades."}</span>
                </div>
            `;

            return;

        }

        contenedor.innerHTML = `<div class="lista-simple">${tareas.map((t) => `
            <div class="lista-item" style="align-items:flex-start;">
                <div class="lista-item-icono">${HelpsyUI.ICONOS.tareas}</div>
                <div class="lista-item-texto">
                    <strong>${t.titulo}</strong>
                    <span>${esPsicologo ? `Para ${t.pacienteNombre}` : `Asignada por ${t.psicologoNombre}`} · ${t.fechaAsignada}</span>
                    ${t.descripcion ? `<p style="margin-top:4px; font-size:11.5px; color:var(--gris-500);">${t.descripcion}</p>` : ""}
                </div>
                ${!esPsicologo && t.estado === "Pendiente"
                    ? `<button class="btn btn-exito btn-sm" data-completar-tarea="${t.id}">Marcar hecha</button>`
                    : `<span class="badge ${t.estado === "Completada" ? "badge-verde" : "badge-naranja"}">${t.estado}</span>`
                }
            </div>
        `).join("")}</div>`;

    }

    document.getElementById("lista-tareas").addEventListener("click", (evento) => {

        const boton = evento.target.closest("[data-completar-tarea]");
        if (!boton) return;

        const tareas = HelpsyData.obtenerTareas();
        const indice = tareas.findIndex((t) => t.id === boton.dataset.completarTarea);

        if (indice !== -1) {
            tareas[indice].estado = "Completada";
            tareas[indice].fechaCompletadaISO = new Date().toISOString();
            HelpsyData.guardarTareas(tareas);
            HelpsyUI.toast("Tarea marcada como completada.", "exito");
            pintar();
        }

    });

    pintar();

});
