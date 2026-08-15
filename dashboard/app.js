let nivelChart;
let chuvaChart;

const sensorSelect = document.getElementById("sensor-select");
const refreshBtn = document.getElementById("refresh-btn");

function formatarData(valor) {
    if (!valor) return "--";
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? valor : data.toLocaleString("pt-BR");
}

function badgeRisco(risco) {
    const valor = risco || "DESCONHECIDO";
    return `<span class="badge ${valor}">${valor}</span>`;
}

async function carregarSensores() {
    const resposta = await fetch("/api/sensores");
    const dados = await resposta.json();
    for (const sensor of dados.sensores || []) {
        const option = document.createElement("option");
        option.value = sensor.sensor_id;
        option.textContent = `${sensor.sensor_id} — ${sensor.nome}`;
        sensorSelect.appendChild(option);
    }
}

function atualizarCards(resumo) {
    document.getElementById("total-registros").textContent = resumo.total ?? 0;
    document.getElementById("chuva-media").textContent = Number(resumo.chuva_media_mm || 0).toFixed(2);
    document.getElementById("nivel-maximo").textContent = Number(resumo.nivel_maximo_m || 0).toFixed(3);
    document.getElementById("risco-atual").innerHTML = badgeRisco(resumo.risco_atual);
    document.getElementById("fonte-dados").textContent = `Fonte: ${resumo.fonte || "--"}`;

    const riskList = document.getElementById("risk-list");
    const riscos = resumo.riscos || {};
    riskList.innerHTML = Object.keys(riscos).length
        ? Object.entries(riscos)
            .map(([risco, total]) => `<div class="risk-row"><span>${badgeRisco(risco)}</span><strong>${total}</strong></div>`)
            .join("")
        : "<p>Sem dados de risco.</p>";
}

function atualizarTabela(registros) {
    const corpo = document.getElementById("telemetry-body");
    corpo.innerHTML = registros.slice(0, 20).map((r) => `
        <tr>
            <td>${formatarData(r.timestamp)}</td>
            <td>${r.sensor_id || "--"}</td>
            <td>${Number(r.chuva_mm || 0).toFixed(2)} mm</td>
            <td>${Number(r.nivel_m || 0).toFixed(3)} m</td>
            <td>${r.tendencia || "--"}</td>
            <td>${badgeRisco(r.risco)}</td>
        </tr>
    `).join("");
    document.getElementById("updated-at").textContent = `Atualizado: ${new Date().toLocaleTimeString("pt-BR")}`;
}

function atualizarGraficos(registros) {
    const ordemCronologica = [...registros].reverse();
    const labels = ordemCronologica.map((r) => `${r.sensor_id} ${formatarData(r.timestamp).split(" ").pop()}`);
    const niveis = ordemCronologica.map((r) => Number(r.nivel_m || 0));
    const chuvas = ordemCronologica.map((r) => Number(r.chuva_mm || 0));

    nivelChart?.destroy();
    chuvaChart?.destroy();

    nivelChart = new Chart(document.getElementById("nivel-chart"), {
        type: "line",
        data: {
            labels,
            datasets: [{ label: "Nível (m)", data: niveis, tension: 0.25, borderWidth: 2, pointRadius: 2 }],
        },
        options: { responsive: true, maintainAspectRatio: false },
    });

    chuvaChart = new Chart(document.getElementById("chuva-chart"), {
        type: "bar",
        data: {
            labels,
            datasets: [{ label: "Chuva (mm)", data: chuvas }],
        },
        options: { responsive: true, maintainAspectRatio: false },
    });
}

async function carregarML() {
    const caixa = document.getElementById("ml-box");
    const resposta = await fetch("/api/ml/status");
    const dados = await resposta.json();

    if (!dados.treinado) {
        caixa.innerHTML = `
            <strong>Modelo ainda não treinado</strong>
            <span>Gere telemetria e execute <code>python -m ml.train_model</code>.</span>
            <span>A Etapa 6 já está preparada para treinamento local.</span>
        `;
        return;
    }

    const metricas = dados.metricas || {};
    caixa.innerHTML = `
        <strong>Random Forest treinado</strong>
        <span>Amostras: ${metricas.amostras ?? "--"}</span>
        <span>MAE: ${metricas.mae_m ?? "--"} m</span>
        <span>Fonte: ${metricas.fonte ?? "--"}</span>
    `;
}

async function carregarStatus() {
    const dot = document.getElementById("api-status");
    const texto = document.getElementById("status-text");
    try {
        const resposta = await fetch("/health");
        const dados = await resposta.json();
        dot.className = "status-dot ok";
        texto.textContent = dados.mongodb?.conectado ? "API + MongoDB online" : "API online • MongoDB offline (fallback JSONL)";
    } catch (erro) {
        dot.className = "status-dot error";
        texto.textContent = "API indisponível";
    }
}

async function atualizarDashboard() {
    const sensor = sensorSelect.value;
    const query = sensor ? `&sensor_id=${encodeURIComponent(sensor)}` : "";

    try {
        const [resumoResp, telemetriaResp] = await Promise.all([
            fetch(`/api/resumo?limite=200${query}`),
            fetch(`/api/telemetria?limite=60${query}`),
        ]);

        const resumo = await resumoResp.json();
        const telemetria = await telemetriaResp.json();
        atualizarCards(resumo);
        atualizarTabela(telemetria.registros || []);
        atualizarGraficos(telemetria.registros || []);
        await Promise.all([carregarML(), carregarStatus()]);
    } catch (erro) {
        console.error(erro);
        document.getElementById("status-text").textContent = "Falha ao atualizar dashboard";
        document.getElementById("api-status").className = "status-dot error";
    }
}

refreshBtn.addEventListener("click", atualizarDashboard);
sensorSelect.addEventListener("change", atualizarDashboard);

(async function iniciar() {
    await carregarSensores();
    await atualizarDashboard();
    setInterval(atualizarDashboard, 10000);
})();
