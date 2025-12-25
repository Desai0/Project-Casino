#include <iostream>
#include <vector>
#include <Windows.h>
#include "ret_struct.hpp"
#include "json.hpp" // from nlohman btw
using json = nlohmann::json;

using namespace nlohmann::literals;
int main()
{
    json j;

    j["elem money modyfier"] = {1.5, 3, 5, 10};
    std::vector<float> column_money_modyfier = {2, 5};
    j["column money modyfier"] = column_money_modyfier;

    int number_of_rows = 3;
    j["number of rows"] = number_of_rows;
    j["luck value"] = 50;
    j["bonus chance"] = 2;
    j["freespins chance"] = 5;

    std::string str_params = j.dump();
    
    int bet = 100;

// loading DLL part
    typedef RetStruct (*casino_func)(int bet, std::string str_params);

    const char* path = "./slots.dll";

    void* handle = nullptr;
    casino_func function = nullptr;

    handle = LoadLibraryA(path);
    if (handle == nullptr)
    {
        std::cerr << "Error: Could not load library. Error code: " << GetLastError() << std::endl;
        return 1;
    }

    const char* main_func_name = "spinSlot";
    function = (casino_func)GetProcAddress((HMODULE)handle, main_func_name);

    if (function == nullptr)
    {
        std::cerr << "Error: Could not find the " << main_func_name << " function." << std::endl;
        FreeLibrary((HMODULE)handle);
        return 1;
    }

// function test
    int number_of_columns = column_money_modyfier.size() + 3;
    while (true)
    {
        RetStruct win = function(100, str_params);
        std::cout << "you won: " << win.win_ammount << '\n';

        std::cout << "lines were:\n";
        for (int i = 0; i < number_of_rows; ++i)
        {
            for (int j = 0; j < number_of_columns; ++j)
            {
                std::cout << win.spin_result[i * number_of_columns + j] << ' ';
            }
            std::cout << '\n';
        }
        std::cin.get();
    }

    return 0;
}
