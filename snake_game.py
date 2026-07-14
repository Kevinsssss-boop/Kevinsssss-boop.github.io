#!/usr/bin/env python3
"""
贪吃蛇游戏 — Snake Game
纯 tkinter 实现，无需安装任何第三方库。
方向键 / WASD 控制蛇的移动，吃到红色食物得分。蛇可穿越边界（左进右出、上进下出），撞到自己则游戏结束。
按 R 重新开始，空格暂停，Q 退出。
"""

import tkinter as tk
import random
from collections import deque

# --- 常量 ---
CELL_SIZE = 20
GRID_WIDTH = 30
GRID_HEIGHT = 20
CANVAS_WIDTH = CELL_SIZE * GRID_WIDTH
CANVAS_HEIGHT = CELL_SIZE * GRID_HEIGHT
SPEED = 120  # 毫秒，越小越快

# 颜色
COLOR_BG = "#14141e"
COLOR_GRID = "#232332"
COLOR_SNAKE_HEAD = "#64c864"
COLOR_SNAKE_BODY = "#3ca03c"
COLOR_FOOD = "#dc3c3c"
COLOR_TEXT = "#c8c8c8"

# 方向映射
DIR_MAP = {
    "Up": (0, -1), "w": (0, -1), "W": (0, -1),
    "Down": (0, 1), "s": (0, 1), "S": (0, 1),
    "Left": (-1, 0), "a": (-1, 0), "A": (-1, 0),
    "Right": (1, 0), "d": (1, 0), "D": (1, 0),
}


class Snake:
    """蛇的数据模型。"""

    def __init__(self, x: int, y: int):
        self.body = deque([(x, y)])
        self.direction = (1, 0)  # 默认向右
        self.growing = False

    @property
    def head(self):
        return self.body[0]

    def move(self):
        hx, hy = self.head
        dx, dy = self.direction
        new_head = (hx + dx, hy + dy)
        self.body.appendleft(new_head)
        if self.growing:
            self.growing = False
        else:
            self.body.pop()

    def grow(self):
        self.growing = True

    def collides_with_self(self) -> bool:
        return self.head in list(self.body)[1:]

    def occupies(self, pos: tuple) -> bool:
        return pos in self.body

    def set_direction(self, dx: int, dy: int):
        """禁止反向（不能 180° 掉头）。"""
        if dx + self.direction[0] == 0 and dy + self.direction[1] == 0:
            return
        self.direction = (dx, dy)


class SnakeGame:
    """贪吃蛇游戏主窗口。"""

    def __init__(self):
        self.root = tk.Tk()
        self.root.title("🐍 贪吃蛇")
        self.root.resizable(False, False)

        # 顶部信息栏
        self.info_frame = tk.Frame(self.root, bg="#1a1a2e")
        self.info_frame.pack(fill=tk.X)

        self.score_label = tk.Label(
            self.info_frame, text="得分: 0", font=("Microsoft YaHei", 14, "bold"),
            fg=COLOR_TEXT, bg="#1a1a2e", padx=12, pady=4,
        )
        self.score_label.pack(side=tk.LEFT)

        self.hint_label = tk.Label(
            self.info_frame,
            text="方向键/WASD 移动 | 空格 暂停 | R 重来 | Q 退出",
            font=("Microsoft YaHei", 9), fg="#8c8c96", bg="#1a1a2e", padx=12, pady=4,
        )
        self.hint_label.pack(side=tk.RIGHT)

        # 画布
        self.canvas = tk.Canvas(
            self.root, width=CANVAS_WIDTH, height=CANVAS_HEIGHT,
            bg=COLOR_BG, highlightthickness=0,
        )
        self.canvas.pack()

        # ---- 用 bind_all 绑定到应用层，确保任何焦点下都能收到按键 ----
        self.root.bind_all("<KeyPress>", self._on_key_press)
        self.root.bind_all("<KeyRelease>", self._on_key_release)

        # 追踪当前按住的键
        self._keys_held = set()          # 所有当前按住的键
        self._pending_direction = None   # 最新按下的方向键 (dx, dy)

        # 初始化游戏
        self.running = True
        self._reset()
        self._game_tick()

        # 窗口居中
        self.root.update_idletasks()
        sw = self.root.winfo_screenwidth()
        sh = self.root.winfo_screenheight()
        w = self.root.winfo_width()
        h = self.root.winfo_height()
        x = (sw - w) // 2
        y = (sh - h) // 2
        self.root.geometry(f"+{x}+{y}")

        self.root.protocol("WM_DELETE_WINDOW", self._quit)
        self.root.mainloop()

    # ---------- 游戏状态 ----------

    def _reset(self):
        cx, cy = GRID_WIDTH // 2, GRID_HEIGHT // 2
        self.snake = Snake(cx, cy)
        self.food = None
        self.score = 0
        self.game_over = False
        self.paused = False
        self._keys_held.clear()
        self._pending_direction = None
        self._place_food()
        self.score_label.config(text="得分: 0")

    def _place_food(self):
        empty = [
            (x, y)
            for x in range(GRID_WIDTH)
            for y in range(GRID_HEIGHT)
            if not self.snake.occupies((x, y))
        ]
        self.food = random.choice(empty) if empty else None

    # ---------- 输入（改进版） ----------

    def _on_key_press(self, event: tk.Event):
        """按下键时：记录到按住集合，对于动作键立即处理。"""
        key = event.keysym

        # 阻止 tkinter 默认行为（方向键移动焦点等）
        if key in ("Up", "Down", "Left", "Right", "space", "Tab"):
            return "break"

        self._keys_held.add(key)

        # 即时响应的动作键（不需要等 tick）
        if key in ("r", "R"):
            self._reset()
            return "break"
        if key in ("q", "Q", "Escape"):
            self._quit()
            return "break"
        if key in ("space", "p", "P"):
            if not self.game_over:
                self.paused = not self.paused
            return "break"

        # 方向键 — 立即记录意图方向（在 update 中消费）
        if key in DIR_MAP:
            self._pending_direction = DIR_MAP[key]
            return "break"

    def _on_key_release(self, event: tk.Event):
        """松开键时：从按住集合中移除。"""
        key = event.keysym
        self._keys_held.discard(key)

        # 阻止默认行为
        if key in ("Up", "Down", "Left", "Right", "space", "Tab"):
            return "break"

    # ---------- 游戏逻辑 ----------

    def _update(self):
        if self.game_over or self.paused:
            return

        # 每帧消费一次方向意图（取最新按下的方向键）
        if self._pending_direction is not None:
            self.snake.set_direction(*self._pending_direction)
            self._pending_direction = None

        self.snake.move()
        hx, hy = self.snake.head

        # 穿墙 — 从一边消失，另一边出现
        hx = hx % GRID_WIDTH
        hy = hy % GRID_HEIGHT
        self.snake.body[0] = (hx, hy)

        # 撞自己检测
        if self.snake.collides_with_self():
            self.game_over = True
            return

        # 吃到食物
        if self.food and self.snake.head == self.food:
            self.snake.grow()
            self.score += 10
            self.score_label.config(text=f"得分: {self.score}")
            self._place_food()

    # ---------- 绘制 ----------

    def _draw(self):
        self.canvas.delete("all")

        # 网格线
        for x in range(0, CANVAS_WIDTH, CELL_SIZE):
            self.canvas.create_line(x, 0, x, CANVAS_HEIGHT, fill=COLOR_GRID)
        for y in range(0, CANVAS_HEIGHT, CELL_SIZE):
            self.canvas.create_line(0, y, CANVAS_WIDTH, y, fill=COLOR_GRID)

        # 食物
        if self.food:
            fx, fy = self.food
            pad = 3
            self.canvas.create_oval(
                fx * CELL_SIZE + pad, fy * CELL_SIZE + pad,
                (fx + 1) * CELL_SIZE - pad, (fy + 1) * CELL_SIZE - pad,
                fill=COLOR_FOOD, outline="",
            )

        # 蛇
        for i, (sx, sy) in enumerate(self.snake.body):
            pad = 1
            x1 = sx * CELL_SIZE + pad
            y1 = sy * CELL_SIZE + pad
            x2 = (sx + 1) * CELL_SIZE - pad
            y2 = (sy + 1) * CELL_SIZE - pad
            color = COLOR_SNAKE_HEAD if i == 0 else COLOR_SNAKE_BODY
            self.canvas.create_rectangle(x1, y1, x2, y2, fill=color, outline="")

        # 游戏结束遮罩
        if self.game_over:
            self.canvas.create_rectangle(
                0, 0, CANVAS_WIDTH, CANVAS_HEIGHT,
                fill="#000000", stipple="gray50",
            )
            self.canvas.create_text(
                CANVAS_WIDTH // 2, CANVAS_HEIGHT // 2 - 10,
                text="游戏结束！", font=("Microsoft YaHei", 24, "bold"),
                fill="#ff5050",
            )
            self.canvas.create_text(
                CANVAS_WIDTH // 2, CANVAS_HEIGHT // 2 + 20,
                text="按 R 重新开始", font=("Microsoft YaHei", 14),
                fill=COLOR_TEXT,
            )

        # 暂停提示
        if self.paused and not self.game_over:
            self.canvas.create_rectangle(
                0, 0, CANVAS_WIDTH, CANVAS_HEIGHT,
                fill="#000000", stipple="gray50",
            )
            self.canvas.create_text(
                CANVAS_WIDTH // 2, CANVAS_HEIGHT // 2,
                text="已暂停", font=("Microsoft YaHei", 22, "bold"),
                fill=COLOR_TEXT,
            )

    # ---------- 游戏循环 ----------

    def _game_tick(self):
        if self.running:
            self._update()
            self._draw()
            self.root.after(SPEED, self._game_tick)

    def _quit(self):
        self.running = False
        self.root.destroy()


if __name__ == "__main__":
    SnakeGame()
