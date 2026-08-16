let nivelChart;
let chuvaChart;
let riskChart;
let sensorChart;

const sensorSelect = document.getElementById("sensor-select");
const refreshBtn = document.getElementById("refresh-btn");

const PALETA_RISCO = {
    BAIXO: "#34d399",
    MODERADO: "#facc15",
    ALTO: "#fb923c",
    CRITICO: "#fb7185",
    DESCONHECIDO: "#64748b",
    SEM_DADOS: "#64748b",
};

Chart.defaults.color = "#7f95aa";
Chart.defaults.font.family = 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
Chart.defaults.font.size = 10;
Chart.defaults.animation.duration = 500;
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.boxWidth = 7;

function formatarData(valor) {
    if (!valor) return "--";
    const data = new Date(valor);
    return Number.isNaN(data.getTime()) ? valor : data.toLocaleString("pt-BR");
}

function formatarHora(valor) {
    if (!valor) return "--";
    const data = new Date(valor);
    return Number.isNaN(data.getTime())
        ? "--"
        : data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function riscoNormalizado(risco) {
    return String(risco || "DESCONHECIDO").toUpperCase();
}

function badgeRisco(risco) {
    const valor = riscoNormalizado(risco);
    const label = valor.replaceAll("_", " ");
    return `<span class="badge ${valor}">${label}</span>`;
}

function opcoesBase({ mostrarLegenda = false, eixoY = true, eixoX = true } = {}) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
            legend: { display: mostrarLegenda, position: "bottom" },
            tooltip: {
                backgroundColor: "rgba(7, 16, 29, .96)",
                titleColor: "#edf5ff",
                bodyColor: "#b8c9d9",
                borderColor: "rgba(125, 211, 252, .18)",
                borderWidth: 1,
                padding: 11,
                cornerRadius: 9,
                displayColors: true,
            },
        },
        scales: {
            x: {
                display: eixoX,
                grid: { display: false },
                border: { display: false },
                ticks: { maxTicksLimit: 8, autoSkip: true, color: "#61788e", maxRotation: 0 },
            },
            y: {
                display: eixoY,
                beginAtZero: true,
                grid: { color: "rgba(148, 163, 184, .07)", drawTicks: false },
                border: { display: false },
                ticks: { color: "#61788e", padding: 8 },
            },
        },
    };
}

async function carregarSensores() {
    const resposta = await fetch("/api/sensores");
    if (!resposta.ok) throw new Error("Falha ao carregar sensores");
    const dados = await resposta.json();

    for (const sensor of dados.sensores || []) {
        if ([...sensorSelect.options].some((option) => option.value === sensor.sensor_id)) continue;
        const option = document.createElement("option");
        option.value = sensor.sensor_id;
        option.textContent = `${sensor.sensor_id} — ${sensor.nome}`;
        sensorSelect.appendChild(option);
    }
}

function atualizarKpis(resumo) {
    document.getElementById("total-registros").textContent = resumo.total ?? 0;
    document.getElementById("chuva-media").textContent = Number(resumo.chuva_media_mm || 0).toFixed(2);
    document.getElementById("nivel-medio").textContent = Number(resumo.nivel_medio_m || 0).toFixed(3);
    document.getElementById("nivel-maximo").textContent = Number(resumo.nivel_maximo_m || 0).toFixed(3);
    document.getElementById("risco-atual").innerHTML = badgeRisco(resumo.risco_atual);
    document.getElementById("fonte-dados").textContent = `Fonte: ${resumo.fonte || "--"}`;

    const ultima = resumo.ultima_leitura;
    document.getElementById("risco-caption").textContent = ultima?.timestamp
        ? formatarHora(ultima.timestamp)
        : "Aguardando dados";

    atualizarSnapshot(ultima);
    atualizarRiscos(resumo.riscos || {}, resumo.total || 0);
}

function atualizarSnapshot(leitura) {
    const risco = riscoNormalizado(leitura?.risco || "SEM_DADOS");
    const chip = document.getElementById("snapshot-risk");
    chip.className = `status-chip ${risco}`;
    chip.textContent = risco.replaceAll("_", " ");

    document.getElementById("snapshot-level").textContent = Number(leitura?.nivel_m || 0).toFixed(3);
    document.getElementById("snapshot-sensor").textContent = leitura?.sensor_id || "--";
    document.getElementById("snapshot-rain").textContent = `${Number(leitura?.chuva_mm || 0).toFixed(2)} mm`;
    document.getElementById("snapshot-trend").textContent = leitura?.tendencia || "--";
    document.getElementById("snapshot-time").textContent = formatarHora(leitura?.timestamp);
}

function atualizarRiscos(riscos, total) {
    const entradas = ["BAIXO", "MODERADO", "ALTO", "CRITICO"]
        .map((risco) => [risco, Number(riscos[risco] || 0)])
        .filter(([, quantidade]) => quantidade > 0);

    const riskList = document.getElementById("risk-list");
    riskList.innerHTML = entradas.length
        ? entradas.map(([risco, quantidade]) => `
            <div class="risk-row">
                <span>${badgeRisco(risco)}</span>
                <strong>${quantidade}</strong>
            </div>
        `).join("")
        : '<div class="risk-row"><span>Sem classificação</span><strong>0</strong></div>';

    document.getElementById("risk-total").textContent = total || 0;

    riskChart?.destroy();
    const canvas = document.getElementById("risk-chart");
    riskChart = new Chart(canvas, {
        type: "doughnut",
        data: {
            labels: entradas.map(([risco]) => risco),
            datasets: [{
                data: entradas.map(([, quantidade]) => quantidade),
                backgroundColor: entradas.map(([risco]) => PALETA_RISCO[risco]),
                borderColor: "#0d1929",
                borderWidth: 3,
                hoverOffset: 4,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "rgba(7, 16, 29, .96)",
                    borderColor: "rgba(125, 211, 252, .18)",
                    borderWidth: 1,
                    padding: 10,
                },
            },
        },
    });
}

function atualizarTabela(registros) {
    const corpo = document.getElementById("telemetry-body");

    if (!registros.length) {
        corpo.innerHTML = '<tr><td class="empty-state" colspan="6">Nenhuma telemetria disponível para o filtro atual.</td></tr>';
    } else {
        corpo.innerHTML = registros.slice(0, 20).map((r) => `
            <tr>
                <td>${formatarData(r.timestamp)}</td>
                <td><strong>${r.sensor_id || "--"}</strong></td>
                <td>${Number(r.chuva_mm || 0).toFixed(2)} mm</td>
                <td>${Number(r.nivel_m || 0).toFixed(3)} m</td>
                <td>${r.tendencia || "--"}</td>
                <td>${badgeRisco(r.risco)}</td>
            </tr>
        `).join("");
    }

    const agora = new Date().toLocaleTimeString("pt-BR");
    document.getElementById("updated-at").textContent = `Atualizado ${agora}`;
    document.getElementById("top-updated-at").textContent = agora;
}

function agruparSensores(registros) {
    const grupos = new Map();

    for (const registro of registros) {
        const sensor = registro.sensor_id || "SEM_SENSOR";
        if (!grupos.has(sensor)) grupos.set(sensor, []);
        grupos.get(sensor).push(Number(registro.nivel_m || 0));
    }

    return [...grupos.entries()].map(([sensor, niveis]) => ({
        sensor,
        media: niveis.length ? niveis.reduce((a, b) => a + b, 0) / niveis.length : 0,
    }));
}

function atualizarGraficos(registros) {
    const ordemCronologica = [...registros].reverse();
    const labels = ordemCronologica.map((r) => formatarHora(r.timestamp));
    const niveis = ordemCronologica.map((r) => Number(r.nivel_m || 0));
    const chuvas = ordemCronologica.map((r) => Number(r.chuva_mm || 0));

    nivelChart?.destroy();
    chuvaChart?.destroy();
    sensorChart?.destroy();

    const nivelCanvas = document.getElementById("nivel-chart");
    const nivelContext = nivelCanvas.getContext("2d");
    const nivelGradient = nivelContext.createLinearGradient(0, 0, 0, 310);
    nivelGradient.addColorStop(0, "rgba(56, 189, 248, .30)");
    nivelGradient.addColorStop(.72, "rgba(56, 189, 248, .04)");
    nivelGradient.addColorStop(1, "rgba(56, 189, 248, 0)");

    nivelChart = new Chart(nivelCanvas, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Nível",
                data: niveis,
                borderColor: "#38bdf8",
                backgroundColor: nivelGradient,
                fill: true,
                tension: .36,
                borderWidth: 2.2,
                pointRadius: 0,
                pointHoverRadius: 4,
                pointHoverBackgroundColor: "#e0f2fe",
                pointHoverBorderColor: "#0ea5e9",
                pointHoverBorderWidth: 2,
            }],
        },
        options: {
            ...opcoesBase(),
            plugins: {
                ...opcoesBase().plugins,
                tooltip: {
                    ...opcoesBase().plugins.tooltip,
                    callbacks: { label: (ctx) => ` Nível: ${Number(ctx.raw).toFixed(3)} m` },
                },
            },
            scales: {
                ...opcoesBase().scales,
                y: {
                    ...opcoesBase().scales.y,
                    suggestedMin: niveis.length ? Math.max(0, Math.min(...niveis) - .15) : 0,
                    ticks: { ...opcoesBase().scales.y.ticks, callback: (value) => `${Number(value).toFixed(1)} m` },
                },
            },
        },
    });

    const chuvaCanvas = document.getElementById("chuva-chart");
    chuvaChart = new Chart(chuvaCanvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Chuva",
                data: chuvas,
                backgroundColor: "rgba(34, 211, 238, .58)",
                hoverBackgroundColor: "rgba(103, 232, 249, .82)",
                borderColor: "rgba(34, 211, 238, .85)",
                borderWidth: 1,
                borderRadius: 5,
                borderSkipped: false,
                maxBarThickness: 18,
            }],
        },
        options: {
            ...opcoesBase(),
            plugins: {
                ...opcoesBase().plugins,
                tooltip: {
                    ...opcoesBase().plugins.tooltip,
                    callbacks: { label: (ctx) => ` Chuva: ${Number(ctx.raw).toFixed(2)} mm` },
                },
            },
            scales: {
                ...opcoesBase().scales,
                y: {
                    ...opcoesBase().scales.y,
                    ticks: { ...opcoesBase().scales.y.ticks, callback: (value) => `${value} mm` },
                },
            },
        },
    });

    const sensores = agruparSensores(registros);
    const sensorCanvas = document.getElementById("sensor-chart");
    sensorChart = new Chart(sensorCanvas, {
        type: "bar",
        data: {
            labels: sensores.map((item) => item.sensor),
            datasets: [{
                label: "Nível médio",
                data: sensores.map((item) => Number(item.media.toFixed(3))),
                backgroundColor: ["rgba(129, 140, 248, .72)", "rgba(56, 189, 248, .72)", "rgba(167, 139, 250, .72)"],
                borderRadius: 6,
                borderSkipped: false,
                maxBarThickness: 34,
            }],
        },
        options: {
            ...opcoesBase(),
            indexAxis: "y",
            plugins: {
                ...opcoesBase().plugins,
                tooltip: {
                    ...opcoesBase().plugins.tooltip,
                    callbacks: { label: (ctx) => ` Nível médio: ${Number(ctx.raw).toFixed(3)} m` },
                },
            },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: "rgba(148, 163, 184, .07)" },
                    border: { display: false },
                    ticks: { color: "#61788e", callback: (value) => `${Number(value).toFixed(1)} m` },
                },
                y: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: "#8aa0b5", font: { size: 9 } },
                },
            },
        },
    });
}

async function carregarML() {
    const caixa = document.getElementById("ml-box");
    const dot = document.getElementById("ml-dot");
    const mini = document.getElementById("ml-status-mini");

    const resposta = await fetch("/api/ml/status");
    if (!resposta.ok) throw new Error("Falha ao consultar modelo ML");
    const dados = await resposta.json();

    if (!dados.treinado) {
        caixa.innerHTML = `
            <div class="ml-state">
                <div>
                    <strong>Pipeline preparado para treinamento</strong>
                    <span>O baseline Random Forest já está implementado e aguarda o treinamento local.</span>
                </div>
            </div>
            <div class="ml-metrics">
                <div class="ml-metric"><span>Status</span><strong>Aguardando treino</strong></div>
                <div class="ml-metric"><span>Algoritmo</span><strong>Random Forest</strong></div>
                <div class="ml-metric"><span>Comando</span><strong><code>python -m ml.train_model</code></strong></div>
            </div>
        `;
        dot.className = "system-dot";
        mini.textContent = "Aguardando treino";
        return;
    }

    const metricas = dados.metricas || {};
    caixa.innerHTML = `
        <div class="ml-state">
            <div>
                <strong>Modelo preditivo treinado e disponível</strong>
                <span>Baseline pronto para estimar o próximo nível da água a partir da telemetria.</span>
            </div>
        </div>
        <div class="ml-metrics">
            <div class="ml-metric"><span>Amostras</span><strong>${metricas.amostras ?? "--"}</strong></div>
            <div class="ml-metric"><span>MAE</span><strong>${metricas.mae_m ?? "--"} m</strong></div>
            <div class="ml-metric"><span>Fonte</span><strong>${metricas.fonte ?? "--"}</strong></div>
        </div>
    `;
    dot.className = "system-dot online";
    mini.textContent = "Treinado";
}

async function carregarStatus() {
    const dot = document.getElementById("api-status");
    const texto = document.getElementById("status-text");
    const mongoDot = document.getElementById("mongo-dot");
    const mongoStatus = document.getElementById("mongo-status");

    try {
        const resposta = await fetch("/health");
        if (!resposta.ok) throw new Error("Healthcheck indisponível");
        const dados = await resposta.json();
        const mongoOnline = Boolean(dados.mongodb?.conectado);

        dot.className = "status-dot ok";
        texto.textContent = mongoOnline ? "API + MongoDB online" : "API online • fallback JSONL";
        mongoDot.className = mongoOnline ? "system-dot online" : "system-dot offline";
        mongoStatus.textContent = mongoOnline ? "Online" : "Fallback JSONL";
    } catch (erro) {
        dot.className = "status-dot error";
        texto.textContent = "API indisponível";
        mongoDot.className = "system-dot offline";
        mongoStatus.textContent = "Offline";
    }
}

async function atualizarDashboard() {
    const sensor = sensorSelect.value;
    const query = sensor ? `&sensor_id=${encodeURIComponent(sensor)}` : "";
    refreshBtn.classList.add("loading");
    refreshBtn.disabled = true;

    try {
        const [resumoResp, telemetriaResp] = await Promise.all([
            fetch(`/api/resumo?limite=200${query}`),
            fetch(`/api/telemetria?limite=60${query}`),
        ]);

        if (!resumoResp.ok || !telemetriaResp.ok) throw new Error("Falha ao consultar telemetria");

        const resumo = await resumoResp.json();
        const telemetria = await telemetriaResp.json();
        const registros = telemetria.registros || [];

        atualizarKpis(resumo);
        atualizarTabela(registros);
        atualizarGraficos(registros);
        await Promise.all([carregarML(), carregarStatus()]);
    } catch (erro) {
        console.error(erro);
        document.getElementById("status-text").textContent = "Falha ao atualizar dashboard";
        document.getElementById("api-status").className = "status-dot error";
    } finally {
        refreshBtn.classList.remove("loading");
        refreshBtn.disabled = false;
    }
}

refreshBtn.addEventListener("click", atualizarDashboard);
sensorSelect.addEventListener("change", atualizarDashboard);

for (const link of document.querySelectorAll(".nav-item")) {
    link.addEventListener("click", () => {
        document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
        link.classList.add("active");
    });
}

(async function iniciar() {
    try {
        await carregarSensores();
    } catch (erro) {
        console.error(erro);
    }
    await atualizarDashboard();
    setInterval(atualizarDashboard, 10000);
})();
