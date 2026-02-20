#!/usr/bin/env python3
"""Generate the Paper Presenter app icon (1024x1024 PNG).

Design: A stylized document page with a highlight bar and a play button,
rendered in the Catppuccin Mocha palette on a dark rounded-square background.
"""

from PIL import Image, ImageDraw

SIZE = 1024
MARGIN = 100

# Catppuccin Mocha colors
CRUST = (17, 17, 27)       # #11111b
BASE = (30, 30, 46)        # #1e1e2e
MANTLE = (24, 24, 37)      # #181825
SURFACE0 = (49, 50, 68)    # #313244
SURFACE1 = (69, 71, 90)    # #45475a
SURFACE2 = (88, 91, 112)   # #585b70
OVERLAY0 = (108, 112, 134) # #6c7086
OVERLAY1 = (127, 132, 156) # #7f849c
OVERLAY2 = (147, 153, 178) # #9399b2
SUBTEXT0 = (166, 173, 200) # #a6adc8
SUBTEXT1 = (186, 194, 222) # #bac2de
TEXT = (205, 214, 244)      # #cdd6f4
BLUE = (137, 180, 250)     # #89b4fa
LAVENDER = (180, 190, 254) # #b4befe
MAUVE = (203, 166, 247)    # #cba6f7
YELLOW = (249, 226, 175)   # #f9e2af
PEACH = (250, 179, 135)    # #fab387


def rrect(draw, xy, radius, fill):
    draw.rounded_rectangle(xy, radius=radius, fill=fill)


def main():
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background
    rrect(draw, (0, 0, SIZE - 1, SIZE - 1), 220, BASE)

    # === Document page ===
    page_l = MARGIN + 30
    page_t = MARGIN - 20
    page_r = SIZE - MARGIN - 30
    page_b = SIZE - MARGIN
    page_rad = 28

    # Shadow
    rrect(draw, (page_l + 16, page_t + 16, page_r + 16, page_b + 16), page_rad, (0, 0, 0, 70))

    # Page fill — lighter so it reads as a "document"
    PAGE_BG = (220, 224, 240)  # light grayish-blue, paper-like
    rrect(draw, (page_l, page_t, page_r, page_b), page_rad, PAGE_BG)

    # === Text lines ===
    line_l = page_l + 52
    line_r_max = page_r - 52
    line_h = 20
    gap = 44
    y = page_t + 64

    # Colors for text lines on light background
    TITLE_C = SURFACE0
    BODY_C = OVERLAY1
    SHORT_C = OVERLAY0

    line_specs = [
        (0.52, TITLE_C, 28),       # Title
        (0.88, BODY_C, line_h),    # Body
        (0.80, BODY_C, line_h),    # Body
        (0.42, SHORT_C, line_h),   # Short
        (0.84, BODY_C, line_h),    # Body
        (0.76, BODY_C, line_h),    # Body
        (0.90, BODY_C, line_h),    # Body
        (0.35, SHORT_C, line_h),   # Short
        (0.82, BODY_C, line_h),    # Body
        (0.72, BODY_C, line_h),    # Body
    ]

    line_ys = []
    for frac, color, h in line_specs:
        w = int((line_r_max - line_l) * frac)
        rrect(draw, (line_l, y, line_l + w, y + h), h // 2, color)
        line_ys.append(y)
        y += gap

    # === Highlight overlay on lines 4-5 ===
    hl_pad = 12
    hl_top = line_ys[4] - hl_pad
    hl_bot = line_ys[5] + line_h + hl_pad
    hl_left = line_l - 16
    hl_right = line_r_max + 8

    overlay = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    ol_draw = ImageDraw.Draw(overlay)
    rrect(ol_draw, (hl_left, hl_top, hl_right, hl_bot), 14, (*YELLOW, 110))
    # Left accent bar
    rrect(ol_draw, (hl_left, hl_top, hl_left + 8, hl_bot), 4, (*PEACH, 220))
    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)

    # === Play/Present button (bottom-right, overlapping page edge) ===
    btn_cx = page_r - 30
    btn_cy = page_b - 30
    btn_r = 72

    # Shadow
    draw.ellipse(
        (btn_cx - btn_r + 6, btn_cy - btn_r + 6,
         btn_cx + btn_r + 6, btn_cy + btn_r + 6),
        fill=(0, 0, 0, 50),
    )
    # Circle
    draw.ellipse(
        (btn_cx - btn_r, btn_cy - btn_r, btn_cx + btn_r, btn_cy + btn_r),
        fill=MAUVE,
    )

    # Play triangle
    tri_off = 8
    draw.polygon(
        [
            (btn_cx - 28 + tri_off, btn_cy - 40),
            (btn_cx - 28 + tri_off, btn_cy + 40),
            (btn_cx + 42 + tri_off, btn_cy),
        ],
        fill=(255, 255, 255),
    )

    img.save("app-icon.png")
    print("Generated app-icon.png (1024x1024)")


if __name__ == "__main__":
    main()
