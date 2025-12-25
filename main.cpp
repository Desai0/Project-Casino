#include <iostream>
#include <random>
#include <vector>
#include <string>

// --- Simplified Export Structure ---
// Instead of external header, we define it here for DLL export.
// Array size is fixed for simplicity or handled via pointer.
#define MAX_REELS 15 

struct SpinResult {
    int win_ammount;
    int spin_result[MAX_REELS]; // Fixed size array for simplicity across DLL boundary
    int rows;
    int cols;
};

// --- Mock JSON Parser (Simple Config) ---
// Since nlohmann/json is missing, we will use a simple struct for config
// or just hardcode/parse basic values for now to make it buildable.
struct Params {
    std::vector<float> elem_money_modyfier;
    std::vector<float> column_money_modyfier;
    int number_of_rows;
    int number_of_columns;
    int luck_value;
    int bonus_chance;
    int freespins_chance;
    int number_of_elem;

    Params() {
        // Default Config (Mocking what JSON would provide)
        elem_money_modyfier = {1.5f, 2.0f, 5.0f, 10.0f, 50.0f}; // 5 types of fruits
        number_of_elem = elem_money_modyfier.size();
        column_money_modyfier = {2.0f, 5.0f}; // Multipliers for 4th and 5th match
        number_of_rows = 3;
        number_of_columns = 5; // 3 base + 2 from multipliers
        luck_value = 50;
        bonus_chance = 5;
        freespins_chance = 5;
    }
};

int countMoney(int bet, float elem_mod, float col_mod) {
    return (int)(float(bet) * elem_mod * col_mod);
}

std::random_device dev;
std::mt19937 rnd(dev());

// Exported Function
extern "C" {
    #ifdef _WIN32
    __declspec(dllexport)
    #endif
    SpinResult spinSlot(int bet, const char* config_json) {
        // Ignoring JSON string for now to fix build, using default Params
        // In real version, you'd parse config_json here.
        Params params; 
        
        SpinResult ret;
        ret.win_ammount = -bet; // Initial cost
        ret.rows = params.number_of_rows;
        ret.cols = params.number_of_columns;

        // Initialize result array
        for(int i=0; i<MAX_REELS; ++i) ret.spin_result[i] = 0;

    std::uniform_int_distribution<int> dist(0, params.number_of_elem - 1);
        int* grid = ret.spin_result;

        // Generate Grid
        for (int i = 0; i < params.number_of_rows; ++i) {
            for (int j = 0; j < params.number_of_columns; ++j) {
                int index = i * params.number_of_columns + j;
                if (index < MAX_REELS) {
                    grid[index] = dist(rnd);
                }
            }
        }

        // Logic: Check lines (Simplified logic from original code)
        // Check ONLY first row for now as simple demo logic, 
        // or iterate all rows if they are independent lines.
        for (int i = 0; i < params.number_of_rows; ++i) {
            int match_count = 1;
            int first_elem = grid[i * params.number_of_columns + 0];
            
            for (int j = 1; j < params.number_of_columns; ++j) {
                int current = grid[i * params.number_of_columns + j];
                if (current == first_elem) {
                    match_count++;
                } else {
                    break; 
                }
            }

            if (match_count >= 3) {
                float col_mult = 1.0f;
                if (match_count > 3 && (match_count - 4) < params.column_money_modyfier.size()) {
                    col_mult = params.column_money_modyfier[match_count - 4];
            }
                
                ret.win_ammount += countMoney(bet, params.elem_money_modyfier[first_elem], col_mult);
            }
        }
        
        // If total < 0 (loss), set win to 0 for UI clarity (bet is already deducted in UI)
        // Or keep negative to track net profit? Usually slot returns WIN amount (>=0).
        // Let's return purely WIN amount.
        if (ret.win_ammount < 0) ret.win_ammount = 0; 
        else ret.win_ammount += bet; // Add bet back because we started with -bet

        return ret;
    }
}
