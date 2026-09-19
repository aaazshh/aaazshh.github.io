/**
 * dashboard.js — Chart.js initialisation for the dashboard page.
 *
 * Expects two global variables injected by PHP:
 *   window.DASHBOARD_DATA.weeklyVolume  — [{label, count}, ...]
 *   window.DASHBOARD_DATA.vehicleStatus — [{status, count}, ...]
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const data = window.DASHBOARD_DATA || {};

    initWeeklyVolumeChart(data.weeklyVolume || []);
    initVehicleStatusChart(data.vehicleStatus || []);
});

// ----------------------------------------------------------------
// Weekly Delivery Volume — Bar Chart
// ----------------------------------------------------------------

/**
 * Renders the weekly delivery volume bar chart.
 *
 * @param {Array<{label:string, count:number}>} rows
 */
function initWeeklyVolumeChart(rows) {
    const canvas = document.getElementById('chart-weekly-volume');
    if (!canvas) return;

    const labels = rows.map((r) => r.label);
    const values = rows.map((r) => Number(r.count));

    new Chart(canvas.getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Routes',
                data: values,
                backgroundColor: 'rgba(42,157,143,0.18)',
                borderColor: '#2a9d8f',
                borderWidth: 2,
                borderRadius: 4,
                borderSkipped: false,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1f2937',
                    titleFont: { size: 12, weight: '600' },
                    bodyFont: { size: 12 },
                    padding: 10,
                    cornerRadius: 6,
                    callbacks: {
                        label: (ctx) => ` ${ctx.parsed.y} route${ctx.parsed.y !== 1 ? 's' : ''}`,
                    },
                },
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: {
                        color: '#64748b',
                        font: { size: 12 },
                    },
                    border: { display: false },
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#64748b',
                        font: { size: 12 },
                        stepSize: 1,
                        precision: 0,
                    },
                    grid: {
                        color: '#f1f5f9',
                    },
                    border: { display: false, dash: [4, 4] },
                },
            },
        },
    });
}

// ----------------------------------------------------------------
// Vehicle Status Distribution — Doughnut Chart
// ----------------------------------------------------------------

/**
 * Renders the vehicle status distribution doughnut chart.
 *
 * @param {Array<{status:number, count:number}>} rows  status is an integer (1/2/3)
 */
function initVehicleStatusChart(rows) {
    const canvas = document.getElementById('chart-vehicle-status');
    if (!canvas) return;

    // Prefer the server-injected map (labels come from PHP config.php constants)
    const statusMap = (window.DASHBOARD_DATA || {}).vehicleStatusMap || {
        1: { label: 'Idle', bg: 'rgba(148,163,184,0.2)', border: '#94a3b8' },
        2: { label: 'In Transit', bg: 'rgba(245,158,11,0.15)', border: '#f59e0b' },
    };

    const labels = rows.map((r) => (statusMap[r.status] || {}).label || String(r.status));
    const values = rows.map((r) => Number(r.count));
    const bgs = rows.map((r) => (statusMap[r.status] || { bg: '#e2e8f0' }).bg);
    const borders = rows.map((r) => (statusMap[r.status] || { border: '#94a3b8' }).border);

    const total = values.reduce((a, b) => a + b, 0);

    new Chart(canvas.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: bgs,
                borderColor: borders,
                borderWidth: 2,
                hoverOffset: 6,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '68%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#64748b',
                        font: { size: 12 },
                        padding: 16,
                        usePointStyle: true,
                        pointStyle: 'circle',
                    },
                },
                tooltip: {
                    backgroundColor: '#1f2937',
                    titleFont: { size: 12, weight: '600' },
                    bodyFont: { size: 12 },
                    padding: 10,
                    cornerRadius: 6,
                    callbacks: {
                        label: (ctx) => {
                            const pct = total > 0
                                ? Math.round((ctx.parsed / total) * 100)
                                : 0;
                            return ` ${ctx.parsed} vehicle${ctx.parsed !== 1 ? 's' : ''} (${pct}%)`;
                        },
                    },
                },
            },
        },
    });
}
