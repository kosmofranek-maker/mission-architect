"""Dynamic spacecraft drawing (SVG) that changes with the chosen parts."""
from engine import catalog as C

BUS_SIZE = {"cubesat": 34, "smallsat": 60, "medium": 86, "flagship": 110}
WING = {"none": 0, "body": 0, "small": 60, "medium": 95, "large": 130, "giant": 175}
INSTR_COLOR = {"imaging": "#4FC3F7", "thermal": "#FF8A65", "climate": "#AED581", "composition": "#BA68C8",
               "water": "#4DD0E1", "topography": "#FFD54F", "subsurface": "#90A4AE", "fields": "#F06292"}


def svg(d: dict, width: int = 520) -> str:
    W, H = 520, 300
    cx, cy = W / 2, H / 2 + 10
    s = BUS_SIZE[d["bus"]]
    wing = WING[d["solar"]]
    out = [f'<svg viewBox="0 0 {W} {H}" width="100%" style="max-width:{width}px" xmlns="http://www.w3.org/2000/svg" '
           'role="img" aria-label="Spacecraft diagram">',
           '<defs><linearGradient id="panel" x1="0" x2="1"><stop offset="0" stop-color="#1A3A6B"/>'
           '<stop offset="1" stop-color="#2C5AA0"/></linearGradient>'
           '<linearGradient id="gold" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#E8C35A"/>'
           '<stop offset="1" stop-color="#B8892B"/></linearGradient></defs>']
    # stars
    for i in range(28):
        x, y = (i * 97) % W, (i * 53 + 17) % H
        out.append(f'<circle cx="{x}" cy="{y}" r="{0.6 + (i % 3) * 0.4}" fill="#ffffff" opacity="0.5"/>')
    # solar wings
    if wing:
        ph = max(26, s * 0.6)
        for side in (-1, 1):
            x0 = cx + side * s / 2
            x1 = x0 + side * wing
            out.append(f'<line x1="{x0}" y1="{cy}" x2="{x0 + side * 12}" y2="{cy}" stroke="#999" stroke-width="3"/>')
            xa, xb = sorted((x0 + side * 12, x1))
            out.append(f'<rect x="{xa}" y="{cy - ph / 2}" width="{xb - xa}" height="{ph}" fill="url(#panel)" '
                       'stroke="#8FB3E8" stroke-width="1"/>')
            n = max(2, int((xb - xa) / 22))
            for k in range(1, n):
                xx = xa + k * (xb - xa) / n
                out.append(f'<line x1="{xx}" y1="{cy - ph / 2}" x2="{xx}" y2="{cy + ph / 2}" stroke="#8FB3E8" '
                           'stroke-width="0.6"/>')
    # magnetometer boom
    if "mag" in d["instruments"]:
        out.append(f'<line x1="{cx}" y1="{cy - s / 2}" x2="{cx - 70}" y2="{cy - s / 2 - 90}" stroke="#bbb" '
                   'stroke-width="2" stroke-dasharray="4 2"/>')
        out.append(f'<circle cx="{cx - 70}" cy="{cy - s / 2 - 90}" r="5" fill="#F06292"/>')
    # RTGs
    for k in range(d["rtg"]):
        x = cx + s / 2 + 8 + k * 16
        out.append(f'<line x1="{cx + s / 2}" y1="{cy + s / 2 - 6}" x2="{x + 6}" y2="{cy + s / 2 + 22}" stroke="#999" stroke-width="2"/>')
        out.append(f'<rect x="{x}" y="{cy + s / 2 + 20}" width="12" height="30" rx="3" fill="#555" stroke="#E57373"/>')
    # bus
    out.append(f'<rect x="{cx - s / 2}" y="{cy - s / 2}" width="{s}" height="{s}" rx="4" fill="url(#gold)" '
               'stroke="#7a5a1a" stroke-width="1.5"/>')
    if d["solar"] == "body":
        out.append(f'<rect x="{cx - s / 2 + 3}" y="{cy - s / 2 + 3}" width="{s - 6}" height="{s / 3}" fill="url(#panel)"/>')
    # antenna
    if d["comms"] in ("xhga", "kahga"):
        r = 30 if d["comms"] == "xhga" else 46
        top = cy - s / 2
        out.append(f'<line x1="{cx}" y1="{top}" x2="{cx}" y2="{top - 14}" stroke="#ccc" stroke-width="3"/>')
        out.append(f'<path d="M {cx - r} {top - 14 - r * 0.45} Q {cx} {top - 4} {cx + r} {top - 14 - r * 0.45}" '
                   'fill="#EEE" stroke="#999" stroke-width="1.5"/>')
        out.append(f'<line x1="{cx}" y1="{top - 14}" x2="{cx}" y2="{top - 14 - r * 0.6}" stroke="#999"/>')
    else:
        out.append(f'<line x1="{cx + s / 4}" y1="{cy - s / 2}" x2="{cx + s / 4}" y2="{cy - s / 2 - 18}" stroke="#ccc" stroke-width="2"/>')
        out.append(f'<circle cx="{cx + s / 4}" cy="{cy - s / 2 - 20}" r="3" fill="#ccc"/>')
    # engine nozzle
    if d["propulsion"] != "none":
        nw = {"coldgas": 6, "mono": 10, "biprop": 18}[d["propulsion"]]
        b = cy + s / 2
        out.append(f'<path d="M {cx - nw / 2} {b} L {cx - nw} {b + nw * 1.3} L {cx + nw} {b + nw * 1.3} '
                   f'L {cx + nw / 2} {b} Z" fill="#777" stroke="#444"/>')
    # instruments on the bus face
    inst = d["instruments"]
    for k, key in enumerate(inst):
        i = C.INSTRUMENTS[key]
        col = INSTR_COLOR.get(i["tags"][0], "#fff")
        n = len(inst)
        x = cx - s / 2 + (k + 1) * s / (n + 1)
        y = cy + s / 2 - 10
        out.append(f'<circle cx="{x}" cy="{y}" r="{4 if s < 50 else 6}" fill="{col}" stroke="#222"><title>{i["name"]}</title></circle>')
    out.append(f'<text x="12" y="{H - 12}" fill="#9fb3c8" font-size="12" font-family="sans-serif">'
               f'{C.BUSES[d["bus"]]["name"]} · {len(inst)} instrument(s)</text>')
    out.append("</svg>")
    return "".join(out)
