# Compiler
CXX = clang

# Directories
SRC_DIR = ./src
BUILD_DIR = ./build

# Source files
KRPSIM_SRC = $(SRC_DIR)/krpsim/main.cpp
KRPSIM_VERIF_SRC = $(SRC_DIR)/krpsim_verif/main.cpp

# Executables
KRPSIM_EXEC = krpsim
KRPSIM_VERIF_EXEC = krpsim_verif

# Build targets
all: $(KRPSIM_EXEC)

verif: $(KRPSIM_VERIF_EXEC)

$(KRPSIM_EXEC): $(KRPSIM_SRC)
	$(CXX) -o $(KRPSIM_EXEC) $(KRPSIM_SRC)

$(KRPSIM_VERIF_EXEC): $(KRPSIM_VERIF_SRC)
	$(CXX) -o $(KRPSIM_VERIF_EXEC) $(KRPSIM_VERIF_SRC)

build: all verif

rebuild: clean build

clean:
	rm -f $(KRPSIM_EXEC) $(KRPSIM_VERIF_EXEC)