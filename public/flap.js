// ============================================
// FLAP CLASS
// ============================================
export class Flap {
  constructor(index, maxNum, target) {
    this.index = index;
    this.maxNum = maxNum;
    this.target = target;
    this.current = 0;
    this.delay = index;
    this.frame = 0;
    this.flipSpeed = 4;
    this.position = [0,0];
    this.static = false;
  }

  setTarget(newTarget) {
    this.target = Math.max(0, Math.min(newTarget, this.maxNum - 1));
  }

  setDelay(newDelay) {
    this.delay = Math.max(0, newDelay);
  }

  setRandom() {
    this.current = Math.floor(Math.random() * this.maxNum);
  }

  flip() {
    if (this.delay > 0) {
      this.delay -= 1.0;
      return;
    }

    if (this.current !== this.target && this.static === false) {
      const distanceUp = (this.target - this.current + this.maxNum) % this.maxNum;
      const distanceDown = (this.current - this.target + this.maxNum) % this.maxNum;
      
      let nextValue;
      if (distanceUp <= distanceDown) {
        nextValue = (this.current + Math.min(this.flipSpeed, distanceUp)) % this.maxNum;
      } else {
        nextValue = ((this.current - Math.min(this.flipSpeed, distanceDown)) + this.maxNum) % this.maxNum;
      }

      const newDistanceUp = (this.target - nextValue + this.maxNum) % this.maxNum;
      const newDistanceDown = (nextValue - this.target + this.maxNum) % this.maxNum;
      
      if (Math.min(newDistanceUp, newDistanceDown) <= Math.min(distanceUp, distanceDown)) {
        this.current = nextValue;
      } else {
        this.current = this.target;
      }
    }
  }

  update() {
    this.frame += 1;
    return this.current;
  }

  isFlipping() {
    // Returns true if still waiting OR if still moving
    return (this.current !== this.target || this.delay > 0) && !this.static;
  }
}