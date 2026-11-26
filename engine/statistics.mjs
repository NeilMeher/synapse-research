export class Moments {
  constructor() {
    this.count = 0;
    this.mean = 0;
    this.m2 = 0;
  }

  add(value) {
    this.count++;
    const delta = value - this.mean;
    this.mean += delta / this.count;
    this.m2 += delta * (value - this.mean);
  }

  summary(multiplier = 1.959963984540054, minimum = 0, maximum = 1) {
    if (this.count < 2) throw new Error("Uncertainty requires at least two independent trials.");
    const sd = Math.sqrt(Math.max(0, this.m2 / (this.count - 1)));
    const halfWidth = multiplier * sd / Math.sqrt(this.count);
    return {
      trials: this.count, estimate: this.mean, sd,
      interval: [Math.max(minimum, this.mean - halfWidth), Math.min(maximum, this.mean + halfWidth)],
    };
  }
}
