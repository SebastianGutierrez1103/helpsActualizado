document.addEventListener("DOMContentLoaded", () => {

    const formulario = document.getElementById("form-registro");
    const selectTipo = document.getElementById("tipoUsuario");
    const camposPsicologo = document.getElementById("campos-psicologo");
    const notaTutor = document.getElementById("nota-tutor");
    const selectEspecialidad = document.getElementById("especialidad");
    const inputArchivo = document.getElementById("archivoCedula");
    const zonaArchivo = document.getElementById("zona-archivo");
    const textoArchivo = document.getElementById("texto-archivo");

    selectEspecialidad.innerHTML = HelpsyData.ESPECIALIDADES.map((especialidad) =>
        `<option value="${especialidad}">${especialidad}</option>`
    ).join("");

    function actualizarCamposSegunTipo() {
        camposPsicologo.classList.toggle("oculto", selectTipo.value !== "Psicólogo");
        notaTutor.classList.toggle("oculto", selectTipo.value !== "Tutor");
    }

    function edadEnAnios(fechaISO) {
        const nacimiento = new Date(`${fechaISO}T00:00:00`);
        const hoy = new Date();
        let edad = hoy.getFullYear() - nacimiento.getFullYear();

        if (hoy.getMonth() < nacimiento.getMonth() ||
            (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())) {
            edad -= 1;
        }

        return edad;
    }

    selectTipo.addEventListener("change", actualizarCamposSegunTipo);
    actualizarCamposSegunTipo();

    inputArchivo.addEventListener("change", () => {
        const archivo = inputArchivo.files[0];
        if (!archivo) return;

        if (archivo.type !== "application/pdf") {
            alert("El archivo debe ser un PDF.");
            inputArchivo.value = "";
            return;
        }

        zonaArchivo.classList.add("tiene-archivo");
        textoArchivo.textContent = `Documento PDF seleccionado: ${archivo.name}`;
    });

    formulario.addEventListener("submit", async (evento) => {

        evento.preventDefault();
        document.querySelectorAll(".campo-error").forEach((elemento) => elemento.textContent = "");

        const nombre = document.getElementById("nombre").value.trim();
        const cedula = document.getElementById("cedula").value.trim();
        const email = document.getElementById("email").value.trim().toLowerCase();
        const fechaNacimiento = document.getElementById("fecha-nacimiento").value;
        const password = document.getElementById("password").value;
        const password2 = document.getElementById("password2").value;
        const tipoUsuario = selectTipo.value;
        const autorizacion = document.getElementById("autorizacion-datos").checked;
        const tituloProfesional = document.getElementById("titulo-profesional").value.trim();
        const registroProfesional = document.getElementById("registro-profesional").value.trim();
        const categorias = Array.from(selectEspecialidad.selectedOptions, (opcion) => opcion.value);
        const errores = {
            nombre: document.getElementById("error-nombre"),
            cedula: document.getElementById("error-cedula"),
            email: document.getElementById("error-email"),
            fecha: document.getElementById("error-fecha-nacimiento"),
            password: document.getElementById("error-password"),
            password2: document.getElementById("error-password2"),
            titulo: document.getElementById("error-titulo-profesional"),
            registro: document.getElementById("error-registro-profesional"),
            autorizacion: document.getElementById("error-autorizacion")
        };
        let valido = true;

        if (!["Paciente", "Tutor", "Psicólogo"].includes(tipoUsuario)) {
            HelpsyUI.toast("Ese tipo de cuenta no se puede registrar desde este formulario.", "error");
            return;
        }

        if (nombre.length < 3) {
            errores.nombre.textContent = "Escribe tu nombre completo.";
            valido = false;
        }

        if (!/^\d{6,10}$/.test(cedula)) {
            errores.cedula.textContent = "Cédula inválida (6 a 10 dígitos).";
            valido = false;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            errores.email.textContent = "Correo inválido.";
            valido = false;
        }

        if (!fechaNacimiento || Number.isNaN(new Date(`${fechaNacimiento}T00:00:00`).getTime())) {
            errores.fecha.textContent = "Selecciona una fecha de nacimiento válida.";
            valido = false;
        } else if (new Date(`${fechaNacimiento}T00:00:00`) > new Date()) {
            errores.fecha.textContent = "La fecha de nacimiento no puede estar en el futuro.";
            valido = false;
        } else if (edadEnAnios(fechaNacimiento) < 18) {
            errores.fecha.textContent = "El registro es para personas adultas (18 años o más). Para un menor, debe registrarlo un tutor.";
            valido = false;
        }

        if (password.length < 8) {
            errores.password.textContent = "La contraseña debe tener al menos 8 caracteres.";
            valido = false;
        }

        if (password !== password2) {
            errores.password2.textContent = "Las contraseñas no coinciden.";
            valido = false;
        }

        if (!autorizacion) {
            errores.autorizacion.textContent = "Debes autorizar el tratamiento de tus datos para continuar.";
            valido = false;
        }

        if (tipoUsuario === "Psicólogo") {
            if (tituloProfesional.length < 5) {
                errores.titulo.textContent = "Escribe tu título profesional completo.";
                valido = false;
            }
            if (registroProfesional.length < 4) {
                errores.registro.textContent = "Escribe tu número de registro/tarjeta profesional.";
                valido = false;
            }
            if (categorias.length === 0) {
                HelpsyUI.toast("Selecciona al menos una categoría profesional.", "error");
                valido = false;
            }
        }

        const usuarios = HelpsyData.obtenerUsuarios();
        const psicologos = HelpsyData.obtenerPsicologos();
        const cedulaDuplicada = [...usuarios, ...psicologos].some((cuenta) => cuenta.cedula === cedula);
        const correoDuplicado = [...usuarios, ...psicologos].some((cuenta) =>
            cuenta.email && cuenta.email.toLowerCase() === email
        );

        if (valido && cedulaDuplicada) {
            errores.cedula.textContent = "Ya existe una cuenta con esta cédula.";
            valido = false;
        }
        if (valido && correoDuplicado) {
            errores.email.textContent = "Ya existe una cuenta con este correo.";
            valido = false;
        }
        if (!valido) return;

        const passwordHash = await HelpsyUI.hashPassword(password);
        const consentimiento = HelpsyData.registrarConsentimiento(cedula, cedula, nombre);

        if (tipoUsuario === "Psicólogo") {

            psicologos.push({
                id: `p-${Date.now()}`,
                nombre,
                cedula,
                email,
                correoVerificado: false,
                fechaNacimiento,
                passwordHash,
                titulo: tituloProfesional,
                registroProfesional,
                estadoVerificacion: "Pendiente",
                especialidad: categorias[0],
                categorias,
                experiencia: 1,
                tarifa: 70000,
                calificacion: 5.0,
                bio: "",
                estado: "Activo",
                consentimiento,
                historialConsentimientos: [consentimiento]
            });

            if (!HelpsyData.guardarPsicologos(psicologos)) {
                HelpsyUI.toast("No se pudo guardar el registro profesional.", "error");
                return;
            }

            HelpsyData.registrarActividad("Registro", `Nuevo especialista registrado: ${nombre}, pendiente de verificación.`);

        } else {

            usuarios.push({
                id: `u${Date.now()}`,
                nombre,
                cedula,
                email,
                correoVerificado: false,
                fechaNacimiento,
                passwordHash,
                rol: tipoUsuario,
                estado: "Activo",
                consentimiento,
                historialConsentimientos: [consentimiento]
            });

            if (!HelpsyData.guardarUsuarios(usuarios)) {
                HelpsyUI.toast("No se pudo guardar el registro.", "error");
                return;
            }

            HelpsyData.registrarActividad("Registro", `Nueva cuenta creada: ${nombre} (${tipoUsuario}).`);

        }

        const tipoCuenta = tipoUsuario === "Psicólogo" ? "psicologo" : "usuario";
        const token = HelpsyData.crearTokenCuenta("verificar-correo", tipoCuenta, cedula);

        if (!token) {
            HelpsyUI.toast("La cuenta quedó creada, pero no se pudo generar el enlace. Contacta al administrador de la demo.", "error");
            return;
        }

        const enlace = new URL("login.html", window.location.href);
        enlace.searchParams.set("verificar", token);
        document.getElementById("link-verificacion").href = enlace.href;
        document.getElementById("registro-verificacion").classList.remove("oculto");
        formulario.classList.add("oculto");
        document.getElementById("registro-verificacion").scrollIntoView({ behavior: "smooth", block: "center" });

    });

});
