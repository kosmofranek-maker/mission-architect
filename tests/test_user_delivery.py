import pytest
from engine.model import default_design, evaluate


def test_user_segment_reports_data_delivery_and_required_goals():
    ev = evaluate(default_design("mars_climate") | {"ground": "uni"})
    user = next(s for s in ev["nasa"]["segments"] if s["key"] == "user")
    rows = dict(user["lines"])
    assert ev["data"]["generated_gb_day"] > 0
    assert ev["data"]["return"] == 0
    assert rows["Data delivered"] == "0.0 Gb a day"
    assert rows["Data not delivered"] == rows["Data collected"]
    assert user["state"] in ("warn", "bad")
    assert any("50%" in n for n in user["notes"])


def test_user_segment_delivery_conserves_data():
    ev = evaluate(default_design("wildfire"))
    rows = dict(next(s for s in ev["nasa"]["segments"] if s["key"] == "user")["lines"])
    value = lambda key: float(rows[key].split()[0])
    assert value("Data collected") == pytest.approx(value("Data delivered") + value("Data not delivered"), abs=.11)
    assert rows["Required goals met"] == "2 of 2"


def test_primary_objective_shifts_weight_but_not_the_total():
    from engine import catalog as C
    d = default_design("mars_climate")
    plain = evaluate(d)
    total = sum(g["weight"] for g in plain["science"]["goals"])
    for g in plain["science"]["goals"]:
        picked = evaluate(d | {"priority": g["tag"]})
        ws = {x["tag"]: x for x in picked["science"]["goals"]}
        assert sum(x["weight"] for x in ws.values()) == pytest.approx(total)
        assert ws[g["tag"]]["primary"] and ws[g["tag"]]["weight"] > g["weight"]
    best = max(plain["science"]["goals"], key=lambda g: g["fraction"])
    worst = min(plain["science"]["goals"], key=lambda g: g["fraction"])
    assert evaluate(d | {"priority": best["tag"]})["science"]["score"] > plain["science"]["score"] \
        > evaluate(d | {"priority": worst["tag"]})["science"]["score"]
    assert evaluate(d | {"priority": "nonsense"})["design"]["priority"] is None
    assert C.PRIORITY_WEIGHT > 1


def test_data_processing_trades_money_for_science():
    d = default_design("mars_climate")
    raw, std, center = (evaluate(d | {"processing": p}) for p in ("raw", "standard", "center"))
    assert raw["cost"]["total"] < std["cost"]["total"] < center["cost"]["total"]
    assert raw["science"]["score"] < std["science"]["score"] < center["science"]["score"]
    rows = dict(next(s for s in center["nasa"]["segments"] if s["key"] == "user")["lines"])
    assert rows["Data processing"] == "Science data center"
    assert evaluate(d | {"processing": "nonsense"})["design"]["processing"] == "standard"
