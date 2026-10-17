cmake_minimum_required(VERSION 3.20)
project(scoredump LANGUAGES CXX)

# Links against the prebuilt LibreShockwave static library in
# local/tools/libreshockwave/build (Release, Ninja, MSVC) and zlib in local/tools/zlib-install.
set(TOOLS_DIR "${CMAKE_CURRENT_SOURCE_DIR}/../../local/tools")
set(LSW_ROOT "${TOOLS_DIR}/libreshockwave" CACHE PATH "LibreShockwave source root")
set(LSW_LIB "${LSW_ROOT}/build/cpp/libreshockwave.lib" CACHE FILEPATH "Prebuilt libreshockwave.lib")
set(ZLIB_ROOT_DIR "${TOOLS_DIR}/zlib-install" CACHE PATH "zlib install prefix")

add_library(lsw_prebuilt STATIC IMPORTED)
set_target_properties(lsw_prebuilt PROPERTIES
    IMPORTED_LOCATION "${LSW_LIB}"
    INTERFACE_INCLUDE_DIRECTORIES "${LSW_ROOT}/cpp/include;${ZLIB_ROOT_DIR}/include"
    INTERFACE_COMPILE_DEFINITIONS "LIBRESHOCKWAVE_HAVE_ZLIB=1"
    INTERFACE_LINK_LIBRARIES "${ZLIB_ROOT_DIR}/lib/zlib.lib;ws2_32")

foreach(tool scoredump probe)
    if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/${tool}.cpp")
        add_executable(${tool} ${tool}.cpp)
        target_link_libraries(${tool} PRIVATE lsw_prebuilt)
        target_compile_features(${tool} PRIVATE cxx_std_20)
        if(MSVC)
            target_compile_options(${tool} PRIVATE /utf-8 /EHsc)
        endif()
    endif()
endforeach()

# zlib.dll must sit next to the exe at run time.
if(EXISTS "${ZLIB_ROOT_DIR}/bin/zlib.dll")
    file(COPY "${ZLIB_ROOT_DIR}/bin/zlib.dll" DESTINATION "${CMAKE_CURRENT_BINARY_DIR}")
endif()
