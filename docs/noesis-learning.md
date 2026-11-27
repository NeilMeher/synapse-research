# NOESIS: Interactive Learning Guide

## 1. Overview: The Problem of the Automated Scientist

Imagine you are an automated probe dropped onto an unknown exoplanet. You have a laser sensor that can measure the local gravitational or atmospheric acceleration $y$ at chosen altitudes $x \in [-2, 2]$. Every measurement costs battery energy, so you are granted only **8 measurements**.

Nature's true relationship is governed by one of four candidate physical principles:
1. **Polynomial dynamics** ($f(x) = \theta_0 + \theta_1 x + \theta_2 x^2$)
2. **Periodic / Harmonic waves** ($f(x) = \theta_0 + \theta_1 \sin(\pi x) + \theta_2 \cos(\pi x)$)
3. **Exponential dissipation** ($f(x) = \theta_0 + \theta_1 e^{-x^2} + \theta_2 e^{-|x|}$)
4. **Rational / Padé damping** ($f(x) = \theta_0 + \frac{\theta_1}{1+x^2} + \frac{\theta_2 x}{1+x^2}$)

How should you choose your 8 measurements?

---

## 2. Four Inquiry Strategies

### Strategy A: Passive Random
- You shoot your laser at randomly chosen altitudes.
- **Weakness**: Clustered points often waste measurements near $x \approx 0$, where polynomials, harmonic sines, and rational functions look nearly identical!

### Strategy B: Uniform Grid
- You place measurements at evenly spaced intervals across the whole domain.
- **Strength**: Superb global coverage. Yields the lowest overall test prediction error (RMSE = $0.1219$).
- **Weakness**: Doesn't focus specifically on resolving ambiguities between rival theories.

### Strategy C: Active Uncertainty
- You ask the currently leading theory: *"Where are you least sure about your prediction?"*
- You measure at the point of maximum predictive variance.

### Strategy D: Active Information Gain (*Experimentum Crucis*)
- You ask: *"Where do our rival theories disagree the most?"*
- If Theory 1 predicts $y = +2.5$ at $x = 1.8$, while Theory 2 predicts $y = -1.2$ at the same altitude, measuring at $x = 1.8$ will decisively falsify one of them in a single shot!
- This achieved the highest true law identification rate ($91.33\%$).

---

## 3. The Discovery vs. Precision Trade-off

One of NOESIS's key scientific insights is the **epistemological trade-off**:
- **Discovery Power (Hypothesis Discrimination)**: Maximized by measuring at disagreement hotspots.
- **Interpolation Precision (Parameter Fitting)**: Maximized by uniform space-filling coverage.

An ideal autonomous scientific agent must dynamically balance **theory discrimination** in early phases with **parameter refinement** in later phases.

---

## 4. Replicating the Benchmark

In your terminal:
```bash
# Run unit tests
npm test

# Verify NOESIS exact reproduction
node scripts/noesis.mjs verify

# Run Python reference verification
python scripts/reference_noesis.py
```
