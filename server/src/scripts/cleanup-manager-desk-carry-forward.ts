import "../load-env";

import { ManagerDeskService } from "../services/manager-desk.service";
import { TeamTrackerService } from "../services/team-tracker.service";

interface ParsedArgs {
  apply: boolean;
  managerAccountId?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    apply: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--apply") {
      parsed.apply = true;
      continue;
    }

    if (arg === "--manager") {
      const next = argv[index + 1]?.trim();
      if (!next) {
        throw new Error("Usage: --manager <manager-account-id>");
      }
      parsed.managerAccountId = next;
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const service = new ManagerDeskService(new TeamTrackerService());
  const result = await service.cleanupLegacyCarryForwardChains({
    dryRun: !args.apply,
    managerAccountId: args.managerAccountId,
  });

  process.stdout.write(
    `${args.apply ? "Applied" : "Dry run"} legacy Manager Desk carry-forward cleanup\n`
  );
  if (args.managerAccountId) {
    process.stdout.write(`Manager: ${args.managerAccountId}\n`);
  }
  process.stdout.write(`Scanned chains: ${result.scannedChains}\n`);
  process.stdout.write(`Collapsed chains: ${result.collapsedChains}\n`);
  process.stdout.write(`Removed items: ${result.removedItems}\n`);
  process.stdout.write(`Skipped chains: ${result.skippedChains}\n`);

  if (result.chains.length > 0) {
    process.stdout.write("\nChain details:\n");
    for (const chain of result.chains) {
      process.stdout.write(
        `- ${chain.managerAccountId} | "${chain.title}" | keep ${chain.keptItemId} | remove [${chain.removedItemIds.join(", ")}]${chain.skippedBecauseTrackerLinked ? " | skipped: tracker-linked" : ""}\n`
      );
    }
  }

  if (!args.apply) {
    process.stdout.write(
      "\nRe-run with --apply after reviewing the dry-run output.\n"
    );
  }
}

void main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
});
