'use client';

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { getRatePlans, getSeasons } from '@/lib/api/tarification';

interface EvolutionChartProps {
  labels?: string[];
  occupancyData?: number[];
  adrData?: number[];
  year?: number;
}

export default function EvolutionChart({ labels: propLabels, occupancyData, adrData, year }: EvolutionChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    async function buildChart() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      let labels: string[];
      let toData: number[];
      let adrValues: number[];

      if (propLabels && occupancyData && adrData) {
        labels = propLabels;
        toData = occupancyData;
        adrValues = adrData;
      } else {
        const [ratePlans, seasons] = await Promise.all([getRatePlans(), getSeasons()]);
        const basseSeason = seasons.find((s) => s.nom === 'basse');
        const bassePrices = basseSeason
          ? ratePlans.filter((rp) => rp.seasonId === basseSeason.id)
          : [];
        const avgBasse = Math.round(
          bassePrices.reduce((sum, rp) => sum + (parseFloat(rp.prixTTC) || 0), 0) /
            (bassePrices.length || 1),
        );
        labels = ['Août','Sep','Oct','Nov','Déc','Jan','Fév','Mar','Avr','Mai','Juin','Juil'];
        const baseTO = Math.max(50, Math.min(90, Math.round(avgBasse / 10)));
        const baseADR = Math.round(avgBasse * 1.2);
        toData = labels.map((_, i) => Math.max(40, Math.min(100, baseTO + Math.round(Math.sin(i / 2) * 8 + (i % 3 === 0 ? 5 : 0)))));
        adrValues = labels.map((_, i) => Math.max(200, baseADR + Math.round(Math.cos(i / 3) * 120 + (i % 2 ? 30 : -20))));
      }

      const cs = getComputedStyle(document.documentElement);
      const accent = cs.getPropertyValue('--accent').trim() || '#6366f1';
      const cyan = cs.getPropertyValue('--cyan').trim() || '#06b6d4';

      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }

      chartRef.current = new Chart(canvas, {
        type: 'line',
        data: {
          labels,
          datasets: [
            {
              label: 'T.O. (%)',
              data: toData,
              borderColor: accent,
              backgroundColor: accent,
              tension: 0.3,
              pointRadius: 3,
              fill: false,
              yAxisID: 'y',
            },
            {
              label: 'ADR (DH)',
              data: adrValues,
              borderColor: cyan,
              backgroundColor: cyan,
              tension: 0.3,
              pointRadius: 3,
              fill: false,
              yAxisID: 'y1',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'top' } },
          scales: {
            y: { type: 'linear', position: 'left', ticks: { callback: (v) => String(v) + '%' } },
            y1: { type: 'linear', position: 'right', grid: { drawOnChartArea: false }, ticks: { callback: (v) => String(v) } },
            x: { grid: { display: false } },
          },
        },
      });
    }

    buildChart();

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [propLabels, occupancyData, adrData, year]);

  return <canvas ref={canvasRef} id="chartTO" style={{ width: '100%', height: 200 }} />;
}
