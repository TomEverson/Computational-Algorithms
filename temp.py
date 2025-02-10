import math


def fixed_point(f, x0, max_iter=1000000, epsilon=1e-10):
    x = x0
    for i in range(max_iter):
        try:
            x_new = f(x)
        except OverflowError:
            print(f"Overflow error at iteration {i+1} for x = {x}")
            return None, i + 1
        if abs(x_new - x) < epsilon:
            return x_new, i + 1
        x = x_new
    return x, max_iter


def f(x):
    return -1/100 * (x**2 - x - 2) + x


for i in range(1, 4):
    print(fixed_point(f, i))
