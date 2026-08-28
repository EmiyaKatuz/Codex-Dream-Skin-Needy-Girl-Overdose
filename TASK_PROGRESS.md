# Task Progress

Updated: 2026-08-27 CST (Asia/Shanghai)

## Codex 26.818 missing surfaces

- [PR opened] Branch `codex/fix-26-818-missing-surfaces` was pushed to the
  `Maker-Wen` fork after the authenticated account was denied direct write
  access to `EmiyaKatuz`. Cross-fork PR #27 targets `EmiyaKatuz/main`:
  `https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/pull/27`.
  The PR is open, not merged, and no tag or Release has been created.
- [PR readiness] Added `Unreleased` entries to both platform changelogs. The
  user explicitly chose not to attach a screenshot. PR Notes must state that
  macOS live verification passed, while Windows PowerShell and real Windows
  visual validation remain CI or physical-host gates.
- [implemented] Commit `b4a0bdb` extends the existing file-change summary
  classifier and mutation hints for Codex 26.820
  `text-codex-git-added/deleted` descendants while preserving the old
  `git-decoration-added/deleted` contract and current `changes-*` CSS.
- [TDD verified] The 26.820 fixture first failed with a missing
  `changes-shell`, then passed after the shared selector change. The fixture
  also proves dynamically mounted summaries schedule the existing body
  observer, while the legacy fixture keeps all three `changes-*` markers.
- [regression verified] The final complete macOS suite exited 0 with Swift
  build, XCTest `12/12`, verifier `7/7`, Safe CSS `12/12`, renderer,
  ZIP/import and transaction checks passing. Windows renderer, three-platform
  Internet Angel sync, JavaScript syntax and `git diff --check` also pass.
- [live gap] Revision `34aa0c08580dbf7937de` passed exact live verification,
  but the visible file-change summary unmounted when the user switched tasks
  before its final computed style could be sampled. Do not claim a final live
  screenshot of this component until it appears again.

- [implemented] The two Codex 26.818 opaque `from-surface` composer fades are
  cleared only inside non-Home main surfaces. The shared macOS source and the
  fork's independent Windows base CSS carry the same bounded rule at commit
  `db6a5fc`.
- [implemented] Live DOM inspection showed the visible Environment panel now
  uses `bg-surface-elevated-secondary` instead of
  `bg-token-dropdown-background`. The shared classifier and macOS verifier
  accept both exact surface classes while retaining the existing host,
  geometry, button and semantic gates at commit `9e09990`.
- [scope] Reuse the existing delayed component reconciliation and backport
  only the two exact Codex 26.818 composer-fade selectors from upstream
  `v1.5.16`; do not merge unrelated upstream removals or release changes.
- [workspace] Worktree
  `/private/tmp/Codex-Dream-Skin-Needy-Girl-Overdose-fix-26-818` on branch
  `codex/fix-26-818-missing-surfaces`, based on clean `main` at `1190e27`.
- [TDD] macOS and Windows renderer tests first failed on the missing 148 px
  and 28 px fade signatures, then passed after the CSS change. The macOS
  classifier and verifier tests likewise failed on the elevated Environment
  surface, then passed after the selector union.
- [verified] The final complete `./macos/tests/run-tests.sh` exited 0 with the
  Swift product build, XCTest `12/12`, verifier `7/7`, Safe CSS `12/12`,
  renderer, theme ZIP/import, installer and transaction checks passing.
  `windows/tests/renderer-inject.test.mjs`, the three-platform Internet Angel
  test, runtime sync, JavaScript syntax and `git diff --check` also pass.
- [live verified] A trusted loopback CDP injection and screenshot verified
  revision `7efded8e1d4a78310a00`: the open 300 x 331 Environment panel is
  marked `environment` with the Angel gradient, accent strip and 2 px border;
  the composer remains themed and the black bottom fades are gone. The exact
  verifier returns `pass=true`, no horizontal overflow, and
  `environmentOptionalWhenAbsent=false`.
- [runtime state] The recorded watcher now runs this worktree's `1.5.15`
  injector on port 9341 without restarting Codex. The installed engine remains
  `1.5.12` and its classifier hash differs, so a persistent atomic installation
  remains pending until Codex is closed; do not describe the current hot
  runtime as an installed upgrade.
- [remaining gates] Real Windows visual validation and the PowerShell suite
  remain for CI or a Windows host. No push, PR, merge, version bump, tag or
  Release was performed.
- [design] See
  `docs/superpowers/specs/2026-08-27-codex-26-818-missing-surfaces-design.md`.

## macOS and Windows style parity

- [ready for review] The user confirmed the currently applied theme has no
  visible issue on 2026-08-13 and authorized opening PR #26 for formal review.
  Static checks, Windows PowerShell 5.1, PowerShell 7 and macOS repository
  regressions all pass at commit `1534b5c`. Real Windows Dark/Light screenshot
  comparison remains an explicit post-PR visual gap, not a claimed validation.
- [CI finding fixed locally] PR #26 PowerShell 5.1 and 7 reached the same
  fail-closed quick-fix source guard after the preceding Windows regressions
  passed. The guard still required two superseded Light CSS strings: a direct
  edited-file button selector and the removed global `--angel-paper` remap.
  It now requires the current fixed-dark edited-file component marker and
  adaptive Dream text token instead. A portable Node regression locks both
  guard markers; every `.Contains` sentinel matches its source asset, runtime
  sync and diff checks pass. The complete PowerShell patch suite awaits the
  rerun on Windows CI.
- [live application corrected] A one-shot worktree injection was being
  overwritten by the installed `1.5.12` watcher. Its recorded PID, path, port
  and start time were validated before replacement. The active persistent
  watcher now runs this worktree's `macos/scripts/injector.mjs` at version
  `1.5.14`; exact verification passes at revision
  `8d161a701a54d543ef1e` without changing the persistent theme or Codex config.
- [local implementation complete; final review passed] The post-review shared
  sources restore adaptive text for transparent Light assistant `blockquote`
  and inline `code` / `kbd`, while keeping opaque code, table and detail surfaces
  on their fixed-dark foreground. Renderer fallback Composer discovery now
  excludes structure-detected left navigation. Diff `attachShadow` hooks carry
  active/original metadata so cleanup invalidates retained hooks and a later
  injection can unwrap them. Each fix has a focused red/green regression, and
  generated assets were resynchronized on 2026-08-12. The final screenshot
  review also found task-header status chrome overlapping a narrow native
  source-workspace tab. A single macOS runtime base-CSS guard now suppresses
  only that `::after` decoration while a classified side workspace is mounted; the
  normal task header and floating Environment panel keep the status chrome.
- [current verified checkpoint] Shared extension and Renderer tests, macOS
  overlay/Renderer/verifier tests, Windows Renderer tests, selector doctor,
  runtime sync, relevant JavaScript and macOS shell syntax, all three platform
  payload checks, both macOS Internet Angel presets, macOS payload-template
  `7/7`, Windows payload-template `6/6`, and `git diff --check` pass. The complete
  applicable macOS suite also passes with Swift build, XCTest `10/10`, Safe CSS
  `12/12`, ZIP/import, transaction, signed-runtime, configuration and runtime
  state checks; Doctor was explicitly skipped.
- [visual evidence correction] The earlier Light/Dark workspace screenshots
  opened `Day6.lua` from an unrelated AnimalGit checkout. That file was not
  modified, but those screenshots are discarded as acceptance evidence for
  this repository. The exact verifier and overflow results remain valid for
  the renderer payload; Light/Dark workspace visual acceptance must be rerun
  with a file from this repository after the queued Codex file panel mounts.
- [live state restored] Persistent `appearance=auto` was reapplied as revision
  `8d161a701a54d543ef1e`, follows the native Dark shell, and passes the exact
  verifier. Persistent theme/config hashes remain
  `0ba8d94c7974b01aa3b05886e65afc3323591996f2db7f2d759236019797c430` and
  `b341d7f65ccbb7cc2d52321e6d825ac0e9f5d70370d9feb4559dda0f5ad10dfb`.
  The previous workspace screenshots are not acceptance evidence because they
  showed a file from another repository. A clean current-repository Auto,
  Light and Dark workspace capture remains pending.
- [final code review] Fresh code and automated-contract review found no
  remaining actionable P0/P1/P2 issue. The complete
  macOS suite and the portable Windows Node/payload gates were rerun on the
  final worktree; Windows PowerShell and real Windows visuals remain the only
  platform-specific gaps below. Current-repository macOS workspace screenshots
  remain a separate visual-evidence gap after discarding the cross-project
  captures.
- [remaining platform gates] This macOS host has neither Windows PowerShell nor
  `pwsh`. Real Windows Dark/Light computed-style and screenshot comparison plus
  the complete `run-tests.ps1` suite remain CI or physical-Windows gates; the
  portable checks above are not a complete Windows platform sign-off.

- [goal] Restore the first complete style-parity direction: macOS must consume
  the same Internet Angel component styling as Windows in Dark and Light mode,
  including composers, Projects/PR routes, recognized right workspaces,
  dialogs/menus, diff/source surfaces, and interaction states.
- [scope clarification] The user confirmed on 2026-08-11 that Windows is the
  visual and behavioral reference and macOS is the only parity target. Linux
  generated extension copies may continue to follow the existing sync tool,
  but Linux renderer behavior and live visual validation are not acceptance
  gates for this task.
- [historical review finding, resolved] Shared-extension sync alone was not
  sufficient proof of final parity because Windows keeps an independent base
  CSS and renderer. At that point the macOS renderer misclassified a
  Footer-owned input, excluded a right-aside composer when no left sidebar was
  mounted, and lacked the Windows generic-composer and Diff Shadow behavior.
- [complete] Added red regressions for the two Composer cases, macOS first-frame
  Composer styling, and late Diff Shadow attachment. The minimal runtime fixes
  now reject Footer owners, preserve right-aside composers without a mounted
  left sidebar, copy the Windows generic Composer surface semantics into the
  macOS base source, and use a bounded per-host root-only Diff retry rather than
  repeated full-document classification.
- [historical verified] Focused shared extension, shared renderer, macOS Internet Angel,
  macOS renderer, Windows renderer, runtime sync and JavaScript syntax checks
  pass after regenerating platform assets. The complete macOS suite also passes
  with Swift build and XCTest 10/10; macOS, Windows and Linux payload checks,
  both macOS Internet Angel preset payloads, payload template contracts and
  `git diff --check` pass. At that checkpoint Doctor was explicitly skipped and
  no current-revision live visual smoke had yet been claimed.
- [workspace] Primary worktree on branch
  `codex/macos-windows-style-parity`, created from clean `main`. Draft PR
  preparation was authorized on 2026-08-13. No version bump, tag, merge or
  Release action is included in this branch.
- [scope] Put cross-platform CSS, component bridges, and lifecycle behavior in
  `runtime/internet-angel-extension.{css,js}` and generate all platform copies.
  Keep the current safe multi-composer discovery in `runtime/renderer-inject.js`.
  Keep macOS first-frame/base contracts that correspond to the independent
  Windows base CSS in `runtime/dream-skin.css`, then generate the macOS asset.
- [reference] The original complete parity implementation remains recoverable
  as `stash@{0}` (`83b4fe5`, 2026-08-10 14:37 CST). It was used as the factual
  first-version reference instead of reconstructing the scope from memory.
- [excluded] Divider-drag color stability remains a separate bug. The shared
  side workspace therefore retains the first version's full-surface `155deg`
  gradient; no fixed base color or drag-specific assertion remains in this
  patch. Also excluded: the later Windows `themeDiffsContainers()` adaptive
  token proposal, forced Dark appearance, preset/manifest migration, Windows
  Acrylic or Win32 work, installer, version, and Release work.
- [safety] Do not restore the earlier broad global `aside` paint, recursive
  file-diff background clearing, terminal-panel fallback/reject arrays, or
  full-root attribute observation. The Windows `rounded-2xl` Composer cleanup
  is retained only inside an identified Composer root. Theme classified public
  parts and explicit wrappers; observe only the shared `data-ds-part` bridge
  and owned Diff Shadow roots.
- [superseded] The previous reduced macOS-only direction and its statement that
  Light/Shadow DOM work was excluded are superseded by the user's request to
  restore complete style synchronization.
- [historical review finding, resolved] The first renderer pass intended to
  collect each editable-input-owned composer, including a second
  `ComposerLayoutRoot` in a non-left aside. Review found its Footer rejection
  and no-left-sidebar case incorrect; both now have focused regressions and use
  the existing `data-ds-part="composer"` bridge.
- [complete] Reconstructed the complete shared parity patch from the retained
  Windows behavior and the first implementation's tested contracts. The shared
  CSS now covers adaptive Dark/Light surfaces, Projects/PR frames, recognized
  right workspaces, dialogs, menus, composer internals, semantic message
  wrappers, and source/diff hosts without broad `aside`, recursive diff, or
  radius-utility selectors.
- [complete] The shared extension consumes renderer-owned `data-ds-part`
  composer/sidebar markers, observes only that public attribute, installs the
  Internet Angel source-viewer style into present or bounded-late Shadow DOM
  roots, and removes detached or theme-owned styles during reconciliation and
  cleanup. The temporary macOS-only parity CSS was removed; generated assets
  now come from the shared runtime sources.
- [complete] Ported the Windows menu accent strip, separator and shortcut-label
  styling, plus the Projects/PR sticky-header `::after` fade, into the shared
  Internet Angel extension.
- [complete] Diff Shadow Root checks now exhaust after 12 per-host attempts.
  Cleanup discards timers and retry state, while `whenDefined()` routes through
  the current registry entry instead of retaining a cleaned extension state.
- [historical verified] Focused extension, shared/macOS/Windows renderer, macOS parity,
  runtime sync, JavaScript syntax and diff checks pass on the final code. The
  complete macOS suite also passes after the bounded Diff lifecycle fix,
  including Swift build, XCTest 10/10, signed-runtime switching and runtime-state
  integration; Doctor remains explicitly skipped.
- [historical verified] Focused red/green coverage passes for the shared extension, macOS
  parity fixture, shared renderer, macOS renderer, Windows renderer, and runtime
  asset synchronization. macOS, Windows, and Linux payload checks pass, as do
  JavaScript syntax and `git diff --check`; all three generated extension CSS/JS
  pairs are byte-identical to their shared runtime sources. Both macOS Internet
  Angel presets also pass explicit payload construction with the extension on.
- [historical verified] The complete applicable macOS suite passes with its built-in live
  Doctor skip: shell and Node syntax, Swift build, 10/10 XCTest, payload,
  renderer, Safe CSS, ZIP/import, transaction, signed-runtime, configuration,
  and runtime-state integration checks all passed.
- [superseded by live smoke] A separate direct Doctor run verified the installed ChatGPT
  signature, bundled Node, theme payload, loopback CDP ownership, visible shell,
  composer, and Internet Angel surfaces. It returned 2 only because the running
  renderer still reports old revision `3262374af0c9a64cc572` rather than the
  current worktree payload; no restart or live-code installation was made, so
  no fresh visual smoke is claimed.
- [test gap] PowerShell is unavailable on this macOS host, so the Windows
  PowerShell suite remains for CI or a Windows machine. The relevant Windows
  Node renderer test and Windows payload check passed locally.
- [reviewed] Independent final review found one Light-mode contrast defect:
  Radix containers used an adaptive light surface while idle menu items retained
  the fixed Angel paper foreground. A scoped red/green fix now adapts only idle
  items on those light surfaces, excludes fixed-dark `settings-menu` descendants,
  and leaves hover/focus/selected states white. Re-review found no remaining
  Critical or Important issue.
- [superseded by review] The requested uncommitted restoration was ready for inspection, but
  the clarified Windows-to-macOS parity gate found unresolved differences. No
  commit, push, PR, version, or Release action is planned unless separately
  requested.
- [complete] Added `docs/macos-windows-style-parity-review.md` as the user-facing
  evaluation record. It separates shared sources from generated copies, maps
  each change to its rationale, records retained safety hardening, lists the
  exact exclusions, and documents verification evidence and remaining gaps.
- [reviewed] Final parity review found one remaining Dark Tooltip gap: the
  Windows base covered role, Radix-content, and slot-content portals, while the
  macOS Dark path covered only `[role="tooltip"]`. A focused red test now checks
  the actual macOS base payload rather than broadening the shared extension.
- [complete] Ported the Windows first-frame Tooltip surface and SVG arrow rules
  to `runtime/dream-skin.css`, mapping `--dream-text` and
  `--dream-surface-raised` to `--ds-text` and `--ds-panel-2`. The existing
  shared `[role="tooltip"]` override remains unchanged, so Windows cascade
  behavior is preserved while role-less Radix/slot portals are themed on macOS.
- [historical verified] After the Tooltip fix, the macOS parity test, runtime sync, shared
  extension and renderer tests, macOS and Windows renderer tests, all three
  platform payload checks, both macOS Internet Angel preset payloads, and
  `git diff --check` pass. The complete macOS suite also passes with Swift
  build, XCTest 10/10, signed-runtime switching and runtime-state integration;
  Doctor remains explicitly skipped and no current-revision visual smoke is
  claimed.
- [superseded by live smoke] Final independent re-review found no remaining P0/P1/P2 parity
  issue. Both platform injectors append the same generated extension after
  their base CSS, so the later role-tooltip override is identical on Windows
  and macOS; the new macOS base rules close only the previously missing Dark
  role-less Radix/slot path. Remaining gates are current-revision macOS visual
  smoke, real Windows visual comparison and PowerShell tests, plus optional
  computed-style/screenshot coverage beyond selector fixtures.
- [complete] The user authorized and completed a current-revision macOS Dark/Light live
  visual smoke on 2026-08-11, including a Codex restart if it proves necessary.
  Prefer applying the current worktree payload through the existing trusted
  loopback CDP session, capture revision and visual/computed-style evidence,
  then restore the user's original appearance and runtime state.
- [live finding, fixed locally] The first forced-Light smoke exposed unreadable
  assistant prose. Live computed-style and DOM probes showed the Light palette
  itself was correct (`--angel-adaptive-text` was dark), but current Codex
  assistant units no longer end their content-search key with `:assistant`.
  Their semantic `data-markdown-text-style="assistant-message"` nodes therefore
  retained the native `electron-dark` white foreground over the Light task
  artwork. The shared extension now marks that existing semantic node and uses
  it as a bounded mutation hint; focused initial and late-mount regressions pass.
- [live verifier finding, fixed locally] The Light Environment panel correctly
  matched the shared adaptive Light rule (opaque raised surface, 1 px border,
  no full-surface gradient), while the macOS verifier still required the Dark
  2 px gradient contract. Verification now uses the component's Angel
  `::before` accent strip as common theme evidence, accepts the existing Light
  adaptive surface, and retains the Dark gradient requirement. Focused macOS
  overlay and renderer-verification tests plus syntax and diff checks pass.
- [live finding, fixed locally] Light activity headers inherited Codex's
  dark-shell `--color-token-conversation-body`, whose winning `!important`
  utility made nested status text white on the adaptive Light surface. The
  shared Light CSS now remaps only that token on `activity-header` to
  `--angel-adaptive-text`; fixed-dark activity detail/output and the intentional
  white hover foreground are unchanged. The pre-change Windows System Light
  copy followed the same shared path and lacked this guard; its generated copy
  now includes the fix. This proves the shared trigger shape and protection,
  not that the visible defect was reproduced on a potentially different
  Windows Codex bundle.
- [superseded by final live smoke] Light revision `5bfa831e05753b7e2cab` and Dark revision
  `ac2d278790daaaf5c12f` both pass the current macOS verifier on a visible task
  route with no document overflow. Light visible activity text computes to
  `#201e24`; Dark retains its light activity foreground. Light Environment uses
  its expected 1 px adaptive surface and Dark retains the 2 px gradient.
- [historical verified] After the activity-token fix, focused shared/macOS/Windows renderer
  checks, runtime sync, all three payload checks, JavaScript/shell syntax,
  `git diff --check`, and the complete applicable macOS suite pass again. The
  suite includes Swift build, XCTest 10/10, Safe CSS, ZIP/import, signed-runtime,
  configuration and runtime-state integration; Doctor was explicitly skipped.
- [superseded by final live smoke] The persistent theme remained `appearance=auto` and
  was reapplied successfully as Auto revision `341e687c69f30cf20484`, following
  the user's native Dark setting. The pre-task live revision
  `3262374af0c9a64cc572` had no retained payload snapshot and its old watcher is
  no longer running, so the original payload/revision cannot be claimed as
  restored.
- [remaining gate] Real Windows Light/Dark visual evidence and the PowerShell
  suite remain unavailable on this macOS host. The macOS screenshots cover a
  representative task route and visible Environment, not an exhaustive manual
  pass through every Projects/PR, dialog, tooltip, second-composer or Diff view.
- [superseded by final live smoke] Markdown validation for this file and the parity review, plus
  `git diff --check`, pass. The persisted theme still declares
  `appearance=auto`; Codex and the injector were no longer running at the final
  read-only status check, so the last successful Auto revision above was not
  live-probed again.
- [complete] The user requested an explicit Windows regression assurance pass.
  The macOS-compatible Windows/shared Node subset, payload variants,
  generated-asset sync, syntax checks and independent Windows diff review have
  completed. PowerShell and real Windows visual execution remain explicit
  platform-only gates.
- [review finding, resolved locally] The Windows-focused diff review found
  three System Light cascade regressions in the appended shared extension:
  adaptive Radix paint could overwrite the fixed-dark Settings menu surface,
  the generic Light input rule could overwrite fixed-dark Settings inputs, and
  the late fixed-dark descendant fallback could replace the selected
  side-workspace cyan state with paper white. A narrower follow-up also caught
  the Settings placeholder, wrapper-marked Settings search input, and
  selected-tab descendant variants before final verification.
- [complete] Added focused red contracts, then limited the shared CSS fix to
  excluding classified Settings inputs/placeholders and menus from generic
  Light paint, keeping the Settings search input transparent with a readable
  muted placeholder, and restoring selected side-workspace cyan on both the
  selected node and the same bounded text descendants used by the fixed-dark
  fallback. No Windows base, Renderer, injector, PowerShell, Acrylic, Win32 or
  installer source changed.
- [verified] The focused extension contract is green after regenerating
  all platform copies. All 17 Windows JavaScript/module syntax checks, runtime
  sync, selector doctor, shared renderer, Safe CSS 12/12, nine portable Windows
  Node regressions, payload-template integrity 6/6, injector self-test, and
  System/Acrylic/explicit-theme payload construction pass. The one-shot test
  initially hit sandbox loopback `EPERM` and passed unchanged with local
  loopback permission; invalid `blur` material remains rejected. Targeted
  macOS extension, renderer, verifier, payload-template and both Internet Angel
  preset payload checks also pass. The complete applicable macOS suite passes
  after the shared CSS fix, including Swift build, XCTest 10/10, Safe CSS,
  ZIP/import, transaction, signed-runtime, configuration and runtime-state
  integration; Doctor was explicitly skipped. Its first attempt failed only
  because the sandbox denied Swift's user cache, and the unchanged command
  passed with cache permission.
- [final Windows review] The post-fix read-only review found no remaining
  actionable Dark, Light or Acrylic regression in the changed Windows path.
  It specifically rechecked the Settings search wrapper/child cascade,
  self-marked Settings inputs and placeholders, Settings menu surface and idle
  items, and side-workspace selected parent/descendant restoration.
- [remaining Windows gate] This macOS host still has neither Windows PowerShell
  nor `pwsh`; PowerShell 5.1/7 behavior, Win32/Acrylic runtime effects and real
  Windows Dark/Light computed-style or screenshot validation remain CI or
  physical Windows gates. Do not claim complete Windows platform validation
  from the portable checks above.

## v1.5.14 upstream sync and release

- [goal] Merge the latest upstream `main` into the fork with fork behavior and
  branding taking precedence, raise all platform sources to 1.5.14, run only
  basic local verification, then publish and verify the immutable Release.
- [workspace] Isolated worktree
  `C:\Users\19110\AppData\Local\Temp\codex-dream-skin-v1.5.14-019fdc7d` on
  branch `codex/sync-upstream-v1.5.14`. The primary worktree's user changes to
  `.gitignore`, `TASK_PROGRESS.md`, and `.codegraph/` remain untouched.
- [inputs] Exact fork base `origin/main@ed86e3b5af8d429f884fe9edc6311f4ccd85933e`
  and upstream head `upstream/main@6f789be4570b1d5c9e7e60545f22173195968720`;
  merge base is `0a727a539fc9cd298ad4827c6cefbd4a2192db79`.
- [recovery] Direct git transport to `github.com:443` was unavailable. The
  signed GitHub API commit payloads plus every reachable tree and blob were
  imported with exact SHA verification; both local remote-tracking refs were
  updated only after their current server heads and complete object graphs
  matched.
- [merge] The non-fast-forward merge conflicts are resolved. Fork workflows, release
  invariants, download URLs, INTERNET ANGEL extensions, Issue #14/#16 behavior,
  Win32 readiness evidence, Acrylic and Linux coverage take precedence. Safe
  upstream timestamp/path/schema checks, shared image metadata, macOS menu and
  visibility fixes, root LICENSE/SECURITY, and tools CI coverage are retained.
- [complete] The macOS dimension helper is now present in the App integrity
  list, runtime packaging whitelist, mounted-DMG verification and standalone
  menu upgrade path. Fork update fallbacks remain on the fork, native Open
  ChatGPT behavior is preserved, and the image shell accepts writer task mode
  `full`.
- [complete] Windows migrates only the exact managed v1.5.13 shapes: Active
  themes may use `id=custom` or the strict timestamp ID with the generated
  Active image name; dormant Saved themes are migrated only when explicitly
  selected, under the import mutex, from a direct timestamp-ID child with the
  exact legacy property/file set. The migrated theme passes canonical Node
  payload validation before Active is written. Future/string schemas,
  mismatched IDs, unknown files and external packages remain fail closed.
- [verified] Current basic local checks pass: PowerShell parsing; Git Bash
  syntax; renderer verification 6/6 including hidden-signal Home fail-closed;
  direct host Home/deck fail-closed; Windows schema/path 4/4; installer-static
  in PowerShell 7 and 5.1; functional managed Active and Saved v1.5.13
  migration; shared runtime sync; all three platform payload checks;
  nine-source 1.5.14 consistency; and diff whitespace.
- [scope] Per user direction, no real Codex smoke or complete local platform
  suite is being run. Native Swift/DMG, Setup.exe and full platform suites stay
  mandatory exact-head GitHub CI/Release workflow gates.
- [reviewed] The complete 46-file merge diff is staged and reviewed. Script
  modes remain executable, no upstream release/download URL replaced the fork,
  the macOS dimension helper is included in both full and standalone packaging,
  and the shared validator copies are byte-identical.
- [ci follow-up] Merge commit `450b9148` and assertion commit `17659ce` are on
  PR #25. The exact `17659ce` head passed Static checks, macOS regressions,
  Windows PowerShell 5.1 and Windows PowerShell 7. Automated review then found
  five actionable gaps. The stale assertion was already fixed; local follow-up
  now also fixes the managed timestamp/Saved migration, canonical long fork
  update URLs, Home/INTERNET ANGEL deck fail-open, and standalone macOS menu
  upgrades that could publish a new loader before its helpers.
- [reviewed] The standalone menu upgrade now preflights every coupled source,
  clones the complete installed engine into a private same-parent directory,
  byte-verifies the menu template, six shell scripts and three Node helpers,
  publishes with directory renames, atomically replaces the active SwiftBar
  plugin, and restores both plugin and engine on caught failure. A macOS
  transaction fixture covers success from a v1.5.13-shaped engine and missing
  helper failure before live mutation; exact-head macOS CI will execute it.
- [ci follow-up] Exact `b0644a2` Static and macOS jobs passed, including the new
  menu transaction fixture. Both Windows hosts deterministically reached the
  existing saved-theme count assertion and failed because the new migration
  fixtures were left in the shared test store. The fixture directories are now
  removed after their assertions; production behavior was not implicated.
- [pending] Commit and push the review follow-up, require the new exact-head CI,
  reply to and resolve all five review threads, merge, then verify tag, public
  Release, DMG, Setup.exe and SHA256SUMS.txt.

## v1.5.13 Issue #14/#16 completion and release

- [historical complete] PR #23 was subsequently merged as
  `ed86e3b5af8d429f884fe9edc6311f4ccd85933e`; public v1.5.13 was released with
  the required assets, and Issues #14/#16 were replied to and closed. The
  remaining bullets preserve the pre-publication evidence trail.

- [goal] Resolve the remaining PR #23 CI/review defects, finish and verify
  Issue #14 and #16 on the exact release candidate, merge only after fresh CI
  and approval, then publish and independently verify immutable v1.5.13 assets.
- [workspace] Isolated worktree on `codex/fix-pr23-v1.5.13-resume` at PR #23
  head `18e51bb`. The primary
  worktree's `.gitignore`, `TASK_PROGRESS.md`, and `.codegraph/` changes remain
  untouched.
- [recovery] The previous temporary worktree was cleaned by the host between
  sessions, including all uncommitted files. Its branch remained at `18e51bb`;
  a fresh isolated worktree was created from that exact commit and the audited
  fixes are being rebuilt from the recorded findings and test evidence.
- [historical baseline] At the start of that work, PR #23 was open at `18e51bb` with the original
  PowerShell 7 contention-test failure and review required. Issues #14 and #16
  remain open. The latest public Release remains v1.5.12.
- [diagnosed] Issue #14 still needs visible Home-signal selection, responsive
  native suggestion lifecycle handling, delayed container observation, a
  fail-closed generic composer fallback, and a real delayed navigation
  confirmation. Issue #16's renderer/verifier `missingL1` repair is already in
  main but needs an executable renderer-to-verifier regression and startup
  retry success coverage before its first public release.
- [complete] Rebuilt the Windows renderer/CSS/verifier fixes. Home routing now
  uses visible candidates and a fast plus 360 ms confirmation; native 2–4 card
  lifecycle handling normalizes only a safe deck root, handles late mount and
  whole-root replacement, and removes fallback layout gaps. Generic composer
  discovery validates each visible owner/input and cannot be bypassed by stale
  canonical nodes or incremental classification.
- [complete] Restored executable mode 100755 for the Linux and macOS common
  scripts, corrected platform-specific changelog text, merged duplicate fix
  sections, and replaced the stale version-only progress entry.
- [complete] Added a bounded retry around the same-volume Windows runtime
  directory rename. It retries only transient access/IO errors while the source
  and destination still prove that no rename committed; every ambiguous state
  remains fail closed. Fault injection verifies both retry and exact rollback.
- [verified] Renderer behavior and renderer-to-verifier contract tests pass;
  verifier readiness is 14/14. Startup failure rollback plus two-fail/third-pass
  retry tests pass in PowerShell 7 and Windows PowerShell 5.1. The real Global
  mutex contention probe passes same-engine in both hosts and cross-engine from
  PowerShell 7 to Windows PowerShell. Payload, bootstrap, session, one-shot,
  Home CSS, JavaScript syntax, and diff whitespace checks pass.
- [reviewed] An independent production-only audit found and then verified fixes
  for hidden stale deck observer narrowing, unsafe deck-parent normalization,
  whole-root replacement observation, canonical/generic multi-composer
  coexistence, and renderer/verifier opacity consistency. No P0/P1/P2 finding
  remains in the three production files.
- [verified] The complete Windows suite passes in PowerShell 7 (658.1 s) and
  Windows PowerShell 5.1 (547 s). Focused runtime-patch tests pass in both hosts
  after the bounded rename retry. Windows portable Node tests pass 26/26 and
  installer-static tests pass in both hosts. Shared runtime sync, all three
  platform payload checks, Internet Angel consistency, macOS shell syntax, all
  JavaScript syntax, PowerShell source encoding, runtime safety, six-source
  version consistency, and `git diff --check` pass.
- [platform note] On Windows, the macOS portable suite records 58 passes and 2
  expected skips; 5 cases require POSIX `/tmp` or macOS window tooling and are
  intentionally left to exact-head macOS CI. Native Swift/DMG and signed Setup
  build validation, release asset checksums, and real Codex smoke remain release
  gates and are not claimed locally.
- [complete] The reviewed diff was committed and pushed, exact-head CI passed,
  PR #23 merged, the v1.5.13 tag and three immutable assets were verified, and
  Issues #14/#16 were commented on and closed.

Updated: 2026-08-07 CST (Asia/Shanghai)

## Initial v1.5.13 preparation (superseded)

- [historical] PR #23 initially prepared the 18 commits between public
  `v1.5.12@bf9ca31` and `main@8f9c99a`, including Codex 26.730 compatibility,
  stale-listener recovery, runtime patch support, wallpaper/auxiliary-route
  coverage, and renderer performance follow-ups.
- [complete] The guarded macOS/Windows version sources, synchronized Linux
  sources, package metadata, README labels, and changelogs were raised to
  1.5.13 without changing or replacing the immutable v1.5.12 Release.
- [superseded] This was originally a version-only publication. The 2026-08-09
  section is authoritative: Issue #14/#16 completion, fresh exact-head CI,
  approval, merge, release verification, and Issue closure are now part of the
  same delivery.

Updated: 2026-08-05 CST (Asia/Shanghai)

## Codex 26.730 generic composer fix

- [diagnosed] Codex `26.730.7989.0` replaced `.composer-surface-chrome` with
  the CSS Modules class `_ComposerLayoutFooter_*`, so the older Windows
  renderer stopped theming the composer/dialog input.
- [complete] Merged the upstream v1.5.12 generic renderer fallback and repaired
  the Windows renderer: it now exposes `missingL1` in its runtime scope,
  reclassifies when a generic composer mounts, and re-runs part refresh after
  every ensure so a composer mounted during classification is not missed.
- [verified] Live CDP on Codex 26.730 reports
  `data-ds-part="composer"` on `_ComposerLayoutFooter_yeer6_335`;
  `verify-dream-skin.ps1` passes with `genericInput` visible, engine version
  `1.5.12`, revision `7fab22fba48bb00ee568`, and no hidden-document failure.

## Codex 26.730 wallpaper and generic composer CSS

- [diagnosed] The v1.5.12 Windows CSS only themed `.composer-surface-chrome`,
  which Codex 26.730 no longer renders, and task-route `main` was opaque
  `--dream-surface`, hiding the 超天酱 body wallpaper behind a purple surface.
- [complete] Windows `dream-skin.css` now styles `[data-ds-part="composer"]`
  with the Internet Angel input surface, and keeps task-route `main` and its
  `::after` overlay translucent so the body wallpaper remains visible.
- [verified] Live computed styles show the 超天酱 blob image on `body`,
  semi-transparent task `main` gradient, and a themed generic composer;
  `verify-dream-skin.ps1` passes with `genericInput` visible.

## Codex 26.730 side chat, project preview, and persistent composer

- [diagnosed] The right sidebar and side-chat composer kept native black
  `bg-token-main-surface-primary`, the side composer was outside the main
  surface and never got `data-ds-part="composer"`, and switching conversations
  mounted a new composer that was not reclassified until a manual refresh.
- [complete] The Windows renderer now marks the outermost generic composer
  container, accepts side-chat composers inside `aside`, re-establishes the
  part on every mutation batch, and schedules a fast refresh when the user
  clicks inside any sidebar. Windows CSS now themes the right sidebar and its
  inner token surfaces instead of leaving them black.
- [verified] Live CDP: switching between conversations and back keeps
  `data-ds-part="composer"` on `_ComposerLayoutRoot_yeer6_3` within ~900ms;
  the right sidebar background is themed and its `bg-token-main-surface-primary`
  children are transparent.
- [complete] Built `release/CodexDreamSkin-Setup-v1.5.12.exe` and
  `release/CodexDreamSkin-QuickFix-v1.5.12.zip`; the quick-fix package contains
  a runnable `fix.ps1` plus the patched renderer/css/launcher files.
- [complete] Follow-up: broadened generic composer input discovery, removed
  nested inner frames inside generic/side-chat composers, and neutralized
  native black project/diff surfaces in the right sidebar. Live CDP reports no
  `rgb(0,0,0)`/`rgb(24,24,24)` surfaces in the right sidebar after the fix.
- [complete] Second follow-up: `scroll-mt-4` message wrappers that carry
  `data-message-author-role`/conversation anchors are now transparent and
  borderless, so the main thread and side chat no longer draw a second frame
  around the real message bubble; composer fallback also marks
  `ComposerLayoutRoot` directly when no input is detected.
- [complete] Third follow-up: right-sidebar/diff theming no longer depends on
  being inside the main surface, so project previews rendered in any non-left
  `aside` (outside dialogs) are themed instead of black.
- [complete] Fourth follow-up: `dream-terminal-panel` (the right side chat /
  terminal surface) is now translucent and borderless, and is included in the
  generic composer fallback so its bottom input is no longer a separate black
  frame.
- [complete] Fifth follow-up: the generic composer classifier now marks every
  `ComposerLayoutRoot`, not just the first one, so the main input and the side
  chat input both keep `data-ds-part="composer"` after conversation switches.
  The Windows CSS also themes the second composer before the renderer refresh.
- [complete] Sixth follow-up: Projects, pull requests and other full-route
  pages mount an opaque native `bg-token-main-surface-primary` frame inside the
  main content viewport. Windows CSS now paints that frame, its sticky header,
  search input and input placeholder with adaptive Dream Skin surfaces, so the
  wallpaper remains visible in both dark and light modes.
- [complete] Seventh follow-up: the right-side source-code viewer is a
  shadow-DOM `diffs-container` with an opaque native black surface. The
  renderer now themes its host, file, code, gutter and line-number surfaces
  with inline styles plus a small shadow style for scrollbars and selection,
  so source files follow the active Dream Skin theme in dark and light modes.
- [complete] Eighth follow-up: light mode no longer leaves native dark
  surfaces behind. Windows CSS now themes route frames, the new-chat composer
  body, dialog/Radix overlays, user/assistant bubbles, edited-card badges and
  file rows, environment panels, the left sidebar surface/rows/icons, source
  tooltips, and the scroll-to-bottom hover state with adaptive Dream colors.
  Appearance detection also prefers root classes and light before data
  attributes, so stale debug attributes cannot force light mode back to dark.
- [verified] Live CDP after hot injection: side chat composer is marked
  `data-ds-part="composer"`, the Projects page surface is a translucent theme
  gradient instead of `rgb(24,24,24)`, and the source-code viewer background is
  themed instead of `rgb(17,17,17)`; `verify-dream-skin.ps1` passes with
  `pass: true`, and the full Windows test suite passes.
- [complete] `patch-dream-skin.ps1` now requires the new renderer/CSS markers
  before reporting "already contains fixes", so an older installed engine is
  upgraded in place to this revision. Rebuilt
  `release/CodexDreamSkin-QuickFix-v1.5.12.zip`
  (`32691827C1127A1716201B17004B7308630515D60E9480443711A22A0B224162`) and
  `release/CodexDreamSkin-Setup-v1.5.12.exe`
  (`F4ABD8B32448FA1CF77A4FB57F03A498CD08C8A60526837FC4797453E7266D16`).

## Sync latest upstream and publish fork v1.5.12

- [goal] Merge `upstream/main` at `0a727a539fc9cd298ad4827c6cefbd4a2192db79` into the fork, resolve conflicts in favor of this repository's INTERNET ANGEL, Linux, floating-sidebar, Windows Acrylic and exact-process/HWND architecture, then publish a verified `v1.5.12` Release.
- [workspace] Isolated worktree `F:\Codex-Dream-Skin-Needy-Girl-Overdose-release-v1.5.12` on branch `agent/sync-upstream-release-v1.5.12`; the original dirty worktree and its unrelated changes remain untouched.
- [upstream] Initial fixed merge inputs were fork `origin/main` at `26245e173220969259ce696b07f1052a0aeca70f` and upstream `main` at `1c7a859ed51bcfe4923f6483a5625a6e63f97657`. Before CI repair, upstream advanced by two documentation commits to `0a727a539fc9cd298ad4827c6cefbd4a2192db79`; merge commit `2f176a0` records that ancestry. Per user direction, follow-up `37b0627` restores both READMEs and all affected gallery image assets byte-for-byte to this fork's pre-merge state, so no upstream showcase content enters the published tree.
- [complete] All 33 textual conflicts were resolved without residual conflict markers. The merge retains fork product behavior while integrating upstream Safe CSS runtime compilation, transactional theme replacement recovery, generic renderer fallbacks, Codex 26.727 Settings detection, multiline TOML coverage and immutable Release SHA binding.
- [release] Target version is `1.5.12`; no origin tag or Release with that version existed at preflight. Six guarded macOS/Windows version sources and three fork Linux version sources are synchronized.
- [verified] Shared runtime sync, selector doctor, three-platform payload checks, all 24 Windows Node tests, Windows PowerShell 5.1 and PowerShell 7 full regressions, and installer static tests under both PowerShell hosts pass. Release workflow immutable-SHA and retry binding tests pass.
- [environment] Windows cannot execute the macOS publish/stage tests that require POSIX directory fsync, symlinks and `/bin/bash`; WSL has no installed distribution. Swift and Inno Setup are also unavailable locally. Ubuntu, Windows and macOS CI must provide these filesystem, native build, DMG and Setup.exe results.
- [github] Fine-grained PAT permissions were corrected; branch `agent/sync-upstream-release-v1.5.12` was pushed and draft PR #20 was opened against `main`: `https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/pull/20`.
- [ci] PR #20 is mergeable. Run `30968153557` passed Static checks, Windows PowerShell 5.1 and macOS repository regressions. Windows PowerShell 7 failed only because the child operation-lock contention probe exceeded its 10-second process-start deadline; the product mutex uses a zero-millisecond second-owner timeout and behaved fail closed.
- [verified] The production mutex remains unchanged. The child probe now runs non-interactively, allows 30 seconds for runner process startup, and explicitly waits for exact-process termination after a timeout kill. The focused auto-launch safety test passes under Windows PowerShell 5.1 and PowerShell 7.
- [pending] Push the upstream merge and CI test correction, require all four PR checks on the exact new head, mark the PR ready, merge it, then verify the public Release plus DMG, Setup.exe and `SHA256SUMS.txt` downloads.

## Windows stale CDP listener recovery

- [diagnosed] Codex auto-restart can leave the old CDP listener on `9335`
  owned by a process that no longer exists, so the next reapply fails and
  Codex is reopened without the debug endpoint.
- [complete] The launcher now detects stale dead-owner listeners and scans to
  the next free loopback port even when `-Port` was explicit; live unverified
  listeners still fail closed.
- [verified] The Windows PowerShell suite, installer static checks, Node
  regressions and payload validation pass. On the affected machine the stale
  `9335` listener resolves to the next free port `9336`.

## In-place runtime patch

- [complete] Added `windows/scripts/patch-dream-skin.ps1` so existing
  installations can be fixed without uninstalling or reinstalling. It stages
  and hash-verifies the affected launcher scripts plus the patch script
  itself, backs up the originals, replaces them in the installed engine,
  verifies the result, and preserves themes, config backups, tray settings,
  and the running Codex session.
- [verified] The patch ran against the real installed engine on this machine:
  installed launcher files and the patch script now match the source hashes,
  active theme and config backup remain present, Codex stayed running, and no
  patch transaction directories remain.
- [verified] Runtime-patch regression, stale-listener regression, installer
  static checks, and the full Windows PowerShell suite pass.

Updated: 2026-08-02 CST (Asia/Shanghai)

## macOS DMG build from MacOS-Fix

- [scope] Build a local macOS DMG containing the current uncommitted ChatGPT
  26.727 selector and injection-verification fix. Do not commit, push, tag,
  publish, or replace a GitHub Release.
- [complete] Ran the repository's `macos/scripts/build-dmg.sh` flow, including
  the full macOS test suite, universal app build, ad-hoc signing, read-only DMG
  mount, packaged-runtime checks and SHA-256 generation.
- [target] `macos/release/CodexDreamSkin-v1.5.9.dmg` and its adjacent
  `.dmg.sha256` checksum file.
- [verified] The 8.4 MiB DMG passed the build script's mounted-app validation
  and a separate `hdiutil verify`. Its independently recomputed SHA-256 matches
  the sidecar: `926d11498a5ce450c7879cd4eb68a1fdc3af60df9378beee6572546fd8bb7608`.
- [not published] The artifact remains local. No commit, push, PR, tag, GitHub
  Release, or replacement of an existing public asset was performed.

Updated: 2026-08-01 CST (Asia/Shanghai)

## macOS ChatGPT 26.727 apply verification failure

- [scope] macOS only. Preserve Windows/Linux behavior and shared runtime files
  unless a shared-source sync check proves a generated macOS asset requires it.
- [diagnosed] The installed 1.5.9 payload and exact Internet Angel theme revision
  reach the visible ChatGPT renderer, the active PNG exists, and the themed home,
  sidebar, composer and four-card deck are present. Apply still fails because the
  outer startup verifier rejects the current ChatGPT 26.727 home DOM after
  `main.main-surface` and `header.app-header-tint` disappeared; live evidence has
  `scope.level=L0`, a visible home hero and sidebar, but `shell=null`.
- [diagnosed] The apparent purple full-area mask was the flat themed surface left
  after all artwork rules missed the renamed main shell; the operation host itself
  is transparent outside its small status card. The image payload was valid and
  already present as a renderer Blob URL, but no current main element matched the
  CSS gate that paints it.
- [complete] Extended the canonical selector contract with the stable ChatGPT
  26.727 `data-app-shell-main-surface` and
  `data-app-shell-application-menu-bar` attributes while retaining the legacy
  classes. Synced the generated macOS CSS/renderer/selector assets and the shared
  Internet Angel extension copies used by the platform packages.
- [complete] Kept exact payload, revision, window, viewport, structure, overflow
  and Angel surface checks, but allowed Internet Angel's intentional cyan/green/
  yellow/pink card labels. Ordinary themes still require their existing label
  color match.
- [verified] Focused macOS and generated-asset regressions pass; affected Windows
  Node compatibility tests also pass. `CODEX_DREAM_SKIN_SKIP_DOCTOR=1
  macos/tests/run-tests.sh` passes in full, including shell syntax, runtime sync,
  payload and preset checks, Safe CSS/ZIP/import tests, Swift build and XCTest
  10/10. `git diff --check` passes.
- [verified live] The fixed injector applied to the real ChatGPT 26.727.51351
  renderer on loopback port 9341. Exact installed-engine verification reports
  `pass=true`, `scope.level=L1`, no missing L1 selectors, matching theme revision,
  visible composer/sidebar/environment, and no horizontal overflow. The captured
  installed screenshot is `/tmp/dreamskin-installed-after-fix.png`; the artwork is
  visible and the loading mask is absent.
- [installed locally] Rebuilt and ad-hoc signed the universal menu-bar App, then
  atomically replaced `/Applications/Codex Dream Skin.app` and the installed
  engine without closing or restarting ChatGPT. The watcher is active and the
  previous App/engine remain recoverable at
  `/tmp/codex-dream-skin-before-fix.clZViv`.
- [not published] Changes remain uncommitted on local branch `MacOS-Fix`; no push,
  PR, merge, tag, Release, DMG publication, or user-downloadable update occurred.

Updated: 2026-07-31 CST (Asia/Shanghai)

## Final payload CSS pre-PR blocker

- [diagnosed] A final production-payload audit found that the Windows and Linux
  renderer templates consume only `__DREAM_CSS_JSON__`, while their injectors
  replace that effective placeholder with `baseCss`. The computed Internet
  Angel extension CSS is therefore absent from both final renderer payloads;
  validated Windows Safe CSS is absent for the same reason.
- [complete] Added direct final-IIFE CSS argument regressions for the shared
  Internet Angel extension and Windows Safe CSS, then replaced the effective
  placeholder with `combinedCss` on Windows and `css` on Linux.
- [complete] Reused the existing Windows/Linux fixed-sidebar descendant rules
  for the floating panel through an equal-specificity `:is()` parent. Fixed
  container paint, geometry and ornament ownership remain unchanged.
- [verified] Focused red-green tests prove the extension and Safe CSS reach the
  final renderer IIFE. A Chromium computed-style fixture reports parity for
  navigation, buttons, new-task, section, selected-row and list-item styles on
  both platforms; only the intentional floating-container paint/geometry differs.
- [verified] Platform payload checks, runtime synchronization, JavaScript
  syntax and `git diff --check` pass. Portable Windows Node coverage passes
  21/21; the complete macOS suite passes, including Swift XCTest 10/10.
- [complete] Committed the final payload/parity correction on the feature branch.
- [complete] Pushed the feature branch to the `Maker-Wen` fork and opened
  `EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose#13` against `main`.
- [pending] PR CI and review. Windows PowerShell and real Windows/Linux visual
  smoke remain CI/platform evidence gaps already accepted for this change.

Updated: 2026-07-31 CST (Asia/Shanghai)

## Cross-platform floating-sidebar contract follow-up

- [complete] User expanded the scope beyond the macOS bundled preset: the
  fixed/floating Internet Angel sidebar must work on Windows and Linux too, and
  platforms that support imported Safe CSS must expose both sidebar variants as
  the same public `sidebar` part. Linux does not currently import theme ZIPs or
  Safe CSS, so this task will not add a new Linux theme-store subsystem.
- [complete] Added the optional floating-panel selector to the shared contract;
  canonical macOS and Windows now expose fixed and floating panels through the
  same Safe CSS `sidebar` part. Windows refreshes that part immediately when a
  floating portal is added or removed instead of waiting for its fallback scan.
- [complete] Windows and Linux now set the shared extension's root theme gate
  only for the two exact bundled Internet Angel IDs, set `standard` for every
  other theme, and remove the gate during cleanup. The existing broad art-profile
  heuristic is not reused for theme activation.
- [complete] The shared classifier now visits every matching sidebar, covering
  the native transition where fixed and floating panels briefly coexist.
- [verified] Red tests reproduced all three gaps: dynamic canonical Safe CSS
  part assignment, Windows floating Safe CSS assignment, and simultaneous
  sidebar classification. Focused macOS, Windows and shared tests now pass;
  the Windows VM fixture also executes the Linux renderer for exact-ID,
  non-bundled-ID and cleanup behavior. Shared synchronization, JavaScript syntax
  and `git diff --check` pass.
- [verified] The complete macOS suite passes, including Swift build/XCTest
  10/10, shared runtime, Safe CSS, ZIP/import, shell and Doctor coverage. All
  portable Windows Node tests pass, including renderer, bootstrap, session,
  one-shot, window readiness, payload integrity and injector self-checks; Linux
  syntax and payload construction pass. The independent final review found no
  Critical or Important issues.
- [blocked] This macOS host has neither `pwsh` nor Windows PowerShell, so the
  Windows PowerShell suite must run in CI. Real Windows/Linux Codex screenshot
  smoke is also unavailable locally; these platform evidence gaps remain open
  even though the executable renderer and payload contracts pass.
- [complete] Committed the reviewed P1/P2 follow-up on
  `codex/fix-internet-angel-hover-sidebar`.
- [blocked] Push and PR creation remain blocked by GitHub authentication:
  `gh auth status` reports the active token for `Maker-Wen` as invalid, and an
  HTTPS push cannot read a username. Re-authenticate, then push this branch and
  open the PR without changing the verified implementation.

Updated: 2026-07-31 CST (Asia/Shanghai)

## Internet Angel hover-sidebar pre-PR review follow-up

- [scoped] The review's Safe CSS finding affects imported themes that target
  `[data-ds-part="sidebar"]`; it does not affect the bundled Internet Angel
  sidebar, which uses the separate `data-angel-component` classifier verified
  live in this task. The current PR remains scoped to the macOS bundled theme.
- [complete] Reworked the macOS lifecycle fixture to model fixed-sidebar
  removal, an empty refresh interval, and a later floating portal mount as two
  body mutations. The floating node now has its own mode, search, new-task,
  section, selected-row, profile and help controls, and disconnected nodes no
  longer appear in document queries or cleanup assertions.
- [verified] The focused test first failed on an unclassified floating mode
  control, then passed after the fixture gained real floating descendants. The
  complete macOS suite passes with Swift XCTest 10/10 plus shared runtime,
  payload, Safe CSS, ZIP/import, shell and runtime-state coverage; Doctor was
  skipped because this follow-up changes only the test fixture.

Updated: 2026-07-30 CST (Asia/Shanghai)

## Internet Angel hover-sidebar theme repair

- [diagnosed] Branch `codex/fix-internet-angel-hover-sidebar`. Fixed expansion
  uses `aside.app-shell-left-panel` and was already themed. Collapsing it creates
  a different native node, `[data-testid="app-shell-floating-left-panel"]`,
  whose computed background remained the native `rgb(24, 24, 24)` because the
  Internet Angel lifecycle did not classify it.
- [complete] Reused the stable native test ID in the existing sidebar selector,
  so fixed and floating sidebars enter the same component lifecycle. The shared
  runtime generated identical extension assets for macOS, Windows and Linux.
- [verified] A red-green lifecycle fixture now models the floating node. Live
  CDP collapse/left-edge-hover reproduction confirms the floating node receives
  `data-angel-component="sidebar"` and the Internet Angel scanline/blue-purple
  gradient, blue border and cyan/pink shadow instead of the native black plate.
- [complete] A follow-up experiment made floating and fixed wide-art backgrounds
  numerically identical, but user visual review found that this suppressed the
  floating panel's Internet Angel scanlines, blue-purple surface and neon edge.
  Live same-window comparison then proved why equal transparency still looked
  different: the fixed panel reveals the body artwork, while the floating panel
  overlays an already shaded main surface and becomes doubly dark. Moving the
  fixed ornament layer also overlapped the floating search/footer layout.
- [verified] Fixed-sidebar selectors and ornament ownership remain unchanged.
  Internet Angel floating-only paint now draws the preset's 16:9 artwork in
  viewport cover coordinates behind the same immersive gradient, and reuses only
  layout-safe section/list ornaments. Live computed style reports a viewport
  layer of `1779.56px 1001px` at `-51.56px 0`, `sidebar` classification, heart
  section ornaments, no migrated fixed ornament node and no temporary style.
- [verified] Shared synchronization, Internet Angel parity, macOS and Windows
  payload checks, JavaScript syntax and `git diff --check` pass. The complete
  macOS suite exits 0 with Swift XCTest 10/10 plus renderer, Safe CSS,
  ZIP/import, shell and runtime-state coverage; Doctor was explicitly skipped
  because live CDP evidence was collected separately in this task.
- [complete] Implementation commit created on the feature branch. No merge,
  version bump, tag, Release, or published client asset has been created.
- [diagnosed] The floating panel's `Codex` mode switch still inherits the
  native near-white text color. Live CDP comparison shows the fixed switch is
  transparent too, but receives `var(--ds-accent)` and its suffix from a base
  CSS rule scoped only to `__DREAM_SELECTOR_LEFT_PANEL__`. The floating panel
  uses the same button contract under a different parent and misses that rule.
- [complete] Focused red-green CSS contracts now reuse the existing mode-switch,
  specific muted-placeholder and Internet Angel corner declarations for both
  sidebar parents without changing any fixed-sidebar values.
- [verified] After hot injection, fixed and floating `Codex` controls report
  identical computed text/background/border/radius/font/suffix/icon values;
  the focused Internet Angel macOS regression passes.
- [verified] Runtime synchronization, macOS and Windows payload checks and
  `git diff --check` pass. The complete macOS suite exits 0 with Swift XCTest
  10/10 plus renderer, Safe CSS, ZIP/import, shell and runtime-state coverage;
  Doctor was explicitly skipped because live CDP evidence was collected here.
- [blocked] Push and PR creation remain pending: `gh auth status` reports the
  active GitHub token invalid, and HTTPS `git push` cannot obtain a username.
  Re-authenticate GitHub, then push this branch and open the PR without changing
  the verified commit contents.
- [diagnosed] A semantic live-CDP audit paired 60 fixed/floating sidebar control
  types and found 89 computed-style differences. Almost all are descendant SVG
  colors; the remaining visible differences are foreground text and selected-row
  paint. Their declarations are still scoped only to the fixed sidebar even
  though both panels now share the same component lifecycle.
- [complete] Shared only the existing sidebar descendant/control visual
  selectors with the floating panel: text and SVG colors, transitions, hover
  paint, base selected rows, and the Internet Angel selected-row plate/icon.
  Fixed container background, layering, wide-art surface and ornament ownership
  remain unchanged.
- [verified] Focused red-green contracts cover every shared declaration. After
  hot injection, a live semantic CDP comparison reports identical search and
  help control/SVG colors, borders, radii and effects in fixed and floating
  panels; the fixed SVG tint remains `rgba(175, 174, 178, 0.96)`. A source-scope
  audit found no remaining fixed-only descendant color, hover or selected-state
  rules.
- [verified] Runtime synchronization, macOS and Windows payload integrity, and
  `git diff --check` pass. The complete macOS suite exits 0 with Swift XCTest
  10/10 plus renderer, Safe CSS, ZIP/import, shell and runtime-state coverage;
  Doctor was explicitly skipped because live CDP evidence was collected here.

Updated: 2026-07-28 CST (Asia/Taipei)

## Windows native-window fallback hardening (PR #10)

- [complete] Merged child-fork `main@32ce20b` into
  `codex/fix-windows-crash-lag` with merge commit `e56f1c0`; the public branch
  history was preserved and the two conflicts were resolved against the
  current readiness-test baseline.
- [complete] Repositioned PR #10 as a safety follow-up to merged PR #9. Removed
  the redundant startup-level rendered-skin fallback and its ineffective
  fixture, plus the abandoned payload-template and compositor-CSS tests. The
  final diff contains no startup or visual/CSS changes, and sidebar lag remains
  a separate unresolved issue.
- [complete] Restricted `-32000` fallback to the exact known window-not-found
  messages from `Browser.getWindowForTarget`. Generic `-32000` failures remain
  fail-closed, and every `Browser.getWindowBounds` error now reports
  `window-bounds-unavailable` without falling back to renderer evidence.
- [complete] `verify-dream-skin.ps1` now imports `theme-windows.ps1` exactly once
  before calling `Get-DreamSkinThemePaths`; the Windows suite pins this import
  contract.
- [verified] Focused native-window readiness tests pass 10/10, all portable
  Windows Node tests pass 16/16, injector self-test and payload validation pass,
  the complete Windows PowerShell 5.1 suite passes, and `git diff --check`
  passes.
- [pending] Commit and push the hardening diff, update PR metadata and outdated
  review threads, then require Static checks, PowerShell 5.1, PowerShell 7 and
  macOS repository regressions to pass on the exact pushed head.

## Windows stability repair (2026-07-27)

- [diagnosed] The reported approximately two-minute "crash" is the startup
  rollback timer, not a Windows crash.  The installed verifier records a
  visible, correctly themed L1 renderer, but Chromium 150 returns
  `target-window-unavailable`; after 90 seconds the launcher intentionally
  stops the watcher, closes Codex, and relaunches it normally.
- [complete] Windows now matches the existing macOS compatibility behavior for
  this production CDP limitation.  Exact -32000 target-window-not-found and
  -32601 unsupported-domain responses may use the strict visible-renderer
  fallback; hidden documents, tiny viewports, invalid structure, wrong Browser
  identity/payload, invalid bindings, bounds failures, and arbitrary errors
  still fail closed.
- [complete] Removed the earlier lite-theme experiment, which was not passed
  through the Windows theme loader and therefore never affected the installed
  renderer.  The original full visual appearance remains unchanged.
- [verified] Windows injector/renderer syntax, exact payload construction,
  window-readiness, session, bootstrap, one-shot and renderer fixtures pass.
  `git diff --check` passes.
Updated: 2026-07-26 23:10 HKT (Asia/Hong_Kong)

## Windows Chrome/150 Native-Window Compatibility Backport

- [complete] Reproduced the v1.5.7 rollback on Microsoft Store
  `OpenAI.Codex_26.721.4979.0_x64`: the renderer and theme verified except for
  `Browser.getWindowForTarget`, which returned exact CDP error
  `-32000 Browser window not found` on both the page and browser WebSockets.
- [complete] Confirmed upstream already fixed the same root cause in
  `Fei-Away/Codex-Dream-Skin#265` (`e54703d`) and documented it in issue
  `Fei-Away/Codex-Dream-Skin#267`; the public child-fork v1.5.7 predates that
  upstream merge.
- [complete] Branch `fix/windows-cdp-window-not-found` backports the focused
  Windows classifier/fallback and regression coverage onto child-fork
  `main@78497ca` without importing unrelated macOS, CI or release changes.
- [verified] Focused readiness/one-shot/bootstrap Node tests pass 11/11; the
  complete Windows PowerShell regression suite passes; Node syntax,
  `--check-payload`, and `git diff --check` pass.
- [verified] The exact branch injector ran live against Store Codex
  `26.721.4979.0`: it classified the real `-32000` reply as
  `browser-window-not-found`, reported `fallbackWindowPass=true`, and exited 0
  with `result.pass=true`.
- [complete] Commit `8f9fa54` was pushed to
  `Rhongomiant1227:fix/windows-cdp-window-not-found`; child-fork PR #9 merged as
  `32ce20b` with explicit attribution to upstream #265 and environment/test
  evidence.
- [complete] Added independent Codex `26.721.4979.0` / raw `-32000` evidence
  to upstream issue #267 in comment `#issuecomment-5084191931`; no duplicate
  upstream PR was opened because the fix is already merged there.
- [complete] PR #9 is merged into the child fork. Its fallback is now the base
  behavior hardened by PR #10; it is not separately released yet.

Updated: 2026-07-25 08:31 HKT (Asia/Hong_Kong)
Updated: 2026-07-27 10:32 CST (Asia/Shanghai)

## macOS Internet Angel Interaction Regression Fix (2026-07-27 09:34 CST)

- [verified] Work continues on `codex/macos-internet-angel-parity` and ready
  PR #8. The worktree was clean at `d4d9be8` before this follow-up. Scope is
  restricted to the two exact bundled Internet Angel preset IDs; Gothic and
  imported themes must remain unaffected.
- [verified] Real CDP pointer input reproduces the auxiliary workspace failure.
  The Browser tab becomes selected, but the themed workspace root collapses
  from `991px` to `86px` and its tab panel from `945px` to `40px`. Clicking an
  Edited files row selects Review, but the broken root expands the Review panel
  to `16807px`, removes its bounded scroll container and prevents native file
  positioning from being visible.
- [verified] Temporarily restoring the workspace root's native
  `position: absolute` returns the root to `991px`, Browser/Review to `945px`
  and Review to a bounded `905px` scroll viewport. The cause is the macOS
  overlay marking multiple nested workspace candidates and forcing
  `position: relative !important`; it is not a browser network/load failure.
- [verified] The sidebar scroll root remains `871px` high with `2806px` of
  content. The themed `1px` border reduces each fixed row to a `28px` client
  box around `29px` of content, producing a nested `1px` vertical scroll range
  that consumes wheel input. Temporarily clipping row vertical overflow keeps
  row `scrollTop` at zero and routes wheel input to the native sidebar scroller.
- [verified] Red-green regressions now require exactly one innermost workspace
  mark, forbid workspace positioning overrides and positioned decoration, and
  require fixed-height sidebar rows to clip vertical overflow. The classifier
  selects only the smallest valid right-docked workspace. The CSS paints its
  cyan/blue/pink top stripe as a background layer and no longer changes native
  position, dimensions, overflow or z-index.
- [verified] Source hot injection and real input checks pass. A first wheel event
  over a sidebar row moves the native root from `scrollTop=0` to `420` while all
  rows stay at zero. Opening `Browser` from the right-panel add menu produces a
  full `945px` `New tab` panel with the native address field and Start browsing
  surface. Clicking `macos/tests/internet-angel-macos.test.mjs` from Edited
  files switches from Browser to Review, scrolls Review to `4641`, and leaves
  the requested file header visible at panel `y=92`.
- [verified] The targeted native-window screenshot shows the complete Browser
  surface without clipping, overlap or document overflow. Computer Use refused
  access to `com.openai.codex` by policy and CDP screenshots block while the
  embedded browser is open, so the visual capture used macOS window-level
  `screencapture`; interaction and geometry assertions remain CDP-derived.
- [verified] `CODEX_DREAM_SKIN_SKIP_DOCTOR=1 macos/tests/run-tests.sh` passes
  all shell/Node, shared runtime, Safe CSS, import/ZIP and 10 Swift XCTest cases.
  A temporary arm64 app build passes strict code-signature verification, reports
  an arm64 Mach-O executable and contains byte-identical overlay CSS/JS assets.
  `git diff --check` also passes.
- [verified] Implementation commit `8290ad3` passed the scoped diff review and
  was pushed to existing ready PR #8. GitHub reports the PR as open and non-draft
  with exact head `8290ad30b550050346c5b1d151975320db0a14ba`; its merge state is
  currently `BLOCKED` and no status checks are reported yet. No install, merge,
  version bump, tag or Release is part of this follow-up.

## macOS Internet Angel Complete Surface Audit (2026-07-27 01:22 CST)

- [verified] Performed a bidirectional parity audit between the Windows
  renderer/CSS component inventory and the currently open macOS Codex DOM. The
  scope remains exact Internet Angel preset IDs only; Gothic and imported themes
  must remain unaffected.
- [verified] Live CDP evidence reproduces all newly reported gaps. The open
  Environment flyout contains two native sections, but the macOS classifier marks
  only the first header/section; the Sources header therefore keeps its native
  black background. The left sidebar currently has 195 `sidebar-row` marks,
  including nested folder controls and screen-reader-only buttons, and applies a
  visible rest-state plate to all of them. Its native inner scroll container is
  still functional (`clientHeight=871`, `scrollHeight=2161`), so the defect is
  visual hierarchy loss rather than a broken scrollbar.
- [verified] Windows has dedicated `changes-pill`, `changes-shell` and
  `changes-clip-host` classification and CSS for the compact changed-files status;
  the macOS overlay currently has none of those components. Windows also keeps
  ordinary sidebar buttons transparent at rest and reserves the full plate for
  selected rows, unlike the current macOS overlay.
- [verified] Added red-green DOM/CSS regressions and exact-theme-gated coverage for
  both Environment/Sources sections, the compact changed-files shell/clip/pill,
  transparent sidebar rest states, native selected rows, the composer goal-mode
  trigger and settings app-main controls. A direct Windows-to-macOS component
  contract now checks the remaining interaction surfaces for classifier and CSS
  coverage.
- [verified] A real `920x820` macOS window exposed a second Environment rendering
  path: a visible Radix popover exists beside the exiting `absolute z-40` portal.
  The old classifier accepted only the latter and mislabeled the visible panel as
  `summary-panel`. The classifier now accepts both portal hosts while retaining
  the existing dual-section, button-count and Git/semantic safety gates. The
  theme never writes portal position or translation overrides.
- [verified] Source hot injection and real-window evidence pass at `920x820` and
  restored `1694x991`. The visible Radix panel is inside `x=542..842`, the restored
  panel is inside `x=1378..1678`, both Environment/Sources headers are themed,
  only the active sidebar task has a selection plate, expanded project folders
  remain transparent, and the composer/changed-files pill/document have no
  horizontal overflow. The native window was restored to its original bounds.
- [verified] `CODEX_DREAM_SKIN_SKIP_DOCTOR=1 macos/tests/run-tests.sh`
  completed with shell/Node syntax checks, shared runtime synchronization,
  Safe CSS, import/ZIP/runtime coverage and 10 Swift XCTest cases passing; the
  live Doctor was explicitly skipped. An arm64 menu-bar `.app` built into `/tmp`,
  passed strict `codesign` verification, reported an arm64 Mach-O executable and
  contained byte-identical Internet Angel CSS/JS assets.
- [verified] Final focused Internet Angel regression, both touched Node syntax
  checks and `git diff --check` pass. The worktree contains only the four intended
  follow-up files.
- [verified] Implementation and regressions were committed as `7447acc` and
  pushed to the existing ready PR #8 branch. This progress-only update records
  the completed verification and push. No merge, install, version bump or Release
  was performed.

## macOS Internet Angel Detail Parity Follow-up (2026-07-27 00:18 CST)

- [complete] Re-audited the current macOS renderer against the Windows Internet
  Angel implementation for Output, expanded Edited files details and the full
  conversation surface. Scope remains exact-theme-ID gated and must not affect
  Gothic or imported themes.
- [verified] Live Codex 26.721.41059 DOM inspection shows the Edited files card
  shell is classified, but its icon, action group, distinct Undo/Review states,
  file-list rows and Show-more footer have no component markers. The existing
  macOS summary fixture is an Environment lookalike, so it does not exercise a
  real Output panel.
- [verified] The current renderer no longer exposes `[data-message-author-role]`;
  user bubbles, assistant responses, message actions, historical activities and
  streaming activities now use current structural markers. Inline command/output
  bodies and the right-side Outputs summary receive dedicated theme surfaces.
- [complete] Expanded Edited files cards now classify and style the icon, action
  group, distinct Undo/Review buttons, file-list surface, clickable rows, paths,
  per-file statistics and Show-more footer. The later generic resource-card rule
  explicitly excludes classified edited cards so it cannot overwrite the
  dedicated cyan/pink treatment.
- [verified] Focused red/green regressions, JavaScript syntax, all macOS shell
  syntax, the complete macOS repository suite and 10 Swift XCTest cases pass.
  Live Codex checks at 1694x991 and an emulated 900x900 viewport show no horizontal
  overflow; the card controls and paths remain contained. The current Outputs
  panel, Edited files details, conversation bubble and computed styles were
  checked from source-injected screenshots.
- [verified] A fresh arm64 app build completed. Strict code-signature verification,
  arm64 Mach-O inspection and byte-for-byte packaged overlay asset comparisons
  pass. The build was not installed or published.
- [complete] Follow-up commit `2111c3b` is pushed to the account fork and ready
  PR #8 now points at that exact implementation. GitHub reports the PR open and
  `BLOCKED` with no check rollup; CI and maintainer review remain separate gates.
  No merge, release or install is claimed.

## macOS Internet Angel Visual Parity (2026-07-26 21:48 CST)

- [complete] Branch `codex/macos-internet-angel-parity` adds a macOS-only,
  exact-theme-ID overlay for both bundled Internet Angel presets. It covers the
  composer, Environment/Changes, left navigation and footer, Add palette, turn
  navigation, settings, terminal/summary, selection, edited-file, overlay and
  subagent surfaces without activating for Gothic or custom themes.
- [complete] Rebased the implementation onto current `origin/main@78497ca`
  (v1.5.7). Conflict resolution preserves the current native-window readiness
  gate, validated Safe CSS composition and current version while adding the
  Internet Angel surface gate to the final renderer assessment.
- [verified] Shared runtime synchronization, the complete macOS suite, 10 Swift
  XCTest cases, signed-runtime checks and live Doctor all pass on the rebased tree.
  The current Codex 26.721.41059 renderer reports `pass: true` with the composer,
  Environment, sidebar footer, turn rail and scroll-to-bottom coverage active and
  no horizontal overflow.
- [verified] An arm64 `Codex Dream Skin.app` build completed at version 1.5.7.
  Strict code-signature verification, Mach-O architecture and packaged overlay
  asset presence all pass. The temporary build was not installed or published.
- [complete] Commits `88afb57` and `e7bdd80` are pushed to the account fork.
  Ready PR #8 targets upstream `main@78497ca`:
  `https://github.com/EmiyaKatuz/Codex-Dream-Skin-Needy-Girl-Overdose/pull/8`.
- [pending] GitHub checks and maintainer review have not completed. The PR is
  open and currently reports `BLOCKED` with no check rollup yet; it is not
  merged or released. No version bump, tag, Release publication or installation
  is in scope.
## v1.5.1 Version Release (2026-07-25 08:28 HKT)

- [complete] Created `codex/release-v1.5.1` from the exact synchronized
  `origin/main@3593e8f`. No remote `v1.5.1` tag or GitHub Release existed at
  preflight.
- [complete] Updated the six release version sources to `1.5.1`, the two
  macOS current-version assertions, and the dated macOS/Windows changelog
  headings. The Windows readiness fixture added by #249 also encoded the
  current injected version; its `1.5.0` value initially made the two positive
  readiness cases fail after the bump, so that corresponding assertion now
  reports `1.5.1`. Historical changelog entries and unrelated fixture data
  remain unchanged.
- [verified] Six-source consistency, semantic/unpublished-tag preflight,
  focused macOS update/common version assertions, Bash and Node syntax, both
  injector payload checks, 21 macOS and 11 Windows portable Node regressions,
  and `git diff --check` pass locally. The Windows suite was rerun after the
  fixture correction and passed all 11 tests.
- [complete] Release commit `3289f64` is pushed to
  `codex/release-v1.5.1`; ready PR #250 targets `main` with that exact head.
- [verified] Initial CI run `30136427124` passed Static checks; both Windows
  suites passed their regressions/static checks and macOS passed regressions
  plus its native build before the required durable-progress checkpoint.
- [in progress] Push this progress-only docs commit to PR #250, then require a
  fresh Static checks, Windows PowerShell 5.1, PowerShell 7, and macOS run for
  the new exact head. The superseded CI head is not merge evidence.
- [pending] After merge, verify the automatic Release workflow creates a
  `v1.5.1` tag at the exact merge commit and publishes non-empty DMG, Setup.exe,
  and `SHA256SUMS.txt` assets. No manual package, tag, or Release publication is
  permitted.

## v1.5.1 Installer Preflight Fix (2026-07-25 07:36 HKT)

- [complete] Branch `codex/fix-macos-installer-preflight-v1.5.1` moves
  `discover_codex_app` before the outer running-app guard, so `CODEX_EXE` and
  the exact app bundle are bound before any engine bytes can be deployed.
- [complete] A real outer-installer regression covers the closed-app inner
  failure rollback and a compiled matching app process rejected before deploy;
  it verifies that the prior engine stays intact and no installing, previous or
  broken staging tree remains.
- [verified] Root reran Bash syntax, the focused installer preflight regression,
  `git diff --check`, and the complete macOS CI-parameter suite with signed
  runtime and Doctor integrations explicitly skipped. All applicable checks
  passed; full-Xcode SwiftPM/XCTest remains an environment skip.
- [complete] Fix commit `747c618` was pushed in PR #247. GitHub Actions run
  `30134848593` passed Static checks, both Windows jobs and macOS repository
  regressions; the PR was squash-merged to `main@3aa89d7` after bypassing only
  the impossible same-account self-review requirement.
- [complete] The post-merge Release guard run `30135002941` skipped duplicate
  publication successfully because the version remained 1.5.0. Post-merge CI
  run `30135002980` also passed all four jobs, including DMG and Setup builds.
- [in progress] Public v1.5.0 remains unsuitable for website enablement. ChatGPT
  26.721.41059 currently reaches CDP without a native window; an independent
  worktree is implementing correct post-CDP app activation and fail-closed
  visible-window verification before the separate v1.5.1 version PR.
- [in progress] A Windows parity audit found the same release-blocking class:
  the current verifier can accept hidden or minimized L0/L1 renderers without
  native-window evidence. A separate origin/main worktree owns Windows window
  binding, DOM visibility and non-minimized readiness tests. Both platform fixes
  must merge before the v1.5.1 version bump.
- [complete] macOS readiness commit `1d76a86` plus test-isolation follow-up
  `e7cc38c` passed all four PR CI jobs in run `30135795473`; PR #248 was
  squash-merged to `main@ea5f37f`.
- [complete] Windows readiness commit `fc454cb` passed all four PR CI jobs in
  run `30135894880`, including the new PowerShell 5.1 startup rollback fixture;
  PR #249 was squash-merged to `main@3593e8f`.
- [in progress] Prepare the separate v1.5.1 version-only branch from
  `main@3593e8f`, update all six sources, both assertions and both changelogs,
  then require CI before merge and automatic Release publication.

## v1.5.0 Installed Release Finding (2026-07-25 07:18 HKT)

- [complete] Public v1.5.0 Release/tag/DMG/Setup.exe/SHA256SUMS were independently
  downloaded and verified. The DMG installs and registers `dreamskin`, but a
  real engine upgrade exposed a release P1: the outer installer invokes
  `codex_is_running` before `discover_codex_app`, so its pre-copy running-app
  guard expands undefined `CODEX_EXE` and fails open under `set -u`.
- [complete] The failed real upgrade atomically restored the entire previous
  v1.4.0 engine tree; no mixed tree or installer staging residue remains and the
  original active theme bytes are unchanged.
- [blocked] Current ChatGPT `26.721.41059` opens a loopback CDP target but has no
  native window after launch on this host. The v1.5.0 injector applies its exact
  payload to that target but correctly refuses visible verification, so the
  outer installer rolls back. Do not enable the website for v1.5.0.
- [in progress] Prepare a focused v1.5.1 installer-preflight fix with functional
  regression coverage, then retest a public build and the current renderer
  before enabling the website.

## Final Publication Gate (2026-07-25 06:23 HKT)

- [complete] PR #245 passed all four CI jobs and was squash-merged to client
  `main` as `71f30f0`. The v1.4.0 Release guard completed successfully without
  publishing a duplicate because the feature PR did not change versions.
- [complete] Separate branch `codex/release-v1.5.0` changes only the six version
  sources, two version assertions and the macOS/Windows changelog headings.
  Version consistency, stale-reference scan, all 24 portable Node regressions,
  the CI-mode macOS suite and `git diff --check` pass locally.
- [complete] Version-only commit `3c43752` was pushed and Draft PR #246 targets
  `main`.
- [complete] PR #246 passed all four CI jobs and was squash-merged to client
  `main` as `aad9fc0`.
- [in progress] Automatic Release run `30131800275` is building v1.5.0 from
  that exact main commit. No public v1.5.0 tag/assets, website enablement or
  deployment exists yet.
- [complete] Initial PR #245 CI run `30130742965` exposed three gaps. The
  macOS-only Swift fixture now reports a real Node test skip on non-Darwin
  hosts; the signed package-identity shell integration honors the repository's
  existing CI skip; and Windows runtime fingerprinting recursively
  canonicalizes object keys so active-image renaming cannot change content
  identity.
- [verified] Root reproduced the Windows fingerprint mismatch with portable
  PowerShell, then proved the saved/active hashes are identical after the fix.
  CI-mode macOS regressions, 20 macOS and 4 Windows Node regressions, all
  PowerShell parse/encoding checks and `git diff --check` pass locally. Repair
  commit `3a2c809` is pushed; fresh CI run `30131282832` is the active gate.
- [complete] Feature commit `c44b434` was pushed to
  `codex/one-click-theme-apply`; Draft PR #245 targets `main`. All release
  version sources intentionally remain `1.4.0`.
- [in progress] PR #245 must pass Static checks, Windows PowerShell 5.1,
  PowerShell 7 and macOS repository regressions before it is marked ready or
  merged.
- [complete] The independent final Windows read-only audit reports PASS with no
  P0/P1 findings. `git diff --check` passes. Native PowerShell 5.1, compiled
  Setup.exe protocol registration and a real Windows renderer transaction remain
  required PR CI/Windows-host gates rather than local macOS claims.
- [complete] Root reran all 24 portable macOS/Windows Node regressions and the
  complete macOS repository suite on the final stable tree. Both passed; only
  the documented full-Xcode XCTest and installed-app Doctor branches skipped on
  this Command Line Tools host.
- [complete] Final static checks and an x86_64 native app build passed, including
  strict codesign, exact `dreamskin` URL-scheme registration and packaged helper
  inventory.
- [fact] The public client remains v1.4.0 and the website one-click action remains
  correctly disabled until the automatic v1.5.0 Release is public and verified.

## Root Integrated macOS Recheck (2026-07-25 05:50 HKT)

- [complete] Root independently reran the exact pre-switch community transaction
  regression, private ZIP identity regression, focused bounded-HTTP/import/
  staging Node tests, relevant Bash syntax, plist validation and
  `git diff --check`; all passed on the combined macOS tree.
- [complete] All 13 currently approved production ZIPs were exercised through
  the current strict macOS importer with an isolated temporary HOME. Every one
  failed closed on the missing required `theme.css`, and the isolated saved-theme
  library remained empty. The real user theme library and active renderer were
  not changed by this rejection test.
- [pending] Windows click-time baseline closure, combined cross-platform CI,
  final public Release install and website-button acceptance remain.

## macOS Rollback Pre-Switch Closure (2026-07-25 05:43 HKT)

- [complete] Inside the inherited community operation lock, the macOS
  transaction now snapshots the active theme and runs `injector --verify`
  against that exact snapshot and current CDP port before the first switch.
  The injector therefore checks both the rollback theme ID and computed payload
  revision against the renderer; a mismatch exits before any theme switch.
- [complete] The transaction fixture now records exact renderer-verification
  calls. A state mismatch proves zero verification and zero switches; an
  injected renderer-verification failure proves one verification and zero
  switches. Success, verified rollback and failed rollback cases continue to
  pass under one inherited lock.
- [complete] Rollback retention now distinguishes a snapshot promoted to the
  private `recovery/` tree, a structurally validated snapshot retained in its
  original operation directory when promotion fails, and no confirmed
  snapshot. The App does not delete an in-place fallback, startup stale cleanup
  skips community operations containing such a snapshot, and UI/docs no longer
  promise that retaining a snapshot means recovery succeeded.
- [verified] `macos/tests/community-apply-transaction.test.sh`, focused
  `bash -n`, `git diff --check`, and a standalone Swift recovery-promotion
  failure smoke pass. A direct x86_64 app build with the macOS 14.4 SDK passed at
  `/tmp/CodexDreamSkin-one-click-macos-closure.app`; strict ad-hoc signature,
  exact bundled transaction-script bytes, and the `dreamskin` URL scheme were
  rechecked. The build was not installed.
- [remaining] The owner must rerun the combined macOS suite after all agents
  finish, rebuild the final integrated app, reinstall it, verify bundled engine
  identity, and repeat the installed renderer transaction. Full SwiftPM/XCTest
  remains a CI/full-Xcode gate on this Command Line Tools-only host.

## Windows Transaction Hardening (2026-07-25 05:06 HKT)

- [complete] Community downloads now pass their approved byte count and SHA-256
  into the strict ZIP importer. The importer opens the archive exclusively,
  checks both values on that same FileStream, rewinds it, and extracts from the
  still-open handle. Replacement, truncation and wrong-hash regressions were
  added.
- [complete] Imported and duplicate results now return a stable runtime-content
  fingerprint. One-click apply copies the saved theme into a private transaction
  snapshot, recomputes the exact fingerprint, and refuses to write active files
  unless it still matches.
- [complete] The Windows operation lock now covers the exact active snapshot and
  active-file write. The parent releases it before invoking
  start-dream-skin.ps1, because that script acquires the same lock and only
  exits after exact renderer verification. Failed writes and failed startup
  restore under lock, restart, and verify the previous renderer; a newer manual
  theme choice is detected and never overwritten.
- [complete] Native confirmation metadata rejects Unicode Format, bidi,
  line-separator and paragraph-separator characters. Mocked transaction tests
  cover success, wrong private identity, partial writes, verified rollback,
  rollback file/renderer failure, and concurrent supersession.
- [in progress] Independent PowerShell 5.1/transaction review is running. This
  macOS host has no powershell.exe or pwsh, so executable Windows tests,
  Setup.exe protocol registration, and the real renderer transaction remain
  Windows CI/host gates. git diff --check currently passes.

## Active Scope

- Worktree: `/private/tmp/dreamskin-one-click.36Mjwl`
- Branch: `codex/one-click-theme-apply` based on public v1.4.0/main `277b520`
- Goal: strict `dreamskin://apply?version=ver_...` website-to-client apply for macOS and Windows.
- User primary client worktree was not touched.

## Root Repeated Installed Acceptance (2026-07-25 04:41 HKT)

- Root independently re-imported the three compliant official fixtures through
  the installed strict importer; each returned `duplicate`, validated Safe CSS
  and the expected stable content fingerprint.
- Root switched all three themes live again. Exact renderer verification passed
  each theme ID/revision with visible shell/sidebar/composer/home, zero business
  class pollution and no horizontal overflow. Fresh evidence is under
  `/private/tmp/dreamskin-installed-smoke.iVev9i/`.
- A deliberately wrong imported-content fingerprint exercised the parent
  transaction failure path. It returned exit `20`, reapplied the exact previous
  snapshot and visibly reverified it. Root then reapplied the exact original
  snapshot; `preset-gothic-void-crusade` is active and verified now.
- macOS metadata display validation now explicitly rejects bidi controls and
  line/paragraph separators that could visually spoof the native confirmation.
  Targeted tests and the final rebuild/reinstall remain after this edit.

## macOS Safety Closure

- Implemented fixed-origin bounded HTTP with explicit redirect failure, header/chunked size bounds, cancellation, and exactly-once completion coverage.
- Community ZIP import rechecks approved byte count and SHA-256 on the private no-follow snapshot used for extraction.
- Import publishing returns a runtime content fingerprint; staging calculates the same fingerprint and switching requires an exact match.
- Community apply holds one cross-process transaction lock across exact active-theme snapshot, apply/render verification, and verified rollback. Fresh ownerless locks fail closed; only a dead owner or an ownerless lock at least 10 minutes old is reclaimable.
- The rollback snapshot contains the exact active `theme.json`, referenced image, optional `theme.css`, and content identity even when the active theme is not in `themes/<id>`.
- Hot apply now runs exact injector verification; cold apply already runs `injector --verify` against the active theme before success. Failed community apply re-applies and verifies the exact snapshot; exit 20 means verified recovery, exit 21 means recovery was not verified.
- Quit/menu termination is blocked while network, import, apply, recovery, engine install, or runtime operations are busy. Startup removes only stale private operation directories older than 24 hours and preserves community operation roots that still contain a structurally validated rollback snapshot.
- Native confirmation states that a cold apply may restart ChatGPT and that unsent input should be saved. Menu progress covers metadata, download, import, snapshot/apply, and recovery state.

## Verification

- Root independently reran `CODEX_DREAM_SKIN_SKIP_DOCTOR=1
  macos/tests/run-tests.sh`: PASS, with only the documented full-Xcode
  SwiftPM/XCTest and explicitly skipped Doctor branches omitted.
- Root built and installed `/tmp/CodexDreamSkin-one-click-root.app`, verified
  its ad-hoc signature, `dreamskin` URL scheme, complete runtime inventory,
  and byte-identical deployed engine. The previous 1.3.3 app, engine and user
  state are recoverably backed up at
  `/tmp/dreamskin-before-one-click.g6pClo`.
- The real installed importer added three official four-file fixtures as
  `local-one-click-1/2/3`; all reported `safeCssStatus=validated` and a stable
  content fingerprint without changing the active theme during import.
- The installed switcher applied all three fixtures to the real ChatGPT/Codex
  renderer. Exact `injector --verify` passed each theme ID/revision, Safe CSS,
  visible shell/sidebar/composer/card geometry, matching text colors, zero
  business-class pollution and no document overflow. Screenshots are
  `/tmp/dreamskin-local-one-click-1.png`,
  `/tmp/dreamskin-local-one-click-2.png`, and
  `/tmp/dreamskin-local-one-click-3.png`.
- Root restored `preset-gothic-void-crusade`; its active theme/image are
  byte-identical to the pre-test backup (SHA-256 `8316c6ad...` and
  `b76a7cbe...`), exact renderer verify passes, and deep status reports
  `session=active`, `injectorAlive=true`, `cdpOk=true`.
- LaunchServices delivered malformed and canonical production legacy
  `dreamskin://` links to the installed app as native warning windows. The
  production exact-metadata route currently returns 404, so the legacy link
  failed closed and did not change the active theme. A successful end-to-end
  network apply still requires a deployed compatible package.

- `CODEX_DREAM_SKIN_SKIP_DOCTOR=1 macos/tests/run-tests.sh`: PASS. SwiftPM/XCTest skipped because this Command Line Tools host has no matching full Xcode platform; Doctor intentionally skipped. Signed-runtime switch and runtime-state integration passed.
- Direct Swift x86_64 typecheck with macOS 14.4 SDK: PASS.
- Bounded HTTP redirect/oversize/chunked/cancel/exactly-once fixture: PASS.
- Community import private-snapshot byte/SHA identity fixture: PASS.
- Community transaction success/verified rollback/rollback-failure and inherited-lock fixture: PASS.
- `DREAMSKIN_SDK=/Library/Developer/CommandLineTools/SDKs/MacOSX14.4.sdk DREAMSKIN_ARCHS=x86_64 macos/scripts/build-menubar-app.sh --skip-tests --output /tmp/CodexDreamSkin-one-click-hardened.app`: PASS. Built Mach-O x86_64; packaged runtime helpers and `dreamskin` URL scheme verified.
- `git diff --check`: PASS before final build.

## Remaining Integrated Work

- No commit, push, PR, merge, replacement Release, or deployment has occurred.
  A local development build is installed and fully backed up; public v1.4.0
  still does not contain one-click apply.
- A complete fixed-origin network success smoke still requires a deployed
  approved `applyCompatible: true` package. Existing approved legacy
  production packages are intentionally preview/download-only.
- Real Windows PowerShell 5.1 and Setup.exe protocol install require Windows CI/host verification.
