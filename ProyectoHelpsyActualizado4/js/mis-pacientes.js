document.addEventListener("DOMContentLoaded", () => {

    const sesion = HelpsyUI.montarShell("mis-pacientes", "Mis pacientes");
    if (!sesion) return;
    if (!HelpsyUI.exigirRol("Psicólogo")) return;

    const citas = HelpsyData.obtenerCitas().filter((c) => c.psicologoCedula === sesion.cedula);

    const mapaPacientes = new Map();

    citas.forEach((c) => {

        if (!mapaPacientes.has(c.pacienteCedula)) {

            mapaPacientes.set(c.pacienteCedula, {
                cedula: c.pacienteCedula,
                nombre: c.pacienteNombre,
                sesiones: 0,
                ultimaCita: c.fecha
            });

        }

        mapaPacientes.get(c.pacienteCedula).sesiones++;

    });

    const pacientes = Array.from(mapaPacientes.values());

    document.getElementById("contador-pacientes").textContent = `${pacientes.length} pacientes`;

    const contenedor = document.getElementById("lista-pacientes");

    if (pacientes.length === 0) {

        contenedor.innerHTML = `
            <div class="estado-vacio">
                ${HelpsyUI.ICONOS.vacio}
                <strong>Todavía no tienes pacientes</strong>
                <span>Cuando alguien agende y pague una cita contigo, aparecerá aquí.</span>
            </div>
        `;

        return;

    }

    contenedor.innerHTML = `
        <div class="tabla-envoltura">
            <table class="tabla-datos">
                <thead><tr><th>Paciente</th><th>Sesiones</th><th>Última cita</th><th></th></tr></thead>
                <tbody>
                    ${pacientes.map((p) => `
                        <tr>
                            <td>
                                <div class="fila-persona">
                                    <span class="avatar-mini">${HelpsyUI.iniciales(p.nombre)}</span>
                                    ${p.nombre}
                                </div>
                            </td>
                            <td>${p.sesiones}</td>
                            <td>${p.ultimaCita}</td>
                            <td><button class="btn btn-fantasma btn-sm" data-ver-diario="${p.cedula}" data-nombre="${p.nombre}">Ver diario</button></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;

    contenedor.addEventListener("click", async (evento) => {

        const boton = evento.target.closest("[data-ver-diario]");
        if (!boton) return;

        const cedula = boton.dataset.verDiario;
        const nombre = boton.dataset.nombre;

        // RF-43 / RNF-05: un especialista accediendo al diario de un
        // paciente es exactamente el tipo de acceso que debe quedar en
        // la auditoría, sea o no uno de sus pacientes vinculados.
        HelpsyData.registrarAccesoSensible(sesion.nombre, sesion.rol, "Diario emocional de paciente", cedula);

        const entradas = HelpsyData.obtenerDiario(cedula);

        document.getElementById("titulo-diario-paciente").textContent = `Diario de ${nombre}`;

        const panel = document.getElementById("panel-diario-paciente");
        panel.classList.remove("oculto");
        panel.scrollIntoView({ behavior: "smooth", block: "start" });

        const contenedorNotas = document.getElementById("contenido-diario-paciente");

        if (entradas.length === 0) {

            contenedorNotas.innerHTML = `
                <div class="estado-vacio">
                    ${HelpsyUI.ICONOS.vacio}
                    <strong>Este paciente aún no ha registrado su ánimo</strong>
                    <span>Cuando lo haga, sus entradas aparecerán aquí.</span>
                </div>
            `;

            return;

        }

        contenedorNotas.innerHTML = `<p style="font-size:11px; color:var(--gris-500);">Descifrando notas...</p>`;

        // La misma cédula que cifró las notas es la única llave para
        // descifrarlas — el psicólogo puede leerlas porque conoce la
        // cédula del paciente, no porque tenga un permiso especial.
        // (Nota para cuando haya backend: ahí la llave debe depender
        // de un permiso real, no solo de conocer un dato público.)
        const entradasConNotas = await Promise.all(
            [...entradas].reverse().map(async (e) => ({
                ...e,
                notasTexto: e.notasCifradas
                    ? await HelpsyUI.descifrarTexto(e.notasCifradas, cedula)
                    : (e.notas || "")
            }))
        );

        contenedorNotas.innerHTML = entradasConNotas.map((e) => `
            <div class="diario-entrada">
                <span class="diario-entrada-emoji">${e.emoji}</span>
                <div class="diario-entrada-texto">
                    <strong>${e.animoTexto}</strong>
                    <p>${e.notasTexto || "Sin notas."}</p>
                </div>
                <span class="diario-entrada-fecha">${e.fecha}</span>
            </div>
        `).join("");

    });

    document.getElementById("btn-cerrar-diario").addEventListener("click", () => {
        document.getElementById("panel-diario-paciente").classList.add("oculto");
    });

});
