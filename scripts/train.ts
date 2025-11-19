import fs from "fs";
import path from "path";

type Row = Record<string, number>;

function parseArgs() {
  const args = process.argv.slice(2);
  let data = "data/car_prices.csv";
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a.startsWith("--data=")) data = a.split("=")[1];
    else if (a === "--data" && args[i + 1]) data = args[i + 1];
  }
  return { data };
}

function readCsv(file: string) {
  const full = path.resolve(process.cwd(), file);
  const text = fs.readFileSync(full, "utf-8");
  const lines = text.trim().split(/\r?\n/);
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    const obj: Row = {} as any;
    for (let j = 0; j < headers.length; j++) {
      const v = Number(cols[j]);
      if (!Number.isFinite(v)) continue;
      obj[headers[j]] = v;
    }
    rows.push(obj);
  }
  return { headers, rows };
}

function selectXY(rows: Row[], features: string[], target: string) {
  const X: number[][] = [];
  const y: number[] = [];
  for (const r of rows) {
    if (!features.every((f) => f in r)) continue;
    if (!(target in r)) continue;
    const x = [1, ...features.map((f) => r[f])];
    X.push(x);
    y.push(r[target]);
  }
  return { X, y };
}

function normalize(X: number[][]) {
  const n = X.length;
  const d = X[0].length;
  const means = new Array(d).fill(0);
  const stds = new Array(d).fill(1);
  for (let j = 1; j < d; j++) {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += X[i][j];
    const m = sum / n;
    let varSum = 0;
    for (let i = 0; i < n; i++) varSum += (X[i][j] - m) ** 2;
    const s = Math.sqrt(varSum / Math.max(1, n - 1)) || 1;
    means[j] = m;
    stds[j] = s;
    for (let i = 0; i < n; i++) X[i][j] = (X[i][j] - m) / s;
  }
  return { means, stds };
}

function trainLinearGD(X: number[][], y: number[], lr: number, epochs: number) {
  const n = X.length;
  const d = X[0].length;
  let w = new Array(d).fill(0);
  for (let e = 0; e < epochs; e++) {
    const pred = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < d; j++) s += X[i][j] * w[j];
      pred[i] = s;
    }
    const grad = new Array(d).fill(0);
    for (let j = 0; j < d; j++) {
      let g = 0;
      for (let i = 0; i < n; i++) g += (pred[i] - y[i]) * X[i][j];
      grad[j] = g / n;
    }
    for (let j = 0; j < d; j++) w[j] -= lr * grad[j];
  }
  return w;
}

function predict(X: number[][], w: number[]) {
  const n = X.length;
  const d = X[0].length;
  const out = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let s = 0;
    for (let j = 0; j < d; j++) s += X[i][j] * w[j];
    out[i] = s;
  }
  return out;
}

function rmse(y: number[], p: number[]) {
  let s = 0;
  for (let i = 0; i < y.length; i++) s += (y[i] - p[i]) ** 2;
  return Math.sqrt(s / y.length);
}

function r2(y: number[], p: number[]) {
  let ssRes = 0;
  let ssTot = 0;
  let m = 0;
  for (let i = 0; i < y.length; i++) m += y[i];
  m /= y.length;
  for (let i = 0; i < y.length; i++) {
    ssRes += (y[i] - p[i]) ** 2;
    ssTot += (y[i] - m) ** 2;
  }
  return 1 - ssRes / ssTot;
}

async function main() {
  const { data } = parseArgs();
  const { rows } = readCsv(data);
  const features = ["mileage", "age", "owners"];
  const target = "price";
  const { X, y } = selectXY(rows, features, target);
  if (X.length === 0) {
    console.error("No valid rows parsed from CSV");
    process.exit(1);
  }
  normalize(X);
  const w = trainLinearGD(X, y, 0.01, 2000);
  const p = predict(X, w);
  const rm = rmse(y, p);
  const score = r2(y, p);
  console.log(JSON.stringify({ rows: X.length, rmse: rm, r2: score, weights: w }));
}

main();