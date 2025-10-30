/************  AUTENTICACIÓN SIMPLE  ************/
const CREDENTIALS = { user: "admin", pass: "1234" }; // <-- cámbialas aquí

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
  const s = localStorage.getItem("sessionUser");
  if (s){ enterApp(s); }
}
checkSession();

loginForm.addEventListener("submit", (e)=>{
  e.preventDefault();
  const u = document.getElementById("loginUser").value.trim();
  const p = document.getElementById("loginPass").value.trim();
  if (u === CREDENTIALS.user && p === CREDENTIALS.pass){
    localStorage.setItem("sessionUser", u);
    loginErr.hidden = true;
    enterApp(u);
    loginForm.reset();
  } else {
    loginErr.hidden = false;
  }
});

btnLogout.addEventListener("click", ()=>{
  localStorage.removeItem("sessionUser");
  appView.classList.add("hidden");
  loginView.classList.remove("hidden");
});

/************  APP ORIGINAL  ************/
const fechaInput = document.getElementById("fecha");
const trabajoSelect = document.getElementById("trabajo");
const listaPersonal = document.getElementById("listaPersonal");
const tablaBody = document.querySelector("#tablaOrdenes tbody");

const TIPOS_TRABAJO = [
  "Eléctrico","Mecánico","Hidráulico","Soldadura",
  "Automatización","Montaje","Fabricación","Limpieza"
];

const PERSONAL = [
  { nombre: "Luis",     skills: ["Eléctrico","Montaje"],          phone: "" },
  { nombre: "Ana",      skills: ["Eléctrico","Automatización"],   phone: "" },
  { nombre: "Rosa",     skills: ["Eléctrico","Fabricación"],      phone: "" },
  { nombre: "Miguel",   skills: ["Mecánico","Montaje"],           phone: "" },
  { nombre: "José",     skills: ["Mecánico","Soldadura"],         phone: "" },
  { nombre: "Daniela",  skills: ["Mecánico","Fabricación"],       phone: "" },
  { nombre: "Pablo",    skills: ["Hidráulico","Montaje"],         phone: "" },
  { nombre: "Sofía",    skills: ["Hidráulico","Automatización"],  phone: "" },
  { nombre: "Raúl",     skills: ["Soldadura","Fabricación"],      phone: "" },
  { nombre: "Carmen",   skills: ["Soldadura","Mecánico"],         phone: "" },
  { nombre: "Erick",    skills: ["Automatización","Eléctrico"],   phone: "" },
  { nombre: "Lucía",    skills: ["Automatización","Montaje"],     phone: "" },
  { nombre: "Tomás",    skills: ["Montaje","Mecánico"],           phone: "" },
  { nombre: "Andrea",   skills: ["Montaje","Hidráulico"],         phone: "" },
  { nombre: "Víctor",   skills: ["Fabricación","Soldadura"],      phone: "" },
  { nombre: "María",    skills: ["Fabricación","Eléctrico"],      phone: "" },
  { nombre: "Jorge",    skills: ["Eléctrico","Hidráulico"],       phone: "" },
  { nombre: "Nadia",    skills: ["Mecánico","Automatización"],    phone: "" },
  { nombre: "Kevin",    skills: ["Soldadura","Montaje"],          phone: "" },
  { nombre: "Brenda",   skills: ["Hidráulico","Limpieza"],        phone: "" },
];

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
    `Personal: ${o.personal.join(", ")}`,
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
  const filtrados = tipoTrabajo
    ? PERSONAL.filter(p => p.skills.includes(tipoTrabajo))
    : PERSONAL;

  (filtrados.length ? filtrados : PERSONAL).forEach(p => {
    const wrap = document.createElement("label");
    wrap.className = "chk filtered";
    wrap.innerHTML = `
      <input type="checkbox" value="${p.nombre}" data-phone="${p.phone}">
      <span>${p.nombre}</span>
    `;
    listaPersonal.appendChild(wrap);
  });
}

// Estado
const ordenes = [];

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
document.getElementById("btnAgregar").addEventListener("click", () => {
  const numero = document.getElementById("numero").value.trim();
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
  const calificacion = document.getElementById("calificacion").value;
  const telefono = document.getElementById("telefono").value.replace(/\s+/g,"");

  if (!numero || !area || !supervisor || !trabajo || !magnitud || !descripcion || personal.length===0 || !inicio || !fin || !responsable || !calificacion) {
    alert("Complete todos los campos y seleccione al menos una persona.");
    return;
  }
  const duracion = calcularDuracion(inicio, fin);
  if (!duracion.valido){ alert("La fecha/hora de fin debe ser posterior al inicio."); return; }

  const orden = { numero, area, fecha, supervisor, trabajo, magnitud, descripcion, personal, inicio, fin, duracion, responsable, calificacion, telefono };
  ordenes.push(orden);
  renderTabla();

  // Reset
  document.getElementById("formOrden").reset();
  setFechaActual();
  renderPersonal("");
  document.getElementById("duracion").value = "";
});

// Render tabla
function renderTabla(){
  tablaBody.innerHTML = "";
  ordenes.forEach((o) => {
    const tr = document.createElement("tr");
    const msg = armarMensajeWA(o);
    const waTodos = linkWA(msg, o.telefono);

    const waIndividuales = o.personal.map(nombre => {
      const p = PERSONAL.find(x => x.nombre === nombre);
      return `<a class="wa" href="${linkWA(msg, p?.phone || "")}" target="_blank">Enviar a ${nombre}</a>`;
    }).join("");

    tr.innerHTML = `
      <td>${o.numero}</td>
      <td>${o.area}</td>
      <td>${o.fecha}</td>
      <td>${o.supervisor}</td>
      <td>${o.trabajo}</td>
      <td>${o.magnitud}</td>
      <td>${o.descripcion}</td>
      <td>${o.personal.join(", ")}</td>
      <td>${new Date(o.inicio).toLocaleString()}</td>
      <td>${new Date(o.fin).toLocaleString()}</td>
      <td>${o.duracion.dias} d / ${o.duracion.horas} h</td>
      <td>${o.responsable}</td>
      <td>${o.calificacion}</td>
      <td>
        <div class="wa-links">
          <a class="wa" href="${waTodos}" target="_blank">📲 Enviar a todos</a>
          ${waIndividuales}
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
