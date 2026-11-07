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
