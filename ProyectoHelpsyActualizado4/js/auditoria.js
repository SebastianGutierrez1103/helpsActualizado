document.addEventListener("DOMContentLoaded", () => {

    const sesion = HelpsyUI.montarShell("auditoria", "Auditoría");
    if (!sesion) return;
    if (!HelpsyUI.exigirRol("Administrador")) return;

    const tabla = document.getElementById("tabla-auditoria");
    const contador = document.getElementById("contador-auditoria");
    const filtroTitular = document.getElementById("filtro-titular-auditoria");
    const buscador = document.getElementById("buscar-auditoria");

    function pintarEstadisticas() {

        const registros = HelpsyData.obtenerAuditoria();
        const titulares = new Set(registros.map((r) => r.titularCedula)).size;
        const usuarios = new Set(registros.map((r) => r.usuario)).size;

        document.getElementById("stat-grid-auditoria").innerHTML = `
            <div class="stat-card">
                <div class="stat-card-encabezado"><span class="stat-card-icono icono-azul-suave">${HelpsyUI.ICONOS.reportes}</span>Total de accesos</div>
                <strong>${registros.length}</strong><small>Registrados desde que existe este avance</small>
            </div>
            <div class="stat-card">
                <div class="stat-card-encabezado"><span class="stat-card-icono icono-morado-suave">${HelpsyUI.ICONOS.usuario}</span>Titulares distintos</div>
                <strong>${titulares}</strong><small>Personas cuyos datos fueron consultados</small>
            </div>
            <div class="stat-card">
                <div class="stat-card-encabezado"><span class="stat-card-icono icono-verde-suave">${HelpsyUI.ICONOS.usuarios}</span>Personas que accedieron</div>
                <strong>${usuarios}</strong><small>Entre especialistas, tutores y pacientes</small>
            </div>
        `;

    }

    function pintarTabla() {

        const titular = filtroTitular.value.trim().toLowerCase();
        const texto = buscador.value.trim().toLowerCase();

        const registros = HelpsyData.obtenerAuditoria().filter((r) => {

            if (titular && !String(r.titularCedula || "").toLowerCase().includes(titular)) return false;

            if (texto) {
                const enTexto = `${r.usuario} ${r.recurso}`.toLowerCase();
                if (!enTexto.includes(texto)) return false;
            }

            return true;

        });

        contador.textContent = `${registros.length} registros`;

        if (registros.length === 0) {

            tabla.innerHTML = `
                <tr><td colspan="5">
                    <div class="estado-vacio">
                        ${HelpsyUI.ICONOS.vacio}
                        <strong>No hay accesos que coincidan</strong>
                        <span>Ajusta los filtros, o todavía no se ha accedido a datos sensibles.</span>
                    </div>
                </td></tr>
            `;

            return;

        }

        tabla.innerHTML = registros.slice(0, 300).map((r) => `
            <tr>
                <td>${new Date(r.fecha).toLocaleString("es-CO")}</td>
                <td>${r.usuario}</td>
                <td><span class="badge badge-gris">${r.rol}</span></td>
                <td>${r.recurso}</td>
                <td>${r.titularCedula || "—"}</td>
            </tr>
        `).join("");

    }

    filtroTitular.addEventListener("input", pintarTabla);
    buscador.addEventListener("input", pintarTabla);

    pintarEstadisticas();
    pintarTabla();

});
