/**
 * The numbers behind the match of the day, with nothing else in the file.
 *
 * They live apart from daily.ts because the prediction card is a client
 * component: importing a single constant from a module that also imports the
 * database drags `postgres` into the browser bundle, and the build stops with
 * "Can't resolve 'fs'". Values here, queries there.
 */

/**
 * The prize for a correct score, as a share of what everyone started with.
 *
 * A fifth of the starting balance is enormous — on €10.000 it is €2.000, more
 * than most players make in a month. That is the point: it has to be worth
 * opening the app for. It is a gift, not a pot, so several correct guesses
 * each get the full amount rather than splitting it.
 */
export const PREDICTION_REWARD_SHARE = 0.2;

/** Highest score either side can be given. Beyond this it stops being a guess. */
export const MAX_GOALS = 7;
