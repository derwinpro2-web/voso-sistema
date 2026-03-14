// ==========================================
// GRÁFICOS
// ==========================================

function initCharts() {
    const ctx1 = document.getElementById('severityChart').getContext('2d');
    severityChart = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: ['Baja', 'Media', 'Alta', 'Crítica'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: ['#10b981', '#f59e0b', '#f97316', '#ef4444'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 10,
                        font: { size: 10 },
                        padding: 10
                    }
                }
            }
        }
    });

    const ctx2 = document.getElementById('trendChart').getContext('2d');
    trendChart = new Chart(ctx2, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Anomalías',
                data: [],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                x: { ticks: { font: { size: 9 } } },
                y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 9 } } }
            }
        }
    });
}

function updateCharts() {
    const severidadCounts = {
        baja: records.filter(r => r.severidad === 'baja').length,
        media: records.filter(r => r.severidad === 'media').length,
        alta: records.filter(r => r.severidad === 'alta').length,
        critica: records.filter(r => r.severidad === 'critica').length
    };

    severityChart.data.datasets[0].data = [
        severidadCounts.baja,
        severidadCounts.media,
        severidadCounts.alta,
        severidadCounts.critica
    ];
    severityChart.update();

    updateTrendChart();
}

function updateTrendChart() {
    const days = parseInt(document.getElementById('chartPeriod').value);
    const labels = [];
    const data = [];

    for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        labels.push(dateStr);

        const count = records.filter(r => {
            const rDate = new Date(r.fecha);
            return rDate.toDateString() === date.toDateString();
        }).length;
        data.push(count);
    }

    trendChart.data.labels = labels;
    trendChart.data.datasets[0].data = data;
    trendChart.update();
}
