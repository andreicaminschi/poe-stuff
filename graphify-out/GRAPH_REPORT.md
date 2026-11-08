# Graph Report - poe-stuff  (2026-11-08)

## Corpus Check
- 500 files · ~203,349 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: (none) 3, .css 3, .graphify-bak 1)

## Summary
- 2843 nodes · 7248 edges · 129 communities (120 shown, 9 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 145 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `89c50b63`
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
- usePanel
- Fall-Through Validator
- score-run-cli.ts
- Panel Dispatcher and Session
- Lake Storage Service
- Filter Parser and AST
- contract.ts
- Filter Matcher and Evaluator
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
- seeder-editor.tsx
- apps/taxonomy/types.ts
- taxonomy-cli.ts
- Electron Main and Security
- build-scenarios.ts
- Catalog Dependencies
- item-editor.tsx
- Sample Builder
- Catalog CLIs
- Condition Scenarios
- Bronze Validation Schemas
- repoe/service.ts
- taxonomy/service.ts
- PoeWatch Price Selection
- Filter Validate Package
- Root Scripts
- react
- Agent Training Dependencies
- list-item-rows.ts
- Panel TS Config
- Agent Input Context
- GGG Rate Limiter
- Root TS Config
- operator-names.ts
- GGG Call and Headers
- Item Parser Package
- RePoE Package
- item.ts
- GGG Package
- Unfiltered Reports
- poe.ninja Package
- Plan Dialog and Command Edits
- validate-authored.ts
- command-schema.ts
- Taxonomy App Package
- Filter Compile Package
- Panel State Package
- Project Rules (CLAUDE.md)
- versions.ts
- poe.watch Package
- Agent Input Package
- endpoints.test-helpers.ts
- GGG Service and Listings
- Taxonomy Service Package
- validate-version.ts
- list-filter-options.ts
- repoe/types.ts
- poe-stuff product README
- Sample Set Values
- judge-rows.ts
- filler-schema.ts
- Filter Eval Package
- Diff Summary Package
- Jest Toolchain
- services/taxonomy/types.ts
- ESLint Config
- GGG Config and Trade URL
- GGG Item Data
- GGG Service Docs
- poe.ninja Fan-Out Docs
- Claude Commands
- Catalog Medallion Docs
- Filter Condition Docs
- omnibar.tsx
- Cache Package
- Filter Eval Docs
- Root Package
- Filter Tiering TODOs
- version-store.ts
- AWS Multi-IP Polling
- load-state.ts
- Currency Exchange Storage
- Ladder Link Analysis
- GGG Stats Endpoint
- Lake Package
- build-rows-cli.ts
- Item filter syntax
- seed-taxonomy.test.ts
- AWS Rate-Limit Scheduling
- repoe/call.ts
- @poe/lake
- RePoE Endpoint Docs
- categories.json Flattened Tree
- Env Package
- check-state.ts
- search-listings.ts
- Training rows (router/filler/judge.jsonl)
- Exchange Stats Method
- repoe/config.ts
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
2. `deriveSeed()` - 80 edges
3. `pickWording()` - 46 edges
4. `PanelState` - 44 edges
5. `usePanel` - 42 edges
6. `pickOne()` - 42 edges
7. `createLakeService()` - 42 edges
8. `Lake` - 34 edges
9. `varyName()` - 30 edges
10. `createFaker()` - 26 edges

## Surprising Connections (you probably didn't know these)
- `poe-stuff product README` --references--> `How the agent is trained`  [EXTRACTED]
  README.md → docs/agent-training.md
- `Export (ONNX classifiers, GGUF Filler)` --shares_data_with--> `agent.ts / agent/run-steps.ts (Router-Filler-executor-diff-Judge loop)`  [INFERRED]
  docs/agent-training.md → apps/panel/REVIEW.md
- `call()` --calls--> `sleep()`  [EXTRACTED]
  services/ggg/call.ts → lib/cache/sleep.ts
- `fetchJson()` --calls--> `buildCacheKey()`  [EXTRACTED]
  services/poe-ninja/call.ts → lib/cache/build-cache-key.ts
- `runCommand()` --calls--> `executeCommand()`  [EXTRACTED]
  apps/panel/session.ts → lib/panel-state/execute-command.ts

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

## Communities (129 total, 9 thin omitted)

### Community 0 - "poe.ninja Service"
Cohesion: 0.05
Nodes (59): sleep(), fetchJson(), request(), RETRIABLE(), context, DEFAULT_BASE_URL, DEFAULT_USER_AGENT, GAME_PATH (+51 more)

### Community 1 - "Diff Summary Library"
Cohesion: 0.08
Nodes (63): COLLATOR, compareText(), buildChildChange(), expandChange(), findLevel(), describeEarlierStep(), flagOverwrites(), formatValue() (+55 more)

### Community 2 - "Item Parser"
Cohesion: 0.06
Nodes (58): expand(), IndexedStat, ModMatcher, modMatcher(), resolveMod(), matcher, mod(), stats (+50 more)

### Community 3 - "validate-conditions.ts"
Cohesion: 0.15
Nodes (29): isObject(), isText(), optionalBooleanProblem(), unknownFields(), rowProblem(), categoryProblem(), CONDITION_FIELDS, conditionProblem() (+21 more)

### Community 4 - "Python Trainers"
Cohesion: 0.06
Nodes (36): check_classifier(), convert(), export_classifier(), export_filler(), Logits, main(), data_path(), read_rows() (+28 more)

### Community 5 - "Panel State Commands"
Cohesion: 0.09
Nodes (50): CreateCategoryCommand, executeCreateCategory(), CreateSeederCommand, executeCreateSeeder(), DeleteCategoryCommand, executeDeleteCategory(), DeleteSeedersCommand, executeDeleteSeeders() (+42 more)

### Community 6 - "resolve-row.ts"
Cohesion: 0.06
Nodes (56): drawableRows(), Resolution, resolutionProblems(), resolveCategory(), resolveRow(), rowOf(), baseTypeFrom, version (+48 more)

### Community 7 - "usePanel"
Cohesion: 0.17
Nodes (24): ConfirmDialog(), ConfirmDialogProps, DialogFrame(), DialogFrameProps, DialogHost(), FilterChips(), FILTER_TITLES, FilterPane() (+16 more)

### Community 8 - "Fall-Through Validator"
Cohesion: 0.12
Nodes (35): Owner, readOwnerNote(), FilterBlock, buildEveryMatchMatcher(), FilterMatch, buildSamples(), formatPath(), brief() (+27 more)

### Community 9 - "score-run-cli.ts"
Cohesion: 0.16
Nodes (22): RowSetManifest, listPredictionSets(), main(), percent(), readJsonLines(), rebuildScenarios(), renderFiller(), renderLabels() (+14 more)

### Community 10 - "Panel Dispatcher and Session"
Cohesion: 0.09
Nodes (31): StepTrace, createDispatcher(), Dispatcher, FeedbackRecord, FeedbackVerdict, KeptPlan, stampOf(), viewOf() (+23 more)

### Community 11 - "Lake Storage Service"
Cohesion: 0.13
Nodes (7): record, FILE, createFileCache(), FileCache, @jest/globals, Reply, CachedResponse

### Community 12 - "Filter Parser and AST"
Cohesion: 0.14
Nodes (26): APPLY_KEYS, ApplyKey, REQUIRED_KEYS, fail(), formatCondition(), formatNote(), wrong(), BlockDraft (+18 more)

### Community 13 - "contract.ts"
Cohesion: 0.13
Nodes (15): AgentPlan, Channel, CHANNEL_NAMES, ChannelName, DeepReadonly, Inputs, Notes, NOTES_SCHEMA (+7 more)

### Community 14 - "Filter Matcher and Evaluator"
Cohesion: 0.07
Nodes (52): asList(), compare(), evaluateFilter(), lettersOf(), matchBoolean(), matchCondition(), matchCounted(), matchEnums() (+44 more)

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
Cohesion: 0.13
Nodes (66): recover(), pickSiblingSeeder(), buildAddRarityScenario(), buildDropConditionScenario(), buildReplaceRarityScenario(), drawRange(), createFaker(), deriveSeed() (+58 more)

### Community 19 - "Catalog Pipeline"
Cohesion: 0.08
Nodes (46): extractGGGItems, extractPoeWatchCompact, extractPoeWatchCorruptions, extractPoeWatchRatios, extractTaxonomy, BRONZE_FILES, bronzeKey(), GOLD_FILES (+38 more)

### Community 20 - "Training Row Builders"
Cohesion: 0.12
Nodes (34): buildRows(), changeCoverage(), buildFillerRows(), listDoneLines(), buildJudgeRows(), buildNoOpRow(), buildWrongCommand(), drawReject() (+26 more)

### Community 21 - "Panel Agent Runtime"
Cohesion: 0.11
Nodes (21): Agent, createAgent(), use(), listRuns(), ClassifierExport, ClassifierName, ClassifierPrecision, loadClassifier() (+13 more)

### Community 22 - "Panel Dependencies"
Cohesion: 0.05
Nodes (51): WORKSPACE, dependencies, @huggingface/transformers@^4.3.0, node-llama-cpp@^3.22.1, onnxruntime-node@^1.30.0, @poe/agent-input@workspace:^, @poe/filter-eval@workspace:^, @poe/lake@workspace:^ (+43 more)

### Community 23 - "link-prices.ts"
Cohesion: 0.09
Nodes (40): Bag, buildEnchants(), buildFoulborn(), buildUniquesByBase(), closestNames(), compareVersions(), Conditions, ConditionValue (+32 more)

### Community 24 - "Catalog Unique Pricing"
Cohesion: 0.13
Nodes (11): basesByUnique(), FiledListing, groupListings(), listedUniques(), uniqueOf(), withUniques(), UniqueGroup, UniqueListing (+3 more)

### Community 25 - "seeder-editor.tsx"
Cohesion: 0.19
Nodes (17): buildSeederUpdate(), diffConditions(), diffSplit(), SeederDraft, SeederUpdate, splitsByDefault(), toSeederDraft(), ChipList() (+9 more)

### Community 26 - "apps/taxonomy/types.ts"
Cohesion: 0.07
Nodes (37): isSeeded(), rowOf(), seedItems(), clusterJewelVariants(), ITEM_LEVELS, PASSIVES, passivesConditions(), form() (+29 more)

### Community 27 - "taxonomy-cli.ts"
Cohesion: 0.11
Nodes (48): main(), flag(), createTaxonomy(), initTaxonomy(), items, categoriesKey(), latestCategoriesKey(), latestKey() (+40 more)

### Community 28 - "Electron Main and Security"
Cohesion: 0.11
Nodes (22): Outputs, createLogger(), agent, dispatcher, Handlers, HANDLERS, lake, logger (+14 more)

### Community 29 - "build-scenarios.ts"
Cohesion: 0.12
Nodes (26): buildOneScenario(), capitalize(), buildPartlyDoneScenario(), DONE_SCENARIOS, VISIBLE_FIRST_STEP, VISIBLE_SINGLE_STEP, fileScenario(), collectStrings() (+18 more)

### Community 30 - "Catalog Dependencies"
Cohesion: 0.11
Nodes (24): dependencies, @poe/filter-compile@workspace:^, @poe/filter-eval@workspace:^, @poe/filter-validate@workspace:^, @poe/ggg@workspace:^, @poe/lake@workspace:^, @poe/poe-watch@workspace:^, @poe/taxonomy@workspace:^ (+16 more)

### Community 31 - "item-editor.tsx"
Cohesion: 0.18
Nodes (14): buildItemUpdate(), ItemDraft, ItemUpdate, priceKey(), toItemDraft(), DraftProps, ItemDraftEditor(), PriceList() (+6 more)

### Community 32 - "Sample Builder"
Cohesion: 0.09
Nodes (26): buildPathSamples(), buildRejects(), buildRowSamples(), conditionValues(), categories, itemsOfSet(), row, sampleSets() (+18 more)

### Community 33 - "Catalog CLIs"
Cohesion: 0.26
Nodes (17): chooseForce(), main(), parseSources(), report(), chooseHour(), flag(), main(), manifestKey() (+9 more)

### Community 34 - "Condition Scenarios"
Cohesion: 0.12
Nodes (23): buildConditionScenario(), CONDITION_SCENARIOS, RARITIES, BOOLEAN_WORDS, CONDITION_WORDS, ConditionChange, describeCondition(), describeValueSet() (+15 more)

### Community 35 - "Bronze Validation Schemas"
Cohesion: 0.12
Nodes (17): BRONZE_SCHEMAS, condition, gggItem, gggItems, poeWatchCompact, poeWatchCorruptions, poeWatchRatios, renamed (+9 more)

### Community 36 - "repoe/service.ts"
Cohesion: 0.24
Nodes (16): call(), currentHour(), getBaseItems(), BaseItems, getClusterJewels(), getEssences(), getFoulbornMap(), FoulbornMap (+8 more)

### Community 37 - "taxonomy/service.ts"
Cohesion: 0.11
Nodes (22): createLakeService(), isWindowsLock(), renameWithRetry(), rename, serialise(), LakeServiceOptions, categoriesKey(), DEFAULT_PREFIX (+14 more)

### Community 38 - "PoeWatch Price Selection"
Cohesion: 0.15
Nodes (21): bestPrice(), dearest(), Exchange, exchangeSale(), field(), fromPoeWatch(), listingKey(), Lookup (+13 more)

### Community 39 - "Filter Validate Package"
Cohesion: 0.10
Nodes (21): dependencies, @poe/filter-compile@workspace:^, @poe/filter-eval@workspace:^, exports, ./build-samples, ./check-filter, ./describe-sample, ./find-fall-through (+13 more)

### Community 40 - "Root Scripts"
Cohesion: 0.09
Nodes (22): scripts, agent:rows, agent:scenarios, agent:score, catalog, catalog:compile, catalog:publish, catalog:validate (+14 more)

### Community 41 - "react"
Cohesion: 0.17
Nodes (17): App(), ErrorBanner(), TopBar(), useUndoKey(), CATEGORIES_SIZE, CategoriesTab(), SEEDERS_SIZE, CategoryList() (+9 more)

### Community 42 - "Agent Training Dependencies"
Cohesion: 0.13
Nodes (20): dependencies, @faker-js/faker@^10.6.0, microdiff@^1.6.0, @poe/agent-input@workspace:^, @poe/filter-eval@workspace:^, @poe/lake@workspace:^, @poe/panel-state@workspace:^, @util/diff-summary@workspace:^ (+12 more)

### Community 43 - "list-item-rows.ts"
Cohesion: 0.28
Nodes (10): filterItemRows(), ItemFilters, ItemList(), ItemRow, listItemRows(), nameItem(), listScopedSeeders(), matchesSearch() (+2 more)

### Community 44 - "Panel TS Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, forceConsistentCasingInFileNames, isolatedModules, jsx, lib, module (+13 more)

### Community 45 - "Agent Input Context"
Cohesion: 0.19
Nodes (18): buildContext(), contexts, describeContext(), findFreeMatch(), isWordCharacter(), findFuzzyNames(), FuzzyMatch, overlaps() (+10 more)

### Community 46 - "GGG Rate Limiter"
Cohesion: 0.23
Nodes (10): assertRules(), createLimiter(), nap(), spacingFor(), take(), waitFor(), LimiterOptions, RateLimiter (+2 more)

### Community 47 - "Root TS Config"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, forceConsistentCasingInFileNames, isolatedModules, lib, module, moduleResolution (+12 more)

### Community 48 - "operator-names.ts"
Cohesion: 0.26
Nodes (12): ConditionRowProps, EQUALITY, EVERY, isText(), kindOf(), listOperators(), nameOperator(), NAMES (+4 more)

### Community 49 - "GGG Call and Headers"
Cohesion: 0.18
Nodes (14): RFC-7231, applyRateLimits(), backoffMs(), call(), CallOptions, requestKey(), RETRYABLE, GggHttpError (+6 more)

### Community 50 - "Item Parser Package"
Cohesion: 0.11
Nodes (19): dependencies, @poe/filter-eval@workspace:^, exports, ./match-mods, ./mod-text, ./parse-header, ./parse-item, ./parse-mods (+11 more)

### Community 51 - "RePoE Package"
Cohesion: 0.11
Nodes (19): dependencies, @util/cache@workspace:^, exports, ./errors, ./get-base-items.types, ./get-cluster-jewels.types, ./get-essences.types, ./get-foulborn-map.types (+11 more)

### Community 52 - "item.ts"
Cohesion: 0.12
Nodes (17): buildGold, row(), withSilver(), withThreeSilverFiles(), groupByCategory(), DuplicateName, DuplicateReport, findDuplicates() (+9 more)

### Community 53 - "GGG Package"
Cohesion: 0.11
Nodes (18): dependencies, @util/cache@workspace:^, exports, ./errors, ./fetch-currency-hour.types, ./fetch-listings.types, ./get-item-data.types, ./get-stats.types (+10 more)

### Community 54 - "Unfiltered Reports"
Cohesion: 0.20
Nodes (10): describeSample(), describeValue(), groupUnfiltered(), UnfilteredGroup, cellValue(), escape(), reportCsv(), ROW_COLUMNS (+2 more)

### Community 55 - "poe.ninja Package"
Cohesion: 0.12
Nodes (17): dependencies, @util/cache@workspace:^, exports, ./errors, ./get-exchange-overview.types, ./get-exchange-ratios.types, ./get-item-overview.types, ./get-league-items.types (+9 more)

### Community 56 - "Plan Dialog and Command Edits"
Cohesion: 0.24
Nodes (10): PlanOutcome, PlanStep, parseCommandText(), ParsedCommand, draftStep(), MESSAGE_OUTCOMES, OUTCOME_MESSAGES, PlanDialog() (+2 more)

### Community 57 - "validate-authored.ts"
Cohesion: 0.33
Nodes (6): slug(), collectAuthoredTable(), FIELDS, isAuthoredKey(), problemOf(), validateAuthoredTable()

### Community 58 - "command-schema.ts"
Cohesion: 0.11
Nodes (16): Assert, COMMAND_SCHEMA, CommandSchemaCovers, CommandSchemaFits, itemPatch, name, names, operator (+8 more)

### Community 59 - "Taxonomy App Package"
Cohesion: 0.15
Nodes (16): dependencies, @poe/filter-compile@workspace:^, @poe/filter-eval@workspace:^, @poe/filter-validate@workspace:^, @poe/lake@workspace:^, @poe/repoe@workspace:^, @poe/filter-compile, @poe/filter-eval (+8 more)

### Community 60 - "Filter Compile Package"
Cohesion: 0.12
Nodes (16): dependencies, @poe/filter-eval@workspace:^, exports, ./compose-layers, ./fill-from-row, ./owner-note, ./resolve-row, ./types (+8 more)

### Community 61 - "Panel State Package"
Cohesion: 0.11
Nodes (19): dependencies, @poe/filter-eval@workspace:^, @util/diff-summary@workspace:^, exports, ./check-state, ./execute-command, ./generate-items, ./load-state (+11 more)

### Community 62 - "Project Rules (CLAUDE.md)"
Cohesion: 0.10
Nodes (15): Feature analysis lenses, Feature analysis output template (meeting notes), feature-analysis skill, Agent training pipeline (scenarios, rows, train, export, predict, score), Filler beam search generate-and-verify, POE_USER_AGENT env var, poe-stuff CLAUDE.md, Agent: Router, Filler, Judge (+7 more)

### Community 63 - "versions.ts"
Cohesion: 0.17
Nodes (14): collect(), collectCategoryTable(), problemOf(), validateCategoryTable(), collectTaxonomyTable(), problemOf(), validateTaxonomyTable(), TableShapeError (+6 more)

### Community 64 - "poe.watch Package"
Cohesion: 0.13
Nodes (15): dependencies, @util/cache@workspace:^, exports, ./errors, ./get-compact-data.types, ./get-corruption-data.types, ./get-exchange-ratios.types, ./service (+7 more)

### Community 65 - "Agent Input Package"
Cohesion: 0.15
Nodes (14): dependencies, @poe/filter-eval@workspace:^, @poe/panel-state@workspace:^, exports, ./describe-context, ./format-input, ./vocabulary, @poe/filter-eval (+6 more)

### Community 66 - "endpoints.test-helpers.ts"
Cohesion: 0.32
Nodes (5): context, freeLimiter, stubFetch(), UA, digest

### Community 67 - "GGG Service and Listings"
Cohesion: 0.21
Nodes (14): fetchCurrencyHour(), FetchCurrencyHourOptions, CurrencyExchange, createFetchPageRequest(), fetchAllListings(), fetchListings(), HASHES_PER_PAGE, pageHashes() (+6 more)

### Community 68 - "Taxonomy Service Package"
Cohesion: 0.14
Nodes (14): dependencies, @poe/lake@workspace:^, exports, ./errors, ./get-categories.types, ./get-taxonomy.types, ./service, ./types (+6 more)

### Community 69 - "validate-version.ts"
Cohesion: 0.26
Nodes (8): VersionFiles, collectBaseTypes(), seedNames(), RowProblem, collectVersion(), inFile(), keysOf(), VersionProblem

### Community 70 - "list-filter-options.ts"
Cohesion: 0.50
Nodes (4): findSeeder(), listFilterOptions(), listSeeders(), PlacedSeeder

### Community 71 - "repoe/types.ts"
Cohesion: 0.11
Nodes (19): Essences, Mods, BaseItemBuff, BaseItemProperties, BaseItemRequirements, BaseItemVisualIdentity, ClusterJewelPassive, DefenceRange (+11 more)

### Community 72 - "poe-stuff product README"
Cohesion: 0.09
Nodes (27): S3 is the local disk at ./.s3, AWS move: three blockers, Catalog (bronze/silver/gold), catalog.json row contract (Item), Collector (planned) and the GGG rate limiter, Structured conditions, four levels (category, subcategory, item, variant), Taxonomy listing match picks the PoeWatch price, Pipeline: RePoE/PoeWatch/GGG -> taxonomy -> catalog -> generator -> .filter (+19 more)

### Community 73 - "Sample Set Values"
Cohesion: 0.30
Nodes (9): ConditionName, CONDITIONS, itemValues(), literalValue(), Lookup, rawValues(), countedValue(), toItemValue() (+1 more)

### Community 74 - "judge-rows.ts"
Cohesion: 0.29
Nodes (12): changeAction(), invertRemoval(), invertUpdate(), changeTarget(), retarget(), changeValue(), revaluePatch(), pickOtherCategories() (+4 more)

### Community 75 - "filler-schema.ts"
Cohesion: 0.13
Nodes (22): buildConditions(), buildConditionValues(), buildFillerSchemas(), buildObject(), buildPatched(), buildSeederPatch(), Field, ITEM_PATCH (+14 more)

### Community 76 - "Filter Eval Package"
Cohesion: 0.15
Nodes (12): exports, ./evaluate-filter, ./filter-ast, ./filter-classes, ./format-note, ./match-filter, ./parse-filter, license (+4 more)

### Community 77 - "Diff Summary Package"
Cohesion: 0.18
Nodes (11): dependencies, microdiff@^1.6.0, exports, ./summarize-diff, ./types, microdiff, license, name (+3 more)

### Community 78 - "Jest Toolchain"
Cohesion: 0.17
Nodes (12): devDependencies, jest@^30.4.2, @jest/globals@^30.4.1, jiti@^2.7.0, @swc/core@^1.16.0, @swc/jest@^0.2.39, @types/node@^26.2.0, @types/node (+4 more)

### Community 79 - "services/taxonomy/types.ts"
Cohesion: 0.13
Nodes (19): buildSilver, fromTaxonomy(), rowOf(), UNPRICED, main(), main(), progress(), STEPS (+11 more)

### Community 80 - "ESLint Config"
Cohesion: 0.18
Nodes (10): eslint@^10.8.1, @eslint/js@^10.0.1, globals@^17.11.0, @stylistic/eslint-plugin@^5.10.0, typescript-eslint@^8.67.0, eslint, @eslint/js, globals (+2 more)

### Community 81 - "GGG Config and Trade URL"
Cohesion: 0.27
Nodes (6): DEFAULT_CURRENCY_API_URL, DEFAULT_TRADE_API_URL, DEFAULT_TRADE_SITE_URL, trimUrl(), TradeSearch, tradeSearchUrl()

### Community 82 - "GGG Item Data"
Cohesion: 0.17
Nodes (15): getItemData(), mapGGGItemDataToGGGItem(), mapGGGItemGroupDataToGGGItemGroup(), GGGItemGroup, BaseGGGItem, CachedResponse, CurrencyMarket, CurrencySide (+7 more)

### Community 83 - "GGG Service Docs"
Cohesion: 0.22
Nodes (10): call.mmd diagram, createGGGService, fetchCurrencyHour, fetchListings / fetchAllListings, getStats, GggHttpError, @poe/ggg, GGG Rate Limiter (header-driven) (+2 more)

### Community 84 - "poe.ninja Fan-Out Docs"
Cohesion: 0.22
Nodes (10): Hour-keyed Response Cache, createPoeNinjaService, Bounded fan-out (concurrency 4), getExchangeRatios (18-type fan-out), getItemOverview, getLeagueItems (28-type fan-out), getLeagues, mapItemOverviewLineToNinjaItem (+2 more)

### Community 85 - "Claude Commands"
Cohesion: 0.20
Nodes (4): /document command, jest fake timers with advanceTimersByTimeAsync, /write-tests command, Node 26 type stripping (erasableSyntaxOnly, verbatimModuleSyntax)

### Community 86 - "Catalog Medallion Docs"
Cohesion: 0.28
Nodes (6): apps/catalog README, Bronze Stage, --force refetch flag, Gold Stage (catalog.json), POE_USER_AGENT, Silver Stage

### Community 87 - "Filter Condition Docs"
Cohesion: 0.14
Nodes (12): Authored Rows (authored/<slug>, replaces, reason), Cluster jewels seed, Gem variants seed, rejected-base-types.json, Seeded and Manual Files, Six Version Files Published as Two, Taxonomy Validator Refusals, BaseType condition (+4 more)

### Community 88 - "omnibar.tsx"
Cohesion: 0.39
Nodes (6): listKnownNames(), completeWith(), ModelPicker(), Omnibar(), NameSuggestion, suggestNames()

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

### Community 93 - "version-store.ts"
Cohesion: 0.22
Nodes (14): openSession(), compareVersions(), createVersionStore(), importBaseline(), readLog(), readManifest(), writeVersion(), LegacyManifest (+6 more)

### Community 94 - "AWS Multi-IP Polling"
Cohesion: 0.20
Nodes (6): Leaving AWS: Hetzner floating IPs, Public IPv4 charge dominates cost, One EC2 instance, many Elastic IPs, Open question: per-IP vs per-account limits, Open question: prefix or ASN bucketing, Source-IP socket binding via secondary private IPs

### Community 95 - "load-state.ts"
Cohesion: 0.21
Nodes (15): listItemProblems(), settleItems(), GeneratedItem, generateItems(), ItemCondition, listClashes(), listGroups(), splits() (+7 more)

### Community 97 - "Currency Exchange Storage"
Cohesion: 0.22
Nodes (9): S3 storage as batched gzipped NDJSON, GGG Currency Exchange history endpoint (web.poecdn.com/api/currency-exchange), Currency Exchange stats research, Market record (pair, league, hour), Metadata path keys (not trade-site ids), Ratio direction trap, Storage grain: one row per (hour, league, market_id), extractFeatures (+1 more)

### Community 98 - "Ladder Link Analysis"
Cohesion: 0.28
Nodes (9): Trap: copied builds swamp results, Finding links in ladder data - method, DuckDB scaling path, Trap: game rules dominate results, Gephi graph view, Lift (observed / expected co-occurrence), Louvain community detection, Normalized PMI (+1 more)

### Community 99 - "GGG Stats Endpoint"
Cohesion: 0.33
Nodes (6): getStats(), mapGGGStatDataToGGGStat(), GGGStat, GGGStatData, GGGStatDataResponse, GGGStatOption

### Community 101 - "Lake Package"
Cohesion: 0.22
Nodes (8): exports, ./service, ./types, license, name, private, type, version

### Community 102 - "build-rows-cli.ts"
Cohesion: 0.33
Nodes (9): countLabels(), main(), renderReview(), renderScenarioRows(), writeRowSet(), buildScenarios(), main(), renderScenario() (+1 more)

### Community 103 - "Item filter syntax"
Cohesion: 0.16
Nodes (10): Catalog Row (meanPrice, lowConfidence, poeWatch, uniques), poeWatch Price Entry {source,id,name}, apps/taxonomy README, Structured Condition Language, taxonomy:build-eval-cases (classifier eval cases), Item Overrides (filterable, tradable, excluded, quest, unpriceable), Unique Base Rows (unique/regular, foulborn, fragments), Item filter syntax (+2 more)

### Community 104 - "seed-taxonomy.test.ts"
Cohesion: 0.21
Nodes (6): gems, items, jewels, ClusterJewels, RepoeService, ClusterJewel

### Community 105 - "AWS Rate-Limit Scheduling"
Cohesion: 0.32
Nodes (5): The 12s trap (shortest-window-first limiter), AWS polling infrastructure design findings, Nested rate-limit tiers (search and fetch), Central scheduler with per-IP dual ledgers, Work unit (1 search + 3 fetches)

### Community 106 - "repoe/call.ts"
Cohesion: 0.33
Nodes (3): buildCacheKey(), RepoeHttpError, RepoeParseError

### Community 107 - "@poe/lake"
Cohesion: 0.10
Nodes (20): Condition Kinds (boolean, numeric, ordered, strings, enums, sockets, counted, gem), = partial vs == exact text match, docs/item-filter-syntax.md, writeJsonAtomic (temp file + rename), createLakeService, Lake (readJson, writeJson, writeJsonAtomic, writeJsonLines, exists, list, clear), @poe/lake, .s3 local object storage (+12 more)

### Community 108 - "RePoE Endpoint Docs"
Cohesion: 0.16
Nodes (13): createFileCache, createPoeWatchService, getCompactData (/compact, all=true), getCorruptionData (/corruptions), ItemData (union on category), createRepoeService, getClusterJewels (cluster_jewels.json), getEssences (Essence.min.json) (+5 more)

### Community 109 - "categories.json Flattened Tree"
Cohesion: 0.20
Nodes (12): catalog:compile (unstyled .filter), catalog:validate (unfiltered and fall-through), Own-miss / Fall-through / Overlap Buckets, catchAll category, categories.json Flattened Tree, Category hints (check, gamble), Subcategory order, Subcategory rejects sets (+4 more)

### Community 110 - "Env Package"
Cohesion: 0.29
Nodes (6): exports, license, name, private, type, version

### Community 111 - "check-state.ts"
Cohesion: 0.43
Nodes (7): allowsEmpty(), checkState(), fitsLeaf(), isPrice(), listRepeatedSeeders(), listShapeProblems(), OPERATORS

### Community 112 - "search-listings.ts"
Cohesion: 0.36
Nodes (6): createTradeSearchRequest(), mapGGGSearchResponseDataToGGGListingSearch(), searchListings(), GGGListingSearch, GggContext, GGGSearchResponseData

### Community 113 - "Training rows (router/filler/judge.jsonl)"
Cohesion: 0.29
Nodes (7): lib/agent-input (shared model input format), How the agent is trained, Execution match scoring, Judge reject mutations, Training rows (router/filler/judge.jsonl), Scenarios (request, setup, steps), Held-out template and seeder-name splits

### Community 114 - "Exchange Stats Method"
Cohesion: 0.33
Nodes (6): Chaos normalization (direct plus one-hop), Degenerate rows (zero volume, 0:0 ratios), Divine Orb dominates chaos volume, Spread as liquidity/confidence signal, VWAP invariant (volume pair = ratio), Pruning rare features (MIN threshold)

### Community 115 - "repoe/config.ts"
Cohesion: 0.50
Nodes (3): DEFAULT_BASE_URL, DEFAULT_USER_AGENT, trimUrl()

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
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 826 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@jest/globals` connect `Lake Storage Service` to `poe.ninja Service`, `Item Parser`, `resolve-row.ts`, `Fall-Through Validator`, `Filter Parser and AST`, `Filter Matcher and Evaluator`, `poe.watch Service`, `Taxonomy Eval Cases`, `Catalog Pipeline`, `Catalog Unique Pricing`, `apps/taxonomy/types.ts`, `taxonomy-cli.ts`, `Sample Builder`, `Catalog CLIs`, `taxonomy/service.ts`, `PoeWatch Price Selection`, `GGG Rate Limiter`, `GGG Call and Headers`, `item.ts`, `Unfiltered Reports`, `validate-authored.ts`, `versions.ts`, `endpoints.test-helpers.ts`, `validate-version.ts`, `Sample Set Values`, `Jest Toolchain`, `services/taxonomy/types.ts`, `GGG Config and Trade URL`, `Root Package`, `GGG Stats Endpoint`, `seed-taxonomy.test.ts`, `repoe/call.ts`, `repoe/config.ts`, `Sample Query`?**
  _High betweenness centrality (0.205) - this node is a cross-community bridge._
- **What connects `MSYS_NO_PATHCONV`, `MSYS_NO_PATHCONV`, `RFC-7231` to the rest of the system?**
  _71 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `poe.ninja Service` be split into smaller, more focused modules?**
  _Cohesion score 0.0537280701754386 - nodes in this community are weakly interconnected._
- **Why does `agent.ts / agent/run-steps.ts (Router-Filler-executor-diff-Judge loop)` connect `Python Trainers` to `Training rows (router/filler/judge.jsonl)`, `Panel Dispatcher and Session`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Should `Diff Summary Library` be split into smaller, more focused modules?**
  _Cohesion score 0.07522774022920953 - nodes in this community are weakly interconnected._
- **Why does `Bronze/Silver/Gold Pipeline` connect `Catalog Medallion Docs` to `Catalog Pipeline`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `Item Parser` be split into smaller, more focused modules?**
  _Cohesion score 0.05962059620596206 - nodes in this community are weakly interconnected._