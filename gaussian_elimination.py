import random


def generate_linear_system(n):
    A = [[random.randint(1, 10) for _ in range(n)] for _ in range(n)]

    x = [random.randint(1, 10) for _ in range(n)]

    b = [sum(A[i][j] * x[j] for j in range(n)) for i in range(n)]

    return A, b, x


def generate_hilbert_system(n):
    A = [[1 / (i + j + 1) for j in range(n)] for i in range(n)]
    x = [random.randint(1, 10) for _ in range(n)]
    b = [sum(A[i][j] * x[j] for j in range(n)) for i in range(n)]
    return A, b, x


def print_matrix(matrix):
    for row in matrix:
        print('  '.join(f"{elem:8.4f}" for elem in row[:-1]), end='  |  ')
        print(f"{row[-1]:8.4f}")
    print()


def create_augmented_matrix(A, b):
    return [A[i] + [b[i]] for i in range(len(A))]


def forward_elimination(matrix):
    n = len(matrix)

    print("Initial Matrix:")
    print_matrix(matrix)

    for i in range(n):
        max_row = i
        for j in range(i + 1, n):
            if abs(matrix[j][i]) > abs(matrix[max_row][i]):
                max_row = j

        if max_row != i:
            print(f"Swapping row {i} with row {max_row}")
            matrix[i], matrix[max_row] = matrix[max_row], matrix[i]

        pivot = matrix[i][i]
        if abs(pivot) < 1e-10:
            print(
                f"Pivot in row {i} is effectively zero, skipping column {i}.")
            continue

        for j in range(i + 1, n):
            factor = matrix[j][i] / pivot
            print(
                f"Eliminating element in row {j}, column {i} using factor {factor:.4f}.")

            for k in range(i, n + 1):
                matrix[j][k] -= factor * matrix[i][k]

            print(f"After eliminating row {j}:")
            print_matrix(matrix)

    print("Final Upper Triangular Matrix:")
    print_matrix(matrix)
    return matrix


def backward_substitution(matrix):
    n = len(matrix)
    x = [0] * n

    for i in range(n - 1, -1, -1):
        sum_ax = sum(matrix[i][j] * x[j] for j in range(i + 1, n))
        x[i] = (matrix[i][-1] - sum_ax) / matrix[i][i]

    return x


def compute_residue(A, x, b):
    Ax = [sum(A[i][j] * x[j] for j in range(len(x))) for i in range(len(A))]
    residue = [Ax[i] - b[i] for i in range(len(b))]
    return sum(r ** 2 for r in residue) ** 0.5


def test_system(n):
    print(f"Testing N={n}\n")
    print("Random Matrix:")
    A, b, x_actual = generate_linear_system(n)
    matrix = create_augmented_matrix(A, b)
    upper_triangular = forward_elimination(matrix)
    x_computed = backward_substitution(upper_triangular)
    residue = compute_residue(A, x_computed, b)
    print(f"Residue norm: {residue:.4e}\n")

    print("Hilbert Matrix:")
    A, b, x_actual = generate_hilbert_system(n)
    matrix = create_augmented_matrix(A, b)
    upper_triangular = forward_elimination(matrix)
    x_computed = backward_substitution(upper_triangular)
    residue = compute_residue(A, x_computed, b)
    print(f"Residue norm: {residue:.4e}\n")


if __name__ == "__main__":
