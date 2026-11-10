# Graph Report - poe-stuff  (2026-11-10)

## Corpus Check
- 520 files · ~209,398 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 3, .css 3, .graphify-bak 1)

## Summary
- 2969 nodes · 7681 edges · 130 communities (121 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 154 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c9eec081`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- poe.ninja Service
- Diff Summary Library
- Item Parser
- validate-conditions.ts
- Python Trainers
- Panel State Commands
- resolve-row.ts
- react
- Fall-Through Validator
- score-run-cli.ts
- dispatcher.ts
- item-scenarios.ts
- Filter Parser and AST
- store.ts
- match-filter.ts
- poe.watch Service
- poe.watch Types
- Taxonomy Eval Cases
- Scenario Wording Helpers
- Catalog Pipeline
- Training Row Builders
- Panel Agent Runtime
- Panel Dependencies
- link-prices.ts
- Catalog Unique Pricing
- item-list.tsx
- apps/taxonomy/types.ts
- taxonomy-cli.ts
- Electron Main and Security
- build-scenarios.ts
- Catalog Dependencies
- panel-state/types.ts
- build-samples.ts
- Catalog CLIs
- conditions.ts
- Bronze Validation Schemas
- repoe/service.ts
- taxonomy/service.ts
- PoeWatch Price Selection
- Filter Validate Package
- Root Scripts
- load-state.ts
- Agent Training Dependencies
- generate-items.ts
- Panel TS Config
- Agent Input Context
- rate-limiter.ts
- Root TS Config
- operator-names.ts
- GGG Call and Headers
- Item Parser Package
- RePoE Package
- usePanel
- GGG Package
- Unfiltered Reports
- poe.ninja Package
- migrate-tag-seeders-cli.ts
- tag-seeder-editor.tsx
- command-schema.ts
- Taxonomy App Package
- Filter Compile Package
- Panel State Package
- Project Rules (CLAUDE.md)
- taxonomy-cli.ts
- poe.watch Package
- Agent Input Package
- endpoints.test-helpers.ts
- ggg/service.ts
- Taxonomy Service Package
- @jest/globals
- fetch-listings.ts
- build-item-update.ts
- poe-stuff product README
- versions.ts
- judge-rows.ts
- filler-schema.ts
- Filter Eval Package
- Diff Summary Package
- Jest Toolchain
- item.ts
- ESLint Config
- GGG Config and Trade URL
- GGG Item Data
- GGG Service Docs
- poe.ninja Fan-Out Docs
- Claude Commands
- Catalog Medallion Docs
- categories.json Flattened Tree
- validate-cli.ts
- Cache Package
- Filter Eval Docs
- Root Package
- Filter Tiering TODOs
- devDependencies
- AWS Multi-IP Polling
- find-fall-through.test.ts
- write-unstyled-filter.ts
- Currency Exchange Storage
- Ladder Link Analysis
- GGG Stats Endpoint
- items-of-set.ts
- Lake Package
- write-condition-line.ts
- Item filter syntax
- picker-dialog.tsx
- AWS Rate-Limit Scheduling
- ggg/call.test.ts
- @poe/lake
- RePoE Endpoint Docs
- omnibar.tsx
- Env Package
- fill-from-row.ts
- Training rows (router/filler/judge.jsonl)
- scripts
- Exchange Stats Method
- Sample Query
- Upgrade Fingerprints
- Yarn Config
- Train Script
- Panel Review Docs
- Header Reconciliation Research
- Export Script
- Explain Command
- Container Entry Script
- Filter Classes
- Train Script Docs

## God Nodes (most connected - your core abstractions)
1. `@jest/globals` - 109 edges
2. `deriveSeed()` - 83 edges
3. `PanelState` - 59 edges
4. `usePanel` - 49 edges
5. `pickWording()` - 48 edges
6. `createLakeService()` - 46 edges
7. `pickOne()` - 43 edges
8. `Lake` - 35 edges
9. `varyName()` - 29 edges
10. `drawNewName()` - 27 edges

## Surprising Connections (you probably didn't know these)
- `Export (ONNX classifiers, GGUF Filler)` --shares_data_with--> `agent.ts / agent/run-steps.ts (Router-Filler-executor-diff-Judge loop)`  [INFERRED]
  docs/agent-training.md → apps/panel/REVIEW.md
- `poe-stuff product README` --references--> `How the agent is trained`  [EXTRACTED]
  README.md → docs/agent-training.md
- `main()` --calls--> `createLakeService()`  [EXTRACTED]
  apps/agent-training/build-rows-cli.ts → services/lake/service.ts
- `summarizeCommand()` --calls--> `summarizeDiff()`  [EXTRACTED]
  apps/agent-training/build-rows/judge-rows.ts → lib/diff-summary/summarize-diff.ts
- `summarizeCommand()` --calls--> `executeCommand()`  [EXTRACTED]
  apps/agent-training/build-rows/judge-rows.ts → lib/panel-state/execute-command.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Agent training pipeline: scenarios, rows, train, score, export** — docs_agent_training_scenarios, docs_agent_training_rows, docs_agent_training_train_sh, apps_agent_training_score_run_cli, docs_agent_training_export [EXTRACTED 1.00]
- **Filter validation: format, parse, evaluate** — lib_filter_eval_readme_formatnote, lib_filter_eval_readme_parsefilter, lib_filter_eval_readme_evaluatefilter, lib_filter_eval_readme_buildfiltermatcher [EXTRACTED 1.00]
- **Panel agent plan loop: Router, Filler, executor, diff summary, Judge** — apps_panel_review_agent_run_steps, docs_agent_training_router, docs_agent_training_filler, docs_agent_training_judge, docs_agent_training_generate_and_verify [EXTRACTED 1.00]
- **Market price sources (PoeWatch, poe.ninja, GGG Currency Exchange)** — services_poe_watch_readme_poe_watch, services_poe_ninja_readme_poe_ninja, services_ggg_readme_fetchcurrencyhour [EXTRACTED 1.00]
- **Rate-limit-safe scheduler design** — research_aws_polling_infrastructure_scheduler, research_aws_polling_infrastructure_12s_trap, research_aws_polling_infrastructure_header_reconciliation, research_aws_polling_infrastructure_60_percent_utilization, research_aws_polling_infrastructure_work_unit [EXTRACTED 1.00]
- **Discovery beyond top lift** — research_ladder_link_analysis_luxury_upgrade_fingerprint, research_ladder_link_analysis_profile, research_ladder_link_analysis_upgrade_vs_variant, research_ladder_link_analysis_item_level_analysis [EXTRACTED 1.00]
- **Taxonomy to catalog to generator pipeline** — readme_taxonomy, readme_catalog, readme_generator, readme_collector, readme_pipeline [EXTRACTED 1.00]
- **Tier placement rules** — claude_tiers_rule, claude_lib_imports_no_service, claude_service_reads_no_environment, claude_poe_user_agent [EXTRACTED 1.00]
- **Filter validation: samples, rejects, catchAll and fall-through buckets** — apps_taxonomy_readme_samples, apps_taxonomy_readme_rejects, apps_taxonomy_readme_catchall, apps_catalog_readme_catalog_validate, apps_catalog_readme_fall_through_buckets [INFERRED 0.85]
- **Commands and skills that plan first and stop for approval** — _claude_commands_document_document_command, _claude_commands_write_tests_write_tests_command, _claude_skills_feature_analysis_skill_feature_analysis [INFERRED 0.85]
- **Exchange price model: band plus VWAP** — research_currency_exchange_stats_vwap_invariant, research_currency_exchange_stats_ratio_direction_trap, research_currency_exchange_stats_spread_liquidity, research_currency_exchange_stats_chaos_normalization [INFERRED 0.85]
- **Hour-keyed response cache shared across services** — services_ggg_readme_hour_keyed_cache, services_poe_watch_readme_createpoewatchservice, services_repoe_readme_createrepoeservice, services_poe_ninja_readme_createpoeninjaservice, services_ggg_readme_createfilecache [INFERRED 0.95]

## Communities (130 total, 9 thin omitted)

### Community 0 - "poe.ninja Service"
Cohesion: 0.06
Nodes (57): fetchJson(), request(), RETRIABLE(), DEFAULT_BASE_URL, DEFAULT_USER_AGENT, GAME_PATH, trimUrl(), args (+49 more)

### Community 1 - "Diff Summary Library"
Cohesion: 0.08
Nodes (64): COLLATOR, compareText(), buildChildChange(), expandChange(), findLevel(), describeEarlierStep(), flagOverwrites(), formatValue() (+56 more)

### Community 2 - "Item Parser"
Cohesion: 0.06
Nodes (58): expand(), IndexedStat, ModMatcher, modMatcher(), resolveMod(), matcher, mod(), stats (+50 more)

### Community 3 - "validate-conditions.ts"
Cohesion: 0.14
Nodes (31): isObject(), isText(), optionalBooleanProblem(), unknownFields(), slug(), FIELDS, isAuthoredKey(), rowProblem() (+23 more)

### Community 4 - "Python Trainers"
Cohesion: 0.06
Nodes (36): check_classifier(), convert(), export_classifier(), export_filler(), Logits, main(), data_path(), read_rows() (+28 more)

### Community 5 - "Panel State Commands"
Cohesion: 0.10
Nodes (46): COMMAND_TYPES, CreateCategoryCommand, executeCreateCategory(), CreateSeederCommand, executeCreateSeeder(), CreateTagSeederCommand, executeCreateTagSeeder(), DeleteCategoryCommand (+38 more)

### Community 6 - "resolve-row.ts"
Cohesion: 0.17
Nodes (20): Resolution, rowOf(), Composed, composeLayers(), keyOf(), buildForm(), CategoryRecords, findCategoryLayers() (+12 more)

### Community 7 - "react"
Cohesion: 0.13
Nodes (23): App(), ErrorBanner(), ModeTab(), TopBar(), useUndoKey(), CATEGORIES_SIZE, CategoriesTab(), SEEDERS_SIZE (+15 more)

### Community 8 - "Fall-Through Validator"
Cohesion: 0.11
Nodes (40): Owner, readOwnerNote(), FilterBlock, formatPath(), checkFilter(), FilterCheck, skipPathRepeats(), unsampledOf() (+32 more)

### Community 9 - "score-run-cli.ts"
Cohesion: 0.15
Nodes (23): listPredictionSets(), main(), percent(), readJsonLines(), rebuildScenarios(), renderFiller(), renderLabels(), canonical() (+15 more)

### Community 10 - "dispatcher.ts"
Cohesion: 0.05
Nodes (59): Agent, StepTrace, createDispatcher(), Dispatcher, FeedbackRecord, FeedbackVerdict, KeptPlan, stampOf() (+51 more)

### Community 11 - "item-scenarios.ts"
Cohesion: 0.24
Nodes (15): buildAddTagSeederTagScenario(), buildCreateTagSeederScenario(), buildDeleteTagSeederScenario(), buildRemoveTagSeederTagScenario(), drawTagSeeder(), ITEM_SCENARIOS, listBaseTypes(), nameTagSeeder() (+7 more)

### Community 12 - "Filter Parser and AST"
Cohesion: 0.09
Nodes (41): ACTIONS, APPLY_KEYS, ApplyKey, CONDITIONS_BY_LOWER, EQUALITY_OPERATORS, FilterCondition, Game, GAMES (+33 more)

### Community 13 - "store.ts"
Cohesion: 0.09
Nodes (27): AgentPlan, CHANNEL_NAMES, ChannelName, DeepReadonly, Inputs, ModelRun, Notes, NOTES_SCHEMA (+19 more)

### Community 14 - "match-filter.ts"
Cohesion: 0.11
Nodes (38): asList(), compare(), evaluateFilter(), lettersOf(), matchBoolean(), matchCondition(), matchCounted(), matchEnums() (+30 more)

### Community 15 - "poe.watch Service"
Cohesion: 0.10
Nodes (21): call(), currentHour(), DEFAULT_BASE_URL, DEFAULT_USER_AGENT, trimUrl(), PoeWatchHttpError, getCompactData(), context (+13 more)

### Community 16 - "poe.watch Types"
Cohesion: 0.10
Nodes (36): AccessoryItem, ArmourItem, AzmeriItem, BaseTypeItem, CatalystItem, ChayulaItem, CurrencyItem, DeepwaterItem (+28 more)

### Community 17 - "Taxonomy Eval Cases"
Cohesion: 0.11
Nodes (25): buildEvalCases(), EvalCase, EvalCases, EvalOverlap, EvalRow, findBlockEntries(), rare, ring (+17 more)

### Community 18 - "Scenario Wording Helpers"
Cohesion: 0.17
Nodes (52): buildAddRarityScenario(), buildDropConditionScenario(), buildReplaceRarityScenario(), deriveSeed(), buildRenameTagSeederScenario(), buildAddKnownItemScenario(), buildRemoveKnownItemsScenario(), KNOWN_ITEM_SCENARIOS (+44 more)

### Community 19 - "Catalog Pipeline"
Cohesion: 0.08
Nodes (48): buildGold, row(), withSilver(), withThreeSilverFiles(), buildSilver, UNPRICED, extractGGGItems, extractPoeWatchCompact (+40 more)

### Community 20 - "Training Row Builders"
Cohesion: 0.13
Nodes (33): buildRows(), changeAction(), buildFillerRows(), listDoneLines(), buildJudgeRows(), buildNoOpRow(), buildWrongCommand(), drawReject() (+25 more)

### Community 21 - "Panel Agent Runtime"
Cohesion: 0.13
Nodes (17): createAgent(), use(), listRuns(), ClassifierExport, ClassifierName, ClassifierPrecision, loadClassifier(), LoadedClassifier (+9 more)

### Community 22 - "Panel Dependencies"
Cohesion: 0.09
Nodes (30): dependencies, @huggingface/transformers@^4.3.0, onnxruntime-node@^1.30.0, @poe/agent-input@workspace:^, @poe/filter-eval@workspace:^, @poe/lake@workspace:^, @poe/panel-state@workspace:^, @poe/repoe@workspace:^ (+22 more)

### Community 23 - "link-prices.ts"
Cohesion: 0.09
Nodes (40): Bag, buildEnchants(), buildFoulborn(), buildUniquesByBase(), closestNames(), compareVersions(), Conditions, ConditionValue (+32 more)

### Community 24 - "Catalog Unique Pricing"
Cohesion: 0.14
Nodes (10): mostListed(), basesByUnique(), FiledListing, groupListings(), listedUniques(), uniqueOf(), withUniques(), ItemData (+2 more)

### Community 25 - "item-list.tsx"
Cohesion: 0.20
Nodes (11): filterItemRows(), ItemFilters, findSeeder(), ItemList(), ItemRow, listScopedSeeders(), listSeeders(), PlacedSeeder (+3 more)

### Community 26 - "apps/taxonomy/types.ts"
Cohesion: 0.06
Nodes (44): isSeeded(), rowOf(), seedItems(), clusterJewelVariants(), ITEM_LEVELS, PASSIVES, passivesConditions(), form() (+36 more)

### Community 27 - "taxonomy-cli.ts"
Cohesion: 0.15
Nodes (33): createTaxonomy(), initTaxonomy(), items, categoriesKey(), latestCategoriesKey(), latestKey(), registryKey(), SOURCE_FILES (+25 more)

### Community 28 - "Electron Main and Security"
Cohesion: 0.11
Nodes (22): Channel, Outputs, CHANNELS, describeError(), agent, dispatcher, Handlers, HANDLERS (+14 more)

### Community 29 - "build-scenarios.ts"
Cohesion: 0.10
Nodes (34): buildOneScenario(), buildScenarios(), capitalize(), buildAlreadyDoneScenario(), buildPartlyDoneScenario(), DONE_SCENARIOS, VISIBLE_FIRST_STEP, VISIBLE_SINGLE_STEP (+26 more)

### Community 30 - "Catalog Dependencies"
Cohesion: 0.11
Nodes (24): dependencies, @poe/filter-compile@workspace:^, @poe/filter-eval@workspace:^, @poe/filter-validate@workspace:^, @poe/ggg@workspace:^, @poe/lake@workspace:^, @poe/poe-watch@workspace:^, @poe/taxonomy@workspace:^ (+16 more)

### Community 31 - "panel-state/types.ts"
Cohesion: 0.12
Nodes (28): invertPatch(), invertRemoval(), invertSeederTags(), invertTagSeederUpdate(), invertUpdate(), SeederUpdate, BagDiff, PriceListProps (+20 more)

### Community 32 - "build-samples.ts"
Cohesion: 0.16
Nodes (15): buildPathSamples(), buildRejects(), buildRowSamples(), buildSamples(), conditionValues(), categories, itemsOfSet(), Lookup (+7 more)

### Community 33 - "Catalog CLIs"
Cohesion: 0.13
Nodes (27): groupByCategory(), chooseForce(), main(), parseSources(), report(), chooseHour(), flag(), main() (+19 more)

### Community 34 - "conditions.ts"
Cohesion: 0.14
Nodes (24): buildConditionScenario(), CONDITION_SCENARIOS, RARITIES, BOOLEAN_WORDS, CONDITION_WORDS, ConditionChange, describeCondition(), describeValueSet() (+16 more)

### Community 35 - "Bronze Validation Schemas"
Cohesion: 0.12
Nodes (17): BRONZE_SCHEMAS, condition, gggItem, gggItems, poeWatchCompact, poeWatchCorruptions, poeWatchRatios, renamed (+9 more)

### Community 36 - "repoe/service.ts"
Cohesion: 0.09
Nodes (40): call(), currentHour(), DEFAULT_BASE_URL, DEFAULT_USER_AGENT, trimUrl(), RepoeHttpError, RepoeParseError, getBaseItems() (+32 more)

### Community 37 - "taxonomy/service.ts"
Cohesion: 0.20
Nodes (14): categoriesKey(), DEFAULT_PREFIX, LATEST_CATEGORIES_FILE, LATEST_FILE, latestCategoriesKey(), latestKey(), versionKey(), NOT_FOUND (+6 more)

### Community 38 - "PoeWatch Price Selection"
Cohesion: 0.18
Nodes (18): bestPrice(), dearest(), Exchange, exchangeSale(), field(), fromPoeWatch(), listingKey(), Lookup (+10 more)

### Community 39 - "Filter Validate Package"
Cohesion: 0.10
Nodes (21): dependencies, @poe/filter-compile@workspace:^, @poe/filter-eval@workspace:^, exports, ./build-samples, ./check-filter, ./describe-sample, ./find-fall-through (+13 more)

### Community 40 - "Root Scripts"
Cohesion: 0.09
Nodes (22): scripts, agent:rows, agent:scenarios, agent:score, catalog, catalog:compile, catalog:publish, catalog:validate (+14 more)

### Community 41 - "load-state.ts"
Cohesion: 0.12
Nodes (29): countLabels(), main(), renderReview(), renderScenarioRows(), RowSetManifest, writeRowSet(), main(), renderScenario() (+21 more)

### Community 42 - "Agent Training Dependencies"
Cohesion: 0.13
Nodes (20): dependencies, @faker-js/faker@^10.6.0, microdiff@^1.6.0, @poe/agent-input@workspace:^, @poe/filter-eval@workspace:^, @poe/lake@workspace:^, @poe/panel-state@workspace:^, @util/diff-summary@workspace:^ (+12 more)

### Community 43 - "generate-items.ts"
Cohesion: 0.18
Nodes (17): listItemRows(), nameItem(), nextItemRows(), formatCondition(), GeneratedItem, generateItems(), ItemCondition, listGroups() (+9 more)

### Community 44 - "Panel TS Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module (+13 more)

### Community 45 - "Agent Input Context"
Cohesion: 0.18
Nodes (19): buildContext(), contexts, findFreeMatch(), isWordCharacter(), findFuzzyNames(), FuzzyMatch, overlaps(), Span (+11 more)

### Community 46 - "rate-limiter.ts"
Cohesion: 0.23
Nodes (10): assertRules(), createLimiter(), nap(), spacingFor(), take(), waitFor(), LimiterOptions, RateLimiter (+2 more)

### Community 47 - "Root TS Config"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+12 more)

### Community 48 - "operator-names.ts"
Cohesion: 0.14
Nodes (25): buildSeederUpdate(), diffConditions(), diffSplit(), SeederDraft, splitsByDefault(), toSeederDraft(), ChipList(), ChipListProps (+17 more)

### Community 49 - "GGG Call and Headers"
Cohesion: 0.19
Nodes (13): RFC-7231, buildCacheKey(), sleep(), applyRateLimits(), backoffMs(), call(), CallOptions, requestKey() (+5 more)

### Community 50 - "Item Parser Package"
Cohesion: 0.11
Nodes (19): dependencies, @poe/filter-eval@workspace:^, exports, ./match-mods, ./mod-text, ./parse-header, ./parse-item, ./parse-mods (+11 more)

### Community 51 - "RePoE Package"
Cohesion: 0.11
Nodes (19): dependencies, @util/cache@workspace:^, exports, ./errors, ./get-base-items.types, ./get-cluster-jewels.types, ./get-essences.types, ./get-foulborn-map.types (+11 more)

### Community 52 - "usePanel"
Cohesion: 0.21
Nodes (19): toItemDraft(), ConfirmDialog(), ConfirmDialogProps, DialogFrame(), DialogFrameProps, DialogHost(), FilterChips(), DraftProps (+11 more)

### Community 53 - "GGG Package"
Cohesion: 0.11
Nodes (18): dependencies, @util/cache@workspace:^, exports, ./errors, ./fetch-currency-hour.types, ./fetch-listings.types, ./get-item-data.types, ./get-stats.types (+10 more)

### Community 54 - "Unfiltered Reports"
Cohesion: 0.20
Nodes (10): describeSample(), describeValue(), groupUnfiltered(), UnfilteredGroup, cellValue(), escape(), reportCsv(), ROW_COLUMNS (+2 more)

### Community 55 - "poe.ninja Package"
Cohesion: 0.12
Nodes (17): dependencies, @util/cache@workspace:^, exports, ./errors, ./get-exchange-overview.types, ./get-exchange-ratios.types, ./get-item-overview.types, ./get-league-items.types (+9 more)

### Community 56 - "migrate-tag-seeders-cli.ts"
Cohesion: 0.18
Nodes (21): LegacyEntry, logKey(), main(), migrateVersion(), stateKey(), collectSide(), convertPatch(), diffSeederTags() (+13 more)

### Community 57 - "tag-seeder-editor.tsx"
Cohesion: 0.19
Nodes (16): buildTagSeederUpdate(), diffConditions(), EMPTY_TAG_SEEDER_DRAFT, isCompleteDraft(), TagSeederDraft, TagSeederUpdate, toTagSeederDraft(), diffBag() (+8 more)

### Community 58 - "command-schema.ts"
Cohesion: 0.11
Nodes (17): Assert, CommandSchemaCovers, CommandSchemaFits, itemPatch, name, names, operator, Parsed (+9 more)

### Community 59 - "Taxonomy App Package"
Cohesion: 0.15
Nodes (16): dependencies, @poe/filter-compile@workspace:^, @poe/filter-eval@workspace:^, @poe/filter-validate@workspace:^, @poe/lake@workspace:^, @poe/repoe@workspace:^, @poe/filter-compile, @poe/filter-eval (+8 more)

### Community 60 - "Filter Compile Package"
Cohesion: 0.12
Nodes (16): dependencies, @poe/filter-eval@workspace:^, exports, ./compose-layers, ./fill-from-row, ./owner-note, ./resolve-row, ./types (+8 more)

### Community 61 - "Panel State Package"
Cohesion: 0.10
Nodes (21): dependencies, @poe/filter-eval@workspace:^, @util/diff-summary@workspace:^, exports, ./check-state, ./execute-command, ./generate-items, ./list-item-tags (+13 more)

### Community 62 - "Project Rules (CLAUDE.md)"
Cohesion: 0.10
Nodes (15): Feature analysis lenses, Feature analysis output template (meeting notes), feature-analysis skill, Agent training pipeline (scenarios, rows, train, export, predict, score), Filler beam search generate-and-verify, POE_USER_AGENT env var, poe-stuff CLAUDE.md, Agent: Router, Filler, Judge (+7 more)

### Community 63 - "taxonomy-cli.ts"
Cohesion: 0.14
Nodes (23): main(), flag(), PREFIX, highestDraft(), FILE, readRejectedBaseTypes(), drawableRows(), resolutionProblems() (+15 more)

### Community 64 - "poe.watch Package"
Cohesion: 0.13
Nodes (15): dependencies, @util/cache@workspace:^, exports, ./errors, ./get-compact-data.types, ./get-corruption-data.types, ./get-exchange-ratios.types, ./service (+7 more)

### Community 65 - "Agent Input Package"
Cohesion: 0.15
Nodes (14): dependencies, @poe/filter-eval@workspace:^, @poe/panel-state@workspace:^, exports, ./describe-context, ./format-input, ./vocabulary, @poe/filter-eval (+6 more)

### Community 66 - "endpoints.test-helpers.ts"
Cohesion: 0.38
Nodes (5): context, freeLimiter, stubFetch(), UA, digest

### Community 67 - "ggg/service.ts"
Cohesion: 0.21
Nodes (12): fetchCurrencyHour(), FetchCurrencyHourOptions, CurrencyExchange, createTradeSearchRequest(), mapGGGSearchResponseDataToGGGListingSearch(), searchListings(), GGGListingSearch, GGGService (+4 more)

### Community 68 - "Taxonomy Service Package"
Cohesion: 0.14
Nodes (14): dependencies, @poe/lake@workspace:^, exports, ./errors, ./get-categories.types, ./get-taxonomy.types, ./service, ./types (+6 more)

### Community 69 - "@jest/globals"
Cohesion: 0.10
Nodes (16): BRONZE, writeBronze(), BRONZE_STEPS, record, validateBronze, emptyVersion, createFileCache(), FileCache (+8 more)

### Community 70 - "fetch-listings.ts"
Cohesion: 0.36
Nodes (7): createFetchPageRequest(), fetchAllListings(), fetchListings(), HASHES_PER_PAGE, pageHashes(), GGGListingPage, createGGGService()

### Community 71 - "build-item-update.ts"
Cohesion: 0.23
Nodes (10): buildItemUpdate(), ItemDraft, ItemUpdate, priceKey(), executeUpdateItem(), patchPrices(), priceKey(), UpdateItemCommand (+2 more)

### Community 72 - "poe-stuff product README"
Cohesion: 0.09
Nodes (27): S3 is the local disk at ./.s3, AWS move: three blockers, Catalog (bronze/silver/gold), catalog.json row contract (Item), Collector (planned) and the GGG rate limiter, Structured conditions, four levels (category, subcategory, item, variant), Taxonomy listing match picks the PoeWatch price, Pipeline: RePoE/PoeWatch/GGG -> taxonomy -> catalog -> generator -> .filter (+19 more)

### Community 73 - "versions.ts"
Cohesion: 0.11
Nodes (26): VersionFiles, collectAuthoredTable(), problemOf(), validateAuthoredTable(), collectBaseTypes(), seedNames(), collect(), collectCategoryTable() (+18 more)

### Community 74 - "judge-rows.ts"
Cohesion: 0.24
Nodes (16): changeCoverage(), recover(), recoverBases(), changeTarget(), retarget(), retargetTagSeeder(), changeValue(), revaluePatch() (+8 more)

### Community 75 - "filler-schema.ts"
Cohesion: 0.13
Nodes (24): buildConditions(), buildFillerSchemas(), buildObject(), buildPatched(), buildSeederPatch(), buildTagSeederPatch(), Field, listOrderedSubsets() (+16 more)

### Community 76 - "Filter Eval Package"
Cohesion: 0.15
Nodes (12): exports, ./evaluate-filter, ./filter-ast, ./filter-classes, ./format-note, ./match-filter, ./parse-filter, license (+4 more)

### Community 77 - "Diff Summary Package"
Cohesion: 0.18
Nodes (11): dependencies, microdiff@^1.6.0, exports, ./summarize-diff, ./types, microdiff, license, name (+3 more)

### Community 78 - "Jest Toolchain"
Cohesion: 0.17
Nodes (12): devDependencies, jest@^30.4.2, @jest/globals@^30.4.1, jiti@^2.7.0, @swc/core@^1.16.0, @swc/jest@^0.2.39, @types/node@^26.2.0, @types/node (+4 more)

### Community 79 - "item.ts"
Cohesion: 0.14
Nodes (15): PoeWatchLink, PricedVariant, UniqueGroup, UniqueListing, Condition, Hint, Listing, ListingMatch (+7 more)

### Community 80 - "ESLint Config"
Cohesion: 0.18
Nodes (10): eslint@^10.8.1, @eslint/js@^10.0.1, globals@^17.11.0, @stylistic/eslint-plugin@^5.10.0, typescript-eslint@^8.67.0, eslint, @eslint/js, globals (+2 more)

### Community 81 - "GGG Config and Trade URL"
Cohesion: 0.27
Nodes (6): DEFAULT_CURRENCY_API_URL, DEFAULT_TRADE_API_URL, DEFAULT_TRADE_SITE_URL, trimUrl(), TradeSearch, tradeSearchUrl()

### Community 82 - "GGG Item Data"
Cohesion: 0.16
Nodes (16): getItemData(), mapGGGItemDataToGGGItem(), mapGGGItemGroupDataToGGGItemGroup(), GGGItemGroup, BaseGGGItem, CurrencySide, GGGItem, GGGItemData (+8 more)

### Community 83 - "GGG Service Docs"
Cohesion: 0.22
Nodes (10): call.mmd diagram, createGGGService, fetchCurrencyHour, fetchListings / fetchAllListings, getStats, GggHttpError, @poe/ggg, GGG Rate Limiter (header-driven) (+2 more)

### Community 84 - "poe.ninja Fan-Out Docs"
Cohesion: 0.24
Nodes (9): Hour-keyed Response Cache, createPoeNinjaService, Bounded fan-out (concurrency 4), getExchangeRatios (18-type fan-out), getItemOverview, getLeagueItems (28-type fan-out), getLeagues, mapItemOverviewLineToNinjaItem (+1 more)

### Community 85 - "Claude Commands"
Cohesion: 0.20
Nodes (4): /document command, jest fake timers with advanceTimersByTimeAsync, /write-tests command, Node 26 type stripping (erasableSyntaxOnly, verbatimModuleSyntax)

### Community 86 - "Catalog Medallion Docs"
Cohesion: 0.28
Nodes (6): apps/catalog README, Bronze Stage, --force refetch flag, Gold Stage (catalog.json), POE_USER_AGENT, Silver Stage

### Community 87 - "categories.json Flattened Tree"
Cohesion: 0.09
Nodes (22): catalog:compile (unstyled .filter), catalog:validate (unfiltered and fall-through), Own-miss / Fall-through / Overlap Buckets, catchAll category, categories.json Flattened Tree, Cluster jewels seed, taxonomy:build-eval-cases (classifier eval cases), Gem variants seed (+14 more)

### Community 88 - "validate-cli.ts"
Cohesion: 0.23
Nodes (11): fromTaxonomy(), rowOf(), main(), main(), progress(), STEPS, writeUnstyledFilter(), Taxonomy (+3 more)

### Community 89 - "Cache Package"
Cohesion: 0.20
Nodes (9): exports, ./build-cache-key, ./create-file-cache, ./sleep, license, name, private, type (+1 more)

### Community 90 - "Filter Eval Docs"
Cohesion: 0.31
Nodes (9): APPLY_KEYS, Filter Block Shape, buildFilterMatcher, evaluateFilter, FilterItem, formatNote / formatCondition, #@ Note (tier/verb/family), parseFilter (+1 more)

### Community 91 - "Root Package"
Cohesion: 0.20
Nodes (9): typescript@^6.0.0, typescript, license, name, packageManager, private, type, version (+1 more)

### Community 92 - "Filter Tiering TODOs"
Cohesion: 0.17
Nodes (11): Deleted packages (@poe/workers, @poe/filterv2, generator, filter-style), Generator (not built): buckets, visual identity, Tiering: chaos or stack-size, Exceptional gems fall outside the gem grid, Filter: game decisions for tiering, Gem buckets dominate the block count, Whether a gem is worth a block at its drop state, HasExplicitMod counts names in filter-eval, game counts modifiers (+3 more)

### Community 93 - "devDependencies"
Cohesion: 0.12
Nodes (17): WORKSPACE, devDependencies, electron@44.3.0, electron-vite@5.0.0, @types/node@^26.2.0, @types/react@19.3.0, @types/react-dom@19.3.0, typescript@^6.0.0 (+9 more)

### Community 94 - "AWS Multi-IP Polling"
Cohesion: 0.20
Nodes (6): Leaving AWS: Hetzner floating IPs, Public IPv4 charge dominates cost, One EC2 instance, many Elastic IPs, Open question: per-IP vs per-account limits, Open question: prefix or ASN bucketing, Source-IP socket binding via secondary private IPs

### Community 95 - "find-fall-through.test.ts"
Cohesion: 0.29
Nodes (4): filter(), qualitySamples, rejecting, skillAndSupport

### Community 96 - "write-unstyled-filter.ts"
Cohesion: 0.17
Nodes (12): writeOwnerNote(), Form, Block, Compiled, CompileRow, findCategoryRecord(), orderRows(), Skip (+4 more)

### Community 97 - "Currency Exchange Storage"
Cohesion: 0.22
Nodes (9): S3 storage as batched gzipped NDJSON, GGG Currency Exchange history endpoint (web.poecdn.com/api/currency-exchange), Currency Exchange stats research, Market record (pair, league, hour), Metadata path keys (not trade-site ids), Ratio direction trap, Storage grain: one row per (hour, league, market_id), extractFeatures (+1 more)

### Community 98 - "Ladder Link Analysis"
Cohesion: 0.28
Nodes (9): Trap: copied builds swamp results, Finding links in ladder data - method, DuckDB scaling path, Trap: game rules dominate results, Gephi graph view, Lift (observed / expected co-occurrence), Louvain community detection, Normalized PMI (+1 more)

### Community 99 - "GGG Stats Endpoint"
Cohesion: 0.33
Nodes (6): getStats(), mapGGGStatDataToGGGStat(), GGGStat, GGGStatData, GGGStatDataResponse, GGGStatOption

### Community 100 - "items-of-set.ts"
Cohesion: 0.24
Nodes (9): ConditionName, CONDITIONS, itemValues(), literalValue(), rawValues(), row, countedValue(), toItemValue() (+1 more)

### Community 101 - "Lake Package"
Cohesion: 0.22
Nodes (8): exports, ./service, ./types, license, name, private, type, version

### Community 102 - "write-condition-line.ts"
Cohesion: 0.29
Nodes (11): LineResult, Value, writeBare(), writeBoolean(), writeConditionLine(), writeConditionLines(), writeGemValue(), writeList() (+3 more)

### Community 103 - "Item filter syntax"
Cohesion: 0.14
Nodes (12): Catalog Row (meanPrice, lowConfidence, poeWatch, uniques), poeWatch Price Entry {source,id,name}, apps/taxonomy README, Authored Rows (authored/<slug>, replaces, reason), Structured Condition Language, Item Overrides (filterable, tradable, excluded, quest, unpriceable), rejected-base-types.json, Unique Base Rows (unique/regular, foulborn, fragments) (+4 more)

### Community 104 - "picker-dialog.tsx"
Cohesion: 0.42
Nodes (6): FILTER_TITLES, FilterPane(), FilterSectionView(), listFilterOptions(), FilterSection, usePicks()

### Community 105 - "AWS Rate-Limit Scheduling"
Cohesion: 0.32
Nodes (5): The 12s trap (shortest-window-first limiter), AWS polling infrastructure design findings, Nested rate-limit tiers (search and fetch), Central scheduler with per-IP dual ledgers, Work unit (1 search + 3 fetches)

### Community 106 - "ggg/call.test.ts"
Cohesion: 0.24
Nodes (4): Reply, GggHttpError, CachedResponse, CallEvent

### Community 107 - "@poe/lake"
Cohesion: 0.10
Nodes (20): Condition Kinds (boolean, numeric, ordered, strings, enums, sockets, counted, gem), = partial vs == exact text match, docs/item-filter-syntax.md, writeJsonAtomic (temp file + rename), createLakeService, Lake (readJson, writeJson, writeJsonAtomic, writeJsonLines, exists, list, clear), @poe/lake, .s3 local object storage (+12 more)

### Community 108 - "RePoE Endpoint Docs"
Cohesion: 0.15
Nodes (14): createFileCache, createPoeWatchService, getCompactData (/compact, all=true), getCorruptionData (/corruptions), getExchangeRatios (/exchange/ratios), ItemData (union on category), createRepoeService, getClusterJewels (cluster_jewels.json) (+6 more)

### Community 109 - "omnibar.tsx"
Cohesion: 0.39
Nodes (6): listKnownNames(), completeWith(), ModelPicker(), Omnibar(), NameSuggestion, suggestNames()

### Community 110 - "Env Package"
Cohesion: 0.29
Nodes (6): exports, license, name, private, type, version

### Community 111 - "fill-from-row.ts"
Cohesion: 0.39
Nodes (6): checkBaseTypes(), checkName(), fillCondition(), Filled, fillFromRow(), row

### Community 112 - "Training rows (router/filler/judge.jsonl)"
Cohesion: 0.29
Nodes (7): lib/agent-input (shared model input format), How the agent is trained, Execution match scoring, Judge reject mutations, Training rows (router/filler/judge.jsonl), Scenarios (request, setup, steps), Held-out template and seeder-name splits

### Community 113 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, start, typecheck

### Community 114 - "Exchange Stats Method"
Cohesion: 0.33
Nodes (6): Chaos normalization (direct plus one-hop), Degenerate rows (zero volume, 0:0 ratios), Divine Orb dominates chaos volume, Spread as liquidity/confidence signal, VWAP invariant (volume pair = ratio), Pruning rare features (MIN threshold)

### Community 119 - "Sample Query"
Cohesion: 0.60
Nodes (3): part(), sampleQuery(), WORDED

### Community 120 - "Upgrade Fingerprints"
Cohesion: 0.40
Nodes (5): Directional confidence (aThenB / bThenA), Item-instance property table, Luxury-upgrade fingerprint, profile (group enrichment), Upgrade vs variant check

### Community 123 - "Yarn Config"
Cohesion: 0.40
Nodes (4): approvedGitRepositories, enableScripts, nodeLinker, npmMinimalAgeGate

### Community 124 - "Train Script"
Cohesion: 0.67
Nodes (3): MSYS_NO_PATHCONV, train.sh script, step()

### Community 125 - "Panel Review Docs"
Cohesion: 0.50
Nodes (4): Panel renderer index.html, Panel Rewrite Self-Review, contract/command-schema.ts (nine commands as zod), contract.ts (IPC channel table)

### Community 126 - "Header Reconciliation Research"
Cohesion: 0.50
Nodes (3): Rate-limit header reconciliation, @poe/ggg/parse-rate-limit-headers, Open question: does poecdn share the pathofexile.com rate-limit budget

## Knowledge Gaps
- **71 isolated node(s):** `MSYS_NO_PATHCONV`, `MSYS_NO_PATHCONV`, `RFC-7231`, `session.ts / session/patch.ts (pure core)`, `Filter Actions (sound, icon, beam, colours)` (+66 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 845 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@jest/globals` connect `@jest/globals` to `poe.ninja Service`, `Item Parser`, `resolve-row.ts`, `Fall-Through Validator`, `Filter Parser and AST`, `match-filter.ts`, `poe.watch Service`, `Taxonomy Eval Cases`, `Catalog Pipeline`, `Catalog Unique Pricing`, `apps/taxonomy/types.ts`, `taxonomy-cli.ts`, `build-samples.ts`, `Catalog CLIs`, `repoe/service.ts`, `PoeWatch Price Selection`, `rate-limiter.ts`, `GGG Call and Headers`, `Unfiltered Reports`, `taxonomy-cli.ts`, `endpoints.test-helpers.ts`, `fetch-listings.ts`, `versions.ts`, `Jest Toolchain`, `GGG Config and Trade URL`, `validate-cli.ts`, `Root Package`, `find-fall-through.test.ts`, `write-unstyled-filter.ts`, `GGG Stats Endpoint`, `items-of-set.ts`, `write-condition-line.ts`, `ggg/call.test.ts`, `fill-from-row.ts`, `Sample Query`?**
  _High betweenness centrality (0.189) - this node is a cross-community bridge._
- **What connects `MSYS_NO_PATHCONV`, `MSYS_NO_PATHCONV`, `RFC-7231` to the rest of the system?**
  _71 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `poe.ninja Service` be split into smaller, more focused modules?**
  _Cohesion score 0.05742821473158552 - nodes in this community are weakly interconnected._
- **Why does `agent.ts / agent/run-steps.ts (Router-Filler-executor-diff-Judge loop)` connect `Python Trainers` to `Training rows (router/filler/judge.jsonl)`, `dispatcher.ts`?**
  _High betweenness centrality (0.072) - this node is a cross-community bridge._
- **Should `Diff Summary Library` be split into smaller, more focused modules?**
  _Cohesion score 0.07601835915088927 - nodes in this community are weakly interconnected._
- **Why does `Bronze/Silver/Gold Pipeline` connect `Catalog Medallion Docs` to `Catalog Pipeline`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `Item Parser` be split into smaller, more focused modules?**
  _Cohesion score 0.05962059620596206 - nodes in this community are weakly interconnected._