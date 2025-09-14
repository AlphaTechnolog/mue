#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <errno.h>

#include <raylib.h>
#include <mujs.h>

#define JS_ENTRYPOINT      "main.js"
#define DEFAULT_TITLE      "window"
#define DEFAULT_TARGET_FPS 120
#define DEFAULT_WIDTH      800
#define DEFAULT_HEIGHT     600

#define CHECK_ARGTYPE(idx, expected_type) \
    do { \
        if (!js_is##expected_type(J, (idx))) { \
            js_typeerror(J, "argument is not "#expected_type); \
            return; \
        } \
    } while (0);

#define MAP_OBJ_PROP(obj, idx, prop, prop_js, converter) \
    do { \
        js_getproperty(J, (idx), #prop_js); \
        (obj)->prop = converter(J, -1); \
        js_pop(J, 1); \
    } while (0);

#define CONSUME_OBJ_PROP(obj, idx, prop, converter) MAP_OBJ_PROP(obj, idx, prop, prop, converter)

#include "raw_js_bindings.h"

#define EXPOSE(fun, fnname) \
    do { \
        js_newcfunction(J, (fun), (fnname), 0); \
        js_setglobal(J, (fnname)); \
    } while (0);

void *js_allocator(void *_, void *ptr, const int size)
{
    if (size > 0) {
        return realloc(ptr, size);
    }
    free(ptr);
    return NULL;
}

void js_panic(js_State *J)
{
    const char *errmsg = "(unknown error)";
    if (js_isstring(J, -1)) {
        errmsg = js_tostring(J, -1);
    }

    fprintf(stderr, "fatal: %s\n", errmsg); js_freestate(J); exit(1);
}

void color_fetch_from_stack(Color *c, js_State *J, int obj_idx)
{
    CONSUME_OBJ_PROP(c, obj_idx, r, (unsigned char)js_tonumber);
    CONSUME_OBJ_PROP(c, obj_idx, g, (unsigned char)js_tonumber);
    CONSUME_OBJ_PROP(c, obj_idx, b, (unsigned char)js_tonumber);
    CONSUME_OBJ_PROP(c, obj_idx, a, (unsigned char)js_tonumber);
}

typedef struct Vec2d {
    double x;
    double y;
} Vec2d;

void vec2d_init(Vec2d *v, double x, double y)
{
    v->x = x;
    v->y = y;
}

void vec2d_push_onto_stack(const Vec2d *v, js_State *J)
{
    js_newobject(J);
    {
        js_pushnumber(J, v->x);
        js_setproperty(J, -2, "x");
        js_pushnumber(J, v->y);
        js_setproperty(J, -2, "y");
    }
}

void vec2d_fetch_from_stack(Vec2d *v, js_State *J, const int obj_idx)
{
    CONSUME_OBJ_PROP(v, obj_idx, x, js_tonumber);
    CONSUME_OBJ_PROP(v, obj_idx, y, js_tonumber);
}

// print(...: any[]): void;
void print(js_State *J)
{
    int i = 1;
    const int top = js_gettop(J);
    while (i < top) {
        const char *s = js_tostring(J, i);
        if (i++ > 1) putchar(' ');
        fputs(s, stdout);
    }
    putchar('\n');
    js_pushundefined(J);
}

// read(filename: string): string;
void js_read(js_State *J)
{
    CHECK_ARGTYPE(1, string);

    const char *filename = js_tostring(J, 1);
    FILE *f = fopen(filename, "rb");
    if (!f) {
        js_error(J, "cannot open file '%s': %s\n", filename, strerror(errno));
    }

    if (fseek(f, 0, SEEK_END) < 0) {
        fclose(f);
        js_error(J, "cannot seek in file '%s': %s\n", filename, strerror(errno));
    }

    const long n = ftell(f);
    if (n < 0) {
        fclose(f);
        js_error(J, "cannot tell in file '%s': %s\n", filename, strerror(errno));
    }

    if (fseek(f, 0, SEEK_SET) < 0) {
        fclose(f);
        js_error(J, "cannot seek in file '%s': %s\n", filename, strerror(errno));
    }

    char *s = malloc(n + 1);
    if (!s) {
        fclose(f);
        js_error(J, "out of memory");
    }

    const unsigned long t = fread(s, 1, n, f);
    if (t != n) {
        free(s);
        fclose(f);
        js_error(J, "cannot read data from file '%s': %s\n", filename, strerror(errno));
    }
    s[n] = 0;

    js_pushstring(J, s);
    free(s);
    fclose(f);
}

// graphics.drawRectangle(pos: Vec2d, size: Vec2d, color: Color): void;
void graphics_draw_rectangle(js_State *J)
{
    for (int i = 0; i < 4; ++i) {
        CHECK_ARGTYPE(i, object);
    }

    Vec2d pos = {0};
    vec2d_fetch_from_stack(&pos, J, 1);

    Vec2d size = {0};
    vec2d_fetch_from_stack(&size, J, 2);

    Color color = {0};
    color_fetch_from_stack(&color, J, 3);

    DrawRectangle((int)pos.x, (int)pos.y, (int)size.x, (int)size.y, color);
    js_pushundefined(J);
}

// input.isKeyPressed(key: number): boolean;
void input_is_key_pressed(js_State *J)
{
    CHECK_ARGTYPE(1, number);
    js_pushboolean(J, IsKeyPressed((int)js_tonumber(J, 1)));
}

// input.isKeyDown(key: number): boolean;
void input_is_keydown(js_State *J)
{
    CHECK_ARGTYPE(1, number);
    js_pushboolean(J, IsKeyDown((int)js_tonumber(J, 1)));
}

// input.isKeyUp(key: number): boolean;
void input_is_keyup(js_State *J)
{
    CHECK_ARGTYPE(1, number);
    js_pushboolean(J, IsKeyUp((int)js_tonumber(J, 1)));
}

void rectangle_fetch_from_stack(Rectangle *r, js_State *J, const int idx)
{
    CONSUME_OBJ_PROP(r, idx, x, (float)js_tonumber);
    CONSUME_OBJ_PROP(r, idx, y, (float)js_tonumber);
    CONSUME_OBJ_PROP(r, idx, width, (float)js_tonumber);
    CONSUME_OBJ_PROP(r, idx, height, (float)js_tonumber);
}

void rectangle_push_onto_stack(const Rectangle *r, js_State *J)
{
    js_newobject(J);
    {
        js_pushnumber(J, r->x);
        js_setproperty(J, -2, "x");
        js_pushnumber(J, r->y);
        js_setproperty(J, -2, "y");
        js_pushnumber(J, r->width);
        js_setproperty(J, -2, "width");
        js_pushnumber(J, r->height);
        js_setproperty(J, -2, "height");
    }
}

// collisions.checkRecs(a: Rectangle, b: Rectangle): boolean;
void collision_check_recs(js_State *J)
{
    CHECK_ARGTYPE(1, object);
    CHECK_ARGTYPE(2, object);

    Rectangle a = {0},
              b = {0};

    rectangle_fetch_from_stack(&a, J, 1);
    rectangle_fetch_from_stack(&b, J, 2);

    js_pushboolean(J, CheckCollisionRecs(a, b));
}

// collisions.getCollisionRec(a: Rectangle, b: Rectangle): Rectangle | null;
void collision_get_collision_rec(js_State *J)
{
    CHECK_ARGTYPE(1, object);
    CHECK_ARGTYPE(2, object);

    Rectangle a = {0},
              b = {0};

    rectangle_fetch_from_stack(&a, J, 1);
    rectangle_fetch_from_stack(&b, J, 2);

    if (!CheckCollisionRecs(a, b)) {
        js_pushnull(J);
        return;
    }

    const Rectangle res = GetCollisionRec(a, b);
    rectangle_push_onto_stack(&res, J);
}

// graphics.drawText(text: string, pos: Vec2d, size: number, color: Color): void;
void graphics_draw_text(js_State *J)
{
    CHECK_ARGTYPE(1, string);
    CHECK_ARGTYPE(2, object);
    CHECK_ARGTYPE(3, number);
    CHECK_ARGTYPE(4, object);

    Vec2d pos = {0};
    Color color = {0};
    const char *text = js_tostring(J, 1);
    vec2d_fetch_from_stack(&pos, J, 2);
    double size = js_tonumber(J, 3);
    color_fetch_from_stack(&color, J, 4);

    DrawText(text, (int)pos.x, (int)pos.y, (int)size, color);

    js_pushundefined(J);
}

// graphics.measureText(text: string, size: number): number;
void graphics_measure_text(js_State *J)
{
    CHECK_ARGTYPE(1, string);
    CHECK_ARGTYPE(2, number);
    js_pushnumber(J, (double)MeasureText(js_tostring(J, 1), (int)js_tonumber(J, 2)));
}

// time.getTime(): number;
void get_time(js_State *J)
{
    js_pushnumber(J, GetTime());
}

void global_functions(js_State *J)
{
    EXPOSE(print, "print");
    EXPOSE(js_read, "read");
    EXPOSE(graphics_draw_rectangle, "Mue_Graphics_DrawRectangle");
    EXPOSE(input_is_key_pressed, "Mue_Input_IsKeyPressed");
    EXPOSE(input_is_keydown, "Mue_Input_IsKeyDown");
    EXPOSE(input_is_keyup, "Mue_Input_IsKeyUp");
    EXPOSE(collision_check_recs, "Mue_Collision_CheckRecs");
    EXPOSE(collision_get_collision_rec, "Mue_Collision_GetCollisionRec");
    EXPOSE(graphics_draw_text, "Mue_Graphics_DrawText");
    EXPOSE(graphics_measure_text, "Mue_Graphics_MeasureText");
    EXPOSE(get_time, "Mue_Time_GetTime");
    js_dostring(J, console_js);
    js_dostring(J, stacktrace_js);
    js_dostring(J, require_js);
    js_dostring(J, graphics_js);
    js_dostring(J, input_js);
    js_dostring(J, time_js);
    js_dostring(J, collision_js);
    js_dostring(J, raylib_enums_js);
}

typedef struct WinConfig {
    char title[1024];
    int target_fps;
    Vec2d dimensions;
} WinConfig;

void win_config_init(WinConfig *cnf, const char *title, int target_fps, double w, double h)
{
    strlcpy(cnf->title, title, sizeof(cnf->title));
    cnf->target_fps = target_fps;
    cnf->dimensions.x = w;
    cnf->dimensions.y = h;
}

void win_config_push_ontostack(WinConfig *cnf, js_State *J)
{
    js_newobject(J);
    {
        js_pushstring(J, cnf->title);
        js_setproperty(J, -2, "title");
        js_pushnumber(J, (double)cnf->target_fps);
        js_setproperty(J, -2, "targetFps");
        vec2d_push_onto_stack(&cnf->dimensions, J);
        js_setproperty(J, -2, "dimensions");
    }
}

void win_config_fetch_fromstack(WinConfig *cnf, js_State *J, int idx)
{
    js_getproperty(J, idx, "title");
    strlcpy(cnf->title, js_tostring(J, -1), sizeof(cnf->title));
    js_pop(J, 1);

    MAP_OBJ_PROP(cnf, idx, target_fps, targetFps, (int)js_tonumber);

    js_getproperty(J, -1, "dimensions");
    if (!js_isobject(J, -1)) {
        js_typeerror(J, "dimensions is not an object");
    }
    vec2d_fetch_from_stack(&cnf->dimensions, J, -1);
    js_pop(J, 1);
}

void win_config_from_setup(WinConfig *cnf, js_State *J)
{
    js_getglobal(J, "setup");

    // use defaults when setup function is not defined.
    if (js_isundefined(J, -1)) {
        return;
    }

    js_pushnull(J); // push `this`.

    win_config_push_ontostack(cnf, J);

    if (js_pcall(J, 1)) {
        fprintf(stderr, "unable to call setup: %s\n", js_tostring(J, -1));
        js_pop(J, 1);
        js_freestate(J);
        exit(1);
    }

    // the returned value should be an object with the same properties.
    if (!js_isobject(J, -1)) {
        js_typeerror(J, "return variable is not an object");
    }

    win_config_fetch_fromstack(cnf, J, -1);
    js_pop(J, 1);
}

void setup(js_State *J)
{
    WinConfig config = {0};
    win_config_init(
        &config,
        DEFAULT_TITLE,
        DEFAULT_TARGET_FPS,
        DEFAULT_WIDTH,
        DEFAULT_HEIGHT
    );

    win_config_from_setup(&config, J);

    InitWindow((int)config.dimensions.x, (int)config.dimensions.y, config.title);
    SetTargetFPS(config.target_fps);
}

void call_update_hook(js_State *J)
{
    js_getglobal(J, "update");
    if (js_isundefined(J, -1)) {
        return;
    }
    js_pushnull(J); // push `this`.
    js_pushnumber(J, GetFrameTime());

    if (js_pcall(J, 1)) {
        fprintf(stderr, "update hook failed: %s\n", js_tostring(J, -1));
        js_pop(J, 1);
        js_freestate(J);
        exit(1);
    }
    js_pop(J, 1);
}

void call_draw_hook(js_State *J)
{
    js_getglobal(J, "draw");
    if (js_isundefined(J, -1)) {
        return;
    }
    js_pushnull(J);

    if (js_pcall(J, 0)) {
        fprintf(stderr, "draw hook failed: %s\n", js_tostring(J, -1));
        js_pop(J, 1);
        js_freestate(J);
        exit(1);
    }
    js_pop(J, 1);
}

void gameloop(js_State *J)
{
    while (!WindowShouldClose()) {
        call_update_hook(J);
        BeginDrawing();
        ClearBackground(BLACK);
        call_draw_hook(J);
        EndDrawing();
    }
}

void cleanup(js_State *J)
{
    js_getglobal(J, "cleanup");
    if (js_isundefined(J, -1)) {
        return;
    }

    js_pushnull(J);

    if (js_pcall(J, 0)) {
        fprintf(stderr, "unable to call cleanup hook: %s\n", js_tostring(J, -1));
        js_pop(J, 1);
        js_freestate(J);
        exit(1);
    }

    js_pop(J, 1);

    CloseWindow();
}

int main(const int argc, char *argv[])
{
    const char *pathname = ".";
    if (argc > 1) {
        pathname = argv[1];
    }
    chdir(pathname);

    js_State *J = js_newstate(js_allocator, NULL, 0);
    if (!J) {
        fprintf(stderr, "unable to initialise mu js runtime\n");
        return 1;
    }

    js_atpanic(J, js_panic);
    if (js_try(J)) {
        fprintf(stderr, "%s\n", js_tostring(J, -1));
        js_freestate(J);
        return 1;
    }

    global_functions(J);
    if (js_dofile(J, JS_ENTRYPOINT)) {
        js_freestate(J);
        return 1;
    }

    setup(J);
    gameloop(J);
    cleanup(J);

    js_freestate(J);

    return 0;
}
