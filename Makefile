CC 	      := cc

INCDIR    := include
LIBDIR    := lib
RPATH     := $(LIBDIR)

CFLAGS    := -I$(INCDIR) -Wall -Werror -O3
LDFLAGS   := -L$(LIBDIR) -lmujs -lraylib -Wl,-rpath,$(RPATH)

SRCS      := $(shell find ./src -type f -name '*.c')
OBJS      := $(SRCS:.c=.o)
TARGET    := mue

.PHONY: all clean run
all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) -o $@ $^ $(LDFLAGS)

%.o: %.c
	$(CC) -c -o $@ $< $(CFLAGS)

clean: $(TARGET) $(OBJS)
	rm $^

run: $(TARGET)
	./$<
