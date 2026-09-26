cmake_minimum_required(VERSION 3.15)

project(MySuperApp LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

if (MSVC)
    add_compile_options(/utf-8)
endif()

add_executable(MySuperApp Web_Ex14.cpp)