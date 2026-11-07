import math

import pytest

from engine import catalog as C
from engine.model import default_design, evaluate
from engine.scoring import score
from engine.simulate import monte_carlo, simulate


@pytest.mark.parametrize("scenario", list(C.SCENARIOS))
def test_default_designs_launchable(scenario):
    ev = evaluate(default_design(scenario))
    assert ev["ok"], [i["text"] for i in ev["issues"] if i["severity"] == "blocker"]
    assert 0 < ev["science"]["score"] <= 115


def blockers(d):
    return [i["area"] for i in evaluate(d)["issues"] if i["severity"] == "blocker"]


def test_rocket_equation_matches_closed_form():
    d = default_design("lunar_ice")
    ev = evaluate(d)
    m = ev["mass"]
    isp = C.PROPULSION[d["propulsion"]]["isp"]
    assert math.isclose(m["wet"] / m["dry"], math.exp(m["dv"] / (isp * C.G0)), rel_tol=1e-6)


def test_electron_cannot_reach_mars():
    d = default_design("mars_climate") | {"launch_vehicle": "electron"}
    assert "launch" in blockers(d)


def test_magnetorquer_blocked_beyond_earth():
    assert "adcs" in blockers(default_design("lunar_ice") | {"adcs": "magnetorquer"})


def test_university_station_cant_reach_mars():
    assert "comms" in blockers(default_design("mars_climate") | {"ground": "uni"})


def test_no_power_source_blocked():
    assert "power" in blockers(default_design("wildfire") | {"solar": "none", "rtg": 0})


def test_solar_power_falls_with_distance():
    e = evaluate(default_design("europa"))
    assert e["power"]["sunlit"] < C.SOLAR_ARRAYS["giant"]["power_1au"] / 25


def test_over_budget_blocked_unless_sandbox():
    d = default_design("wildfire") | {"launch_vehicle": "sls"}
    assert "cost" in blockers(d)
    assert "cost" not in blockers(d | {"sandbox": True})


def test_slots_limit():
    d = default_design("wildfire") | {"bus": "cubesat", "instruments": ["wac", "thermal", "sounder"]}
    assert "bus" in blockers(d)


def test_bigger_dish_returns_more_data():
    d = default_design("mars_climate")
    low = evaluate(d | {"comms": "xhga"})["data"]["return"]
    high = evaluate(d | {"comms": "kahga", "ground": "dsn70"})["data"]["return"]
    assert high > low


def test_simulation_is_deterministic():
    d = default_design("europa")
    a, b = simulate(d, 42), simulate(d, 42)
    assert a["events"] == b["events"] and a["science_score"] == b["science_score"]


def test_blocked_design_does_not_launch():
    d = default_design("mars_climate") | {"launch_vehicle": "electron"}
    s = simulate(d, 1)
    assert not s["launched"] and score(s)["grade"] == "F"


def test_score_bounds_and_grade():
    for seed in range(20):
        sc = score(simulate(default_design("wildfire"), seed))
        assert 0 <= sc["total"] <= sum(sc["max"].values())
        assert sc["grade"] in "SABCF"


def test_monte_carlo():
    mc = monte_carlo(default_design("wildfire"), runs=50)
    assert 0.7 <= mc["success_rate"] <= 1.0
    assert mc["science_p10"] <= mc["science_median"] <= mc["science_p90"]


def test_room_roles_and_approvals():
    from engine.rooms import RoomStore
    s = RoomStore()
    code = s.create("mars_climate")
    s.join(code, "ana", ["science"])
    s.join(code, "bo", ["manager", "systems", "comms"])
    assert not s.set_field(code, "ana", "bus", "flagship")  # not her role
    for p, roles in (("ana", ["science"]), ("bo", ["manager", "systems", "comms"])):
        for r in roles:
            assert s.approve(code, p, r)
    assert s.all_approved(code)
    assert s.set_field(code, "ana", "orbit", "low")
    assert not s.all_approved(code)  # any change resets approvals
    assert s.get(code)["design"]["orbit"] == "low"


def test_leaderboard(tmp_path):
    from engine import leaderboard as lb
    p = tmp_path / "lb.json"
    for i in range(5):
        lb.add({"scenario": "wildfire", "score": i * 100, "name": f"p{i}"}, p)
    lb.add({"scenario": "europa", "score": 999, "name": "x"}, p)
    t = lb.top("wildfire", 3, p)
    assert [r["score"] for r in t] == [400, 300, 200]


@pytest.mark.parametrize("scenario", list(C.SCENARIOS))
def test_blank_design_evaluates_with_choose_blockers(scenario):
    from engine.model import COMPONENTS, blank_design, edl_use
    ev = evaluate(blank_design(scenario))
    assert not ev["ok"]
    missing = [i for i in ev["issues"] if i["area"] == "missing"]
    if C.SCENARIOS[scenario].get("kind") == "program":
        assert len(missing) == 1 and missing[0]["field"] == "manifest"
    elif C.SCENARIOS[scenario].get("kind") == "vehicle":
        assert {i["field"] for i in missing} == {"shape", "seats", "heatshield", "abort", "landing", "launch_vehicle"}
    else:
        assert len(missing) == len(COMPONENTS) - (0 if edl_use(scenario) else 1)
    assert ev["science"]["score"] == 0
    assert not simulate(blank_design(scenario), 1)["launched"]


def test_partial_design_has_no_noise_from_missing_parts():
    from engine.model import blank_design
    d = blank_design("wildfire") | {"orbit": "sso", "instruments": ["thermal"]}
    ev = evaluate(d)
    areas = {i["area"] for i in ev["issues"] if i["severity"] == "blocker"}
    assert areas == {"missing"}  # only "choose X", nothing derived from absent parts


def test_normalize_rejects_unknown_parts():
    from engine.model import normalize
    d = normalize({"scenario": "moon?", "bus": "deathstar", "orbit": "geo", "instruments": ["wac", "nope", "wac"]})
    assert d["scenario"] == "wildfire" and d["bus"] is None and d["orbit"] == "geo" and d["instruments"] == ["wac"]


def _load(d, key):
    return evaluate(d)["power"]["loads"][key]


def test_heaters_grow_with_distance_and_size_and_rtg_heat_helps():
    from engine.model import blank_design
    base = {"bus": "medium", "solar": "large", "battery": "b3000", "comms": "xhga", "ground": "dsn34",
            "computer": "radhard", "adcs": "wheels", "propulsion": "biprop", "instruments": ["wac"]}
    earth = blank_design("wildfire") | base | {"orbit": "sso"}
    mars = blank_design("mars_climate") | base | {"orbit": "elliptical"}
    jup = blank_design("europa") | base | {"orbit": "flyby"}
    assert _load(earth, "Heaters") == 0 < _load(mars, "Heaters") < _load(jup, "Heaters")
    assert _load(jup | {"bus": "flagship"}, "Heaters") > _load(jup, "Heaters")
    assert _load(jup | {"rtg": 1}, "Heaters") < _load(jup, "Heaters")


def test_small_spacecraft_draw_less_for_wheels_and_comms_scale_with_contact():
    d = default_design("wildfire")
    assert _load(d | {"bus": "cubesat"}, "ADCS") < _load(d | {"bus": "medium"}, "ADCS")
    assert _load(d | {"ground": "uni"}, "Comms") < _load(d | {"ground": "commercial"}, "Comms")


def test_airbags_need_air():
    d = default_design("lunar_lander") | {"edl": "airbags"}
    assert any(i["area"] == "edl" and i["severity"] == "blocker" for i in evaluate(d)["issues"])


def test_lunar_night_needs_rtg():
    d = default_design("lunar_lander") | {"orbit": "mare"}
    ev = evaluate(d)
    assert any(i["severity"] == "blocker" and "eclipse" in i["text"] for i in ev["issues"])
    d2 = d | {"rtg": 2}
    assert evaluate(d2)["power"]["eclipse_need_wh"] < ev["power"]["eclipse_need_wh"]


def test_orbital_instruments_useless_on_surface():
    ev = evaluate(default_design("mars_rover") | {"instruments": ["hirise", "drill"]})
    assert ev["science"]["per_instrument"]["hirise"] == 0


def test_hazard_avoidance_cuts_landing_risk():
    a = evaluate(default_design("lunar_lander") | {"orbit": "psr", "rtg": 2, "solar": "none"})
    b = evaluate(default_design("lunar_lander") | {"orbit": "psr", "rtg": 2, "solar": "none", "edl": "hazard"})
    assert b["edl"]["landing_risk"] < a["edl"]["landing_risk"] / 2


def test_sample_return_needs_capsule_and_no_flyby():
    ev = evaluate(default_design("asteroid_sample") | {"orbit": "flyby"})
    assert any(i["area"] == "orbit" and i["severity"] == "blocker" for i in ev["issues"])
    bigger = evaluate(default_design("asteroid_sample"))["mass"]["dv"]
    plain = evaluate(default_design("asteroid_prospector") | {"orbit": "orbit"})["mass"]["dv"]
    assert bigger > plain  # the trip home needs extra delta-v


def test_relay_only_at_mars():
    from engine.model import normalize
    assert normalize(default_design("lunar_lander") | {"ground": "relay"})["ground"] is None


def test_launch_windows_trade_time_for_risk():
    from engine.model import launch_windows
    w = launch_windows("mars", 0)
    assert [x["month"] for x in w] == sorted(x["month"] for x in w)
    assert w[1]["month"] - w[0]["month"] == 26           # Mars windows repeat every 26 months
    assert w[0]["risk_mult"] > w[1]["risk_mult"]          # less time to build = riskier
    early = evaluate(default_design("mars_climate") | {"window": "w1"})
    assert any(i["area"] == "window" for i in early["issues"])
    assert early["mass"]["capacity"] != evaluate(default_design("mars_climate") | {"window": "w3"})["mass"]["capacity"]


def test_slip_costs_money_and_months():
    from engine.simulate import simulate
    d = default_design("venus_clouds") | {"window": "w1"}
    sims = [simulate(d, s) for s in range(60)]
    slipped = [x for x in sims if x.get("launch_delay")]
    assert slipped and all(x["launch_delay"] == 19 for x in slipped)


def test_partners_share_cost_add_hardware_and_delay():
    a = evaluate(default_design("mars_climate"))
    b = evaluate(default_design("mars_climate") | {"partners": ["esa", "isro", "jaxa"]})
    assert b["design"]["partners"] == ["esa", "isro"]          # at most two
    assert b["cost"]["total"] < a["cost"]["total"]
    assert "partner_esa" in b["science"]["per_instrument"]
    assert b["data"]["contact_hours"] > a["data"]["contact_hours"]
    assert b["schedule"]["slip"] == a["schedule"]["slip"] and b["partners"]["delay"] > 0.1


def _prog(sc, flights):
    from engine.model import blank_design
    return blank_design(sc) | {"manifest": [{"p": p, "lv": lv, "slot": s} for p, lv, s in flights]}


def test_station_order_matters():
    ev = evaluate(_prog("orbital_outpost", [("hab", "falcon9", 0), ("core", "vulcan", 1)]))
    assert any(i["area"] == "order" for i in ev["issues"])


def test_crew_needs_crew_rated_rocket_and_supplies():
    bad = evaluate(_prog("orbital_outpost", [("core", "vulcan", 0), ("hab", "falcon9", 0), ("crew", "falcon_heavy", 1)]))
    assert any(i["area"] == "crew" and i["severity"] == "blocker" for i in bad["issues"])
    hungry = evaluate(_prog("orbital_outpost", [("core", "vulcan", 0), ("truss", "falcon9", 0), ("hab", "falcon9", 0),
                                                ("crew", "falcon9", 1), ("crew", "falcon9", 3)]))
    assert any(i["area"] == "supplies" and i["severity"] == "blocker" for i in hungry["issues"])


def test_moon_base_needs_power_for_four():
    ev = evaluate(_prog("lunar_base", [("lcargo", "vulcan", 0), ("lcrew", "sls", 1)]))
    assert any(i["area"] == "power" for i in ev["issues"])


def test_mars_crew_needs_predeployed_habitat_and_stages():
    same_window = evaluate(_prog("mars_base", [("mhab", "sls", 1), ("mpower", "falcon_heavy", 1), ("mtransit", "falcon_heavy", 1),
                                               ("mtransit", "falcon_heavy", 1), ("mcrew", "falcon9", 1)]))
    assert any(i["area"] == "order" for i in same_window["issues"])
    no_stages = evaluate(_prog("mars_base", [("mhab", "sls", 0), ("mpower", "falcon_heavy", 0), ("mcrew", "falcon9", 1)]))
    assert any("transit stage" in i["text"] for i in no_stages["issues"])


def test_partner_flight_is_free_and_on_their_date():
    base = _prog("orbital_outpost", [("core", "vulcan", 0), ("truss", "falcon9", 1), ("hab", "falcon9", 1)])
    a, b = evaluate(base), evaluate(base | {"partners": ["esa"]})
    assert len(b["program"]["flights"]) == len(a["program"]["flights"]) + 1
    lab = b["program"]["flights"][-1]
    assert lab["p"] == "lab" and lab["partner"] == "esa" and lab["cost"] == 0
    assert b["science"]["score"] > a["science"]["score"]


def test_program_simulation_is_reproducible():
    from engine.simulate import simulate
    d = default_design("mars_base")
    assert simulate(d, 11)["events"] == simulate(d, 11)["events"]


def test_reused_booster_is_cheaper_and_landings_are_reported():
    from engine.simulate import simulate
    a = evaluate(default_design("mars_climate"))
    b = evaluate(default_design("mars_climate") | {"boosters": {"falcon9": 1}})
    assert b["cost"]["total"] < a["cost"]["total"] and b["reused_booster"]
    assert any(simulate(default_design("mars_climate"), s).get("boosters_recovered") for s in range(5))


def test_iss_is_already_there():
    ev = evaluate(_prog("iss_resupply", [("crew", "falcon9", 0)]))
    assert not any(i["area"] == "order" for i in ev["issues"])   # the ISS provides the habitat


def test_program_reflies_boosters():
    ev = evaluate(_prog("iss_resupply", [("crew", "falcon9", 0), ("cargo", "falcon9", 1)]))
    assert [f.get("reused", False) for f in ev["program"]["flights"]] == [False, True]


def test_crew_vehicle_rules():
    base = default_design("crew_transport")
    assert evaluate(base)["ok"]
    assert any(i["area"] == "abort" for i in evaluate(base | {"shape": "winged", "abort": "tower"})["issues"])
    assert any(i["area"] == "landing" for i in evaluate(base | {"landing": "runway"})["issues"])
    assert any(i["area"] == "abort" for i in evaluate(base | {"abort": "seats"})["issues"])   # 4 seats, ejection seats
    safe = evaluate(base | {"abort": "tower", "heatshield": "ablative", "landing": "ocean"})
    assert safe["vehicle"]["one_in"] > 270 and safe["vehicle"]["seat_cost"] > evaluate(base)["vehicle"]["seat_cost"]


def test_joint_mission_partner_pays():
    a = evaluate(default_design("mars_climate"))
    b = evaluate(default_design("mars_climate") | {"joint": {"partner": "jaxa", "share": 0.25}})
    assert b["cost"]["total"] < a["cost"]["total"] * 0.8
