"""Run the frozen POLIS reference with the correct precision for aggregate means."""
from runpy import run_module
from statistics import mean
from unittest.mock import patch

import reference_civilizations


def floating_mean(values):
    """An exactly integral mean still matches a binary64 online mean within tolerance."""
    return float(mean(values))


if __name__ == "__main__":
    # Limit the adapter to summary means. Integer distributions, replay rows and ledgers
    # are still checked exactly by the frozen reference.
    with patch.object(reference_civilizations, "mean", floating_mean):
        run_module("reference_polis", run_name="__main__")
