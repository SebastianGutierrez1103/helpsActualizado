document.addEventListener("DOMContentLoaded", () => {

    const sesion = HelpsyUI.montarShell("usuarios", "Usuarios");
    if (!sesion) return;
    if (!HelpsyUI.exigirRol("Administrador")) return;

    const tabla = document.getElementById("tabla-usuarios");
    const contador = document.getElementById("contador-usuarios");
    const filtroRol = document.getElementById("filtro-rol");
    const buscador = document.getElementById("buscar-usuario");

    const formulario = document.getElementById("form-usuario");
    const modalTitulo = document.getElementById("modal-titulo");

    function badgeRol(rol) {

        const mapa = { "Administrador": "badge-morado", "Psicólogo": "badge-azul", "Paciente": "badge-gris" };
        return `<span class="badge ${mapa[rol] || "badge-gris"}">${rol}</span>`;

    }

    /* ============================================================
       VERIFICACIÓN DE ESPECIALISTAS (RF-07 / HU-26)
       Los psicólogos se guardan en una colección aparte
       (HelpsyData.obtenerPsicologos), no en "usuarios".
    ============================================================ */

    const tablaPendientes = document.getElementById("tabla-pendientes");
    const contadorPendientes = document.getElementById("contador-pendientes");

    function badgeVerificacion(estado) {

        const mapa = {
            "Pendiente": "badge-naranja",
            "Aprobado": "badge-verde",
            "Rechazado": "badge-rojo"
        };

        return `<span class="badge ${mapa[estado] || "badge-gris"}">${estado || "Aprobado"}</span>`;

    }

    function pintarPendientes() {

        const psicologos = HelpsyData.obtenerPsicologos();
        const pendientes = psicologos.filter((p) => p.estadoVerificacion === "Pendiente");

        contadorPendientes.textContent = pendientes.length === 0
            ? "No hay especialistas esperando revisión."
            : `${pendientes.length} especialista${pendientes.length === 1 ? "" : "s"} esperando tu revisión.`;

        if (pendientes.length === 0) {

            tablaPendientes.innerHTML = `
                <tr><td colspan="7">
                    <div class="estado-vacio">
                        ${HelpsyUI.ICONOS.vacio}
                        <strong>Todo al día</strong>
                        <span>No hay registros nuevos de psicólogos por verificar.</span>
                    </div>
                </td></tr>
            `;

            return;

        }

        tablaPendientes.innerHTML = pendientes.map((p) => `
            <tr>
                <td>
                    <div class="fila-persona">
                        <span class="avatar-mini">${HelpsyUI.iniciales(p.nombre)}</span>
                        ${p.nombre}
                    </div>
                </td>
                <td>${p.cedula}</td>
                <td>${p.titulo || "—"}</td>
                <td>${p.registroProfesional || "—"}</td>
                <td>${p.especialidad}</td>
                <td>${badgeVerificacion(p.estadoVerificacion)}</td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="btn btn-primario btn-sm" data-aprobar="${p.id}">Aprobar</button>
                        <button class="btn btn-fantasma btn-sm" data-rechazar="${p.id}">Rechazar</button>
                    </div>
                </td>
            </tr>
        `).join("");

    }

    tablaPendientes.addEventListener("click", (evento) => {

        const botonAprobar = evento.target.closest("[data-aprobar]");
        const botonRechazar = evento.target.closest("[data-rechazar]");

        if (botonAprobar) {

            const psicologos = HelpsyData.obtenerPsicologos();
            const indice = psicologos.findIndex((p) => p.id === botonAprobar.dataset.aprobar);
            if (indice === -1) return;

            psicologos[indice].estadoVerificacion = "Aprobado";
            delete psicologos[indice].motivoRechazo;

            HelpsyData.guardarPsicologos(psicologos);
            HelpsyData.registrarActividad("Verificación de especialistas", `${sesion.nombre} aprobó el registro profesional de ${psicologos[indice].nombre}.`);
            HelpsyUI.toast(`${psicologos[indice].nombre} fue verificado y ya aparece en las búsquedas de pacientes.`, "exito");

            pintarPendientes();

        }

        if (botonRechazar) {

            document.getElementById("rechazo-id").value = botonRechazar.dataset.rechazar;
            document.getElementById("rechazo-motivo").value = "";
            document.getElementById("error-rechazo-motivo").textContent = "";
            HelpsyUI.abrirModal("modal-rechazo");

        }

    });

    const formularioRechazo = document.getElementById("form-rechazo");

    document.getElementById("cerrar-modal-rechazo").addEventListener("click", () => HelpsyUI.cerrarModal("modal-rechazo"));
    document.getElementById("cancelar-modal-rechazo").addEventListener("click", () => HelpsyUI.cerrarModal("modal-rechazo"));

    formularioRechazo.addEventListener("submit", (evento) => {

        evento.preventDefault();

        const id = document.getElementById("rechazo-id").value;
        const motivo = document.getElementById("rechazo-motivo").value.trim();

        if (motivo.length < 10) {
            document.getElementById("error-rechazo-motivo").textContent = "Explica el motivo con al menos 10 caracteres: el especialista lo verá.";
            return;
        }

        const psicologos = HelpsyData.obtenerPsicologos();
        const indice = psicologos.findIndex((p) => p.id === id);
        if (indice === -1) return;

        psicologos[indice].estadoVerificacion = "Rechazado";
        psicologos[indice].motivoRechazo = motivo;

        HelpsyData.guardarPsicologos(psicologos);
        HelpsyData.registrarActividad("Verificación de especialistas", `${sesion.nombre} rechazó el registro profesional de ${psicologos[indice].nombre}.`);
        HelpsyUI.toast(`Se notificará a ${psicologos[indice].nombre} que su verificación fue rechazada.`, "exito");

        HelpsyUI.cerrarModal("modal-rechazo");
        pintarPendientes();

    });

    function pintarEstadisticas() {

        const usuarios = HelpsyData.obtenerUsuarios();

        const admins = usuarios.filter((u) => u.rol === "Administrador").length;
        const psicologos = usuarios.filter((u) => u.rol === "Psicólogo").length;
        const pacientes = usuarios.filter((u) => u.rol === "Paciente").length;

        document.getElementById("stat-grid-usuarios").innerHTML = `
            <div class="stat-card">
                <div class="stat-card-encabezado"><span class="stat-card-icono icono-azul-suave">${HelpsyUI.ICONOS.usuarios}</span>Total</div>
                <strong>${usuarios.length}</strong><small>Usuarios registrados aquí</small>
            </div>
            <div class="stat-card">
                <div class="stat-card-encabezado"><span class="stat-card-icono icono-morado-suave">${HelpsyUI.ICONOS.usuario}</span>Administradores</div>
                <strong>${admins}</strong><small>Con acceso total al sistema</small>
            </div>
            <div class="stat-card">
                <div class="stat-card-encabezado"><span class="stat-card-icono icono-verde-suave">${HelpsyUI.ICONOS.seguimiento}</span>Psicólogos</div>
                <strong>${psicologos}</strong><small>Atendiendo pacientes</small>
            </div>
            <div class="stat-card">
                <div class="stat-card-encabezado"><span class="stat-card-icono icono-naranja-suave">${HelpsyUI.ICONOS.reportes}</span>Pacientes</div>
                <strong>${pacientes}</strong><small>Con cuenta creada</small>
            </div>
        `;

    }

    function pintarTabla() {

        const usuarios = HelpsyData.obtenerUsuarios();
        const rol = filtroRol.value;
        const texto = buscador.value.trim().toLowerCase();

        const filtrados = usuarios.filter((u) => {

            if (rol !== "Todos" && u.rol !== rol) return false;

            if (texto) {
                const enTexto = `${u.nombre} ${u.cedula} ${u.email}`.toLowerCase();
                if (!enTexto.includes(texto)) return false;
            }

            return true;

        });

        contador.textContent = `${filtrados.length} de ${usuarios.length} usuarios`;

        if (filtrados.length === 0) {

            tabla.innerHTML = `
                <tr><td colspan="6">
                    <div class="estado-vacio">
                        ${HelpsyUI.ICONOS.vacio}
                        <strong>No hay usuarios que coincidan</strong>
                        <span>Ajusta el filtro de rol o el término de búsqueda.</span>
                    </div>
                </td></tr>
            `;

            return;

        }

        tabla.innerHTML = filtrados.map((u) => `
            <tr>
                <td>
                    <div class="fila-persona">
                        <span class="avatar-mini">${HelpsyUI.iniciales(u.nombre)}</span>
                        ${u.nombre}
                    </div>
                </td>
                <td>${u.cedula}</td>
                <td>${u.email}</td>
                <td>${badgeRol(u.rol)}</td>
                <td><span class="badge ${u.estado === "Activo" ? "badge-verde" : "badge-gris"}">${u.estado}</span></td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="btn-icono" data-editar="${u.id}" aria-label="Editar ${u.nombre}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
                        </button>
                        <button class="btn-icono" data-borrar="${u.id}" aria-label="Eliminar ${u.nombre}">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `).join("");

    }

    function refrescarTodo() {
        pintarEstadisticas();
        pintarTabla();
        pintarPendientes();
    }

    filtroRol.addEventListener("change", pintarTabla);
    buscador.addEventListener("input", pintarTabla);

    /* -------------------- Modal: nuevo / editar -------------------- */

    function abrirModalNuevo() {

        formulario.reset();
        document.getElementById("usuario-id").value = "";
        modalTitulo.textContent = "Nuevo usuario";
        document.getElementById("usuario-password").required = true;
        document.getElementById("nota-usuario-password").textContent = "";
        document.querySelectorAll("#form-usuario .campo-error").forEach((e) => e.textContent = "");
        HelpsyUI.abrirModal("modal-usuario");

    }

    function abrirModalEditar(id) {

        const usuario = HelpsyData.obtenerUsuarios().find((u) => u.id === id);
        if (!usuario) return;

        modalTitulo.textContent = "Editar usuario";
        document.getElementById("usuario-id").value = usuario.id;
        document.getElementById("usuario-nombre").value = usuario.nombre;
        document.getElementById("usuario-cedula").value = usuario.cedula;
        document.getElementById("usuario-email").value = usuario.email;
        document.getElementById("usuario-rol").value = usuario.rol;
        document.getElementById("usuario-estado").value = usuario.estado;
        document.getElementById("usuario-password").value = "";
        document.getElementById("usuario-password").required = false;
        document.getElementById("nota-usuario-password").textContent = "Déjalo en blanco para no cambiar la contraseña actual.";

        document.querySelectorAll("#form-usuario .campo-error").forEach((e) => e.textContent = "");
        HelpsyUI.abrirModal("modal-usuario");

    }

    document.getElementById("btn-nuevo-usuario").addEventListener("click", abrirModalNuevo);
    document.getElementById("cerrar-modal-usuario").addEventListener("click", () => HelpsyUI.cerrarModal("modal-usuario"));
    document.getElementById("cancelar-modal-usuario").addEventListener("click", () => HelpsyUI.cerrarModal("modal-usuario"));

    tabla.addEventListener("click", (evento) => {

        const botonEditar = evento.target.closest("[data-editar]");
        const botonBorrar = evento.target.closest("[data-borrar]");

        if (botonEditar) {
            abrirModalEditar(botonEditar.dataset.editar);
        }

        if (botonBorrar) {

            const usuarios = HelpsyData.obtenerUsuarios();
            const usuario = usuarios.find((u) => u.id === botonBorrar.dataset.borrar);

            if (usuario && confirm(`¿Eliminar a ${usuario.nombre}? Esta acción no se puede deshacer.`)) {

                HelpsyData.guardarUsuarios(usuarios.filter((u) => u.id !== usuario.id));
                HelpsyData.registrarActividad("Usuarios", `${sesion.nombre} eliminó al usuario ${usuario.nombre}.`);
                HelpsyUI.toast(`${usuario.nombre} fue eliminado.`, "exito");
                refrescarTodo();

            }

        }

    });

    formulario.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        document.querySelectorAll("#form-usuario .campo-error").forEach((e) => e.textContent = "");

        const id = document.getElementById("usuario-id").value;
        const nombre = document.getElementById("usuario-nombre").value.trim();
        const cedula = document.getElementById("usuario-cedula").value.trim();
        const email = document.getElementById("usuario-email").value.trim();
        const password = document.getElementById("usuario-password").value;
        const rol = document.getElementById("usuario-rol").value;
        const estado = document.getElementById("usuario-estado").value;

        let valido = true;

        if (nombre.length < 3) {
            document.getElementById("error-usuario-nombre").textContent = "Escribe el nombre completo.";
            valido = false;
        }

        if (!/^\d{6,10}$/.test(cedula)) {
            document.getElementById("error-usuario-cedula").textContent = "Cédula inválida.";
            valido = false;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            document.getElementById("error-usuario-email").textContent = "Correo inválido.";
            valido = false;
        }

        // Contraseña: obligatoria al crear, opcional al editar
        // (en blanco = no se toca la que ya tenía).
        const esNuevo = !id;

        if ((esNuevo || password) && password.length > 0 && password.length < 6) {
            document.getElementById("error-usuario-password").textContent = "Mínimo 6 caracteres.";
            valido = false;
        }

        if (esNuevo && password.length === 0) {
            document.getElementById("error-usuario-password").textContent = "La contraseña es obligatoria para una cuenta nueva.";
            valido = false;
        }

        const usuarios = HelpsyData.obtenerUsuarios();

        const cedulaDuplicada = usuarios.some((u) => u.cedula === cedula && u.id !== id);

        if (valido && cedulaDuplicada) {
            document.getElementById("error-usuario-cedula").textContent = "Ya existe otro usuario con esta cédula.";
            valido = false;
        }

        if (!valido) return;

        if (id) {

            const indice = usuarios.findIndex((u) => u.id === id);
            const passwordHash = password
                ? await HelpsyUI.hashPassword(password)
                : usuarios[indice].passwordHash;

            usuarios[indice] = { ...usuarios[indice], nombre, cedula, email, rol, estado, passwordHash };
            HelpsyData.registrarActividad("Usuarios", `${sesion.nombre} editó al usuario ${nombre}.`);
            HelpsyUI.toast("Usuario actualizado.", "exito");

        } else {

            const passwordHash = await HelpsyUI.hashPassword(password);
            usuarios.push({ id: `u${Date.now()}`, nombre, cedula, email, passwordHash, rol, estado });
            HelpsyData.registrarActividad("Usuarios", `${sesion.nombre} creó al usuario ${nombre} (${rol}).`);
            HelpsyUI.toast("Usuario creado.", "exito");

        }

        HelpsyData.guardarUsuarios(usuarios);
        HelpsyUI.cerrarModal("modal-usuario");
        refrescarTodo();

    });

    refrescarTodo();

});
