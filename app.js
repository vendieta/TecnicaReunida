import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function login(email, password) {
  console.log("Intentando login en Supabase con:", `${email}@tecnicaunidas.com`, password);
  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: `${email}@tecnicaunidas.com`,
    password
  });
  console.log(data, error);
  return { data, error };
}

/************  AUTENTICACIÓN SIMPLE  ************/
const CREDENTIALS = { user: "admidn", pass: "1234" }; // <-- cámbialas aquí

const loginView = document.getElementById("loginView");
const appView   = document.getElementById("app");
const loginForm = document.getElementById("loginForm");
const loginErr  = document.getElementById("loginError");
const userName  = document.getElementById("userName");
const btnLogout = document.getElementById("btnLogout");

function enterApp(username){
  userName.textContent = username;
  loginView.classList.add("hidden");
  appView.classList.remove("hidden");
}

function checkSession(){
  const dataUser = JSON.parse(localStorage.getItem("sessionUser"));
  console.log("Revisando sesión guardada:", dataUser);
  if (dataUser){ enterApp(dataUser.user.id); }
}
checkSession();

if (loginForm) {
  loginForm.addEventListener("submit", async (e)=>{
    e.preventDefault();
    const u = document.getElementById("loginUser").value.trim();
    const p = document.getElementById("loginPass").value.trim();
    const {data, error} = await login(u, p); // Supabase login attempt
    console.log("Intento de login con:", u, p);
    console.log("Resultado:", data.user);
    if (!error && data){
      localStorage.setItem("sessionUser", JSON.stringify(data));
      loginErr.hidden = true;
      enterApp(u);
      loginForm.reset();
    } else {
      loginErr.hidden = false;
    }
  });
}

if (btnLogout) {
  btnLogout.addEventListener("click", ()=>{
    localStorage.removeItem("sessionUser");
    appView.classList.add("hidden");
    loginView.classList.remove("hidden");
  });
}

/************  APP ORIGINAL  ************/
const fechaInput = document.getElementById("fecha");
const trabajoSelect = document.getElementById("trabajo");
const listaPersonal = document.getElementById("listaPersonal");
const tablaBody = document.querySelector("#tablaOrdenes tbody");

async function cargarSupervisores() {
  const supervisorSelect = document.getElementById("supervisor");

  const { data, error } = await supabaseClient
    .from("supervisores")
    .select("*");

  if (error) {
    console.error("Error obteniendo supervisores:", error);
    return;
  }
  console.log("Supervisores cargados:", data);

  data.forEach(item => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = 'Ing. '+ item.names + ' ' + item.lastNames;
    supervisorSelect.appendChild(option);
  });
}

cargarSupervisores();

const { data: dataPersonal, error: errorPersonal } = await supabaseClient
  .from("personal")
  .select("*")

  if (errorPersonal) {
  alert("Error al cargar las órdenes de trabajo.");
  console.error("Error:", error)
} else {
  console.log("Trabajadores:", dataPersonal)
}

function setFechaActual(){ fechaInput.value = new Date().toLocaleDateString(); }

function calcularDuracion(inicioStr, finStr){
  const i = new Date(inicioStr);
  const f = new Date(finStr);
  if (isNaN(i) || isNaN(f) || f <= i) return { dias:0, horas:0, valido:false };
  const ms = f - i;
  const horasTot = Math.floor(ms / (1000*60*60));
  return { dias: Math.floor(horasTot/24), horas: horasTot % 24, valido:true };
}

function armarMensajeWA(o){
  return encodeURIComponent([
    "ORDEN DE TRABAJO",
    `N°: ${o.numero}`,
    `Área: ${o.area}`,
    `Fecha: ${o.fecha}`,
    `Supervisor: ${o.supervisor}`,
    `Trabajo: ${o.trabajo}`,
    `Magnitud: ${o.magnitud}`,
    `Descripción: ${o.descripcion}`,
    // `Personal: ${o.personal.join(", ")}`,
    `Inicio: ${new Date(o.inicio).toLocaleString()}`,
    `Fin: ${new Date(o.fin).toLocaleString()}`,
    `Duración: ${o.duracion.dias} día(s) ${o.duracion.horas} hora(s)`,
    `Responsable área: ${o.responsable}`,
    `Calificación: ${o.calificacion}`
  ].join("\n"));
}

function linkWA(textoCodificado, numero=""){
  return numero ? `https://wa.me/${numero}?text=${textoCodificado}`
                : `https://wa.me/?text=${textoCodificado}`;
}

// Render checkboxes
function renderPersonal(tipoTrabajo = ""){
  listaPersonal.innerHTML = "";
  console.log("Filtrando personal por tipo de trabajo:", tipoTrabajo);
  const filtrados = tipoTrabajo
    ? dataPersonal.filter(p => p.area.includes(tipoTrabajo))
    : dataPersonal;

  (filtrados.length ? filtrados : dataPersonal).forEach(p => {
    const wrap = document.createElement("label");
    wrap.className = "chk filtered";
    wrap.innerHTML = `
      <input type="checkbox" value="${p.names} ${p.lastNames}" data-phone="${p.telefono}">
      <span>${p.names} ${p.lastNames}</span>
    `;
    listaPersonal.appendChild(wrap);
  });
}

//! Cargar órdenes de trabajo
const { data, error } = await supabaseClient
  .from("workOrders")
  .select(`*,
    supervisores (
    id,
    names,
    lastNames),
    gradeWorkOrders (calificacion)`
  );

if (error) {
  alert("Error al cargar las órdenes de trabajo.");
  console.error("Error:", error)
} else {
  console.log("ordenes de trabajo:", data)
}


// Inicialización
setFechaActual();
renderPersonal("");

document.getElementById("inicio").addEventListener("change", updateDuracion);
document.getElementById("fin").addEventListener("change", updateDuracion);
function updateDuracion(){
  const ini = document.getElementById("inicio").value;
  const fin = document.getElementById("fin").value;
  const d = calcularDuracion(ini, fin);
  document.getElementById("duracion").value = d.valido
    ? `${d.dias} día(s) ${d.horas} hora(s)`
    : "Rango inválido";
}

// Filtrar personal por tipo de trabajo
trabajoSelect.addEventListener("change", () => { renderPersonal(trabajoSelect.value); });

// Seleccionar todo / nada
document.getElementById("btnSelTodo").addEventListener("click", () => {
  document.querySelectorAll('#listaPersonal input[type="checkbox"]').forEach(c => c.checked = true);
});
document.getElementById("btnSelNada").addEventListener("click", () => {
  document.querySelectorAll('#listaPersonal input[type="checkbox"]').forEach(c => c.checked = false);
});

// Agregar orden
document.getElementById("btnAgregar").addEventListener("click", async () => {
  // const numero = document.getElementById("numero").value.trim();
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
  // const calificacion = document.getElementById("calificacion").value;
  const telefono = document.getElementById("telefono").value.replace(/\s+/g,"");

  if ( !area || !supervisor || !trabajo || !magnitud || !descripcion || personal.length===0 || !inicio || !fin || !responsable ) {
    alert("Complete todos los campos y seleccione al menos una persona.");
    return;
  }
  const duracion = calcularDuracion(inicio, fin);
  if (!duracion.valido){ alert("La fecha/hora de fin debe ser posterior al inicio."); return; }
  const {data, error} = await supabaseClient.from('workOrders').insert([
    {
      area: area,
      supervisor: supervisor,
      trabajo: trabajo,
      magnitud: magnitud,
      descripcion: descripcion,
      personal: personal,
      inicio: inicio,
      fecha: fecha,
      fin: fin,
      duracion: duracion,
      responsableArea: responsable
    }]);
  if (error) {
  console.error("Error al insertar:", error);
} else {
  console.log("Insertado correctamente:", data);
  location.reload();
}

// Reset
document.getElementById("formOrden").reset();
setFechaActual();
renderPersonal("");
document.getElementById("duracion").value = "";
});
renderTabla();

// Manejar calificaciones
document.querySelectorAll(".calificacion").forEach(select => {
  select.addEventListener("change", async function() {
    const valor = this.value;
    const id = this.dataset.id;

    if (!valor) return;

    const confirmado = confirm(`¿Seguro que deseas calificar con: ${valor}?`);

    if (!confirmado) {
      this.value = ""; 
      return;
    }

    // Guardar en Supabase
    const { data, error } = await supabaseClient
      .from("ordenes")
      .update({ calificacion: valor })
      .eq("id", id);

    if (error) {
      alert("Error guardando calificación");
      console.error(error);
      return;
    }

    alert("✅ Calificación guardada!");
    location.reload(); // recargar tabla para actualizar UI
  });
});



// Render tabla
function renderTabla(){
  tablaBody.innerHTML = "";
  data.forEach((o) => {
    console.log("Orden:", o);
    const tr = document.createElement("tr");
    const msg = armarMensajeWA(o);
    const waTodos = linkWA(msg, o.telefono);

    // const waIndividuales = o.personal.map(nombre => {
    //   // const p = PERSONAL.find(x => x.nombre === nombre);
    //   return `<a class="wa" href="${linkWA(msg, p?.phone || "")}" target="_blank">Enviar a ${nombre}</a>`;
    // }).join("");

tr.innerHTML = `
  <td>${o.orden}</td>
  <td>${o.area}</td>
  <td>${o.fecha}</td>
  <td>Ing. ${o.supervisores.names} ${o.supervisores.lastNames}</td>
  <td>${o.trabajo}</td>
  <td>${o.magnitud}</td>
  <td>${o.descripcion}</td>
  <td>"personal"</td>
  <td>${new Date(o.inicio).toLocaleString()}</td>
  <td>${new Date(o.fin).toLocaleString()}</td>
  <td>${o.duracion}</td>
  <td>${o.responsableArea}</td>

  <td>
    ${o.gradeWorkOrders
      ? o.gradeWorkOrders.calificacion
      : `
        <select class="calificacion" data-id="${o.id}">
          <option value="">Seleccione</option>
          <option>Excelente</option>
          <option>Bueno</option>
          <option>Regular</option>
          <option>Deficiente</option>
        </select>
      `
    }
  </td>

  <td>
    <div class="wa-links">
      <a class="wa" href="${waTodos}" target="_blank">📲 Enviar a todos</a>
    </div>
  </td>
`;

    tablaBody.appendChild(tr);
  });
}

// Exportar CSV
document.getElementById("btnExportar").addEventListener("click", () => {
  if (ordenes.length === 0){ alert("No hay datos para exportar."); return; }
  const headers = [
    "Numero","Area","Fecha","Supervisor","Trabajo","Magnitud","Descripcion",
    "Personal","Inicio","Fin","Duracion(dias)","Duracion(horas)","Responsable","Calificacion"
  ];
  const rows = ordenes.map(o => ([
    o.numero, o.area, o.fecha, o.supervisor, o.trabajo, o.magnitud,
    o.descripcion.replace(/\n/g," "),
    o.personal.join(" | "),
    new Date(o.inicio).toLocaleString(),
    new Date(o.fin).toLocaleString(),
    o.duracion.dias, o.duracion.horas,
    o.responsable, o.calificacion
  ]));
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(","))
    .join("\n");

  const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ordenes_trabajo.csv";
  a.click();
  URL.revokeObjectURL(url);
});
