"""NASA challenge resources in the game: CML ladder, segments, equipment list, advice, real missions, build options."""
import pytest

from engine import catalog as C
from engine import nasa
from engine.model import blank_design, default_design, evaluate
from engine.scoring import score
from engine.simulate import simulate


@pytest.mark.parametrize("scenario", list(C.SCENARIOS))
def test_brief_for_every_mission(scenario):
    for design in (blank_design(scenario), default_design(scenario)):
        n = evaluate(design)["nasa"]
        assert [s["key"] for s in n["segments"]] == ["launch", "space", "ground", "user"]
        assert len(n["cml"]["steps"]) == 4 and 0 <= n["cml"]["level"] <= 4
        assert n["real"] and all(r["lesson"] and r["url"].startswith("https://") for r in n["real"])
        assert all(t["source"] and t["quote"] for t in n["tips"])


def test_every_resource_is_linked_and_used():
    assert len(nasa.RESOURCES) == 9
    assert all(r["key"] in nasa.URL and r["used"] and r["what"] for r in nasa.RESOURCES)
    assert [p["key"] for p in nasa.PROCESS] == ["need", "concept", "requirements", "design", "build", "implement"]


def test_cml_climbs_with_the_design():
    assert evaluate(blank_design("wildfire"))["nasa"]["cml"]["level"] == 0
    assert evaluate(blank_design("wildfire") | {"orbit": "sso"})["nasa"]["cml"]["level"] == 1
    d = default_design("wildfire")
    alone = evaluate(d)["nasa"]["cml"]
    assert alone["level"] == 2 and alone["skipped_trades"]          # a point design without a trade study stays at CML 2
    traded = evaluate(d, trades=2)["nasa"]["cml"]
    assert traded["level"] == 4 and not traded["skipped_trades"]


def test_point_design_needs_margins_and_reserve():
    d = default_design("wildfire")
    ev = evaluate(d, trades=2)
    assert ev["cost"]["reserve"] >= 0.10 and ev["nasa"]["cml"]["level"] == 4
    broke = evaluate(d | {"spare": "spare", "testing": "tlyf", "launch_vehicle": "falcon_heavy"}, trades=2)
    if broke["cost"]["reserve"] < 0.10:
        assert broke["nasa"]["cml"]["level"] == 3


def test_segments_follow_the_issues():
    ev = evaluate(default_design("mars_climate") | {"comms": "uhf"})
    seg = {s["key"]: s["state"] for s in ev["nasa"]["segments"]}
    assert seg["ground"] in ("warn", "bad")
    seg = {s["key"]: s["state"] for s in evaluate(blank_design("mars_climate"))["nasa"]["segments"]}
    assert seg["launch"] == "pending" and seg["ground"] == "pending"


def test_equipment_list_adds_up_to_the_launch_mass():
    ev = evaluate(default_design("mars_climate"))
    m = ev["nasa"]["mel"]
    assert m["total"]["mass"] == pytest.approx(ev["mass"]["wet"], rel=0.01)
    assert {"Structure", "Payload", "Propulsion"} <= {r["group"] for r in m["rows"]}
    assert evaluate(default_design("iss_resupply"))["nasa"]["mel"]["rows"] == []


def test_tips_react_to_the_design():
    tips = {t["id"]: t["active"] for t in evaluate(default_design("wildfire"))["nasa"]["tips"]}
    assert tips["tlyf"] and tips["spare"] and tips["trades"]
    tips = {t["id"]: t["active"] for t in evaluate(default_design("wildfire") | {"testing": "tlyf", "spare": "spare"}, trades=2)["nasa"]["tips"]}
    assert not tips["tlyf"] and not tips["spare"] and not tips["trades"]


def test_testing_changes_cost_and_risk():
    d = default_design("mars_climate")
    std, tlyf, mini = (evaluate(d | {"testing": t}) for t in ("standard", "tlyf", "minimal"))
    assert mini["cost"]["total"] < std["cost"]["total"] < tlyf["cost"]["total"]
    assert tlyf["schedule"]["risk_mult"] < std["schedule"]["risk_mult"] < mini["schedule"]["risk_mult"]
    assert any("Minimal testing" in i["text"] for i in mini["issues"])
    assert evaluate(d | {"testing": "nonsense"})["design"]["testing"] == "standard"


def test_spare_unit_survives_a_launch_failure():
    d = default_design("wildfire")
    seed = next(s for s in range(1, 3000) if any(e["kind"] == "launch_failure" for e in simulate(d, s)["events"]))
    assert simulate(d, seed)["outcome"] == "lost"
    twin = simulate(d | {"spare": "spare"}, seed)
    assert twin["outcome"] != "lost" or twin["months_survived"] > 0
    assert any(e["kind"] == "launch_failure" and e["impact"] == "bad" for e in twin["events"])
    assert evaluate(d | {"spare": "spare"})["cost"]["total"] > evaluate(d)["cost"]["total"]
    assert any("second flight unit" in a for a in score(twin)["analysis"])


def test_reserve_rule_is_worth_fifty_points():
    d = default_design("wildfire")
    ev = evaluate(d)
    sim = simulate(d, 7, ev)
    full = score(sim)["parts"]["budget"]
    ev["cost"]["reserve"] = 0.05
    assert score(sim)["parts"]["budget"] == full - 50
    assert any("10%" in a for a in score(sim)["analysis"])


def test_real_mission_rows_compare_like_with_like():
    r = evaluate(default_design("mars_climate"))["nasa"]["real"][0]
    assert r["name"] == "Mars Reconnaissance Orbiter" and {x["label"] for x in r["rows"]} >= {"Launch mass", "Cost", "Rocket"}
    assert "lighter" in r["note"] or "heavier" in r["note"] or "same" in r["note"]
