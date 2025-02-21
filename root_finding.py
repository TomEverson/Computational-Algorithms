def f(x):
    return x**4 + 3*x**3 + x**2 - 2*x - 0.5


def bisection_method(f, a, b, tol=1e-6, max_iter=50):
    if f(a) * f(b) >= 0:
        return None

    for _ in range(max_iter):
        c = (a + b) / 2.0
        fc = f(c)
        if abs(fc) < tol or (b - a) / 2 < tol:
            return c
        if f(a) * fc < 0:
            b = c
        else:
            a = c
    return (a + b) / 2.0


def find_roots_bisection(f, a, b, num_subdivisions=100, tol=1e-6, max_iter=50):
    xs = [a + i * (b - a) /
          num_subdivisions for i in range(num_subdivisions + 1)]
    roots = []

    for i in range(num_subdivisions):
        x0, x1 = xs[i], xs[i + 1]
        f0, f1 = f(x0), f(x1)

        if abs(f0) < tol:
            roots.append(x0)
        if f0 * f1 < 0:
            root = bisection_method(f, x0, x1, tol, max_iter)
            if root is not None:
                roots.append(root)

    unique_roots = []
    for r in roots:
        if not any(abs(r - ur) < tol for ur in unique_roots):
            unique_roots.append(r)

    return sorted(unique_roots)


interval_start = -3
interval_end = 2
subdivisions = 200

roots = find_roots_bisection(f, interval_start, interval_end,
                             num_subdivisions=subdivisions, tol=1e-6, max_iter=100)


print(roots)
