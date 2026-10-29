// Keep tuning separate from game behaviour so features can be developed independently.
window.COIN_DASH = {
  width: 800,
  height: 500,
  roundSeconds: 20,
  playerSpeed: 360,
  // Every treasureEvery-th pickup is a treasure chest worth treasureValue coins.
  treasureEvery: 5,
  treasureValue: 5,
  defaultDifficulty: 'normal',
  // brain: 'bounce' drifts and bounces, 'chase' steers toward the player,
  // 'hunter' stops to predict where the player will be, then rushes that spot.
  difficulties: {
    easy:    { label: 'Easy',    blurb: 'Two slow skulls drifting around',
               droneCount: 2, droneSpeed: 80,  brain: 'bounce' },
    normal:  { label: 'Normal',  blurb: 'Three skulls bouncing off the walls',
               droneCount: 3, droneSpeed: 105, brain: 'bounce' },
    hard:    { label: 'Hard',    blurb: 'Four skulls that follow you',
               droneCount: 4, droneSpeed: 140, brain: 'chase', turnRate: 1.6 },
    extreme: { label: 'Extreme', blurb: 'Skulls calculate your path and rush you',
               droneCount: 4, droneSpeed: 72,  brain: 'hunter', turnRate: 1.2,
               rushSpeed: 384, aimMs: 550, maxRushMs: 1100, cooldownMs: 1500 }
  },
  colors: { background: 0x101c31, player: 0x71e8ce, coin: 0xffd166, drone: 0xff657a, skull: 0xfff4e0,
            belly: 0xd9fff6, wing: 0x3fb8a0, chest: 0xa0643c }
};
