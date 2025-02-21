#include <iostream>
#include <eigen3/Eigen/Dense>
#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"
#define STB_IMAGE_WRITE_IMPLEMENTATION
#include "stb_image_write.h"
#include <vector>
#include <complex>
#include <algorithm>
#include <math.h>

using namespace std;
using namespace Eigen;

typedef complex<double> Complex;
typedef Matrix<Complex, Dynamic, Dynamic> ComplexMatrix;
typedef MatrixXd RealMatrix;

// Improved fftshift implementation with rotation fix
ComplexMatrix fftshift(const ComplexMatrix &input)
{

    cout << "FFT Shift" << endl;

    int rows = input.rows();
    int cols = input.cols();
    ComplexMatrix shifted(rows, cols);

    int row_mid = rows / 2;
    int col_mid = cols / 2;

    // Handle both even and odd dimensions
    for (int i = 0; i < rows; i++)
    {
        for (int j = 0; j < cols; j++)
        {
            // Calculate new positions with proper wrapping
            int new_i = (i + row_mid) % rows;
            int new_j = (j + col_mid) % cols;
            shifted(new_i, new_j) = input(i, j);
        }
    }

    return shifted;
}

// If you want to perform inverse shift, you can use the same function
// but with negative offsets
ComplexMatrix ifftshift(const ComplexMatrix &input)
{

    cout << "Inverse FFT Shift" << endl;

    int rows = input.rows();
    int cols = input.cols();
    ComplexMatrix shifted(rows, cols);

    // For odd dimensions, we want to floor when calculating midpoints
    int row_mid = rows / 2;
    int col_mid = cols / 2;

    // Copy the quadrants with rotation correction
    for (int i = 0; i < rows; i++)
    {
        for (int j = 0; j < cols; j++)
        {
            // Apply 180-degree rotation by adding an extra rows/2 and cols/2
            int new_i = (i + row_mid * 2) % rows;
            int new_j = (j + col_mid * 2) % cols;
            shifted(new_i, new_j) = input(i, j);
        }
    }

    return shifted;
}

// Function to load image using stb_image
unsigned char *load_image(const char *file_path, int &width, int &height, int &channels)
{
    unsigned char *image = stbi_load(file_path, &width, &height, &channels, 0);
    if (image == nullptr)
    {
        cout << "Failed to load image!" << endl;
        exit(-1);
    }
    cout << "Loaded image with width: " << width << ", height: " << height << ", channels: " << channels << endl;
    return image;
}

// Function to convert an RGB image to Grayscale
MatrixXd convert_to_grayscale(unsigned char *image, int width, int height, int channels)
{
    // Create a matrix to store the grayscale image
    MatrixXd gray_image(height, width);

    // Check if the image is already grayscale
    if (channels == 1)
    {
        for (int y = 0; y < height; ++y)
        {
            for (int x = 0; x < width; ++x)
            {
                gray_image(y, x) = static_cast<double>(image[y * width + x]) / 255.0;
            }
        }
        cout << "Image is already grayscale." << endl;
    }
    // Convert RGB to Grayscale
    else if (channels == 3)
    {
        for (int y = 0; y < height; ++y)
        {
            for (int x = 0; x < width; ++x)
            {
                int index = (y * width + x) * channels;
                double r = static_cast<double>(image[index]) / 255.0;
                double g = static_cast<double>(image[index + 1]) / 255.0;
                double b = static_cast<double>(image[index + 2]) / 255.0;

                // Grayscale value using luminosity method
                gray_image(y, x) = 0.299 * r + 0.587 * g + 0.114 * b;
            }
        }
        cout << "Converted RGB image to grayscale." << endl;
    }
    else
    {
        cout << "Unsupported image format with " << channels << " channels." << endl;
        exit(-1);
    }

    return gray_image;
}

ComplexMatrix dft_matrix(int N)
{
    ComplexMatrix W(N, N);
    const Complex j(0, 1);

    for (int k = 0; k < N; ++k)
    {
        for (int n = 0; n < N; ++n)
        {
            double angle = -2.0 * M_PI * k * n / N;
            W(k, n) = exp(-j * Complex(angle));
        }
    }
    return W;
}

// Function to apply 2D DFT using matrix multiplication
ComplexMatrix generate_dft(const MatrixXd &img)
{
    cout << "Generating DFT" << endl;
    int M = img.rows();
    int N = img.cols();

    // Create DFT matrices for rows and columns
    ComplexMatrix W_M = dft_matrix(M);
    ComplexMatrix W_N = dft_matrix(N);

    // Convert the input image to complex type
    ComplexMatrix img_complex(M, N);
    for (int i = 0; i < M; ++i)
    {
        for (int j = 0; j < N; ++j)
        {
            img_complex(i, j) = Complex(img(i, j), 0.0);
        }
    }

    // Apply DFT first on columns, then on rows
    ComplexMatrix row_dft = W_M * img_complex; // DFT of rows
    ComplexMatrix dft_result = row_dft * W_N;  // DFT of columns

    return dft_result;
}

// Function to flatten the 2D DFT result and calculate magnitudes
vector<double> calculate_magnitudes(const ComplexMatrix &dft)
{
    vector<double> magnitudes;
    for (int i = 0; i < dft.rows(); ++i)
    {
        for (int j = 0; j < dft.cols(); ++j)
        {
            magnitudes.push_back(abs(dft(i, j)));
        }
    }
    return magnitudes;
}

// Function to compress the image by zeroing out small coefficients
ComplexMatrix compress_img(const ComplexMatrix &dft, double compression_rate = 0.1)
{

    cout << "Compressing Image" << endl;

    int M = dft.rows();
    int N = dft.cols();

    // Calculate magnitudes and keep track of indices
    vector<pair<double, pair<int, int>>> magnitude_indices;
    for (int i = 0; i < M; ++i)
    {
        for (int j = 0; j < N; ++j)
        {
            magnitude_indices.push_back({abs(dft(i, j)), {i, j}});
        }
    }

    // Sort by magnitude
    sort(magnitude_indices.begin(), magnitude_indices.end());

    // Create compressed matrix
    ComplexMatrix dft_compressed = ComplexMatrix::Zero(M, N);

    // Keep only the top coefficients
    int keep_count = static_cast<int>(M * N * compression_rate);
    for (int i = magnitude_indices.size() - keep_count; i < magnitude_indices.size(); ++i)
    {
        auto &entry = magnitude_indices[i];
        int row = entry.second.first;
        int col = entry.second.second;
        dft_compressed(row, col) = dft(row, col);
    }

    return dft_compressed;
}

// Function to manually perform ifftshift
ComplexMatrix manual_ifftshift(const ComplexMatrix &dft_compressed)
{
    int M = dft_compressed.rows();
    int N = dft_compressed.cols();

    // Calculate the center indices (handles both even and odd dimensions)
    int half_M = (M + 1) / 2;
    int half_N = (N + 1) / 2;

    // Create a matrix to store the shifted result
    ComplexMatrix dft_ishifted(M, N);

    // Top-left ↔ Bottom-right
    dft_ishifted.topLeftCorner(M - half_M, N - half_N) = dft_compressed.bottomRightCorner(M - half_M, N - half_N);
    dft_ishifted.bottomRightCorner(M - half_M, N - half_N) = dft_compressed.topLeftCorner(M - half_M, N - half_N);

    // Top-right ↔ Bottom-left
    dft_ishifted.topRightCorner(M - half_M, half_N) = dft_compressed.bottomLeftCorner(M - half_M, half_N);
    dft_ishifted.bottomLeftCorner(M - half_M, half_N) = dft_compressed.topRightCorner(M - half_M, half_N);

    return dft_ishifted;
}

ComplexMatrix inverse_dft_matrix(int N)
{
    ComplexMatrix W(N, N);
    const Complex j(0, 1);

    for (int k = 0; k < N; ++k)
    {
        for (int n = 0; n < N; ++n)
        {
            double angle = 2.0 * M_PI * k * n / N;
            W(k, n) = exp(j * Complex(angle)) / static_cast<double>(N);
        }
    }
    return W;
}

// Function to apply 2D Inverse DFT using matrix multiplication
RealMatrix apply_inverse_dft(const ComplexMatrix &dft_compressed)
{

    cout << "Apply Inverse DFT" << endl;

    int M = dft_compressed.rows();
    int N = dft_compressed.cols();

    ComplexMatrix W_M = inverse_dft_matrix(M);
    ComplexMatrix W_N = inverse_dft_matrix(N);

    ComplexMatrix reconstructed_complex = W_M * dft_compressed * W_N;

    // Improved normalization
    RealMatrix reconstructed_image(M, N);
    double min_val = numeric_limits<double>::max();
    double max_val = numeric_limits<double>::lowest();

    // First pass: find min and max values
    for (int i = 0; i < M; ++i)
    {
        for (int j = 0; j < N; ++j)
        {
            double val = abs(reconstructed_complex(i, j));
            min_val = min(min_val, val);
            max_val = max(max_val, val);
        }
    }

    double range = max_val - min_val;
    // Second pass: normalize to [0,1] range with 180-degree rotation
    for (int i = 0; i < M; ++i)
    {
        for (int j = 0; j < N; ++j)
        {
            // Apply 180-degree rotation by reversing indices
            int rotated_i = M - 1 - i;
            int rotated_j = N - 1 - j;
            reconstructed_image(rotated_i, rotated_j) = (abs(reconstructed_complex(i, j)) - min_val) / range;
        }
    }

    return reconstructed_image;
}

// Function to save the reconstructed image as PNG
void save_image(const RealMatrix &image, const char *filename)
{
    int width = image.cols();
    int height = image.rows();

    // Convert Eigen Matrix to unsigned char array
    unsigned char *img_data = new unsigned char[width * height];

    for (int y = 0; y < height; ++y)
    {
        for (int x = 0; x < width; ++x)
        {
            // Scale to [0, 255] and cast to unsigned char
            img_data[y * width + x] = static_cast<unsigned char>(image(y, x) * 255.0);
        }
    }

    // Save as JPG (grayscale, 1 channel)
    stbi_write_jpg(filename, width, height, 1, img_data, width, 10);

    // Free the image memory
    delete[] img_data;

    cout << "Image saved as " << filename << endl;
}

int main()
{
    int width, height, channels;

    // Load the image
    unsigned char *image = load_image("img.png", width, height, channels);

    // Convert to grayscale
    MatrixXd gray_image = convert_to_grayscale(image, width, height, channels);

    // Calculate the DFT
    ComplexMatrix dft_result = generate_dft(gray_image);

    // Shift Before Compression
    ComplexMatrix dft_shifted = fftshift(dft_result);

    // Compress the DFT result with a compression rate of 10%
    ComplexMatrix dft_compressed = compress_img(dft_shifted, 0.01);

    // UnShift the Image
    ComplexMatrix dft_unshifted = ifftshift(dft_compressed);

    // Apply the Inverse DFT
    RealMatrix reconstructed_image = apply_inverse_dft(dft_unshifted);

    save_image(reconstructed_image, "reconstructed_image.jpg");

    stbi_image_free(image);

    return 0;
}
