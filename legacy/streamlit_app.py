"""Mission Architect: a space mission design game (NASA Space Apps 2026).

Run: .venv/bin/streamlit run app.py
"""
from __future__ import annotations

import base64
import json
import random

import plotly.graph_objects as go
import streamlit as st

from engine import catalog as C
from engine import leaderboard as LB
from engine.model import default_design, evaluate, normalize
from engine.rooms import FIELD_OWNER, RoomStore
from engine.scoring import score
from engine.simulate import monte_carlo, simulate
from spacecraft import svg

st.set_page_config(page_title="Mission Architect", page_icon="🚀", layout="wide")
ss = st.session_state

SEV_ICON = {"blocker": "⛔", "warning": "⚠️", "info": "💡"}
IMPACT_ICON = {"good": "🟢", "bad": "🟠", "fatal": "🔴", "neutral": "⚪"}
GRADE_COLOR = {"S": "#B388FF", "A": "#4CAF50", "B": "#03A9F4", "C": "#FFC107", "F": "#F44336"}


@st.cache_resource
def room_store() -> RoomStore:
    return RoomStore()


store = room_store()

# ------------------------------------------------------------------------------ session state
ss.setdefault("design", default_design("wildfire"))
ss.setdefault("runs", [])
ss.setdefault("room", None)
ss.setdefault("player", "")
ss.setdefault("my_roles", list(C.ROLES))
ss.setdefault("last", None)

if ss.room and not store.exists(ss.room):
    ss.room = None  # server restarted


def in_room() -> bool:
    return bool(ss.room)


def design() -> dict:
    return store.get(ss.room)["design"] if in_room() else ss.design


def can_edit(field: str) -> bool:
    return not in_room() or FIELD_OWNER.get(field) in ss.my_roles


def set_field(field: str, value):
    if in_room():
        if not store.set_field(ss.room, ss.player, field, value):
            st.toast(f"Only the {C.ROLES[FIELD_OWNER[field]]['name']} can change that.", icon="🔒")
    elif field == "scenario":
        ss.design = default_design(value) | {"difficulty": ss.design["difficulty"], "sandbox": ss.design["sandbox"]}
        ss.last = None
    else:
        ss.design[field] = value


def _cb(field: str):
    set_field(field, ss[f"w_{field}"])


def select(field, label, options: dict, fmt=None, help=None, learn=True):
    D = design()
    key = f"w_{field}"
    ss[key] = D[field]
    st.selectbox(label, list(options), key=key, format_func=fmt or (lambda k: options[k]["name"]),
                 on_change=_cb, args=(field,), disabled=not can_edit(field), help=help)
    if learn and options[D[field]].get("learn"):
        st.caption(options[D[field]]["learn"])


def slider(field, label, lo, hi, help=None):
    key = f"w_{field}"
    ss[key] = design()[field]
    st.slider(label, lo, hi, key=key, on_change=_cb, args=(field,), disabled=not can_edit(field), help=help)


def lock_note(role: str):
    if in_room() and role not in ss.my_roles:
        owner = store.roles_taken(ss.room).get(role)
        st.info(f"🔒 Read-only: this section belongs to the **{C.ROLES[role]['name']}**"
                + (f" ({owner})." if owner else " (nobody has claimed it yet)."))


def gauge(label, frac, text, good=True):
    frac = max(0.0, min(1.0, frac))
    st.progress(frac, text=f"{'✅' if good else '❗'} **{label}** · {text}")


def fig_layout(fig, h=300):
    fig.update_layout(height=h, margin=dict(l=10, r=10, t=30, b=10), legend=dict(orientation="h", y=-0.15))
    return fig


# ------------------------------------------------------------------------------ sidebar
with st.sidebar:
    st.title("🚀 Mission Architect")
    st.caption("Design a real-ish space mission. Balance mass, power, data, money and risk.")

    mode = st.radio("Mode", ["Solo", "Team (multiplayer)"], horizontal=True,
                    index=1 if in_room() else 0, key="mode")
    if mode == "Solo" and in_room():
        ss.room, ss.my_roles = None, list(C.ROLES)
        st.rerun()
    if mode.startswith("Team"):
        if not in_room():
            ss.player = st.text_input("Your name", ss.player, max_chars=20)
            c1, c2 = st.columns(2)
            code = c2.text_input("Room code", max_chars=4, placeholder="ABCD").upper().strip()
            if c1.button("Create room", disabled=not ss.player, width="stretch"):
                ss.room = store.create(ss.design["scenario"])
                store.replace_design(ss.room, ss.design)
                ss.my_roles = []
                store.join(ss.room, ss.player, [])
                st.rerun()
            if c2.button("Join", disabled=not (ss.player and code), width="stretch"):
                if store.exists(code):
                    ss.room, ss.my_roles = code, []
                    store.join(code, ss.player, [])
                    st.rerun()
                else:
                    st.error("No room with that code.")
            st.caption("One person creates a room and shares the 4-letter code. Each player claims roles; "
                       "everyone sees changes live. All four roles must approve before launch.")
        else:
            room = store.get(ss.room)
            st.markdown(f"### Room `{ss.room}`")
            taken = store.roles_taken(ss.room, exclude=ss.player)
            free = [r for r in C.ROLES if r not in taken]
            roles = st.multiselect("My roles", free, default=[r for r in ss.my_roles if r in free],
                                   format_func=lambda r: f"{C.ROLES[r]['icon']} {C.ROLES[r]['name']}")
            if roles != ss.my_roles:
                ss.my_roles = roles
                store.join(ss.room, ss.player, roles)
                st.rerun()
            for r, info in C.ROLES.items():
                who = ss.player if r in ss.my_roles else taken.get(r, "—")
                ok = "✅" if room["approvals"][r] else "⏳"
                st.markdown(f"{ok} {info['icon']} {info['name']}: **{who}**")
            with st.expander("Team chat", expanded=False):
                for m in room["chat"][-12:]:
                    st.markdown(f"**{m['who']}**: {m['text']}" if m.get("msg") else f"*{m['who']} {m['text']}*")
                msg = st.chat_input("Message the team")
                if msg:
                    store.say(ss.room, ss.player, msg)
                    st.rerun()
            if st.button("Leave room"):
                store.join(ss.room, ss.player, [])
                ss.design = room["design"]
                ss.room, ss.my_roles = None, list(C.ROLES)
                st.rerun()

    st.divider()
    D = design()
    select("scenario", "Mission", C.SCENARIOS,
           fmt=lambda k: f"{C.SCENARIOS[k]['name']} ({C.SCENARIOS[k]['difficulty']})", learn=False)
    select("difficulty", "Difficulty", C.DIFFICULTY, learn=False,
           help="Cadet: +30% budget, fewer surprises. Flight Director: tight money, more failures.")
    key = "w_sandbox"
    ss[key] = D["sandbox"]
    st.toggle("Sandbox (ignore budget)", key=key, on_change=_cb, args=("sandbox",), disabled=not can_edit("sandbox"),
              help="Free play: no budget limit. Scores are not saved to the leaderboard.")

    with st.expander("💾 Save / load / share"):
        blob = json.dumps(D, indent=1)
        st.download_button("Download design (.json)", blob, file_name=f"mission_{D['scenario']}.json",
                           mime="application/json", width="stretch")
        share = base64.urlsafe_b64encode(json.dumps(D, separators=(",", ":")).encode()).decode()
        st.text_area("Share code (copy & send)", share, height=80)
        up = st.file_uploader("Load design (.json)", type="json")
        paste = st.text_input("…or paste a share code")
        new = None
        try:
            if up is not None:
                new = json.loads(up.getvalue())
            elif paste:
                new = json.loads(base64.urlsafe_b64decode(paste.encode()))
        except Exception:
            st.error("That file/code is not a valid design.")
        if new and st.button("Load it", type="primary"):
            new = normalize(new)
            if in_room():
                store.replace_design(ss.room, new)
            else:
                ss.design = new
            st.rerun()

# ------------------------------------------------------------------------------ evaluation + header
D = design()
EV = evaluate(D)
SC = EV["scenario"]

st.markdown(f"## {SC['name']} · {EV['destination']['name']}")
st.markdown(f"*{SC['pitch']}* {SC['story']}")

m, p, dat, cst, sci = EV["mass"], EV["power"], EV["data"], EV["cost"], EV["science"]
g1, g2, g3, g4, g5 = st.columns(5)
with g1:
    gauge("Mass", m["wet"] / m["capacity"] if m["capacity"] else 1,
          f"{m['wet']:,.0f} / {m['capacity']:,} kg" if m["capacity"] else "rocket can't reach", m["margin"] >= 0)
with g2:
    gauge("Power", p["load"] / p["generation"] if p["generation"] else 1,
          f"{p['load']:,.0f} / {p['generation']:,.0f} W", p["margin"] >= 0 and p["eclipse_need_wh"] <= p["battery_usable_wh"])
with g3:
    gauge("Data home", dat["return"], f"{dat['return']:.0%} of {dat['generated_gb_day']:,.0f} Gb/day", dat["return"] >= 0.8)
with g4:
    gauge("Budget", cst["total"] / cst["budget"], f"{cst['total']:,.0f} / {cst['budget']:,.0f} M$",
          cst["total"] <= cst["budget"] or D["sandbox"])
with g5:
    gauge("Science", min(1, sci["score"] / 100), f"{sci['score']:.0f} / 100", sci["score"] >= 50)

n_block = sum(i["severity"] == "blocker" for i in EV["issues"])
n_warn = sum(i["severity"] == "warning" for i in EV["issues"])
if n_block:
    st.error(f"⛔ {n_block} blocker(s) — the design can't launch yet. See **Design Review**.")
elif n_warn:
    st.warning(f"⚠️ Launchable, with {n_warn} warning(s). See **Design Review**.")
else:
    st.success("✅ Clean design: ready for launch!")

tabs = st.tabs(["🧭 Mission Manager", "🔧 Systems", "🔭 Science", "📡 Comms & Ops", "📋 Design Review",
                "🚀 Launch & Results", "🏆 Leaderboard", "📘 Learn"])

# ------------------------------------------------------------------------------ manager
with tabs[0]:
    lock_note("manager")
    st.caption(f"🎯 Role goal: {C.ROLES['manager']['goal']}")
    c1, c2 = st.columns([1, 1])
    with c1:
        tgt = EV["orbit_info"]["lv_target"]
        select("launch_vehicle", "Launch vehicle", C.LAUNCH_VEHICLES,
               fmt=lambda k: f"{C.LAUNCH_VEHICLES[k]['name']} · {C.LAUNCH_VEHICLES[k]['capacity'][tgt]:,} kg to "
                             f"{C.LV_TARGET_LABEL[tgt]} · {C.LAUNCH_VEHICLES[k]['cost']} M$")
        slider("years", "Science mission length (years)", 1, 12,
               help=f"Scientists asked for at least {SC['min_years']} years. Longer = more science but more ops cost.")
        if EV["cruise_years"]:
            st.caption(f"🛰️ Plus {EV['cruise_years']:g} years of cruise before science starts.")
        st.markdown("#### Science goals")
        for g in sci["goals"]:
            st.progress(g["fraction"], text=f"{'⭐ ' if g['required'] else ''}{g['label']} — {g['fraction']:.0%} "
                                            f"(weight {g['weight']})")
        st.caption("⭐ = required. A required goal under 50% means the mission misses its main purpose.")
    with c2:
        items = {k: v for k, v in cst["items"].items() if v > 0}
        fig = go.Figure(go.Pie(labels=list(items), values=list(items.values()), hole=0.5, sort=False,
                               texttemplate="%{label}<br>%{value:.0f} M$"))
        fig.update_layout(title=f"Cost: {cst['total']:,.0f} of {cst['budget']:,.0f} M$ (reserve {cst['reserve']:.0%})",
                          showlegend=False)
        st.plotly_chart(fig_layout(fig, 360), key="cost_pie")

# ------------------------------------------------------------------------------ systems
with tabs[1]:
    lock_note("systems")
    st.caption(f"🎯 Role goal: {C.ROLES['systems']['goal']}")
    c1, c2 = st.columns([1, 1])
    with c1:
        select("bus", "Spacecraft bus", C.BUSES,
               fmt=lambda k: f"{C.BUSES[k]['name']} · max {C.BUSES[k]['max_dry']:,} kg · {C.BUSES[k]['slots']} slots")
        select("solar", "Solar array", C.SOLAR_ARRAYS)
        slider("rtg", "RTGs (nuclear power, 110 W each)", 0, C.RTG["max"], help=C.RTG["learn"])
        select("battery", "Battery", C.BATTERIES)
        select("adcs", "Attitude control (pointing)", C.ADCS,
               fmt=lambda k: f"{C.ADCS[k]['name']} · {C.ADCS[k]['pointing_deg']:g}°")
        select("propulsion", "Propulsion", C.PROPULSION)
        st.caption(f"Δv needed: **{m['dv']:,.0f} m/s** (orbit insertion + station-keeping + 10% margin) → "
                   f"**{m['propellant']:,.0f} kg** propellant (rocket equation).")
    with c2:
        parts = {k: v for k, v in m["parts"].items() if v > 0}
        parts["Tanks"] = m["tanks"]
        parts["Propellant"] = m["propellant"]
        fig = go.Figure()
        for k, v in parts.items():
            fig.add_bar(name=k, y=["Spacecraft"], x=[v], orientation="h")
        if m["capacity"]:
            fig.add_vline(x=m["capacity"], line_dash="dash", line_color="red", annotation_text="rocket limit")
        fig.update_layout(barmode="stack", title=f"Mass {m['wet']:,.0f} kg · margin {m['margin']:.0%}")
        st.plotly_chart(fig_layout(fig, 230), key="mass_bar")
        fig = go.Figure()
        fig.add_bar(name="Solar (avg)", x=["Generation"], y=[p["generation"] - p["rtg"]])
        fig.add_bar(name="RTG", x=["Generation"], y=[p["rtg"]])
        for k, v in p["loads"].items():
            fig.add_bar(name=k, x=["Load"], y=[v])
        fig.update_layout(barmode="stack", title=f"Power at end of life · margin {p['margin']:.0%}")
        st.plotly_chart(fig_layout(fig, 300), key="power_bar")
        st.caption(f"🔋 Eclipse needs **{p['eclipse_need_wh']:,.0f} Wh**; battery gives **{p['battery_usable_wh']:,.0f} Wh** "
                   f"usable. Sunlight here: {1 / EV['destination']['sun_au'] ** 2:.0%} of Earth's.")

# ------------------------------------------------------------------------------ science
with tabs[2]:
    lock_note("science")
    st.caption(f"🎯 Role goal: {C.ROLES['science']['goal']}")
    dest = SC["destination"]
    c1, c2 = st.columns([1, 1])
    with c1:
        select("orbit", "Orbit", C.ORBITS[dest])
        o = EV["orbit_info"]
        st.caption(f"Coverage {o['coverage']:.0%} · eclipse {o['eclipse_h']:g} h · ground contact {o['earth_view']:.0%} "
                   f"of the time · insertion Δv {o['dv_insert']} m/s")
        key = "w_instruments"
        ss[key] = D["instruments"]
        st.multiselect(f"Instruments (bus has {C.BUSES[D['bus']]['slots']} slots)", list(C.INSTRUMENTS), key=key,
                       format_func=lambda k: C.INSTRUMENTS[k]["name"], on_change=_cb, args=("instruments",),
                       disabled=not can_edit("instruments"))
        goal_tags = {g["tag"] for g in SC["goals"]}
        rows = [{"Instrument": i["name"], "Serves": ", ".join(t for t in i["tags"] if t in goal_tags) or "—",
                 "Mass kg": i["mass"], "Power W": i["power"], "Data Mbps": i["data_mbps"], "Cost M$": i["cost"],
                 "Pointing °": i["pointing_deg"], "On board": "✅" if k in D["instruments"] else ""}
                for k, i in C.INSTRUMENTS.items()]
        rows.sort(key=lambda r: (r["Serves"] == "—", r["Instrument"]))
        st.dataframe(rows, hide_index=True, height=300)
    with c2:
        fig = go.Figure(go.Bar(x=[g["label"] for g in sci["goals"]], y=[g["fraction"] * 100 for g in sci["goals"]],
                               marker_color=["#4CAF50" if g["met"] else "#FF9800" for g in sci["goals"]]))
        fig.add_hline(y=50, line_dash="dot", annotation_text="minimum")
        fig.update_layout(title=f"Goal coverage · science {sci['score']:.0f}/100", yaxis_range=[0, 105],
                          yaxis_title="%")
        st.plotly_chart(fig_layout(fig, 320), key="sci_bar")
        for k in D["instruments"]:
            i = C.INSTRUMENTS[k]
            with st.expander(f"{i['name']} — contributes {sci['per_instrument'].get(k, 0):.1f} pts"):
                st.write(i["learn"])
                st.caption(f"Pointing quality ×{sci['pointing'][k]:.2f} · data returned {dat['per_instrument'][k]:.0%}")

# ------------------------------------------------------------------------------ comms
with tabs[3]:
    lock_note("comms")
    st.caption(f"🎯 Role goal: {C.ROLES['comms']['goal']}")
    c1, c2 = st.columns([1, 1])
    with c1:
        select("comms", "Antenna / radio", C.COMMS, fmt=lambda k: f"{C.COMMS[k]['name']} · up to {C.COMMS[k]['max_mbps']} Mbps")
        select("ground", "Ground stations", C.GROUND)
        select("computer", "Flight computer", C.COMPUTERS,
               fmt=lambda k: f"{C.COMPUTERS[k]['name']} · {C.COMPUTERS[k]['storage_gb']} GB · rad level {C.COMPUTERS[k]['rad']}")
        r = EV["radiation"]
        st.markdown(f"☢️ Radiation environment: **{C.RADIATION_LABEL[r['env']]}** · electronics tolerance level "
                    f"**{r['tolerance']}** · survival odds **{r['survival']:.0%}**")
    with c2:
        st.metric("Downlink rate", f"{dat['rate_mbps']:.2f} Mbps",
                  help="Signal falls with distance squared. Bigger dishes and Ka-band help.")
        cc1, cc2, cc3 = st.columns(3)
        cc1.metric("Collected", f"{dat['generated_gb_day']:,.1f} Gb/day")
        cc2.metric("Sent home", f"{min(dat['downlink_gb_day'], dat['generated_gb_day']):,.1f} Gb/day")
        cc3.metric("Contact", f"{dat['contact_hours']:.1f} h/day")
        if D["instruments"]:
            fig = go.Figure(go.Bar(x=[C.INSTRUMENTS[k]["name"] for k in D["instruments"]],
                                   y=[dat["per_instrument"][k] * 100 for k in D["instruments"]]))
            fig.update_layout(title="Data returned per instrument (%)", yaxis_range=[0, 105])
            st.plotly_chart(fig_layout(fig, 280), key="data_bar")
        st.caption(f"💾 Recorder: needs {dat['storage_need_gb']:,.1f} GB between contacts, has {dat['storage_gb']} GB.")

# ------------------------------------------------------------------------------ review
with tabs[4]:
    c1, c2 = st.columns([1, 1])
    with c1:
        st.html(svg(D))
        st.markdown("#### Team role goals")
        from engine.scoring import role_goals
        for rk, ok in role_goals(EV).items():
            st.markdown(f"{'✅' if ok else '⬜'} {C.ROLES[rk]['icon']} **{C.ROLES[rk]['name']}** — {C.ROLES[rk]['goal']}")
        if in_room():
            st.markdown("#### Approvals")
            room = store.get(ss.room)
            for rk in ss.my_roles:
                appr = room["approvals"][rk]
                if st.button(("Withdraw approval" if appr else "Approve design") + f" as {C.ROLES[rk]['name']}",
                             key=f"appr_{rk}", type="secondary" if appr else "primary"):
                    store.approve(ss.room, ss.player, rk, not appr)
                    st.rerun()
    with c2:
        st.markdown("#### Design review board")
        if not EV["issues"]:
            st.success("No issues found. 🎉")
        for i in EV["issues"]:
            with st.expander(f"{SEV_ICON[i['severity']]} {i['text']}", expanded=i["severity"] == "blocker"):
                st.write(i["why"])
        if EV["ok"] and st.button("🎲 Risk analysis (200 simulated missions)"):
            mc = monte_carlo(D, 200)
            st.metric("Chance of full success", f"{mc['success_rate']:.0%}")
            st.caption(f"Science: worst 10% ≤ {mc['science_p10']:.0f}, median {mc['science_median']:.0f}, "
                       f"best 10% ≥ {mc['science_p90']:.0f}")

# ------------------------------------------------------------------------------ launch
with tabs[5]:
    ready = EV["ok"] and (not in_room() or store.all_approved(ss.room))
    c1, c2, c3 = st.columns([2, 1, 1])
    name = c1.text_input("Mission name", value=ss.get("mission_name", f"{SC['name']} 1"), key="mission_name")
    seed = c2.number_input("Seed", 1, 999_999, value=ss.get("seed", random.randint(1, 999_999)), key="seed",
                           help="Same seed + same design = same story. Share it to compare runs fairly.")
    c3.write("")
    go_btn = c3.button("🚀 LAUNCH", type="primary", disabled=not ready, width="stretch")
    if not EV["ok"]:
        st.caption("Fix all ⛔ blockers in the Design Review first.")
    elif in_room() and not store.all_approved(ss.room):
        st.caption("Waiting for all four roles to approve the design (Design Review tab).")
    if go_btn:
        sim = simulate(D, int(seed), EV)
        res = {"name": name, "seed": int(seed), "design": dict(D), "sim": sim, "score": score(sim)}
        ss.last = res
        ss.runs.append(res)
        if in_room():
            store.set_last_run(ss.room, {k: v for k, v in res.items()})
        if not D["sandbox"]:
            LB.add({"name": name, "player": ss.player or "solo", "scenario": D["scenario"],
                    "difficulty": D["difficulty"], "score": res["score"]["total"], "grade": res["score"]["grade"],
                    "seed": int(seed), "design": dict(D)})
    last = ss.last
    if in_room() and store.get(ss.room)["last_run"]:
        last = store.get(ss.room)["last_run"]
    if last:
        sim, sco = last["sim"], last["score"]
        st.divider()
        h1, h2 = st.columns([1, 3])
        with h1:
            st.markdown(f"<div style='font-size:96px;font-weight:800;color:{GRADE_COLOR[sco['grade']]};"
                        f"line-height:1'>{sco['grade']}</div>", unsafe_allow_html=True)
            st.metric("Score", f"{sco['total']} / {sum(sco['max'].values())}")
            st.caption(f"Outcome: **{sim['outcome']}** · seed {last['seed']}")
        with h2:
            fig = go.Figure(go.Bar(y=list(sco["parts"]), x=[sco["parts"][k] / sco["max"][k] * 100 for k in sco["parts"]],
                                   orientation="h", text=[f"{sco['parts'][k]} / {sco['max'][k]}" for k in sco["parts"]]))
            fig.update_layout(title=f"“{last['name']}” score breakdown (%)", xaxis_range=[0, 100])
            st.plotly_chart(fig_layout(fig, 250), key="score_bar")
        st.markdown("#### Post-mission analysis")
        for a in sco["analysis"]:
            st.markdown(f"- {a}")
        if sim["timeline"]:
            tl = sim["timeline"]
            fig = go.Figure()
            x = [t["month"] for t in tl]
            fig.add_scatter(x=x, y=[t["science_fraction"] * 100 for t in tl], name="Science collected %")
            fig.add_scatter(x=x, y=[t["battery_pct"] * 100 for t in tl], name="Battery health %")
            fig.add_scatter(x=x, y=[t["reserve"] / EV["cost"]["budget"] * 100 for t in tl], name="Budget reserve %")
            for e in sim["events"]:
                if e["impact"] in ("bad", "fatal", "good") and e["kind"] not in ("launch", "end"):
                    fig.add_vline(x=e["month"], line_width=1, line_dash="dot",
                                  line_color={"bad": "orange", "fatal": "red", "good": "green"}[e["impact"]])
            fig.update_layout(title="Mission timeline (months)", xaxis_title="month")
            st.plotly_chart(fig_layout(fig, 340), key="timeline")
        st.markdown("#### Mission log")
        for e in sim["events"]:
            with st.expander(f"{IMPACT_ICON[e['impact']]} Month {e['month']}: {e['text']}"):
                st.write(e["why"])
    if len(ss.runs) > 1:
        st.markdown("#### Compare your runs")
        st.dataframe([{"Name": r["name"], "Scenario": C.SCENARIOS[r["design"]["scenario"]]["name"], "Seed": r["seed"],
                       "Grade": r["score"]["grade"], "Score": r["score"]["total"], "Outcome": r["sim"]["outcome"],
                       **{k.title(): v for k, v in r["score"]["parts"].items()}} for r in ss.runs[-10:]], hide_index=True)
        fig = go.Figure()
        for r in ss.runs[-6:]:
            tl = r["sim"]["timeline"]
            fig.add_scatter(x=[t["month"] for t in tl], y=[t["science_fraction"] * 100 for t in tl],
                            name=f"{r['name']} (#{r['seed']})")
        fig.update_layout(title="Science collected % over time")
        st.plotly_chart(fig_layout(fig, 300), key="compare")
        if st.button("Clear run history"):
            ss.runs = []
            st.rerun()

# ------------------------------------------------------------------------------ leaderboard
with tabs[6]:
    sc_key = st.selectbox("Scenario", list(C.SCENARIOS), index=list(C.SCENARIOS).index(D["scenario"]),
                          format_func=lambda k: C.SCENARIOS[k]["name"], key="lb_sc")
    rows = LB.top(sc_key, 10)
    if not rows:
        st.info("No missions flown yet. Be the first!")
    for n, r in enumerate(rows, 1):
        c1, c2, c3 = st.columns([4, 1, 1])
        c1.markdown(f"**{n}. {r['name']}** · {r.get('player', '')} · {C.DIFFICULTY[r['difficulty']]['name']} · seed {r['seed']}")
        c2.markdown(f"**{r['grade']}** · {r['score']}")
        if c3.button("Load design", key=f"lb_{n}"):
            if in_room():
                store.replace_design(ss.room, normalize(r["design"]))
            else:
                ss.design = normalize(r["design"])
            st.rerun()

# ------------------------------------------------------------------------------ learn
with tabs[7]:
    st.markdown("""
#### How real missions are designed
Engineers trade **mass, power, data, cost and risk** against each other. Every choice helps one thing and hurts another.

- **Rocket equation.** Each m/s of velocity change costs propellant exponentially: `m_prop = m_dry · (e^(Δv / (Isp·g₀)) − 1)`.
  Efficient engines (high *Isp*) need less fuel.
- **Inverse-square law.** Sunlight and radio signals weaken with distance squared. At Jupiter (5.2 AU) panels get 1/27 of
  the power they get at Earth, and data rates drop by about 25×.
- **Margins.** Spacecraft always grow heavier and hungrier during development. NASA keeps ~10–30% margin on mass and power.
- **Radiation.** Jupiter's belts destroy unprotected electronics. Juno and Europa Clipper hide their computers in titanium vaults.
- **Orbits.** Low orbits give sharp data but need fuel to stay up; high orbits watch more at once but see less detail.
- **Reserves.** Budget cuts and surprises happen. Money in reserve keeps a mission alive.

*Numbers are simplified from public data on missions such as MRO, LRO, Juno, Europa Clipper and CubeSats. They teach
trade-offs, not exact engineering.*
""")

# ------------------------------------------------------------------------------ live multiplayer refresh
if in_room():
    ss.seen_version = store.version(ss.room)

    @st.fragment(run_every=3)
    def _watch():
        if store.version(ss.room) != ss.get("seen_version"):
            st.rerun()

    _watch()
