"""Run the frozen reference with a scale-aware residual for near-singular IRR cancellation."""
from decimal import Decimal, localcontext
from math import fsum
from unittest.mock import patch
import reference_energia as reference


def npv_with_cancellation_check(entries, rate):
    result = reference.frozen_npv(entries, rate)
    scale = fsum(abs(cash) / (1 + rate)**i for i, cash in enumerate(entries))
    if abs(result) <= 32 * 2**-52 * scale:
        with localcontext() as ctx:
            ctx.prec = 48
            discount = 1 / (1 + Decimal.from_float(rate))
            exact = sum(Decimal.from_float(float(cash)) * discount**i for i, cash in enumerate(entries))
        if abs(exact) > Decimal.from_float(32 * 2**-52 * scale):
            raise ValueError("IRR residual exceeds its scale-aware floating-point allowance.")
        return 0.0
    return result


if __name__ == "__main__":
    reference.frozen_npv = reference.npv
    with patch.object(reference, "npv", npv_with_cancellation_check):
        reference.main()
