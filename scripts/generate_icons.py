#!/usr/bin/env python3
"""
WeCal Sync Icon Generator
Generates Chrome extension icons (16, 32, 48, 128px) as PNG files.
Uses only Python stdlib — no Pillow or external deps needed.
"""
import struct, zlib, os, math

def create_png(width, height, pixels):
    """Create a PNG from raw RGBA pixel data (list of ints 0-255)."""
    # Filter bytes (0=no filter) + pixel data
    raw = b''
    for y in range(height):
        raw += b'\x00'  # filter byte: None
        for x in range(width):
            idx = (y * width + x) * 4
            raw += bytes(pixels[idx:idx+4])
    
    def chunk(chunk_type, data):
        c = chunk_type + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0))  # 8bit RGBA
    idat = chunk(b'IDAT', zlib.compress(raw))
    iend = chunk(b'IEND', b'')
    return sig + ihdr + idat + iend

def draw_icon(size, primary=(99, 102, 241), accent=(232, 232, 255), bg=(248, 249, 250)):
    """Draw a bell-in-rounded-square icon for WeCal Sync."""
    pixels = []
    
    s = size
    c = s / 2  # center
    r = s / 2 - 1  # radius for rounded bg
    
    for y in range(s):
        for x in range(s):
            # ---- Rounded square background ----
            dx, dy = abs(x - c), abs(y - c)
            corner_r = s * 0.22  # corner radius
            
            # Check if inside rounded rect
            if dx > r - corner_r and dy > r - corner_r:
                # Corner area - use circle check
                cx = r - corner_r
                cy = r - corner_r
                in_bg = ((dx - cx) ** 2 + (dy - cy) ** 2) <= corner_r ** 2
            else:
                in_bg = (x >= 1 and x < s-1 and y >= 1 and y < s-1)
            
            if not in_bg:
                pixels.extend([0, 0, 0, 0])  # transparent
                continue
            
            # ---- Background color (indigo) ----
            px, py, pz = primary[0], primary[1], primary[2]
            
            # ---- Draw bell shape ----
            bell_cx = c
            bell_top = s * 0.22
            
            # Bell body: a bell shape with some curve
            bell_left = c - s * 0.22
            bell_right = c + s * 0.22
            bell_bottom = s * 0.78
            
            # Is point in bell area?
            in_bell = False
            
            # Body: trapezoid-ish bell
            if x >= bell_left and x <= bell_right and y >= bell_top and y <= bell_bottom - s * 0.08:
                # Side tapers slightly
                taper = (y - bell_top) / (bell_bottom - s * 0.1 - bell_top)
                half_w = s * 0.22 * (1 - taper * 0.15)
                if abs(x - c) <= half_w:
                    in_bell = True
            
            # Bell dome (top curve)
            if y < bell_top + s * 0.06 and not in_bell:
                dome_progress = (y - bell_top) / (s * 0.06)
                dome_half = s * 0.18 * (1 - dome_progress * 0.2)
                if abs(x - c) <= dome_half and y >= bell_top:
                    in_bell = True
            
            # Bottom rim of bell
            rim_y = bell_bottom - s * 0.08
            if abs(y - rim_y) <= s * 0.025 and abs(x - c) <= s * 0.2:
                in_bell = True
            
            # Small circle at bottom (bell clapper - just a dot)
            clapper_y = bell_bottom - s * 0.02
            if (x - c) ** 2 + (y - clapper_y) ** 2 <= (s * 0.035) ** 2:
                in_bell = True
            
            # ---- Handle (small half-circle on top) ----
            handle_y = bell_top - s * 0.08
            if (x - c) ** 2 + (y - handle_y) ** 2 <= (s * 0.04) ** 2:
                in_bell = True
            # Stem connecting handle to bell
            if abs(x - c) <= s * 0.025 and y >= bell_top - s * 0.02 and y <= bell_top + s * 0.02:
                in_bell = True
            
            # ---- Bell shine/reflection (white highlight) ----
            if in_bell:
                # White bell
                r_val, g_val, b_val = accent[0], accent[1], accent[2]
                
                # Soft gradient from top-left
                gradient = 1.0 - ((x - c + s*0.3) * 0.3 + (y - bell_top) * 0.7) / (s * 0.6)
                gradient = max(0.5, min(1.0, gradient))
                
                r_val = int(r_val * gradient)
                g_val = int(g_val * gradient)  
                b_val = int(b_val * gradient)
                
                # Ring lines on bell
                ring_y = bell_top + s * 0.35
                if abs(y - ring_y) <= 1.5:
                    r_val = max(0, int(r_val * 0.85))
                    g_val = max(0, int(g_val * 0.85))
                    b_val = max(0, int(b_val * 0.85))
                
                pixels.extend([r_val, g_val, b_val, 255])
            else:
                # Soft indigo bg with slight gradient
                grad = 1.0 - ((y / s) * 0.3)
                r_val = min(255, int(px * (0.85 + grad * 0.15)))
                g_val = min(255, int(py * (0.85 + grad * 0.15)))
                b_val = min(255, int(pz * (0.85 + grad * 0.15)))
                pixels.extend([r_val, g_val, b_val, 255])
    
    return create_png(size, size, pixels)

def main():
    # Output directory is one level up from scripts/
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    icons_dir = os.path.join(project_dir, 'icons')
    os.makedirs(icons_dir, exist_ok=True)
    
    sizes = [16, 32, 48, 128]
    for size in sizes:
        png_data = draw_icon(size)
        path = os.path.join(icons_dir, f'icon{size}.png')
        with open(path, 'wb') as f:
            f.write(png_data)
        file_size = os.path.getsize(path)
        print(f'Created {path} ({size}x{size}, {file_size} bytes)')
    
    print('Done!')

if __name__ == '__main__':
    main()
