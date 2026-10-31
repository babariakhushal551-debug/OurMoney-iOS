#!/usr/bin/env python3
"""Generate the 1024x1024 iOS app icon (no external dependencies).

Draws a purple gradient background with a white lightning bolt,
matching the OurMoney logo, and writes it as a PNG.
"""
import struct
import sys
import zlib

SIZE = 1024


def png_chunk(tag: bytes, data: bytes) -> bytes:
    return (struct.pack(">I", len(data)) + tag + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF))


def make_icon_png(path: str) -> None:
    raw = bytearray()
    bolt = [(60, 0), (25, 55), (45, 55), (40, 100),
            (78, 42), (56, 42), (66, 0)]

    def in_bolt(x: float, y: float) -> bool:
        x, y = (x / SIZE) * 100.0, (y / SIZE) * 100.0
        inside = False
        n = len(bolt)
        j = n - 1
        for i in range(n):
            xi, yi = bolt[i]
            xj, yj = bolt[j]
            if ((yi > y) != (yj > y)) and \
               x < (xj - xi) * (y - yi) / (yj - yi + 1e-12) + xi:
                inside = not inside
            j = i
        return inside

    top = (134, 59, 255)     # #863bff
    bottom = (109, 25, 235)

    for y in range(SIZE):
        raw.append(0)  # filter: none
        t = y / (SIZE - 1)
        r = round(top[0] + (bottom[0] - top[0]) * t)
        g = round(top[1] + (bottom[1] - top[1]) * t)
        b = round(top[2] + (bottom[2] - top[2]) * t)
        for x in range(SIZE):
            if in_bolt(x, y):
                raw += bytes((255, 255, 255))
            else:
                raw += bytes((r, g, b))

    ihdr = struct.pack(">IIBBBBB", SIZE, SIZE, 8, 2, 0, 0, 0)
    png = (b"\x89PNG\r\n\x1a\n"
           + png_chunk(b"IHDR", ihdr)
           + png_chunk(b"IDAT", zlib.compress(bytes(raw), 9))
           + png_chunk(b"IEND", b""))

    with open(path, "wb") as f:
        f.write(png)
    print(f"wrote {path} ({len(png)} bytes)")


if __name__ == "__main__":
    make_icon_png(sys.argv[1])
