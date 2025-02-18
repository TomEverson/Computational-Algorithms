import "./style.css";
import Chart from "chart.js/auto";

// ---- Types and Interfaces ----
interface Point {
  x: number;
  y: number;
}

interface Interpolations {
  sle?: { coeffs: number[]; points: Point[] };
  lagrange?: { points: Point[] };
  parametric?: {
    coeffsX: number[];
    coeffsY: number[];
    tValues: number[];
    evalX: (t: number) => number;
    evalY: (t: number) => number;
    points: Point[];
  };
}

let currentInterpolations: Interpolations = {};

// Global Chart instance
let chart: Chart | null = null;

// ---- Utility Functions ----

// Simple Gaussian elimination solver for a small linear system.
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = A.length;
  // Augment A with b
  for (let i = 0; i < n; i++) {
    A[i] = A[i].concat(b[i]);
  }

  // Forward elimination
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(A[k][i]) > Math.abs(A[maxRow][i])) {
        maxRow = k;
      }
    }
    // Swap rows if needed
    if (i !== maxRow) {
      [A[i], A[maxRow]] = [A[maxRow], A[i]];
    }
    // Check for zero pivot
    if (Math.abs(A[i][i]) < 1e-12) {
      throw new Error("Matrix is singular or nearly singular");
    }
    // Eliminate below
    for (let k = i + 1; k < n; k++) {
      const factor = A[k][i] / A[i][i];
      for (let j = i; j <= n; j++) {
        A[k][j] -= factor * A[i][j];
      }
    }
  }

  // Back substitution
  const x: number[] = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = A[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= A[i][j] * x[j];
    }
    x[i] = sum / A[i][i];
  }
  return x;
}

// Given points, build and solve the Vandermonde system for polynomial coefficients.
function interpolateSLE(points: Point[]): number[] {
  const n = points.length;
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      row.push(Math.pow(points[i].x, j));
    }
    A.push(row);
    b.push(points[i].y);
  }
  return solveLinearSystem(A, b);
}

// Evaluate a polynomial (given by its coefficients) at a point x.
function evaluatePolynomial(coeffs: number[], x: number): number {
  let result = 0;
  for (let i = 0; i < coeffs.length; i++) {
    result += coeffs[i] * Math.pow(x, i);
  }
  return result;
}

// Evaluate the Lagrange interpolation polynomial at x (using the provided points).
function evaluateLagrange(points: Point[], x: number): number {
  const n = points.length;
  let result = 0;
  for (let i = 0; i < n; i++) {
    let term = points[i].y;
    for (let j = 0; j < n; j++) {
      if (j !== i) {
        term *= (x - points[j].x) / (points[i].x - points[j].x);
      }
    }
    result += term;
  }
  return result;
}

// For parametric interpolation, we need to set up a parameter t for each point.
// We use t_i = i/(n-1) so that t ∈ [0,1]. Then interpolate x(t) and y(t) separately.
function interpolateParametric(points: Point[]): {
  coeffsX: number[];
  coeffsY: number[];
  tValues: number[];
  evalX: (t: number) => number;
  evalY: (t: number) => number;
} {
  const n = points.length;
  const tValues: number[] = [];
  const pointsX: Point[] = [];
  const pointsY: Point[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    tValues.push(t);
    pointsX.push({ x: t, y: points[i].x });
    pointsY.push({ x: t, y: points[i].y });
  }

  // Instead, build the Vandermonde matrix explicitly:
  const A: number[][] = [];
  for (let i = 0; i < n; i++) {
    const row: number[] = [];
    for (let j = 0; j < n; j++) {
      row.push(Math.pow(tValues[i], j));
    }
    A.push(row);
  }
  const coeffsX2 = solveLinearSystem(
    A.map((row) => [...row]),
    pointsX.map((pt) => pt.y)
  );
  const coeffsY = solveLinearSystem(
    A.map((row) => [...row]),
    pointsY.map((pt) => pt.y)
  );
  return {
    coeffsX: coeffsX2,
    coeffsY,
    tValues,
    evalX: (t: number) => evaluatePolynomial(coeffsX2, t),
    evalY: (t: number) => evaluatePolynomial(coeffsY, t),
  };
}

// A simple parser to turn a user-entered function string into a callable function.
// This function does a simple replacement so that e.g. "sin(x)" becomes "Math.sin(x)".
function parseFunction(expr: string): (x: number) => number {
  // Replace common math functions with Math.*
  const funcs = ["sin", "cos", "tan", "exp", "log", "sqrt", "abs"];
  funcs.forEach((fn) => {
    // Use regex to replace function names that are not already preceded by "Math."
    expr = expr.replace(
      new RegExp(`(?<!Math\\.)\\b${fn}\\b`, "g"),
      `Math.${fn}`
    );
  });
  try {
    // Create a new function with x as the parameter.
    // (Be careful: using Function() can be a security risk in other contexts.)
    return new Function("x", `return ${expr};`) as (x: number) => number;
  } catch (err) {
    throw new Error("Invalid function expression");
  }
}

// Parse file content containing points (format: "0,0; 1,1; 2,4; 3,6; …")
function parsePoints(fileContent: string): Point[] {
  const points: Point[] = [];
  // Allow semicolons or newlines as separators.
  const parts = fileContent.split(/;|\n/);
  parts.forEach((part) => {
    const trimmed = part.trim();
    if (trimmed) {
      const [xStr, yStr] = trimmed.split(",");
      if (xStr === undefined || yStr === undefined) {
        throw new Error("Invalid point format");
      }
      const x = parseFloat(xStr);
      const y = parseFloat(yStr);
      if (isNaN(x) || isNaN(y)) {
        throw new Error("Invalid numeric value in point");
      }
      points.push({ x, y });
    }
  });
  // Sort by x so that our plotting domain is [min_x, max_x]
  points.sort((a, b) => a.x - b.x);
  return points;
}

// Generate an array of numbers between start and end (inclusive) with given count.
function linspace(start: number, end: number, count: number): number[] {
  const arr: number[] = [];
  const step = (end - start) / (count - 1);
  for (let i = 0; i < count; i++) {
    arr.push(start + step * i);
  }
  return arr;
}

// Plot data using Chart.js
function plotData(
  series: {
    label: string;
    data: { x: number; y: number }[];
    borderColor: string;
    showLine?: boolean;
    pointRadius?: number;
  }[]
) {
  const ctx = (
    document.getElementById("plotCanvas") as HTMLCanvasElement
  ).getContext("2d")!;
  if (chart !== null) {
    chart.destroy();
  }
  chart = new Chart(ctx, {
    type: "scatter",
    data: {
      datasets: series.map((s) => ({
        label: s.label,
        data: s.data,
        borderColor: s.borderColor,
        backgroundColor: s.borderColor,
        showLine: s.showLine ?? true,
        fill: false,
        pointRadius: s.pointRadius ?? 0,
      })),
    },
    options: {
      scales: {
        x: {
          type: "linear",
          position: "bottom",
          title: { display: true, text: "x" },
        },
        y: { title: { display: true, text: "y" } },
      },
    },
  });
}

// ---- Main Event Handlers ----

const inputTypeRadios = document.getElementsByName("inputType");
const functionInputDiv = document.getElementById(
  "function-input"
) as HTMLDivElement;
const fileInputDiv = document.getElementById("file-input") as HTMLDivElement;
const evalParametricDiv = document.getElementById(
  "eval-parametric"
) as HTMLDivElement;
const messageDiv = document.getElementById("message") as HTMLDivElement;

// Show/hide input sections based on selected input type.
inputTypeRadios.forEach((radio) => {
  radio.addEventListener("change", () => {
    const selected = (
      document.querySelector(
        'input[name="inputType"]:checked'
      ) as HTMLInputElement
    ).value;
    if (selected === "function") {
      functionInputDiv.style.display = "block";
      fileInputDiv.style.display = "none";
    } else {
      functionInputDiv.style.display = "none";
      fileInputDiv.style.display = "block";
    }
  });
});

// Compute Button
document.getElementById("computeBtn")!.addEventListener("click", async () => {
  messageDiv.textContent = "";
  currentInterpolations = {};
  let points: Point[] = [];
  try {
    const selectedInput = (
      document.querySelector(
        'input[name="inputType"]:checked'
      ) as HTMLInputElement
    ).value;
    if (selectedInput === "function") {
      // Get function expression, interval and degree
      const expr = (
        document.getElementById("functionExpression") as HTMLInputElement
      ).value;
      const f = parseFunction(expr);
      const a = parseFloat(
        (document.getElementById("intervalStart") as HTMLInputElement).value
      );
      const b = parseFloat(
        (document.getElementById("intervalEnd") as HTMLInputElement).value
      );
      const deg = parseInt(
        (document.getElementById("polyDegree") as HTMLInputElement).value
      );
      if (isNaN(a) || isNaN(b) || isNaN(deg) || deg < 0) {
        throw new Error("Invalid interval or degree");
      }
      // Use degree+1 points (uniformly spaced)
      const xs = linspace(a, b, deg + 1);
      points = xs.map((x) => ({ x, y: f(x) }));
    } else {
      // File input: read file content and parse points
      const fileInput = document.getElementById(
        "fileUpload"
      ) as HTMLInputElement;
      if (!fileInput.files || fileInput.files.length === 0) {
        throw new Error("No file selected");
      }
      const file = fileInput.files[0];
      const content = await file.text();
      points = parsePoints(content);
      if (points.length < 2) {
        throw new Error("At least 2 points are required");
      }
    }

    // Determine interpolation domain: from leftmost to rightmost x.
    const xDomain = { min: points[0].x, max: points[points.length - 1].x };

    // Prepare series to plot (always include the original points)
    const series: {
      label: string;
      data: { x: number; y: number }[];
      borderColor: string;
      showLine?: boolean;
      pointRadius?: number;
    }[] = [
      {
        label: "Interpolation Points",
        data: points,
        borderColor: "black",
        showLine: false,
        pointRadius: 4,
      },
    ];

    // Which methods are selected?
    const useSLE = (document.getElementById("methodSLE") as HTMLInputElement)
      .checked;
    const useLagrange = (
      document.getElementById("methodLagrange") as HTMLInputElement
    ).checked;
    const useParametric = (
      document.getElementById("methodParametric") as HTMLInputElement
    ).checked;
    // Show/hide parametric evaluation section
    evalParametricDiv.style.display = useParametric ? "block" : "none";

    // For SLE and Lagrange we assume a function y = P(x) defined on [min, max]
    const denseX = linspace(xDomain.min, xDomain.max, 200);

    if (useSLE) {
      const coeffs = interpolateSLE(points);
      currentInterpolations.sle = { coeffs, points };
      const data = denseX.map((x) => ({ x, y: evaluatePolynomial(coeffs, x) }));
      series.push({ label: "SLE Interpolation", data, borderColor: "blue" });
    }
    if (useLagrange) {
      currentInterpolations.lagrange = { points };
      const data = denseX.map((x) => ({ x, y: evaluateLagrange(points, x) }));
      series.push({
        label: "Lagrange Interpolation",
        data,
        borderColor: "green",
      });
    }
    if (useParametric) {
      // For parametric interpolation, we work on the parameter t ∈ [0,1].
      const parametric = interpolateParametric(points);
      // Evaluate at 200 values of t and form (x,y) pairs.
      const ts = linspace(0, 1, 200);
      const data = ts.map((t) => ({
        x: parametric.evalX(t),
        y: parametric.evalY(t),
      }));
      currentInterpolations.parametric = { ...parametric, points: data };
      series.push({
        label: "Parametric Interpolation",
        data,
        borderColor: "red",
      });
    }

    // Plot everything on the same chart.
    plotData(series);
  } catch (err: any) {
    messageDiv.textContent = err.message;
  }
});

// Evaluation for function interpolation (SLE and Lagrange)
document.getElementById("evalBtn")!.addEventListener("click", () => {
  const evalXStr = (document.getElementById("evalX") as HTMLInputElement).value;
  const x = parseFloat(evalXStr);
  let resultText = "";
  if (isNaN(x)) {
    resultText = "Invalid x value";
  } else {
    if (currentInterpolations.sle) {
      const ySLE = evaluatePolynomial(currentInterpolations.sle.coeffs, x);
      resultText += `<p>SLE at x=${x}: ${ySLE.toFixed(4)}</p>`;
    }
    if (currentInterpolations.lagrange) {
      const yLag = evaluateLagrange(currentInterpolations.lagrange.points, x);
      resultText += `<p>Lagrange at x=${x}: ${yLag.toFixed(4)}</p>`;
    }
  }
  (document.getElementById("evalResult") as HTMLDivElement).innerHTML =
    resultText;
});

// Evaluation for parametric interpolation (using parameter t)
document.getElementById("evalTBtn")!.addEventListener("click", () => {
  const evalTStr = (document.getElementById("evalT") as HTMLInputElement).value;
  const t = parseFloat(evalTStr);
  let resultText = "";
  if (isNaN(t) || t < 0 || t > 1) {
    resultText = "Invalid t value (must be between 0 and 1)";
  } else {
    if (currentInterpolations.parametric) {
      const xVal = currentInterpolations.parametric.evalX(t);
      const yVal = currentInterpolations.parametric.evalY(t);
      resultText += `<p>Parametric at t=${t}: (x, y) = (${xVal.toFixed(
        4
      )}, ${yVal.toFixed(4)})</p>`;
    }
  }
  (document.getElementById("evalResult") as HTMLDivElement).innerHTML =
    resultText;
});
