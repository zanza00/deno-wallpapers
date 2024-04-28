import { Context, Effect, Layer, Ref } from "effect";

type state = {
	count: number;
	error_count: number;
	processed: number;
	skipped: number;
};

interface CounterStateI {
	readonly inc: (counter: keyof state) => Effect.Effect<void>;
	get: Effect.Effect<state>;
}

export class CounterState extends Context.Tag("CounterState")<
	CounterState,
	CounterStateI
>() {}

const initialState = Ref.make({
	count: 0,
	error_count: 0,
	processed: 0,
	skipped: 0,
});

class CounterStateImpl implements CounterStateI {
	#value: Ref.Ref<state>;
	get: Effect.Effect<state, never, never>;

	constructor(value: Ref.Ref<state>) {
		this.#value = value;
		this.get = Ref.get(this.#value);
	}

	inc(counter: keyof state) {
		return Ref.update(this.#value, (old_state) => {
			const new_state = { ...old_state };
			new_state[counter] = old_state[counter] + 1;
			return new_state;
		});
	}
}

export const CounterStateLive = Layer.effect(
	CounterState,
	initialState.pipe(
		Effect.map((state) => CounterState.of(new CounterStateImpl(state))),
	),
);
