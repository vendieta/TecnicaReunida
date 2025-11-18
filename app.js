import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// ==================== CREACIÓN DEL CLIENTE SUPABASE ====================
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== CONTROL AUTOMÁTICO DE SESIÓN ====================
supabaseClient.auth.onAuthStateChange(async (event, session) => {
  console.log("Cambio de estado de autenticación:", event);

  switch (event) {
    case "SIGNED_IN":
    case "TOKEN_REFRESHED":
    case "USER_UPDATED":
      localStorage.setItem("sessionUser", JSON.stringify(session));
      break;
    case "SIGNED_OUT":
      localStorage.removeItem("sessionUser");
      appView.classList.add("hidden");
      loginView.classList.remove("hidden");
      break;
  }
});

// ==================== FUNCIÓN DE LOGIN ====================
async function login(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email,
    password
  });
  console.log("Resultado login:", data, error);
  return { data, error };
}

// ==================== ELEMENTOS DEL DOM ====================
const loginView = document.getElementById("loginView");
const appView   = document.getElementById("app");
const loginForm = document.getElementById("loginForm");
const loginErr  = document.getElementById("loginError");
const userName  = document.getElementById("userName");
const btnLogout = document.getElementById("btnLogout");

// ==================== FUNCIÓN ENTRAR APP ====================
function enterApp(username) {
  userName.textContent = username;
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
}

// ==================== VERIFICAR SESIÓN ACTIVA ====================
async function checkSession() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    console.error("Error al verificar sesión:", error);
    localStorage.removeItem("sessionUser");
    return;
  }

  if (data.session) {
    console.log("✅ Sesión válida:", data.session);
    enterApp(data.session.user.email);
  } else {
    console.log("❌ No hay sesión activa");
    localStorage.removeItem("sessionUser");
  }
}
checkSession();

// ==================== LOGIN FORM ====================
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const u = document.getElementById("loginUser").value.trim();
    const p = document.getElementById("loginPass").value.trim();

    const { data, error } = await login(u, p);
    console.log("Intento login:", u, p);
    if (!error && data.session) {
      localStorage.setItem("sessionUser", JSON.stringify(data.session));
      loginErr.hidden = true;
      enterApp(u);
      loginForm.reset();
    } else {
      loginErr.hidden = false;
    }
  });
}

// ==================== LOGOUT SEGURO ====================
if (btnLogout) {
  btnLogout.addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    localStorage.removeItem("sessionUser");
    appView.classList.add("hidden");
    loginView.classList.remove("hidden");
  });
}

// ==================== AUTO REFRESCO DEL TOKEN ====================
async function refreshTokenPeriodicamente() {
  const { data, error } = await supabaseClient.auth.refreshSession();
  if (error) console.error("Error al refrescar token:", error);
  else console.log("🔁 Token renovado automáticamente");
}
// Refresca cada 30 min
setInterval(refreshTokenPeriodicamente, 30 * 60 * 1000);

// ==================== APP ORIGINAL ====================
const fechaInput = document.getElementById("fecha");
const trabajoSelect = document.getElementById("trabajo");
const listaPersonal = document.getElementById("listaPersonal");
const tablaBody = document.querySelector("#tablaOrdenes tbody");

// Cargar supervisores
async function cargarSupervisores() {
  const supervisorSelect = document.getElementById("supervisor");
  const { data, error } = await supabaseClient.from("supervisores").select("*").eq("activo", true);;
  if (error) {
    console.error("Error obteniendo supervisores:", error);
    return;
  }
  console.log("Supervisores cargados:", data);
  data.forEach(item => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = 'Ing. ' + item.names + ' ' + item.lastNames;
    supervisorSelect.appendChild(option);
  });
}
cargarSupervisores();

// Cargar personal
const { data: dataPersonal, error: errorPersonal } = await supabaseClient.from("personal").select("*").eq("activo", true);
if (errorPersonal) {
  // alert("Error al cargar el personal.");
  console.error("Error:", errorPersonal);
} else {
  console.log("Trabajadores:", dataPersonal);
}

function setFechaActual() {
  fechaInput.value = new Date().toLocaleDateString();
}

function calcularDuracion(inicioStr, finStr) {
  const i = new Date(inicioStr);
  const f = new Date(finStr);
  if (isNaN(i) || isNaN(f) || f <= i) return { dias: 0, horas: 0, valido: false };
  const ms = f - i;
  const horasTot = Math.floor(ms / (1000 * 60 * 60));
  return { dias: Math.floor(horasTot / 24), horas: horasTot % 24, valido: true };
}

function armarMensajeWA(o) {
  return encodeURIComponent([
    "ORDEN DE TRABAJO",
    `N°: ${o.numero}`,
    `Área: ${o.area}`,
    `Fecha: ${o.fecha}`,
    `Supervisor: ${o.supervisor}`,
    `Trabajo: ${o.trabajo}`,
    `Magnitud: ${o.magnitud}`,
    `Descripción: ${o.descripcion}`,
    `Inicio: ${new Date(o.inicio).toLocaleString()}`,
    `Fin: ${new Date(o.fin).toLocaleString()}`,
    `Duración: ${o.duracion.dias} día(s) ${o.duracion.horas} hora(s)`,
    `Responsable área: ${o.responsable}`,
    `Calificación: ${o.calificacion}`
  ].join("\n"));
}

function linkWA(textoCodificado, numero = "") {
  return numero
    ? `https://wa.me/${numero}?text=${textoCodificado}`
    : `https://wa.me/?text=${textoCodificado}`;
}

// Render checkboxes
function renderPersonal(tipoTrabajo = "") {
  listaPersonal.innerHTML = "";
  console.log("Filtrando personal por tipo de trabajo:", tipoTrabajo);
  // const filtrados = tipoTrabajo  ? dataPersonal.filter(p => p.area.includes(tipoTrabajo)) : dataPersonal;
    (dataPersonal).forEach(p => {
    // (filtrados.length ? filtrados : dataPersonal).forEach(p => {
    const wrap = document.createElement("label");
    wrap.className = "chk filtered";
    wrap.innerHTML = `
      <input type="checkbox" value=${p.id} data-phone="${p.telefono}">
      <span>${p.names} ${p.lastNames}</span>
    `;
    listaPersonal.appendChild(wrap);
  });
}

// Cargar órdenes
const { data, error } = await supabaseClient.from("ordenesDeTrabajo").select(`
  *,
  supervisores (id, names, lastNames, telefono),
  calificacionDeOrdenes (calificacion),
  personalOrdenes (trabajador (names, lastNames, telefono))
`);
if (error) {
  alert("Error al cargar las órdenes de trabajo.");
  console.error("Error:", error);
} else {
  console.log("Ordenes de trabajo:", data);
}

// Inicialización
setFechaActual();
renderPersonal("");

document.getElementById("inicio").addEventListener("change", updateDuracion);
document.getElementById("fin").addEventListener("change", updateDuracion);
function updateDuracion() {
  const ini = document.getElementById("inicio").value;
  const fin = document.getElementById("fin").value;
  const d = calcularDuracion(ini, fin);
  document.getElementById("duracion").value = d.valido
    ? `${d.dias} día(s) ${d.horas} hora(s)`
    : "Rango inválido";
}

// Filtrar personal
trabajoSelect.addEventListener("change", () => renderPersonal(trabajoSelect.value));

// Seleccionar todo / nada
document.getElementById("btnSelTodo").addEventListener("click", () => {
  document.querySelectorAll('#listaPersonal input[type="checkbox"]').forEach(c => c.checked = true);
});
document.getElementById("btnSelNada").addEventListener("click", () => {
  document.querySelectorAll('#listaPersonal input[type="checkbox"]').forEach(c => c.checked = false);
});

// Agregar orden
document.getElementById("btnAgregar").addEventListener("click", async () => {
  const area = document.getElementById("area").value;
  const fecha = fechaInput.value.trim();
  const supervisor = document.getElementById("supervisor").value;
  const trabajo = document.getElementById("trabajo").value;
  const magnitud = document.getElementById("magnitud").value;
  const descripcion = document.getElementById("descripcion").value.trim();
  const checks = Array.from(document.querySelectorAll('#listaPersonal input[type="checkbox"]:checked'));
  const personal = checks.map(c => c.value);
  const inicio = document.getElementById("inicio").value;
  const fin = document.getElementById("fin").value;
  const responsable = document.getElementById("responsable").value.trim();

  if (!area || !supervisor || !trabajo || !magnitud || !descripcion || personal.length === 0 || !inicio || !fin || !responsable) {
    alert("Complete todos los campos y seleccione al menos una persona.");
    return;
  }

  const duracion = calcularDuracion(inicio, fin);
  if (!duracion.valido) {
    alert("La fecha/hora de fin debe ser posterior al inicio.");
    return;
  }
  for (let i = 0; i < 10; i++) {

    const { data, error } = await supabaseClient.from('ordenesDeTrabajo').insert([{
      area,
      supervisor,
      trabajo,
      magnitud,
      descripcion,
      inicio,
      fecha,
      fin,
      duracion: `${duracion.dias} día(s) ${duracion.horas} hora(s)`,
      responsableArea: responsable
    }]).select();
    
    if (error) {
      console.error("Error al insertar:", error);
      return;
    }
    
    const orderId = data[0].id;
    const personalDataToInsert = personal.map(personId => ({
      orden: orderId,
      trabajador: personId
    }));
    
    const { error: personalError } = await supabaseClient.from("personalOrdenes").insert(personalDataToInsert);
    if (personalError) console.error("Error al agregar personal:", personalError);
    else console.log("Insertado correctamente:", data);
    
  }
    location.reload();
});

  // Render tabla
let paginaActual = 0; // 0 = primeros 20, 1 = siguientes 20, etc.
const tamañoPagina = 5;
document.getElementById("btnPrev").addEventListener("click", () => {
  if (paginaActual > 0) {
    paginaActual--;
    renderTabla();
  }
});

document.getElementById("btnNext").addEventListener("click", () => {
  const totalPaginas = Math.ceil(data.length / tamañoPagina);
  if (paginaActual < totalPaginas - 1) {
    paginaActual++;
    renderTabla();
  }
});


function renderTabla() {
  tablaBody.innerHTML = "";

  const inicio = paginaActual * tamañoPagina;
  const fin = inicio + tamañoPagina;

  const dataInverse = [...data].reverse(); // <- NO uses data.reverse() (altera el array original)

  const dataPagina = dataInverse.slice(inicio, fin);

  dataPagina.forEach((o) => {
    const tr = document.createElement("tr");

    const mensajeDatosCrudo = `
- Detalles de Orden de Trabajo -
---------------------------------------
- Orden: ${String(o.orden).padStart(5, "0")}
- Área: ${o.area}
- Fecha: ${o.fecha}
- Supervisor: Ing. ${o.supervisores.names} ${o.supervisores.lastNames}
- Trabajo Realizado: ${o.trabajo}
- Magnitud: ${o.magnitud}
- Descripción: ${o.descripcion}
- Personal Asignado: ${o.personalOrdenes.map(p => `${p.trabajador.names} ${p.trabajador.lastNames}`).join(', ')}
- Inicio: ${new Date(o.inicio).toLocaleString()}
- Fin: ${new Date(o.fin).toLocaleString()}
- Duración: ${o.duracion}
- Responsable de Área: ${o.responsableArea}
- Calificación: ${o.calificacionDeOrdenes ? o.calificacionDeOrdenes.calificacion : 'Pendiente de Calificar'}
    `;
    const mensajeDatos = mensajeDatosCrudo.replace(/\n/g, '%0A');

    tr.innerHTML = `
      <td>${String(o.orden).padStart(5, "0")}</td>
      <td>${o.area}</td>
      <td>${o.fecha}</td>
      <td>Ing. ${o.supervisores.names} ${o.supervisores.lastNames}</td>
      <td>${o.trabajo}</td>
      <td>${o.magnitud}</td>
      <td>${o.descripcion}</td>
      <td>${o.personalOrdenes.map(p => `${p.trabajador.names} ${p.trabajador.lastNames}`).join(', ')}</td>
      <td>${new Date(o.inicio).toLocaleString()}</td>
      <td>${new Date(o.fin).toLocaleString()}</td>
      <td>${o.duracion}</td>
      <td>${o.responsableArea}</td>
      <td>
        ${o.calificacionDeOrdenes
          ? o.calificacionDeOrdenes.calificacion
          : `
            <select class="calificacion" data-id="${o.id}">
              <option value="">Seleccione</option>
              <option>Excelente</option>
              <option>Bueno</option>
              <option>Regular</option>
              <option>Deficiente</option>
            </select>
          `}
      </td>
      <td class="wa-links">
        <a class="wa" href="https://wa.me/+593963020147?text=${mensajeDatos}" target="_blank">📲 Enviar al Jefe</a>
        <a class="wa" href="https://wa.me/${o.supervisores.telefono}?text=${mensajeDatos}" target="_blank">📲 Enviar al supervisor</a>
      </td>
    `;

    tablaBody.appendChild(tr);
  });

  // Eventos de calificación
  document.querySelectorAll('select.calificacion').forEach(select => {
    select.addEventListener('change', guardarCalificacion);
  });

  // Actualizar numerito "pag.X"
  document.querySelector(".textPag").textContent = `pag. ${paginaActual + 1}`;
}


// ✅ FUNCIÓN SEPARADA PARA GUARDAR CALIFICACIÓN
async function guardarCalificacion(e) {
  const elemento = e.target;
  const calificacion = elemento.value;
  const ordenId = elemento.dataset.id;

  console.log("Calificación seleccionada:", calificacion, "Orden ID:", ordenId);

  if (!calificacion) {
    alert("Seleccione una calificación válida.");
    return;
  }

  // 🔹 Confirmar antes de guardar
  const confirmar = confirm(`¿Está seguro de calificar esta orden con ${calificacion}?`);

  if (!confirmar) {
    console.log("Calificación cancelada por el usuario.");
    // 🔹 Si cancela, se limpia la selección
    elemento.value = "";
    return;
  }

  // 🔹 Insertar en Supabase si confirmó
  const { error } = await supabaseClient
    .from('calificacionDeOrdenes')
    .insert([
      {
        id: ordenId,
        calificacion: calificacion
      }
    ]);

  if (error) {
    console.error("Error al guardar calificación:", error);
    alert("❌ Error al guardar: " + error.message);
  } else {
    console.log("✅ Calificación guardada correctamente");
    alert("✅ Calificación guardada con éxito");
    location.reload();
  }
}
// ==================== EXPORTAR A CSV ====================
document.getElementById("btnExportar").addEventListener("click", exportarCSV);

function exportarCSV() {
  const filas = document.querySelectorAll("#tablaOrdenes tbody tr");
  if (!filas.length) {
    alert("No hay datos para exportar.");
    return;
  }

  // Obtener encabezados de la tabla
  const encabezados = Array.from(
    document.querySelectorAll("#tablaOrdenes thead th")
  ).map(th => th.innerText.trim());

  const datos = [];
  datos.push(encabezados.join(",")); // primera fila con encabezados

  // Recorrer las filas del cuerpo de la tabla
  filas.forEach(tr => {
    const celdas = Array.from(tr.querySelectorAll("td"));
    const fila = celdas
      .slice(0, encabezados.length - 1) // ignora los enlaces de WhatsApp si es necesario
      .map(td => `"${td.innerText.replace(/"/g, '""')}"`) // escapa comillas
      .join(",");
    datos.push(fila);
  });

  // Crear archivo CSV
  const blob = new Blob([datos.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const fecha = new Date().toISOString().split("T")[0];
  a.download = `ordenesDeTrabajo_${fecha}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}



renderTabla();
