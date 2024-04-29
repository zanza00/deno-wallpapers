import { Effect, Layer, Ref } from "effect";

type state = {
	count: number;
	error_count: number;
	processed: number;
	skipped: number;
};

type ICounterState = {
	readonly inc: (counter: keyof state) => Effect.Effect<void>;
	get: Effect.Effect<state>;
};

export class CounterState extends Effect.Tag("CounterState")<
	CounterState,
	ICounterState
>() {}

const initialState = Ref.make({
	count: 0,
	error_count: 0,
	processed: 0,
	skipped: 0,
});

const make = Effect.gen(function* () {
	const state = yield* initialState;

	return {
		get: Ref.get(state),
		inc: (counter: keyof state) =>
			Ref.update(state, (old_state) => {
				const new_state = { ...old_state };
				new_state[counter] = old_state[counter] + 1;
				return new_state;
			}),
	} satisfies ICounterState;
});

export const CounterStateLive = Layer.effect(CounterState, make);
