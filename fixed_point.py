import math

def fixed_point(f, x0, max_iter=1000000):
    x = x0
    for i in range(max_iter):
        try:
            x_new = f(x)
        except OverflowError:
            print(f"Overflow error at iteration {i+1} for x = {x}")
            return None, i + 1
        if abs(x_new - x) == 0:
            return x_new, i + 1
        x = x_new
    return x, max_iter

def g(x):
    return (x ** 2) - 2

def g2(x):
    return math.sqrt(x + 2)

def g3(x):
    return (x + 2) / x


points = [2.1, 1.8, 0.5, -0.5]
func = [g, g2, g3]

for f in func:
    print(f"\nTesting function {f.__name__}:")
    for p in points:
        result, iterations = fixed_point(f, p)
        if result is not None:
            print(f"Starting point {p}: Converged to {result} after {iterations} iterations.")
        else:
            print(f"Starting point {p}: Failed to converge.")
