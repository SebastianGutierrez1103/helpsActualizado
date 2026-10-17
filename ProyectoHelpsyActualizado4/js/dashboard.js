document.addEventListener("DOMContentLoaded", () => {

    const sesion = HelpsyUI.montarShell("dashboard", "Panel de administración");
    if (!sesion) return;
    if (!HelpsyUI.exigirRol("Administrador")) return;

    const usuarios = HelpsyData.obtenerUsuarios();
    const pacientes = HelpsyData.generarPacientes();

    const totalUsuarios = 1500; // cifra de referencia del mockup original
    const pacientesActivos = pacientes.filter((p) => p.estado !== "Completado").length + 838;
    const pacientesInactivos = 310;
    const porcentajeActivos = Math.round((pacientesActivos / totalUsuarios) * 100);

    /* -------------------- Tarjetas de resumen -------------------- */

    document.getElementById("stat-grid").innerHTML = `
        <div class="stat-card">
            <div class="stat-card-encabezado">
                <span class="stat-card-icono icono-azul-suave">${HelpsyUI.ICONOS.usuarios}</span>
                Total usuarios
            </div>
            <strong>${totalUsuarios.toLocaleString("es-CO")}</strong>
            <small>Registrados en Helpsy (${usuarios.length} de este navegador)</small>
        </div>

        <div class="stat-card">
            <div class="stat-card-encabezado">
                <span class="stat-card-icono icono-verde-suave">${HelpsyUI.ICONOS.seguimiento}</span>
                Pacientes activos
            </div>
            <strong>${pacientesActivos.toLocaleString("es-CO")}</strong>
            <small>Con al menos una sesión en curso</small>
        </div>

        <div class="stat-card">
            <div class="stat-card-encabezado">
                <span class="stat-card-icono icono-naranja-suave">${HelpsyUI.ICONOS.reportes}</span>
                Pacientes inactivos
            </div>
            <strong>${pacientesInactivos}</strong>
            <small>Sin sesiones en los últimos 60 días</small>
        </div>

        <div class="stat-card">
            <div class="stat-card-encabezado">
                <span class="stat-card-icono icono-morado-suave">${HelpsyUI.ICONOS.indicadores}</span>
                % de pacientes activos
            </div>
            <strong>${porcentajeActivos}%</strong>
            <small>Sobre el total de usuarios registrados</small>
        </div>
    `;

    /* -------------------- Indicadores de desempeño -------------------- */
    // (en el mockup original "Tiempo de Respuesta" aparecía dos veces;
    // aquí van tres métricas distintas y con sentido)

    const desempeno = [
        { etiqueta: "Nivel de satisfacción", valor: 88 },
        { etiqueta: "Tiempo de respuesta promedio", valor: 74 },
        { etiqueta: "Tasa de retención de pacientes", valor: 66 }
    ];

    document.getElementById("desempeno").innerHTML = desempeno.map((item) => `
        <div class="progreso-fila">
            <div class="progreso-etiqueta">
                <span>${item.etiqueta}</span>
                <strong>${item.valor}%</strong>
            </div>
            <div class="progreso-pista">
                <div class="progreso-relleno" style="width: ${item.valor}%;"></div>
            </div>
        </div>
    `).join("");

    /* -------------------- Carga de datos reciente -------------------- */

    const cargas = HelpsyData.obtenerCargas();

    document.getElementById("cargas-recientes").innerHTML = cargas.length === 0
        ? `
            <div class="estado-vacio">
                ${HelpsyUI.ICONOS.vacio}
                <strong>Todavía no has cargado archivos</strong>
                <span>Cuando subas un archivo en "Carga de datos", aparecerá aquí.</span>
            </div>
        `
        : `<div class="lista-simple">${cargas.slice(0, 4).map((carga) => `
            <div class="lista-item">
                <div class="lista-item-icono">${HelpsyUI.ICONOS.carga}</div>
                <div class="lista-item-texto">
                    <strong>${carga.nombreArchivo}</strong>
                    <span>${carga.registros} registros · ${carga.fecha}</span>
                </div>
                <span class="badge badge-verde">Cargado</span>
            </div>
        `).join("")}</div>`;

    /* -------------------- Seguimiento de casos -------------------- */

    const completados = pacientes.filter((p) => p.estado === "Completado").length;
    const enProgreso = pacientes.filter((p) => p.estado === "En progreso").length;
    const recientes = pacientes.filter((p) => p.estado === "Reciente").length;

    document.getElementById("casos-grid").innerHTML = `
        <div class="stat-card">
            <div class="stat-card-encabezado">
                <span class="stat-card-icono icono-verde-suave">${HelpsyUI.ICONOS.exito}</span>
                Casos completados
            </div>
            <strong>${completados}</strong>
            <small>Cerrados con seguimiento al 95% o más</small>
        </div>
        <div class="stat-card">
            <div class="stat-card-encabezado">
                <span class="stat-card-icono icono-azul-suave">${HelpsyUI.ICONOS.seguimiento}</span>
                En progreso
            </div>
            <strong>${enProgreso}</strong>
            <small>Con tratamiento activo</small>
        </div>
        <div class="stat-card">
            <div class="stat-card-encabezado">
                <span class="stat-card-icono icono-naranja-suave">${HelpsyUI.ICONOS.info}</span>
                Casos recientes
            </div>
            <strong>${recientes}</strong>
            <small>Iniciados hace menos de 2 semanas</small>
        </div>
    `;

});
