import random


def generate_linear_system(n):
    A = [[0 for _ in range(n)] for _ in range(n)]
    for i in range(n):
        row_sum = 0
        for j in range(n):
            if i != j:
                A[i][j] = random.randint(1, 5)
                row_sum += abs(A[i][j])

        A[i][i] = row_sum + random.randint(1, 5)
    x = [random.randint(1, 10) for _ in range(n)]
    b = [sum(A[i][j] * x[j] for j in range(n)) for i in range(n)]
    return A, b, x


def generate_diagonalized_hilbert_system(n):
    A = []
    for i in range(n):
        row = []
        for j in range(n):
            if i != j:
                row.append(1 / (i + j + 1))
            else:
                row.append(10)
        A.append(row)

    x = [random.randint(1, 10) for _ in range(n)]

    b = [sum(A[i][j] * x[j] for j in range(n)) for i in range(n)]

    return A, b, x


def print_matrix(matrix):
    for row in matrix:
        print('  '.join(f"{elem:8.4f}" for elem in row))
    print()


def get_initial_approximation(exact_solution):
    return [x + random.uniform(-0.5, 0.5) for x in exact_solution]


def jacobi_iteration(A, b, x_initial, max_iter, tol=1e-10):
    n = len(A)
    x = x_initial[:]

    for iter_count in range(max_iter):
        print("Iterations :", iter_count + 1)
        print("Current Vector :", x)
        print()

        new_x = x[:]
        for i in range(n):
            s = 0
            for j in range(n):
                if i != j:
                    s += A[i][j] * x[j]
            new_x[i] = (b[i] - s) / A[i][i]

        diff = [abs(new_x[i] - x[i]) for i in range(n)]
        if max(diff) < tol:
            return new_x
        x = new_x
    return x


def gauss_seidel_iteration(A, b, x_initial, max_iter, tol=1e-10):
    n = len(A)
    x = x_initial[:]
    for _ in range(max_iter):
        new_x = x[:]
        for i in range(n):
            s1 = sum(A[i][j] * new_x[j] for j in range(i))
            s2 = sum(A[i][j] * x[j] for j in range(i+1, n))
            new_x[i] = (b[i] - s1 - s2) / A[i][i]
        diff = [abs(new_x[i] - x[i]) for i in range(n)]
        if max(diff) < tol:
            return new_x
        x = new_x
    return x


def test_system(n):
    print("Random Matrix")
    A, b, exact_solution = generate_linear_system(n)

    print("Initial Matrix: ")
    print_matrix(A)

    x_initial = get_initial_approximation(exact_solution)

    x_computed = gauss_seidel_iteration(A, b, x_initial, max_iter=10)
    print("Exact solution:", exact_solution)
    print("Computed solution:", x_computed)
    print()

    print("Jacob Matrix")
    A, b, exact_solution = generate_diagonalized_hilbert_system(n)

    print("Initial Matrix: ")
    print_matrix(A)

    x_initial = get_initial_approximation(exact_solution)

    x_computed = gauss_seidel_iteration(A, b, x_initial, max_iter=10)
    print("Exact solution:", exact_solution)
    print("Computed solution:", x_computed)
    print()


if __name__ == "__main__":
    for n in [3, 5, 8]:
        test_system(n)
