document.addEventListener("DOMContentLoaded", () => {

    const parametros = new URLSearchParams(window.location.search);
    const sesionActiva = HelpsyData.obtenerSesion();

    if (sesionActiva && (parametros.has("verificar") || parametros.has("restablecer"))) {
        HelpsyData.cerrarSesion();
    } else if (sesionActiva) {
        window.location.href = "post-login.html";
        return;
    }

    const formulario = document.getElementById("form-login");
    const formularioRecuperar = document.getElementById("form-recuperar-paso1");
    const formularioRestablecer = document.getElementById("form-recuperar-paso2");
    function obtenerColeccion(tipo) {
        return tipo === "psicologo" ? HelpsyData.obtenerPsicologos() : HelpsyData.obtenerUsuarios();
    }

    function actualizarCuentaDesdeEnlace(registro, cambios) {
        const lista = obtenerColeccion(registro.tipo);
        const cuenta = lista.find((item) => item.cedula === registro.cedula);
        return cuenta && HelpsyData.actualizarCuenta(registro.tipo, registro.cedula, cambios);
    }

    const tokenVerificacion = parametros.get("verificar");

    if (tokenVerificacion) {
        const registro = HelpsyData.obtenerTokenCuenta(tokenVerificacion, "verificar-correo");
        const actualizado = registro && actualizarCuentaDesdeEnlace(registro, { correoVerificado: true });

        if (actualizado && HelpsyData.consumirTokenCuenta(tokenVerificacion)) {
            HelpsyUI.toast("Correo verificado. Ya puedes iniciar sesión.", "exito");
        } else {
            HelpsyUI.toast("El enlace de verificación no es válido o ya venció.", "error");
        }

        parametros.delete("verificar");
        const queryRestante = parametros.toString();
        window.history.replaceState({}, "", `${window.location.pathname}${queryRestante ? `?${queryRestante}` : ""}`);
    }

    document.getElementById("link-olvido").addEventListener("click", (evento) => {
        evento.preventDefault();
        formularioRecuperar.reset();
        formularioRecuperar.classList.remove("oculto");
        formularioRestablecer.classList.add("oculto");
        document.getElementById("recuperar-enlace").classList.add("oculto");
        document.getElementById("recuperar-titulo").textContent = "Recuperar contraseña";
        document.getElementById("recuperar-subtitulo").textContent = "Ingresa tu correo para generar un enlace temporal.";
        HelpsyUI.abrirModal("modal-recuperar");
    });

    document.getElementById("cerrar-modal-recuperar").addEventListener("click", () => {
        HelpsyUI.cerrarModal("modal-recuperar");
    });

    let registroRestablecimiento = null;
    let tokenRestablecimiento = parametros.get("restablecer");

    if (tokenRestablecimiento) {
        registroRestablecimiento = HelpsyData.obtenerTokenCuenta(tokenRestablecimiento, "restablecer-password");
        if (registroRestablecimiento) {
            formularioRecuperar.classList.add("oculto");
            formularioRestablecer.classList.remove("oculto");
            document.getElementById("recuperar-titulo").textContent = "Crear nueva contraseña";
            document.getElementById("recuperar-subtitulo").textContent = "Este enlace de prueba es temporal y de un solo uso.";
            HelpsyUI.abrirModal("modal-recuperar");
        } else {
            tokenRestablecimiento = null;
            HelpsyUI.toast("El enlace de recuperación no es válido o ya venció.", "error");
        }
    }

    formularioRecuperar.addEventListener("submit", (evento) => {

        evento.preventDefault();

        const email = document.getElementById("recuperar-email").value.trim().toLowerCase();
        const resultado = HelpsyData.buscarCuentaPorEmail(email);

        if (!resultado) {
            HelpsyUI.toast("No encontramos una cuenta con ese correo.", "error");
            return;
        }

        const token = HelpsyData.crearTokenCuenta("restablecer-password", resultado.tipo, resultado.cuenta.cedula);

        if (!token) {
            HelpsyUI.toast("No fue posible generar el enlace. Inténtalo de nuevo.", "error");
            return;
        }

        const enlace = new URL("login.html", window.location.href);
        enlace.searchParams.set("restablecer", token);
        const link = document.getElementById("link-restablecer");
        link.href = enlace.href;
        document.getElementById("recuperar-enlace").classList.remove("oculto");
        document.getElementById("recuperar-subtitulo").textContent =
            "Enlace de prueba listo. En producción se enviaría al correo asociado.";

    });

    formularioRestablecer.addEventListener("submit", async (evento) => {

        evento.preventDefault();

        const error = document.getElementById("error-recuperar-password");
        error.textContent = "";

        const nueva = document.getElementById("recuperar-password-nueva").value;
        const confirmar = document.getElementById("recuperar-password-confirmar").value;
        const registroVigente = tokenRestablecimiento &&
            HelpsyData.obtenerTokenCuenta(tokenRestablecimiento, "restablecer-password");

        if (!registroVigente || !registroRestablecimiento ||
            registroVigente.cedula !== registroRestablecimiento.cedula) {
            error.textContent = "El enlace venció o ya fue utilizado. Solicita otro.";
            return;
        }

        if (nueva.length < 8) {
            error.textContent = "La contraseña debe tener al menos 8 caracteres.";
            return;
        }

        if (nueva !== confirmar) {
            error.textContent = "Las contraseñas no coinciden.";
            return;
        }

        const actualizado = actualizarCuentaDesdeEnlace(
            registroVigente,
            { passwordHash: await HelpsyUI.hashPassword(nueva) }
        );

        if (!actualizado || !HelpsyData.consumirTokenCuenta(tokenRestablecimiento)) {
            error.textContent = "No se pudo actualizar la contraseña. Inténtalo de nuevo.";
            return;
        }

        HelpsyUI.cerrarModal("modal-recuperar");
        window.history.replaceState({}, "", window.location.pathname);
        HelpsyUI.toast("Contraseña actualizada. Ya puedes iniciar sesión.", "exito");

    });

    formulario.addEventListener("submit", async (evento) => {

        evento.preventDefault();
        document.querySelectorAll(".campo-error").forEach((elemento) => elemento.textContent = "");
        document.getElementById("aviso-verificacion-login").classList.add("oculto");

        const email = document.getElementById("email").value.trim().toLowerCase();
        const password = document.getElementById("password").value;

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            document.getElementById("error-email").textContent = "Ingresa un correo válido.";
            return;
        }

        if (password.length < 8) {
            document.getElementById("error-password").textContent = "La contraseña debe tener al menos 8 caracteres.";
            return;
        }

        const resultado = HelpsyData.buscarCuentaPorEmail(email);

        if (!resultado) {
            const bloqueoDesconocido = HelpsyData.estaBloqueado(email, "Cuenta");
            if (bloqueoDesconocido.bloqueado) {
                document.getElementById("error-email").textContent =
                    `Demasiados intentos fallidos. Intenta de nuevo en ${bloqueoDesconocido.minutosRestantes} minutos.`;
                return;
            }

            const intento = HelpsyData.registrarIntentoFallido(email, "Cuenta");
            document.getElementById("error-email").textContent = intento.quedoBloqueada
                ? `Demasiados intentos. Intenta de nuevo en ${intento.minutosBloqueo} minutos.`
                : "No encontramos una cuenta con ese correo.";
            return;
        }

        const { cuenta, tipo } = resultado;
        const rolCuenta = tipo === "psicologo" ? "Psicólogo" : cuenta.rol;
        const estadoBloqueo = HelpsyData.estaBloqueado(cuenta.cedula, rolCuenta);

        if (estadoBloqueo.bloqueado) {
            document.getElementById("error-email").textContent =
                `Demasiados intentos fallidos. Intenta de nuevo en ${estadoBloqueo.minutosRestantes} minutos.`;
            return;
        }

        const hashIngresado = await HelpsyUI.hashPassword(password);

        if (cuenta.passwordHash !== hashIngresado) {
            const intento = HelpsyData.registrarIntentoFallido(cuenta.cedula, rolCuenta);
            document.getElementById("error-password").textContent = intento.quedoBloqueada
                ? `Demasiados intentos fallidos. Cuenta bloqueada por ${intento.minutosBloqueo} minutos.`
                : "Correo o contraseña incorrectos.";
            return;
        }

        HelpsyData.limpiarIntentosLogin(cuenta.cedula, rolCuenta);

        if (cuenta.correoVerificado === false) {
            document.getElementById("error-email").textContent = "Verifica tu correo desde el enlace de prueba antes de ingresar.";
            const token = HelpsyData.crearTokenCuenta("verificar-correo", tipo, cuenta.cedula);

            if (token) {
                const enlace = new URL("login.html", window.location.href);
                enlace.searchParams.set("verificar", token);
                document.getElementById("link-verificacion-login").href = enlace.href;
                document.getElementById("aviso-verificacion-login").classList.remove("oculto");
            } else {
                HelpsyUI.toast("No se pudo generar el enlace de verificación.", "error");
            }

            return;
        }

        if (cuenta.estado === "Inactivo") {
            document.getElementById("error-email").textContent = "Esta cuenta está inactiva.";
            return;
        }

        if (tipo === "psicologo" && cuenta.estadoVerificacion === "Pendiente") {
            document.getElementById("error-email").textContent =
                "Tu cuenta sigue pendiente de verificación profesional por un administrador.";
            return;
        }

        if (tipo === "psicologo" && cuenta.estadoVerificacion === "Rechazado") {
            document.getElementById("error-email").textContent =
                `Tu verificación profesional fue rechazada${cuenta.motivoRechazo ? ": " + cuenta.motivoRechazo : "."} Contacta al administrador.`;
            return;
        }

        if (!HelpsyData.guardarSesion({
            cedula: cuenta.cedula,
            nombre: cuenta.nombre,
            rol: rolCuenta,
            especialidad: cuenta.especialidad || null
        })) {
            document.getElementById("error-email").textContent = "No se pudo iniciar la sesión en este navegador.";
            return;
        }

        HelpsyData.registrarActividad("Inicio de sesión", `${cuenta.nombre} (${rolCuenta}) inició sesión.`);
        window.location.href = "post-login.html";

    });

    const credenciales = [
        { nombre: "Laura Gómez", rol: "Administrador", email: "laura.gomez@helpsy.co", password: "Laura#2026" },
        { nombre: "Julián Torres", rol: "Paciente", email: "julian.torres@correo.com", password: "Julian#2026" },
        { nombre: "Carlos Peña", rol: "Psicólogo", email: "carlos.pena@helpsy.co", password: "Carlos#2026" },
        { nombre: "Marta Ruiz", rol: "Psicólogo", email: "marta.ruiz@helpsy.co", password: "Marta#2026" }
    ];

    document.getElementById("lista-credenciales-demo").innerHTML = credenciales.map((cuenta) => `
        <tr><td>${cuenta.nombre}</td><td>${cuenta.rol}</td><td>${cuenta.email}</td><td><code>${cuenta.password}</code></td></tr>
    `).join("");

});
