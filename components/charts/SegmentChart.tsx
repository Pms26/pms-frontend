'use client';

import { useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface SegmentPieData {
  label: string;
  value: number;
  color: string;
}

interface SegmentBarData {
  label: string;
  revenue: number;
  color: string;
}

interface SegmentChartProps {
  type?: 'doughnut' | 'bar';
  pieData?: SegmentPieData[];
  barData?: SegmentBarData[];
}

export default function SegmentChart({ type = 'doughnut', pieData, barData }: SegmentChartProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let chartType: 'doughnut' | 'bar' = type;
    let labels: string[] = [];
    let values: number[] = [];
    let colors: string[] = [];

    if (type === 'doughnut' && pieData && pieData.length > 0) {
      labels = pieData.map((d) => d.label);
      values = pieData.map((d) => d.value);
      colors = pieData.map((d) => d.color);
    } else if (type === 'bar' && barData && barData.length > 0) {
      labels = barData.map((d) => d.label);
      values = barData.map((d) => d.revenue);
      const cs = getComputedStyle(document.documentElement);
      const defaultColors = [
        cs.getPropertyValue('--accent').trim() || '#6366f1',
        cs.getPropertyValue('--cyan').trim() || '#06b6d4',
        cs.getPropertyValue('--green').trim() || '#10b981',
        cs.getPropertyValue('--amber').trim() || '#f59e0b',
        cs.getPropertyValue('--rose').trim() || '#fb7185',
        cs.getPropertyValue('--violet').trim() || '#8b5cf6',
      ];
      colors = barData[0].color
        ? barData.map((d) => d.color)
        : labels.map((_, i) => defaultColors[i % defaultColors.length]);
    }

    if (chartRef.current) {
      chartRef.current.destroy();
      chartRef.current = null;
    }

    if (labels.length === 0) return;

    chartRef.current = new Chart(canvas, {
      type: chartType,
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: colors,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { position: 'right' } },
        scales: chartType === 'bar' ? {
          y: { beginAtZero: true, ticks: { callback: (v) => Number(v).toLocaleString('fr-FR') + ' DH' } },
          x: { grid: { display: false } },
        } : undefined,
      },
    });

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [type, pieData, barData]);

  return <canvas ref={canvasRef} id="chartSegments" style={{ width: '100%', height: 200 }} />;
}
