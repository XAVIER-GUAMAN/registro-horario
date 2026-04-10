import { supabaseClient } from './supabase.js';

const DIAS = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

document.getElementById("mes").addEventListener("change", generarMes);

async function generarMes() {
    const mes = document.getElementById("mes").value;
    if (!mes) return;

    const [year, month] = mes.split("-");
    const dias = new Date(year, month, 0).getDate();

    const tbody = document.querySelector("#tabla tbody");
    tbody.innerHTML = "";

    for (let i = 1; i <= dias; i++) {
        const fecha = new Date(year, month - 1, i);
        const diaSemana = fecha.getDay();

        if (diaSemana === 0 || diaSemana === 6) continue;

        const fila = document.createElement("tr");

        fila.innerHTML = `
            <td>${fecha.toISOString().split("T")[0]}</td>
            <td>${DIAS[diaSemana]}</td>
            <td><input type="time"></td>
            <td><input type="time"></td>
            <td><input type="time"></td>
            <td><input type="time"></td>
            <td class="horas">0.00</td>
        `;

        tbody.appendChild(fila);
    }

    await cargarDesdeSupabase();
}

window.aplicarATodos = function() {
    document.querySelectorAll("#tabla tbody tr").forEach(tr => {
        const inputs = tr.querySelectorAll("input");
        inputs[0].value = "09:00";
        inputs[1].value = "14:00";
        inputs[2].value = "15:00";
        inputs[3].value = "18:00";
        calcularFila(tr);
    });
}

document.addEventListener("input", e => {
    if (e.target.type === "time") {
        calcularFila(e.target.closest("tr"));
    }
});

function calcularFila(tr) {
    const inputs = tr.querySelectorAll("input");

    if (!inputs[0].value || !inputs[3].value) {
        tr.querySelector(".horas").innerText = "0.00";
        return;
    }

    const entrada = toMin(inputs[0].value);
    const pausa = toMin(inputs[1].value || inputs[0].value);
    const reanuda = toMin(inputs[2].value || inputs[3].value);
    const salida = toMin(inputs[3].value);

    const total = (salida - entrada) - (reanuda - pausa);
    tr.querySelector(".horas").innerText = (total / 60).toFixed(2);
}

function toMin(h) {
    const [hh, mm] = h.split(":");
    return hh * 60 + mm * 1;
}

// ================= GUARDAR =================
window.guardarEnSupabase = async function() {
    const filas = document.querySelectorAll("#tabla tbody tr");

    const datos = [];

    filas.forEach(tr => {
        const c = tr.children;

        datos.push({
            fecha: c[0].innerText,
            entrada: c[2].querySelector("input").value,
            pausa: c[3].querySelector("input").value,
            reanudacion: c[4].querySelector("input").value,
            salida: c[5].querySelector("input").value,
            horas: parseFloat(c[6].innerText) || 0
        });
    });

    const { error } = await supabaseClient
        .from('fichajes')
        .upsert(datos, { onConflict: ['fecha'] });

    if (error) {
        alert("Error: " + error.message);
    } else {
        alert("Guardado correctamente ☁️");
    }
}

// ================= EXPORT =================
window.exportarExcel = function() {
    const data = [["Fecha","Día","Entrada","Pausa","Reanuda","Salida","Horas"]];

    document.querySelectorAll("#tabla tbody tr").forEach(tr => {
        const c = tr.children;
        data.push([
            c[0].innerText,
            c[1].innerText,
            c[2].querySelector("input").value,
            c[3].querySelector("input").value,
            c[4].querySelector("input").value,
            c[5].querySelector("input").value,
            c[6].innerText
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Horario");

    XLSX.writeFile(wb, "horario.xlsx");
}

async function cargarDesdeSupabase() {
    const mes = document.getElementById("mes").value;
    if (!mes) return;

    const [year, month] = mes.split("-");

    const inicio = `${year}-${month}-01`;
    const fin = `${year}-${month}-31`;

    const { data, error } = await supabaseClient
        .from('fichajes')
        .select('*')
        .gte('fecha', inicio)
        .lte('fecha', fin);

    if (error) {
        console.error(error);
        return;
    }

    // Mapear por fecha
    const mapa = {};
    data.forEach(d => {
        mapa[d.fecha] = d;
    });

    // Rellenar tabla
    document.querySelectorAll("#tabla tbody tr").forEach(tr => {
        const fecha = tr.children[0].innerText;

        if (mapa[fecha]) {
            const inputs = tr.querySelectorAll("input");

            inputs[0].value = mapa[fecha].entrada || "";
            inputs[1].value = mapa[fecha].pausa || "";
            inputs[2].value = mapa[fecha].reanudacion || "";
            inputs[3].value = mapa[fecha].salida || "";

            calcularFila(tr);
        }
    });
}