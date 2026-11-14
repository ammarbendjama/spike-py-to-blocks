/*
 * examples.js — Programmes d'exemple (API Python SPIKE App 3).
 */
(function (root) {
  'use strict';

  const EXAMPLES = {
    'bonjour': {
      name: 'Bonjour !',
      code: `from hub import light_matrix
import runloop

async def main():
    # ecrire un texte sur la matrice
    await light_matrix.write("Hi!")

runloop.run(main())
`
    },
    'avancer': {
      name: 'Avancer / reculer',
      code: `from hub import port
import motor_pair, runloop

async def main():
    motor_pair.pair(motor_pair.PAIR_1, port.A, port.B)
    await motor_pair.move_for_degrees(720, 300)
    await wait_for_seconds(1)
    await motor_pair.move_for_degrees(-360, 300)
    motor_pair.stop()

runloop.run(main())
`
    },
    'carre': {
      name: 'Parcourir un carre',
      code: `from hub import port
import motor_pair, runloop

async def main():
    motor_pair.pair(motor_pair.PAIR_1, port.A, port.B)
    for i in range(4):
        await motor_pair.move_for_degrees(1030, 300)
        await motor_pair.move_for_degrees(430, 150, 100)

runloop.run(main())
`
    },
    'ligne': {
      name: 'Suivi de ligne',
      code: `from hub import port, light_matrix
import color_sensor, motor_pair, runloop

async def main():
    motor_pair.pair(motor_pair.PAIR_1, port.A, port.B)
    while True:
        if color_sensor.reflection(port.C) < 50:
            await motor_pair.move_for_degrees(20, 100, -40)
        else:
            await motor_pair.move_for_degrees(20, 100, 40)

runloop.run(main())
`
    },
    'distance': {
      name: 'Capteur de distance',
      code: `from hub import port, light_matrix, sound
import distance_sensor, motor_pair, runloop

async def main():
    motor_pair.pair(motor_pair.PAIR_1, port.A, port.B)
    await motor_pair.move_for_degrees(2000, 200)
    await wait_until(distance_sensor.distance(port.F) < 100)
    motor_pair.stop()
    await light_matrix.write("STOP")
    await sound.beep(440, 500)

runloop.run(main())
`
    },
    'brique': {
      name: 'Mes blocs (procedure)',
      code: `from hub import port
import motor, motor_pair, runloop

async def avancer_tout_droit(distance, vitesse):
    await motor_pair.move_for_degrees(distance * 20, vitesse)

async def tourner(angle):
    await motor_pair.move_for_degrees(angle * 5, 100, 100)

async def main():
    motor_pair.pair(motor_pair.PAIR_1, port.A, port.B)
    await avancer_tout_droit(50, 300)
    await tourner(90)
    await avancer_tout_droit(50, 300)

runloop.run(main())
`
    },
    'bouton': {
      name: 'Bouton + variable',
      code: `from hub import port, button, light_matrix
import motor_pair, runloop

async def main():
    motor_pair.pair(motor_pair.PAIR_1, port.A, port.B)
    compteur = 0
    while compteur < 3:
        if button.LEFT in button.pressed():
            compteur += 1
            await light_matrix.write(str(compteur))
        await wait_for_seconds(0.2)
    await motor_pair.move_for_degrees(720, 300)

runloop.run(main())
`
    }
  };

  const Examples = EXAMPLES;
  if (typeof module !== 'undefined' && module.exports) module.exports = Examples;
  else root.Examples = Examples;
})(typeof window !== 'undefined' ? window : globalThis);
