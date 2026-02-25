# BE Specs

Backend specifications created by `/write-be-spec`. Each spec corresponds to one or more IA shards and defines the complete backend contract — routes, schemas, DAL functions, error handling, and security model.

## Naming Convention

Specs are numbered to match their source IA shard: `00-*.md`, `01-*.md`, ..., `NN-*.md`. An `index.md` file maps spec numbers to IA shard sources.

## Completion Requirement

All BE specs must reach **Complete** status before `/plan-phase` begins. Run `/audit-ambiguity be` to verify.
