import "./style.css";
import { create, all } from "mathjs";
import {
  Chart,
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Legend,
} from "chart.js";

// Register Chart.js components
Chart.register(
  LineController,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Title,
  Legend
);

const math = create(all);

document
  .getElementById("find-root-btn")
  ?.addEventListener("click", function () {
    const funcInput = (
      document.getElementById("function-input") as HTMLInputElement
    ).value;
    const intervalInput = (
      document.getElementById("interval-input") as HTMLInputElement
    ).value
      .split(",")
      .map((val) => parseFloat(val.trim()));

    const precision = parseFloat(
      (document.getElementById("precision-input") as HTMLInputElement).value
    );

    // Handle invalid inputs
    if (
      !funcInput ||
      !intervalInput ||
      intervalInput.length !== 2 ||
      isNaN(precision)
    ) {
      document.getElementById("error-message")!.innerText =
        "Please provide valid function, interval, and precision.";
      return;
    }
    document.getElementById("error-message")!.innerText = "";

    const bisectionResult = findRootBisection(
      funcInput,
      intervalInput,
      precision
    );

    console.log(bisectionResult);
    const newtonResult = findRootNewton(funcInput, intervalInput, precision);

    document.getElementById("bisection-root")!.innerText =
      bisectionResult.root.toString();
    document.getElementById("bisection-iterations")!.innerText =
      bisectionResult.iterations.toString();
    document.getElementById("newton-root")!.innerText =
      newtonResult.root.toString();
    document.getElementById("newton-iterations")!.innerText =
      newtonResult.iterations.toString();

    plotConvergence(bisectionResult.errors, newtonResult.errors);
  });

function findRootBisection(
  func: string,
  interval: number[],
  precision: number
) {
  console.log(interval);
  let [a, b] = interval;

  // Add debug logs
  console.log("Initial interval:", a, b);

  const parsedFunc = math.parse(func);
  const f = (x: number) => {
    const result = parsedFunc.evaluate({ x });
    console.log(`f(${x}) = ${result}`);
    return result;
  };

  // Check initial values
  const fa = f(a);
  const fb = f(b);
  console.log(`f(${a}) = ${fa}, f(${b}) = ${fb}`);

  if (fa * fb >= 0) {
    throw new Error(
      "The function must have opposite signs at the endpoints of the interval."
    );
  }

  let iterations = 0;
  let errors: number[] = [];
  let root = a;

  while ((b - a) / 2 > precision) {
    root = (a + b) / 2;
    const fMid = f(root);

    // Debug log for each iteration
    console.log(`Iteration ${iterations}: mid = ${root}, f(mid) = ${fMid}`);

    errors.push(Math.abs(fMid));

    if (Math.abs(fMid) < precision) {
      break;
    }

    if (f(a) * fMid < 0) {
      b = root;
    } else {
      a = root;
    }

    iterations++;
  }

  return {
    root: Number(root.toFixed(6)), // Format the root to 6 decimal places
    iterations,
    errors,
  };
}

function plotConvergence(
  bisectionErrors: number[],
  newtonErrors: number[]
): void {
  // Get the canvas element where the chart will be drawn.
  const canvas = document.getElementById(
    "convergence-chart"
  ) as HTMLCanvasElement;
  if (!canvas) {
    console.error('No canvas element with id "chart" found.');
    return;
  }

  // Determine the maximum number of iterations between the two methods.
  const maxIterations = Math.max(bisectionErrors.length, newtonErrors.length);
  // Create iteration labels (1, 2, 3, ...)
  const labels = Array.from({ length: maxIterations }, (_, i) => i + 1);

  // If one error array is shorter than the other, pad it with null values.
  const padData = (data: number[]): (number | null)[] => {
    return Array.from({ length: maxIterations }, (_, i) =>
      i < data.length ? data[i] : null
    );
  };

  const bisectionData = padData(bisectionErrors);
  const newtonData = padData(newtonErrors);

  // Create the data object for Chart.js.
  const data = {
    labels: labels,
    datasets: [
      {
        label: "Bisection Error",
        data: bisectionData,
        borderColor: "rgba(255, 99, 132, 1)",
        backgroundColor: "rgba(255, 99, 132, 0.2)",
        fill: false,
        tension: 0.1,
      },
      {
        label: "Newton Error",
        data: newtonData,
        borderColor: "rgba(54, 162, 235, 1)",
        backgroundColor: "rgba(54, 162, 235, 0.2)",
        fill: false,
        tension: 0.1,
      },
    ],
  };

  // Create the configuration object.
  const config = {
    type: "line" as const,
    data: data,
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "Convergence Plot",
        },
        tooltip: {
          mode: "index" as const,
          intersect: false,
        },
      },
      interaction: {
        mode: "index" as const,
        intersect: false,
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: "Iteration",
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: "Error",
          },
          // Uncomment the next line if you want a logarithmic scale (e.g., when error values span multiple orders of magnitude).
          // type: 'logarithmic'
        },
      },
    },
  };

  // Instantiate and render the chart.
  // (If you re-plot the chart later, you might want to destroy the old chart instance first.)
  new Chart(canvas, config);
}

function findRootNewton(
  func: string,
  interval: number[],
  precision: number,
  maxIterations: number = 100
) {
  // Parse the function and create its derivative using mathjs
  const parsedFunc = math.parse(func);
  const derivative = math.derivative(parsedFunc, "x");

  // Create evaluation functions
  const f = (x: number) => parsedFunc.evaluate({ x });
  const df = (x: number) => derivative.evaluate({ x });

  // Start from the midpoint of the interval
  let x = (interval[0] + interval[1]) / 2;
  let iterations = 0;
  let errors: number[] = [];

  while (iterations < maxIterations) {
    // Calculate function value and derivative
    const fx = f(x);
    const dfx = df(x);

    // Store error
    errors.push(Math.abs(fx));

    // Check if we've reached desired precision
    if (Math.abs(fx) < precision) {
      break;
    }

    // Check if derivative is too close to zero to prevent division by zero
    if (Math.abs(dfx) < 1e-10) {
      throw new Error(
        "Derivative too close to zero. Method failed to converge."
      );
    }

    // Newton's method formula: x = x - f(x)/f'(x)
    const nextX = x - fx / dfx;

    // Check if we're not making significant progress
    if (Math.abs(nextX - x) < precision) {
      break;
    }

    x = nextX;
    iterations++;
  }

  // Check if we actually found a root
  if (iterations === maxIterations) {
    throw new Error("Failed to converge within maximum iterations");
  }

  return {
    root: Number(x.toFixed(6)),
    iterations,
    errors,
  };
}
