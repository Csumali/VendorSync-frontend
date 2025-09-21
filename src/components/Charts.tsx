'use client';

import { useEffect, useRef, useState } from 'react';
import { Vendor, OptimizationMode } from '@/types';
import styles from './Charts.module.css';

interface ChartsProps {
  vendors: Vendor[];
  savingsSeries: number[];
  optimizationMode: OptimizationMode;
}

export default function Charts({ vendors, savingsSeries, optimizationMode }: ChartsProps) {
  const lineChartRef = useRef<HTMLCanvasElement>(null);
  const barChartRef = useRef<HTMLCanvasElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  const drawLineChart = (canvas: HTMLCanvasElement, series: number[]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width = canvas.clientWidth * devicePixelRatio;
    const h = canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0b121a';
    ctx.fillRect(0, 0, w / devicePixelRatio, h / devicePixelRatio);

    const pad = 18;
    const W = canvas.clientWidth - pad * 2;
    const H = canvas.clientHeight - pad * 2;
    const min = Math.min(...series);
    const max = Math.max(...series);
    const range = (max - min) || 1;

    // grid
    ctx.strokeStyle = '#223142';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = pad + (H / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(pad + W, y);
      ctx.stroke();
    }

    // line
    ctx.beginPath();
    series.forEach((v, i) => {
      const x = pad + (W / (series.length - 1)) * i;
      const y = pad + H - ((v - min) / range) * H;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, '#7cc4ff');
    grad.addColorStop(1, '#19476b');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // fill under
    const path = new Path2D();
    series.forEach((v, i) => {
      const x = pad + (W / (series.length - 1)) * i;
      const y = pad + H - ((v - min) / range) * H;
      i ? path.lineTo(x, y) : path.moveTo(x, y);
    });
    path.lineTo(pad + W, pad + H);
    path.lineTo(pad, pad + H);
    path.closePath();
    const fill = ctx.createLinearGradient(0, pad, 0, pad + H);
    fill.addColorStop(0, 'rgba(124, 196, 255, 0.25)');
    fill.addColorStop(1, 'rgba(25, 71, 107, 0.05)');
    ctx.fillStyle = fill;
    ctx.fill(path);
  };

  const drawBarChart = (canvas: HTMLCanvasElement, labels: string[], values: number[]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width = canvas.clientWidth * devicePixelRatio;
    const h = canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0b121a';
    ctx.fillRect(0, 0, w / devicePixelRatio, h / devicePixelRatio);

    const pad = 18;
    const W = canvas.clientWidth - pad * 2;
    const H = canvas.clientHeight - pad * 2;
    const maxVal = Math.max(...values.map(v => Math.abs(v))) || 1;
    const barW = W / (values.length * 1.5);

    // axis
    ctx.strokeStyle = '#223142';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad, pad + H);
    ctx.lineTo(pad + W, pad + H);
    ctx.stroke();

    values.forEach((v, i) => {
      const x = pad + i * (barW * 1.5) + barW * 0.25;
      const hVal = (Math.abs(v) / maxVal) * (H * 0.9);
      const y = pad + (v >= 0 ? H - hVal : H);
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, v >= 0 ? '#8affc1' : '#ff7b7b');
      grad.addColorStop(1, v >= 0 ? '#0f6e4b' : '#7a2b2b');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, barW, hVal);
      ctx.fillStyle = '#9fb0c0';
      ctx.font = '12px system-ui';
      ctx.fillText(labels[i], x, pad + H + 14);
    });
  };

  useEffect(() => {
    if (lineChartRef.current) {
      const tweak = optimizationMode === 'Max Savings' ? 1.08 : (optimizationMode === 'Cash Heavy' ? 0.95 : 1.0);
      drawLineChart(lineChartRef.current, savingsSeries.map(v => Math.round(v * tweak)));
    }
  }, [savingsSeries, optimizationMode]);

  useEffect(() => {
    if (barChartRef.current) {
      const priceLabels = vendors.map(v => v.name.split(' ')[0]);
      const priceValues = vendors.map(v => v.priceDelta);
      drawBarChart(barChartRef.current, priceLabels, priceValues);
    }
  }, [vendors]);

  useEffect(() => {
    const handleResize = () => {
      if (lineChartRef.current) {
        const tweak = optimizationMode === 'Max Savings' ? 1.08 : (optimizationMode === 'Cash Heavy' ? 0.95 : 1.0);
        drawLineChart(lineChartRef.current, savingsSeries.map(v => Math.round(v * tweak)));
      }
      if (barChartRef.current) {
        const priceLabels = vendors.map(v => v.name.split(' ')[0]);
        const priceValues = vendors.map(v => v.priceDelta);
        drawBarChart(barChartRef.current, priceLabels, priceValues);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [vendors, savingsSeries, optimizationMode]);

  // Check if scrolling is needed on mobile
  useEffect(() => {
    const checkScrollNeed = () => {
      if (window.innerWidth <= 768) {
        setShowScrollHint(true);
        // Hide hint after 3 seconds
        setTimeout(() => setShowScrollHint(false), 3000);
      }
    };
    
    checkScrollNeed();
  }, [vendors, savingsSeries]); // Re-check when data changes

  return (
    <div className={styles.charts}>
      {showScrollHint && (
        <div className={styles.scrollHint}>
          ← Swipe charts to see full data →
        </div>
      )}
      <div className={styles.card}>
        <h3>Cash Flow & Savings Projection</h3>
        <div className={styles.chartContainer}>
          <canvas ref={lineChartRef} height={160}></canvas>
        </div>
        <div className={styles.footer}>
          <span>Optimization Mode: <strong>{optimizationMode}</strong></span>
          <span className={styles.deltaUp}>Potential +$3.2k/yr</span>
        </div>
      </div>
      <div className={styles.card}>
        <h3>Price Change Watchlist (30d)</h3>
        <div className={styles.chartContainer}>
          <canvas ref={barChartRef} height={140}></canvas>
        </div>
        <div className={styles.footer}>
          <span>🧾 Top 5 vendors by spend</span>
          <span className={styles.deltaDown}>Review ↑ increases</span>
        </div>
      </div>
    </div>
  );
}
