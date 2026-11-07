from streamlit.testing.v1 import AppTest


def run():
    at = AppTest.from_file("../app.py", default_timeout=30)
    at.run()
    assert not at.exception, at.exception
    return at


def test_app_renders_all_scenarios():
    at = run()
    for sc in ["lunar_ice", "mars_climate", "europa", "wildfire"]:
        at.selectbox(key="w_scenario").set_value(sc).run()
        assert not at.exception, at.exception
        assert at.session_state["design"]["scenario"] == sc


def test_launch_produces_score(monkeypatch, tmp_path):
    import engine.leaderboard as lb
    monkeypatch.setattr(lb, "PATH", tmp_path / "lb.json")
    at = run()
    launch = next(b for b in at.button if "LAUNCH" in b.label)
    launch.click().run()
    assert not at.exception, at.exception
    assert at.session_state["last"]["score"]["grade"] in "SABCF"


def test_change_part_updates_design():
    at = run()
    at.selectbox(key="w_bus").set_value("cubesat").run()
    assert at.session_state["design"]["bus"] == "cubesat"
    assert not at.exception
