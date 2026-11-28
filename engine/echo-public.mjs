export const POLICIES = Object.freeze({
  majority: 'Strict majority',
  plurality: 'Plurality with seeded ties',
  unanimity: 'Unanimity',
  tieAbstain: 'Plurality with abstention on ties',
});

export function tally(predictions, memberIndices, optionCount, policy, questionId, seed) {
  const counts = Array(optionCount).fill(0);
  let valid = 0;
  for (const member of memberIndices) {
    const option = predictions[member];
    if (Number.isInteger(option) && option >= 0 && option < optionCount) {
      counts[option]++;
      valid++;
    }
  }
  const highest = Math.max(...counts);
  const leaders = counts.flatMap((count, i) => count === highest ? [i] : []);
  let answer = null;
  if (highest > 0) {
    switch (policy) {
      case 'majority':
        if (highest * 2 > memberIndices.length) answer = leaders[0];
        break;
      case 'plurality':
        answer = leaders[(Math.imul((questionId ^ seed), 2654435761) >>> 0) % leaders.length];
        break;
      case 'unanimity':
        if (highest === memberIndices.length) answer = leaders[0];
        break;
      case 'tieAbstain':
        if (leaders.length === 1) answer = leaders[0];
        break;
      default:
        throw new RangeError('Unknown ECHO voting policy');
    }
  }
  return { answer, counts, valid };
}

export function committeeAnswer(row, indices, policy, seed) {
  return tally(row.predictions, indices, row.options, policy, row.id, seed).answer;
}

export function poissonBinomial(probabilities) {
  let distribution = [1];
  for (const probability of probabilities) {
    const next = Array(distribution.length + 1).fill(0);
    distribution.forEach((mass, i) => {
      next[i] += mass * (1 - probability);
      next[i + 1] += mass * probability;
    });
    distribution = next;
  }
  return distribution;
}
