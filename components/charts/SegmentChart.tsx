'use client';

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { getTarifs } from '@/lib/api/tarification';

export default function SegmentChart() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    async function buildChart() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const tarifs = await getTarifs();

      // derive labels and values from tarifs categories
      const labels = tarifs.map((t) => t.cat);
      // use moyenne as representative value
      const values = tarifs.map((t) => t.moyenne || ((t.basse + t.haute) / 2));

      const cs = getComputedStyle(document.documentElement);
      const colors = [
        cs.getPropertyValue('--accent').trim() || '#6366f1',
        cs.getPropertyValue('--cyan').trim() || '#06b6d4',
        cs.getPropertyValue('--green').trim() || '#10b981',
        cs.getPropertyValue('--amber').trim() || '#f59e0b',
        cs.getPropertyValue('--rose').trim() || '#fb7185',
        cs.getPropertyValue('--violet').trim() || '#8b5cf6',
      ];

      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }

      chartRef.current = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: labels.map((_, i) => colors[i % colors.length]),
              hoverOffset: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'right' } },
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
  }, []);

  return <canvas ref={canvasRef} id="chartSegments" style={{ width: '100%', height: 200 }} />;
}
