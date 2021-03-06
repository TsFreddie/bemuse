export function getGauge(gaugeType) {
  if (gaugeType === 'hope') {
    return hopeGauge()
  }
  return nullGauge()
}

function nullGauge() {
  return {
    update() {},
    shouldDisplay() {
      return false
    },
    getPrimary() {
      return 0
    },
    getSecondary() {
      return 0
    },
    getExtra() {
      return 0
    },
  }
}

function hopeGauge() {
  let primary
  let secondary
  let extra
  return {
    update(playerState) {
      const stats = playerState.stats
      const progress = stats.numJudgments / stats.totalCombo
      const getHope = (min, max1, max2) => {
        const max = max1 + (max2 - max1) * progress
        const maxPossibleScore = stats.maxPossibleScore
        return Math.max(0, (maxPossibleScore - min) / (max - min))
      }
      const hopeS = getHope(500000, 555555, 510000) * 0.5
      primary = Math.min(1, hopeS)
      extra = Math.max(0, Math.min(1, hopeS - 1))
      if (hopeS > 0) {
        secondary = 0
      } else {
        const hopeA = getHope(450000, 500000, 500000)
        secondary = hopeA
      }
    },
    shouldDisplay() {
      return primary > 0 || secondary > 0
    },
    getPrimary() {
      return primary
    },
    getSecondary() {
      return secondary
    },
    getExtra() {
      return extra
    },
  }
}
