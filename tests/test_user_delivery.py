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
    assert "50%" in rows["Goal rule"]


def test_user_segment_delivery_conserves_data():
    ev = evaluate(default_design("wildfire"))
    rows = dict(next(s for s in ev["nasa"]["segments"] if s["key"] == "user")["lines"])
    value = lambda key: float(rows[key].split()[0])
    assert value("Data collected") == pytest.approx(value("Data delivered") + value("Data not delivered"), abs=.11)
    assert rows["Required goals met"] == "2 of 2"
