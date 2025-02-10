import math

epsilon = 1e-6

def sin(x):
    return math.sin(x)

def g(x):
    return sin(x) + x

def bisection_method(a, b):
    iterations = 0
    
    if sin(a) * sin(b) > 0:
        raise Exception("No root in the given interval")

    while True:
        iterations += 1
        mid = (a + b) / 2  
        
        if sin(mid) == 0 or (b - a) < epsilon:
            return mid, iterations
            
        if sin(a) * sin(mid) < 0:
            b = mid
        else:
            a = mid
        
        print(f"Bisection interval: [{a}, {b}]")

def fixed_point(x0, max_iter=100):
    x = x0
    iterations = 0
    
    while iterations < max_iter:
        iterations += 1
        x_new = g(x)
        
        if abs(x_new - x) < epsilon:
            return x_new, iterations
            
        x = x_new
        print(f"Fixed point iteration {iterations}: {x}")
    
    raise Exception("Fixed point method did not converge")

print("Bisection Method:")
root_b, iter_b = bisection_method(3, 4)
print(f"Root: {root_b}, Iterations: {iter_b}")

print("\nFixed Point Method:")
root_f, iter_f = fixed_point(3)
print(f"Root: {root_f}, Iterations: {iter_f}")
